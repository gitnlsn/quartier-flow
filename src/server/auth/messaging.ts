import "server-only";

/**
 * Delivery of auth messages (verification links, password reset, OTP codes).
 *
 * No email or SMS provider has been chosen yet. In development, messages are
 * printed to the server console so every flow can be tested locally. In
 * production, sending fails loudly instead of silently dropping codes.
 *
 * TODO: wire a real email provider and SMS provider here.
 */

type EmailMessage = { to: string; subject: string; text: string };
type SmsMessage = { to: string; text: string };

const isProduction = process.env.NODE_ENV === "production";

export async function sendEmail(message: EmailMessage): Promise<void> {
	if (isProduction) {
		throw new Error("Email provider not configured");
	}
	console.info(
		`\n[auth:email] to=${message.to}\nsubject: ${message.subject}\n${message.text}\n`,
	);
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
 */
export function deliver(send: Promise<void>): void {
	send.catch((error: unknown) => {
		console.error("[auth] message delivery failed", error);
	});
}
