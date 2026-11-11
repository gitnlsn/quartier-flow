import { assertCanViewCondominium, getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { SIGNED_URL_TTL_SECONDS, attachments } from "~/server/storage";

/**
 * Opens an expense's invoice. Checks access on every request, then redirects
 * to a short-lived signed URL on Neon Object Storage, so links copied from
 * the page stop working after a few minutes.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getSession();
	if (!session) return new Response("Faça login novamente.", { status: 401 });

	const { id } = await params;
	const expense = await db.expense.findUnique({
		where: { id },
		select: {
			condominiumId: true,
			attachmentKey: true,
			attachmentName: true,
		},
	});
	if (!expense?.attachmentKey) {
		return new Response("Anexo não encontrado.", { status: 404 });
	}

	const access = await getAccess(db, session.user.id);
	try {
		await assertCanViewCondominium(db, access, expense.condominiumId);
	} catch {
		return new Response("Anexo não encontrado.", { status: 404 });
	}

	const filename = (expense.attachmentName ?? "nota").replace(/["\\\r\n]/g, "");
	const url = await attachments.url(expense.attachmentKey, {
		expiresIn: SIGNED_URL_TTL_SECONDS,
		responseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
	});
	return new Response(null, {
		status: 302,
		headers: { Location: url, "Cache-Control": "private, no-store" },
	});
}
