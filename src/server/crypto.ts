import "server-only";

import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";

import { env } from "~/env";

/**
 * AES-256-GCM encryption for secrets stored in the database (e.g. Asaas
 * subaccount API keys). Key derived from AUTH_SECRET: rotating AUTH_SECRET makes
 * stored values unreadable, so re-create those secrets after a rotation.
 */
function key(): Buffer {
	const secret = env.AUTH_SECRET;
	if (!secret) throw new Error("AUTH_SECRET is required to encrypt secrets");
	return createHash("sha256")
		.update(`quartier-flow:secrets:${secret}`)
		.digest();
}

export function encryptSecret(plain: string): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key(), iv);
	const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return ["v1", iv, tag, data]
		.map((part) =>
			typeof part === "string" ? part : part.toString("base64url"),
		)
		.join(".");
}

export function decryptSecret(stored: string): string {
	const [version, iv, tag, data] = stored.split(".");
	if (version !== "v1" || !iv || !tag || !data) {
		throw new Error("Unsupported secret format");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key(),
		Buffer.from(iv, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tag, "base64url"));
	return Buffer.concat([
		decipher.update(Buffer.from(data, "base64url")),
		decipher.final(),
	]).toString("utf8");
}
