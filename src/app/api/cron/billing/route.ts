import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";
import {
	BillingError,
	periodOf,
	prepareRun,
	sendRun,
} from "~/server/billing/runs";
import { db } from "~/server/db";

function authorized(request: Request) {
	const header = request.headers.get("authorization") ?? "";
	const expected = `Bearer ${env.CRON_SECRET}`;
	const a = Buffer.from(header);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Daily billing job. For every condominium whose generation day is today:
 * prepare the run (manual mode stays a draft for the administradora to audit
 * and send) and, in automatic mode, send it. The period is the month of the
 * next due date: same month when dueDay > generationDay, otherwise next month.
 *
 * Outside production, `?date=YYYY-MM-DD` simulates another day for testing.
 */
export async function GET(request: Request) {
	if (!authorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}

	const url = new URL(request.url);
	const simulated = url.searchParams.get("date");
	const today =
		simulated && env.NODE_ENV !== "production"
			? new Date(`${simulated}T12:00:00Z`)
			: new Date();
	const day = today.getUTCDate();

	const configs = await db.billingConfig.findMany({
		where: { enabled: true, generationDay: day },
		select: { condominiumId: true, mode: true, dueDay: true },
	});

	const results = [];
	for (const config of configs) {
		const dueMonth = new Date(
			Date.UTC(
				today.getUTCFullYear(),
				today.getUTCMonth() + (config.dueDay > day ? 0 : 1),
				1,
			),
		);
		const period = periodOf(dueMonth);
		try {
			const run = await prepareRun({
				condominiumId: config.condominiumId,
				period,
				actorUserId: null,
			});
			const sent =
				config.mode === "automatic" && run.status === "draft"
					? await sendRun({ runId: run.id, actorUserId: null })
					: null;
			results.push({
				condominiumId: config.condominiumId,
				period,
				runId: run.id,
				mode: config.mode,
				sent,
			});
		} catch (error) {
			console.error(`[cron:billing] ${config.condominiumId} failed`, error);
			results.push({
				condominiumId: config.condominiumId,
				period,
				error:
					error instanceof BillingError ? error.message : "Erro inesperado",
			});
		}
	}

	return Response.json({ date: today.toISOString().slice(0, 10), results });
}
