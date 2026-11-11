import "server-only";

import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

import { env } from "~/env";

/**
 * Neon Object Storage: the private "attachments" bucket declared in neon.ts.
 * Every Neon branch has its own copy, so a preview branch's rows and files
 * stay in sync. Store object keys in Postgres, never URLs: read access goes
 * through short-lived signed URLs created after an access check.
 */
export const attachments = new Files({
	adapter: neon({
		bucket: "attachments",
		endpoint: env.AWS_ENDPOINT_URL_S3,
		region: env.AWS_REGION,
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	}),
});

/** Signed links only need to survive the redirect that follows the access check. */
export const SIGNED_URL_TTL_SECONDS = 5 * 60;
