import "server-only";

import {
	AsaasError,
	type AsaasList,
	asaasRequest,
	centsToReais,
} from "./client";

export type AsaasPayment = {
	id: string;
	status: string;
	value: number;
	netValue?: number;
	invoiceUrl: string;
	bankSlipUrl?: string | null;
	externalReference?: string | null;
	paymentDate?: string | null;
	clientPaymentDate?: string | null;
	dueDate: string;
	deleted?: boolean;
};

export type CreatePaymentInput = {
	customerId: string;
	amountCents: number;
	dueDate: string; // YYYY-MM-DD
	description: string;
	/** Our Charge.id: makes creation idempotent. */
	externalReference: string;
	finePercent: number;
	interestPercent: number;
	/** Administradora wallet: receives 100% of the net value (docs/features/17). */
	splitWalletId: string;
};

async function findByExternalReference(externalReference: string) {
	const found = await asaasRequest<AsaasList<AsaasPayment>>(
		"GET",
		`/payments?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
	);
	return found.data[0] ?? null;
}

/**
 * Creates a boleto (with Pix QR when the account has a Pix key) split to the
 * administradora. Safe to retry: an existing payment with the same
 * externalReference is returned instead of creating a duplicate.
 */
export async function createPayment(
	input: CreatePaymentInput,
): Promise<AsaasPayment> {
	const existing = await findByExternalReference(input.externalReference);
	if (existing && !existing.deleted) return existing;

	try {
		return await asaasRequest<AsaasPayment>("POST", "/payments", {
			body: {
				customer: input.customerId,
				billingType: "BOLETO",
				value: centsToReais(input.amountCents),
				dueDate: input.dueDate,
				description: input.description,
				externalReference: input.externalReference,
				fine: { value: input.finePercent },
				interest: { value: input.interestPercent },
				split: [{ walletId: input.splitWalletId, percentualValue: 100 }],
			},
		});
	} catch (error) {
		// Timeout/network error: the payment may have been created anyway.
		if (!(error instanceof AsaasError)) {
			const created = await findByExternalReference(input.externalReference);
			if (created) return created;
		}
		throw error;
	}
}
