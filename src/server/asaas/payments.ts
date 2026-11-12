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
	/** Our Charge.id or PlatformInvoice.id: makes creation idempotent. */
	externalReference: string;
	finePercent?: number;
	interestPercent?: number;
	/**
	 * Administradora wallet: receives 100% of the net value (docs/features/17).
	 * Omitted for platform invoices, which stay in our main account.
	 */
	splitWalletId?: string;
};

async function findByExternalReference(externalReference: string) {
	const found = await asaasRequest<AsaasList<AsaasPayment>>(
		"GET",
		`/payments?externalReference=${encodeURIComponent(externalReference)}&limit=1`,
	);
	return found.data[0] ?? null;
}

/**
 * Creates a boleto (with Pix QR when the account has a Pix key), split to the
 * administradora when `splitWalletId` is given. Safe to retry: an existing payment with the same
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
				...(input.finePercent !== undefined && {
					fine: { value: input.finePercent },
				}),
				...(input.interestPercent !== undefined && {
					interest: { value: input.interestPercent },
				}),
				...(input.splitWalletId && {
					split: [{ walletId: input.splitWalletId, percentualValue: 100 }],
				}),
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

/**
 * Deletes (cancels) a payment on Asaas; triggers PAYMENT_DELETED. Not a
 * refund: only for unpaid payments. A payment already gone counts as done.
 */
export async function deletePayment(paymentId: string): Promise<void> {
	try {
		await asaasRequest<{ deleted: boolean; id: string }>(
			"DELETE",
			`/payments/${encodeURIComponent(paymentId)}`,
		);
	} catch (error) {
		if (error instanceof AsaasError && error.status === 404) return;
		throw error;
	}
}

/** Restores a payment deleted with `deletePayment` (POST /payments/{id}/restore). */
export async function restorePayment(paymentId: string): Promise<AsaasPayment> {
	return asaasRequest<AsaasPayment>(
		"POST",
		`/payments/${encodeURIComponent(paymentId)}/restore`,
	);
}
