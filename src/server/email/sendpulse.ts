import "server-only";

import { env } from "~/env";

/**
 * SendPulse transactional email (SMTP service, REST API). Docs:
 * https://sendpulse.com/integrations/api/smtp
 *
 * Authenticated with a static API key (Settings > API > API keys), sent as a
 * Bearer token; it doesn't expire, so there's no token exchange.
 */

const API = "https://api.sendpulse.com";

export type OutgoingEmail = {
	to: string;
	toName?: string;
	subject: string;
	text: string;
	html?: string;
};

export const sendPulseConfigured = () =>
	Boolean(env.SEND_PULSE_API_KEY && env.EMAIL_FROM);

/** Sends one email. Returns SendPulse's message id; throws on any failure. */
export async function sendPulseEmail(message: OutgoingEmail): Promise<string> {
	if (!sendPulseConfigured()) throw new Error("SendPulse not configured");
	const response = await fetch(`${API}/smtp/emails`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${env.SEND_PULSE_API_KEY}`,
		},
		body: JSON.stringify({
			email: {
				subject: message.subject,
				text: message.text,
				// The API takes the HTML version base64-encoded.
				...(message.html
					? { html: Buffer.from(message.html, "utf8").toString("base64") }
					: {}),
				from: { name: env.EMAIL_FROM_NAME, email: env.EMAIL_FROM },
				to: [{ name: message.toName ?? "", email: message.to }],
			},
		}),
		cache: "no-store",
	});
	const body = (await response.json().catch(() => null)) as {
		result?: boolean;
		id?: string;
		message?: string;
		error_code?: number;
	} | null;
	if (!response.ok || body?.result !== true) {
		const detail = body?.message ?? body?.error_code ?? "unknown error";
		throw new Error(`SendPulse send failed (${response.status}): ${detail}`);
	}
	return body.id ?? "";
}
