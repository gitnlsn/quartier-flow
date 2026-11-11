import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { headers } from "next/headers";
import { cache } from "react";

import { env } from "~/env";
import { safeNextPath } from "~/lib/next-path";
import { db } from "~/server/db";
import { deliver, sendEmail } from "./messaging";

const MAGIC_LINK_TTL_SECONDS = 15 * 60;

/**
 * Passwordless authentication, open to everyone (docs/features/01).
 *
 * - Users sign in with a one-time link sent to their email, or with Google.
 *   No passwords. (Google sign-in does not work inside the Android WebView.)
 * - Sign-up is open: the first sign-in creates the account. A new account has
 *   no role; /painel welcomes it and offers the administradora onboarding
 *   (/painel/comecar). Residents and síndicos still get access by invitation.
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
			// Open sign-up: a new Google account creates a user (no role yet).
			disableSignUp: false,
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
			disableSignUp: false,
			expiresIn: MAGIC_LINK_TTL_SECONDS,
			storeToken: "hashed",
			async sendMagicLink({ email, token, url: verifyUrl }) {
				// Open sign-up: any email gets a link; verifying it creates the
				// account when needed. Rate limits (below) curb abuse.
				const existing = await db.user.findUnique({
					where: { email: email.toLowerCase() },
					select: { id: true },
				});

				// Link to our own confirmation page instead of the verify endpoint:
				// email scanners that pre-open links would otherwise consume the
				// one-time token before the person clicks it.
				const url = new URL("/entrar/confirmar", env.BETTER_AUTH_URL);
				url.searchParams.set("token", token);
				const next = safeNextPath(
					new URL(verifyUrl).searchParams.get("callbackURL"),
				);
				if (next) url.searchParams.set("next", next);

				deliver(
					sendEmail({
						to: email,
						subject: existing
							? "Seu link de acesso ao Quartier Flow"
							: "Crie sua conta no Quartier Flow",
						text: [
							existing
								? "Olá! Clique no link abaixo para entrar no Quartier Flow:"
								: "Olá! Clique no link abaixo para criar sua conta no Quartier Flow:",
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
