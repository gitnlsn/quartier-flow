import { timingSafeEqual } from "node:crypto";

import { Prisma } from "@prisma/client";
import { after } from "next/server";

import { env } from "~/env";
import { type AsaasEvent, processWebhookEvent } from "~/server/asaas/webhook";
import { db } from "~/server/db";

function validToken(received: string | null) {
	if (!received) return false;
	const a = Buffer.from(received);
	const b = Buffer.from(env.ASAAS_WEBHOOK_TOKEN);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Asaas webhook (docs/features/17): validate token, store the event once,
 * answer 200 fast (only 200 counts as delivered), process after responding.
 */
export async function POST(request: Request) {
	if (!validToken(request.headers.get("asaas-access-token"))) {
		return new Response("Unauthorized", { status: 401 });
	}

	let event: AsaasEvent;
	try {
		event = (await request.json()) as AsaasEvent;
	} catch {
		return new Response("Invalid JSON", { status: 400 });
	}
	if (!event?.id || !event.event) {
		return new Response("Missing event id", { status: 400 });
	}

	try {
		await db.webhookEvent.create({
			data: {
				id: event.id,
				event: event.event,
				payload: event as unknown as Prisma.InputJsonValue,
			},
		});
	} catch (error) {
		// Redelivery of an event we already have: acknowledge, don't reprocess.
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002"
		) {
			return new Response("OK", { status: 200 });
		}
		throw error;
	}

	after(() => processWebhookEvent(event.id));
	return new Response("OK", { status: 200 });
}
