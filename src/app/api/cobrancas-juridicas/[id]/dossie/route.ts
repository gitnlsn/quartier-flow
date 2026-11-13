import { assertCanViewCondominium, getAccess } from "~/server/access";
import { audit } from "~/server/audit";
import { getSession } from "~/server/auth";
import { caseDetail } from "~/server/collection";
import { db } from "~/server/db";
import { renderDossierPdf } from "~/server/pdf/dossier";

/**
 * Unit dossiê for legal collection (docs/features/04, item 3): debts with
 * the fine/interest estimate, acordos, timeline and the payer's full CPF.
 * Administradora only, logged in AuditLog (LGPD), like the CSV export.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const session = await getSession();
	if (!session) return new Response("Faça login novamente.", { status: 401 });

	const { id: caseId } = await params;
	const found = await db.collectionCase.findUnique({
		where: { id: caseId },
		select: { condominiumId: true },
	});
	if (!found) return new Response("Cobrança não encontrada.", { status: 404 });

	const access = await getAccess(db, session.user.id);
	let canManage = false;
	try {
		({ canManage } = await assertCanViewCondominium(
			db,
			access,
			found.condominiumId,
		));
	} catch {
		return new Response("Cobrança não encontrada.", { status: 404 });
	}
	if (!canManage) {
		return new Response("Somente a administradora pode baixar o dossiê.", {
			status: 403,
		});
	}

	const detail = await caseDetail(caseId, { withCpf: true });
	const pdf = await renderDossierPdf(detail);
	await audit({
		administradoraId: detail.condominium.administradoraId,
		actorUserId: session.user.id,
		action: "collection_case.dossier",
		entity: "collection_case",
		entityId: caseId,
		data: { unitId: detail.unit.id },
	});

	const slug = `${detail.condominium.name}-${detail.unitLabel}`
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return new Response(new Uint8Array(pdf), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="dossie-${slug}-${new Date().toISOString().slice(0, 10)}.pdf"`,
			"Cache-Control": "private, no-store",
		},
	});
}
