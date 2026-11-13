import { assertCanViewCondominium, getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { SIGNED_URL_TTL_SECONDS, attachments } from "~/server/storage";

/**
 * Opens a file of a legal collection case (docs/features/04). Checks access
 * on every request, then redirects to a short-lived signed URL.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ eventId: string }> },
) {
	const session = await getSession();
	if (!session) return new Response("Faça login novamente.", { status: 401 });

	const { eventId } = await params;
	const event = await db.collectionEvent.findUnique({
		where: { id: eventId },
		select: {
			fileKey: true,
			fileName: true,
			case: { select: { condominiumId: true } },
		},
	});
	if (!event?.fileKey) {
		return new Response("Anexo não encontrado.", { status: 404 });
	}
	const access = await getAccess(db, session.user.id);
	try {
		await assertCanViewCondominium(db, access, event.case.condominiumId);
	} catch {
		return new Response("Anexo não encontrado.", { status: 404 });
	}

	const filename = (event.fileName ?? "documento").replace(/["\\\r\n]/g, "");
	const url = await attachments.url(event.fileKey, {
		expiresIn: SIGNED_URL_TTL_SECONDS,
		responseContentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(filename)}`,
	});
	return new Response(null, {
		status: 302,
		headers: { Location: url, "Cache-Control": "private, no-store" },
	});
}
