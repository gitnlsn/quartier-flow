import "server-only";

import { env } from "~/env";

/** Error returned by the Asaas API, with its error codes/descriptions. */
export class AsaasError extends Error {
	constructor(
		readonly status: number,
		readonly errors: { code?: string; description?: string }[],
		readonly path: string,
	) {
		super(
			`Asaas ${status} on ${path}: ${
				errors.map((e) => e.description ?? e.code).join("; ") || "no details"
			}`,
		);
		this.name = "AsaasError";
	}

	/** Human-readable message for the management area (Portuguese from Asaas). */
	get userMessage(): string {
		return (
			this.errors
				.map((e) => e.description)
				.filter(Boolean)
				.join(" ") || "Erro ao comunicar com o Asaas."
		);
	}
}

type Method = "GET" | "POST" | "PUT" | "DELETE";

/**
 * Minimal Asaas REST client (https://docs.asaas.com).
 * Uses the main account key unless `apiKey` is given (e.g. a subaccount key).
 */
export async function asaasRequest<T>(
	method: Method,
	path: string,
	options: { body?: unknown; apiKey?: string; timeoutMs?: number } = {},
): Promise<T> {
	const response = await fetch(`${env.ASAAS_BASE_URL}${path}`, {
		method,
		headers: {
			"Content-Type": "application/json",
			"User-Agent": "quartier-flow",
			access_token: options.apiKey ?? env.ASAAS_API_KEY,
		},
		body: options.body === undefined ? undefined : JSON.stringify(options.body),
		signal: AbortSignal.timeout(options.timeoutMs ?? 20_000),
		cache: "no-store",
	});

	const text = await response.text();
	const json = text ? (JSON.parse(text) as unknown) : null;

	if (!response.ok) {
		const errors =
			json && typeof json === "object" && "errors" in json
				? ((json as { errors: { code?: string; description?: string }[] })
						.errors ?? [])
				: [];
		throw new AsaasError(response.status, errors, path);
	}

	return json as T;
}

export type AsaasList<T> = {
	object: "list";
	hasMore: boolean;
	totalCount: number;
	limit: number;
	offset: number;
	data: T[];
};

/** Asaas works in BRL decimals; we store integer cents. */
export const centsToReais = (cents: number) => Math.round(cents) / 100;
export const reaisToCents = (reais: number) => Math.round(reais * 100);
