import { randomUUID } from "node:crypto";

import {
	ATTACHMENT_EXTENSION,
	MAX_ATTACHMENT_BYTES,
	sniffAttachmentType,
} from "~/lib/expenses";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { BillingError } from "~/server/billing/runs";
import { addEvent } from "~/server/collection";
import { db } from "~/server/db";
import { attachments } from "~/server/storage";

const json = (body: unknown, status: number) => Response.json(body, { status });

/**
 * Adds a note and/or a file (photo or PDF: notices, petitions, receipts) to a
 * legal collection case's timeline (docs/features/04, item 3). Multipart form:
 * "text" and an optional "file" (up to 4 MB, photos compressed by the
 * browser). Same private bucket and checks as expense attachments.
 */
export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getSession();
	if (!session) return json({ error: "Faça login novamente." }, 401);

	const { id: caseId } = await params;
	const found = await db.collectionCase.findUnique({
		where: { id: caseId },
		select: { condominiumId: true },
	});
	if (!found) return json({ error: "Cobrança não encontrada." }, 404);

	const access = await getAccess(db, session.user.id);
	let canManage = false;
	try {
		({ canManage } = await assertCanViewCondominium(
			db,
			access,
			found.condominiumId,
		));
	} catch {
		return json({ error: "Cobrança não encontrada." }, 404);
	}
	if (!canManage) {
		return json({ error: "Somente a administradora pode registrar." }, 403);
	}

	let form: FormData;
	try {
		form = await request.formData();
	} catch {
		return json({ error: "Envio inválido. Tente novamente." }, 400);
	}
	const rawText = form.get("text");
	const text = typeof rawText === "string" ? rawText.trim() : "";
	if (text.length > 2000) {
		return json(
			{ fieldErrors: { text: ["Use no máximo 2000 caracteres."] } },
			422,
		);
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
		const key = `collection/${found.condominiumId}/${caseId}/${randomUUID()}.${ATTACHMENT_EXTENSION[type]}`;
		await attachments.upload(key, bytes, { contentType: type });
		attachment = {
			key,
			name:
				file.name.slice(0, 200) || `documento.${ATTACHMENT_EXTENSION[type]}`,
			type,
			size: bytes.byteLength,
		};
	}
	if (!text && !attachment) {
		return json(
			{ fieldErrors: { text: ["Escreva uma anotação ou anexe um arquivo."] } },
			422,
		);
	}

	try {
		const event = await addEvent({
			caseId,
			text: text || null,
			file: attachment,
			actorUserId: session.user.id,
		});
		return json(event, 201);
	} catch (error) {
		if (attachment) await attachments.delete(attachment.key).catch(() => {});
		if (error instanceof BillingError)
			return json({ error: error.message }, 400);
		throw error;
	}
}
