import { cronAuthorized, cronToday } from "~/server/cron";
import { autoBreakAgreements } from "~/server/delinquency";
import { sendCollectionReminders } from "~/server/reminders";

/**
 * Daily delinquency job (docs/features/04):
 * 1. ends acordos late past the condominium's limit
 *    (BillingConfig.agreementAutoBreakDays, off by default);
 * 2. sends the app's payment reminders for administradoras that chose
 *    "app" as the sender (CollectionStep, defaults otherwise).
 * Both are idempotent: a re-run ends nothing twice and sends nothing twice.
 *
 * Outside production, `?date=YYYY-MM-DD` simulates another day for testing.
 */
export async function GET(request: Request) {
	if (!cronAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}
	const today = cronToday(request);
	const brokenAgreements = await autoBreakAgreements(today);
	const reminders = await sendCollectionReminders(today);
	return Response.json({
		date: today.toISOString().slice(0, 10),
		brokenAgreements,
		reminders,
	});
}
