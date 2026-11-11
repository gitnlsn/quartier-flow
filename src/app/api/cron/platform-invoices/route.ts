import { cronAuthorized, cronToday } from "~/server/cron";
import { db } from "~/server/db";
import { runPlatformBilling } from "~/server/platform-billing";

/**
 * Daily platform billing job (docs/features/18): issues last month's
 * Quartier Flow invoice for each administradora (on the 1st, and catching up
 * on later days) and retries invoices that failed to reach Asaas.
 *
 * Outside production, `?date=YYYY-MM-DD` simulates another day for testing.
 */
export async function GET(request: Request) {
	if (!cronAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}
	const today = cronToday(request);
	const result = await runPlatformBilling(db, today);
	return Response.json({ date: today.toISOString().slice(0, 10), ...result });
}
