import { cronAuthorized } from "~/server/cron";
import { processDeliveries } from "~/server/notifications";

/**
 * Retries notification emails that failed or were interrupted
 * (docs/features/16). New notifications are sent right away by `notify()`;
 * this job only picks up pending deliveries whose next attempt is due.
 */
export async function GET(request: Request) {
	if (!cronAuthorized(request)) {
		return new Response("Unauthorized", { status: 401 });
	}
	return Response.json(await processDeliveries());
}
