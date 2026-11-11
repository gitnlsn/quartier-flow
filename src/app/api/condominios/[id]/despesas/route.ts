import { randomUUID } from "node:crypto";

import { z } from "zod";

import "~/lib/zod-pt";

import {
	ATTACHMENT_EXTENSION,
	EXPENSE_CATEGORIES,
	MAX_ATTACHMENT_BYTES,
	sniffAttachmentType,
} from "~/lib/expenses";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import { audit } from "~/server/audit";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { attachments } from "~/server/storage";

const fields = z.object({
	category: z.enum(EXPENSE_CATEGORIES, {
		errorMap: () => ({ message: "Escolha uma categoria" }),
	}),
	supplier: z
		.string()
		.trim()
		.max(120)
		.transform((v) => v || null),
	description: z
		.string()
		.trim()
		.min(1, "Descreva a despesa")
		.max(300, "Use no máximo 300 caracteres"),
	amountCents: z.coerce
		.number()
		.int()
		.positive("Valor inválido")
		.max(100_000_000_00, "Valor inválido"),
	paidAt: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
		.transform((v) => new Date(`${v}T00:00:00Z`))
		.refine((d) => !Number.isNaN(d.getTime()), "Data inválida"),
});

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Records an expense, with an optional invoice/receipt (docs/features/05).
 *
 * Multipart form: category, supplier, description, amountCents, paidAt
 * (YYYY-MM-DD) and an optional "file" (JPEG/PNG/WebP/PDF, up to 4 MB; the
 * browser compresses photos first). The file goes to the private
 * "attachments" bucket on Neon Object Storage before the row is created.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getSession();
	if (!session) return json({ error: "Faça login novamente." }, 401);

	const { id: condominiumId } = await params;
	const access = await getAccess(db, session.user.id);
	let canManage = false;
	try {
		({ canManage } = await assertCanViewCondominium(db, access, condominiumId));
	} catch {
		return json({ error: "Condomínio não encontrado." }, 404);
	}
	if (!canManage) {
		return json(
			{ error: "Somente a administradora pode lançar despesas." },
			403,
		);
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ error: "Envio inválido. Tente novamente." }, 400);
	}

	const parsed = fields.safeParse({
		category: form.get("category"),
		supplier: form.get("supplier") ?? "",
		description: form.get("description"),
		amountCents: form.get("amountCents"),
		paidAt: form.get("paidAt"),
	});
	if (!parsed.success) {
		return json({ fieldErrors: parsed.error.flatten().fieldErrors }, 422);
	}

	const file = form.get("file");
	let attachment: {
		key: string;
		name: string;
		type: string;
		size: number;
	} | null = null;

	if (file instanceof File && file.size > 0) {
		if (file.size > MAX_ATTACHMENT_BYTES) {
			return json({ fieldErrors: { file: ["Arquivo maior que 4 MB."] } }, 422);
		}
		const bytes = new Uint8Array(await file.arrayBuffer());
		const type = sniffAttachmentType(bytes);
		if (!type) {
			return json(
				{
					fieldErrors: { file: ["Envie uma foto (JPG, PNG, WebP) ou um PDF."] },
				},
				422,
			);
		}
		const key = `expenses/${condominiumId}/${randomUUID()}.${ATTACHMENT_EXTENSION[type]}`;
		await attachments.upload(key, bytes, { contentType: type });
		attachment = {
			key,
			name: file.name.slice(0, 200) || `nota.${ATTACHMENT_EXTENSION[type]}`,
			type,
			size: bytes.byteLength,
		};
	}

	try {
		const expense = await db.expense.create({
			data: {
				condominiumId,
				...parsed.data,
				createdById: session.user.id,
				attachmentKey: attachment?.key,
				attachmentName: attachment?.name,
				attachmentType: attachment?.type,
				attachmentSize: attachment?.size,
			},
			select: { id: true },
		});
		await audit({
			administradoraId: access.administradoraId,
			actorUserId: session.user.id,
			action: "expense.create",
			entity: "expense",
			entityId: expense.id,
			data: {
				condominiumId,
				amountCents: parsed.data.amountCents,
				attachment: attachment?.key ?? null,
			},
		});
		return json(expense, 201);
	} catch (error) {
		// Don't leave an orphan file behind when the row can't be saved.
		if (attachment) await attachments.delete(attachment.key).catch(() => {});
		throw error;
	}
}
