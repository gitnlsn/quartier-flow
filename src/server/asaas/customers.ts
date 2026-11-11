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

/**
 * The administradora as a customer of our main account, billed for the
 * platform (docs/features/18). Same lookup-before-create as ensureCustomer,
 * keyed by "adm_<id>".
 */
export async function ensureAdministradoraCustomer(administradora: {
	id: string;
	name: string;
	email: string;
	cnpj: string;
	asaasCustomerId: string | null;
}): Promise<string> {
	if (administradora.asaasCustomerId) return administradora.asaasCustomerId;

	const externalReference = `adm_${administradora.id}`;
	const found = await asaasRequest<AsaasList<AsaasCustomer>>(
		"GET",
		`/customers?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
	);
	const customer =
		found.data[0] ??
		(await asaasRequest<AsaasCustomer>("POST", "/customers", {
			body: {
				name: administradora.name,
				email: administradora.email,
				cpfCnpj: administradora.cnpj,
				externalReference,
			},
		}));

	await db.administradora.update({
		where: { id: administradora.id },
		data: { asaasCustomerId: customer.id },
	});
	return customer.id;
}
