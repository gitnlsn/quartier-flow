import "server-only";

import { after } from "next/server";

import {
	type OutgoingEmail,
	sendPulseConfigured,
	sendPulseEmail,
} from "~/server/email/sendpulse";

/**
 * Delivery of auth and transactional messages (sign-in links, invites,
 * invoices). Feature notifications go through `notify()`
 * (src/server/notifications), which uses this same email sender.
 *
 * Email goes through SendPulse (docs/features/16). In development without
 * SendPulse credentials, messages are printed to the server console so every
 * flow can be tested locally. No SMS provider yet: in production, sending an
 * SMS fails loudly instead of silently dropping codes.
 */

type SmsMessage = { to: string; text: string };

const isProduction = process.env.NODE_ENV === "production";

/** Sends an email; resolves with the provider's message id ("" in dev). */
export async function sendEmail(message: OutgoingEmail): Promise<string> {
	if (!isProduction) {
		// Always visible locally, so sign-in links work for test accounts too.
		console.info(
			`\n[email] to=${message.to}\nsubject: ${message.subject}\n${message.text}\n`,
		);
	}
	if (sendPulseConfigured()) return sendPulseEmail(message);
	if (isProduction) {
		throw new Error("Email provider not configured");
	}
	return "";
}

export async function sendSms(message: SmsMessage): Promise<void> {
	if (isProduction) {
		throw new Error("SMS provider not configured");
	}
	console.info(`\n[auth:sms] to=${message.to}\n${message.text}\n`);
}

/**
 * Fire-and-forget wrapper. Better Auth recommends not awaiting delivery inside
 * auth endpoints, so response time does not reveal whether an account exists.
 * Inside a request, `after()` keeps the function alive until the send ends
 * (Vercel may otherwise stop it once the response is sent).
 */
export function deliver(send: Promise<unknown>): void {
	const logged = send.catch((error: unknown) => {
		console.error("[email] message delivery failed", error);
	});
	try {
		after(logged);
	} catch {
		// Outside a request (scripts): the promise just runs.
	}
}
