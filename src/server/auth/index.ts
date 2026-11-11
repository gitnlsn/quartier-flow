import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";

import { env } from "~/env";
import { db } from "~/server/db";
import { deliver, sendEmail } from "./messaging";

const MAGIC_LINK_TTL_SECONDS = 15 * 60;

/**
 * Passwordless, invitation-only authentication.
 *
 * - Users sign in with a one-time link sent to their email, or with Google.
 *   No passwords. (Google sign-in does not work inside the Android WebView.)
 * - Sign-up is disabled: accounts are created by an invitation (síndico /
 *   administradora), never by the person requesting a link.
 * - Account recovery = an authorized person updates the email, which must also
 *   revoke all sessions of that user (see docs/features/01).
 */
export const auth = betterAuth({
	appName: "Quartier Flow",
	baseURL: env.BETTER_AUTH_URL,
	secret: env.AUTH_SECRET,
	database: prismaAdapter(db, { provider: "postgresql", transaction: true }),

	socialProviders: {
		google: {
			clientId: env.AUTH_GOOGLE_ID,
			clientSecret: env.AUTH_GOOGLE_SECRET,
			// Invitation-only: Google can sign in existing users, never create them.
			disableSignUp: true,
			prompt: "select_account",
		},
	},

	account: {
		accountLinking: {
			// An invited user who picks "Entrar com Google" is linked to their
			// existing account when Google confirms the same email.
			enabled: true,
			allowDifferentEmails: false,
		},
	},

	session: {
		// Passwordless users should not need a new link every day.
		expiresIn: 30 * 24 * 60 * 60, // 30 days
		updateAge: 24 * 60 * 60, // extend at most once a day while active
	},

	rateLimit: {
		enabled: env.NODE_ENV === "production",
		// Serverless instances don't share memory, so keep counters in Postgres.
		storage: "database",
		customRules: {
			"/sign-in/magic-link": { window: 60, max: 3 },
			"/magic-link/verify": { window: 60, max: 10 },
		},
	},

	plugins: [
		magicLink({
			disableSignUp: true,
			expiresIn: MAGIC_LINK_TTL_SECONDS,
			storeToken: "hashed",
			async sendMagicLink({ email, token }) {
				// Only registered users get an email. The endpoint answers the same
				// way either way, so this doesn't reveal which emails exist.
				const user = await db.user.findUnique({
					where: { email: email.toLowerCase() },
					select: { id: true },
				});
				if (!user) return;

				// Link to our own confirmation page instead of the verify endpoint:
				// email scanners that pre-open links would otherwise consume the
				// one-time token before the person clicks it.
				const url = new URL("/entrar/confirmar", env.BETTER_AUTH_URL);
				url.searchParams.set("token", token);

				deliver(
					sendEmail({
						to: email,
						subject: "Seu link de acesso ao Quartier Flow",
						text: [
							"Olá! Clique no link abaixo para entrar no Quartier Flow:",
							"",
							url.toString(),
							"",
							`O link expira em ${MAGIC_LINK_TTL_SECONDS / 60} minutos e só pode ser usado uma vez.`,
							"Se você não pediu este acesso, ignore este email.",
						].join("\n"),
					}),
				);
			},
		}),
		// Must stay last: lets server actions set auth cookies.
		nextCookies(),
	],
});

export type Session = typeof auth.$Infer.Session;

/** Current session for Server Components and route handlers (deduped per request). */
export const getSession = cache(async () =>
	auth.api.getSession({ headers: await headers() }),
);
