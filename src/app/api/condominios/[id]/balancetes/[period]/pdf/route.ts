import { PERIOD_REGEX } from "~/lib/finance";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { monthLedger, parseSnapshot } from "~/server/finance";
import { renderBalanceSheetPdf } from "~/server/pdf/balance-sheet";

const notFound = () =>
	new Response("Balancete não encontrado.", { status: 404 });

/**
 * Balancete PDF (docs/features/05).
 * - Administradora and síndico: any month (drafts carry a RASCUNHO mark).
 * - Residents of the condominium: published months only.
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string; period: string }> },
) {
	const session = await getSession();
	if (!session) return new Response("Faça login novamente.", { status: 401 });

	const { id: condominiumId, period } = await params;
	if (!PERIOD_REGEX.test(period)) return notFound();

	const access = await getAccess(db, session.user.id);
	let isManager = true;
	try {
		await assertCanViewCondominium(db, access, condominiumId);
	} catch {
		isManager = false;
	}
	if (!isManager) {
		const member = await db.membership.findFirst({
			where: { userId: session.user.id, condominiumId, endedAt: null },
			select: { id: true },
		});
		if (!member) return notFound();
	}

	const sheet = await db.balanceSheet.findUnique({
		where: { condominiumId_period: { condominiumId, period } },
	});
	const published = sheet?.status === "published" && sheet.snapshot;
	if (!published && !isManager) return notFound();

	const data = published
		? parseSnapshot(sheet.snapshot)
		: await monthLedger(condominiumId, period);
	const pdf = await renderBalanceSheetPdf({
		data,
		notes: sheet?.notes ?? null,
		publishedAt: published ? sheet.publishedAt : null,
	});

	const slug = data.condominium.name
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return new Response(new Uint8Array(pdf), {
		headers: {
			"Content-Type": "application/pdf",
			"Content-Disposition": `attachment; filename="balancete-${slug}-${period}${published ? "" : "-rascunho"}.pdf"`,
			"Cache-Control": "private, no-store",
		},
	});
}
