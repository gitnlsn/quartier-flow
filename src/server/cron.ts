import "server-only";

import { timingSafeEqual } from "node:crypto";

import { env } from "~/env";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. */
export function cronAuthorized(request: Request) {
	const header = request.headers.get("authorization") ?? "";
	const expected = `Bearer ${env.CRON_SECRET}`;
	const a = Buffer.from(header);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/** Today, or `?date=YYYY-MM-DD` outside production to simulate another day. */
export function cronToday(request: Request) {
	const simulated = new URL(request.url).searchParams.get("date");
	return simulated && env.NODE_ENV !== "production"
		? new Date(`${simulated}T12:00:00Z`)
		: new Date();
}
