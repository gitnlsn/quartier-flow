import "server-only";

import { db } from "~/server/db";
import { type AsaasList, asaasRequest } from "./client";

type AsaasCustomer = { id: string; externalReference?: string | null };

/**
 * Returns the Asaas customer for a user, creating it once. Asaas allows
 * duplicate customers, so we key on our user id (externalReference) and
 * look it up before creating, which also makes retries after a timeout safe.
 */
export async function ensureCustomer(user: {
	id: string;
	name: string;
	email: string;
	cpf: string;
}): Promise<string> {
	const existing = await db.paymentCustomer.findUnique({
		where: { userId: user.id },
		select: { asaasCustomerId: true },
	});
	if (existing) return existing.asaasCustomerId;

	const found = await asaasRequest<AsaasList<AsaasCustomer>>(
		"GET",
		`/customers?externalReference=${encodeURIComponent(user.id)}&limit=1`,
	);
	const customer =
		found.data[0] ??
		(await asaasRequest<AsaasCustomer>("POST", "/customers", {
			body: {
				name: user.name || user.email,
				email: user.email,
				cpfCnpj: user.cpf,
				externalReference: user.id,
			},
		}));

	await db.paymentCustomer.upsert({
		where: { userId: user.id },
		update: { asaasCustomerId: customer.id },
		create: { userId: user.id, asaasCustomerId: customer.id },
	});
	return customer.id;
}
