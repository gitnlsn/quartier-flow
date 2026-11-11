import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
	/**
	 * Specify your server-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars.
	 */
	server: {
		AUTH_SECRET:
			process.env.NODE_ENV === "production"
				? z.string()
				: z.string().optional(),

		// Public origin of the app, used in sign-in links (e.g. http://localhost:3000).
		BETTER_AUTH_URL: z.string().url(),

		// Google sign-in. Redirect URI: <BETTER_AUTH_URL>/api/auth/callback/google
		AUTH_GOOGLE_ID: z.string(),
		AUTH_GOOGLE_SECRET: z.string(),

		// Asaas (docs/features/17). In .env, escape the key's leading "$" as "\$".
		ASAAS_API_KEY: z.string().startsWith("$aact_"),
		ASAAS_BASE_URL: z
			.string()
			.url()
			.default("https://api-sandbox.asaas.com/v3"),
		// Sent by Asaas in the "asaas-access-token" header of every webhook.
		ASAAS_WEBHOOK_TOKEN: z.string().min(32).max(255),
		// Public URL of /api/webhooks/asaas (unset locally: no public URL to call).
		ASAAS_WEBHOOK_URL: z.string().url().optional(),
		// Protects /api/cron/* (Vercel Cron sends "Authorization: Bearer <secret>").
		CRON_SECRET: z.string().min(16),

		DATABASE_URL: z.string().url(),

		// Neon Object Storage (S3-compatible), pulled by `neon env pull` / `neon deploy`.
		AWS_ACCESS_KEY_ID: z.string(),
		AWS_SECRET_ACCESS_KEY: z.string(),
		AWS_ENDPOINT_URL_S3: z.string().url(),
		AWS_REGION: z.string(),

		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),
	},

	/**
	 * Specify your client-side environment variables schema here. This way you can ensure the app
	 * isn't built with invalid env vars. To expose them to the client, prefix them with
	 * `NEXT_PUBLIC_`.
	 */
	client: {
		// NEXT_PUBLIC_CLIENTVAR: z.string(),
	},

	/**
	 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
	 * middlewares) or client-side so we need to destruct manually.
	 */
	runtimeEnv: {
		AUTH_SECRET: process.env.AUTH_SECRET,

		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
		AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
		AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,

		ASAAS_API_KEY: process.env.ASAAS_API_KEY,
		ASAAS_BASE_URL: process.env.ASAAS_BASE_URL,
		ASAAS_WEBHOOK_TOKEN: process.env.ASAAS_WEBHOOK_TOKEN,
		ASAAS_WEBHOOK_URL: process.env.ASAAS_WEBHOOK_URL,
		CRON_SECRET: process.env.CRON_SECRET,

		DATABASE_URL: process.env.DATABASE_URL,

		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_ENDPOINT_URL_S3: process.env.AWS_ENDPOINT_URL_S3,
		AWS_REGION: process.env.AWS_REGION,

		NODE_ENV: process.env.NODE_ENV,
	},
	/**
	 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
	 * useful for Docker builds.
	 */
	skipValidation: !!process.env.SKIP_ENV_VALIDATION,
	/**
	 * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
	 * `SOME_VAR=''` will throw an error.
	 */
	emptyStringAsUndefined: true,
});
