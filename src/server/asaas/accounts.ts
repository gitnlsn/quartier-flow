import "server-only";

import { type AsaasList, asaasRequest } from "./client";

export type CompanyType = "LIMITED" | "ASSOCIATION" | "MEI" | "INDIVIDUAL";

export type CreateSubaccountInput = {
	name: string;
	email: string;
	cpfCnpj: string;
	companyType: CompanyType;
	mobilePhone: string;
	incomeValue: number;
	address: string;
	addressNumber: string;
	complement?: string;
	province: string;
	postalCode: string;
	/** Public webhook endpoint; omitted in local development. */
	webhook?: { url: string; authToken: string; email: string };
};

export type AsaasSubaccount = {
	id: string;
	walletId: string;
	/** Subaccount API key object. Returned only on creation. */
	accessToken?: { id?: string; apiKey?: string } | null;
};

/** The subaccount API key from a creation response, if present. */
export function subaccountApiKey(account: AsaasSubaccount): string | null {
	return account.accessToken?.apiKey ?? null;
}

/**
 * Finds a subaccount of our main account by CNPJ/CPF. Used to recover when a
 * previous creation succeeded on Asaas but wasn't saved here (e.g. timeout).
 */
export async function findSubaccountByCpfCnpj(cpfCnpj: string) {
	const found = await asaasRequest<AsaasList<AsaasSubaccount>>(
		"GET",
		`/accounts?cpfCnpj=${encodeURIComponent(cpfCnpj)}&limit=1`,
	);
	return found.data[0] ?? null;
}

/** Creates the administradora's receiving account (KYC happens on Asaas). */
export function createSubaccount(input: CreateSubaccountInput) {
	const { webhook, ...account } = input;
	return asaasRequest<AsaasSubaccount>("POST", "/accounts", {
		body: {
			...account,
			webhooks: webhook
				? [
						{
							name: "Quartier Flow",
							url: webhook.url,
							email: webhook.email,
							authToken: webhook.authToken,
							enabled: true,
							interrupted: false,
							sendType: "SEQUENTIALLY",
							events: [
								"ACCOUNT_STATUS_BANK_ACCOUNT_INFO_APPROVED",
								"ACCOUNT_STATUS_BANK_ACCOUNT_INFO_REJECTED",
								"ACCOUNT_STATUS_COMMERCIAL_INFO_APPROVED",
								"ACCOUNT_STATUS_COMMERCIAL_INFO_REJECTED",
								"ACCOUNT_STATUS_DOCUMENT_APPROVED",
								"ACCOUNT_STATUS_DOCUMENT_REJECTED",
								"ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED",
								"ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL",
								"ACCOUNT_STATUS_GENERAL_APPROVAL_PENDING",
								"ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED",
							],
						},
					]
				: undefined,
		},
	});
}

export type AccountStatus = {
	id: string;
	commercialInfo: string;
	bankAccountInfo: string;
	documentation: string;
	general: string; // PENDING | AWAITING_APPROVAL | APPROVED | REJECTED
};

/** KYC status, read with the subaccount's own key. */
export function getAccountStatus(subaccountApiKey: string) {
	return asaasRequest<AccountStatus>("GET", "/myAccount/status", {
		apiKey: subaccountApiKey,
	});
}

export type PendingDocuments = {
	data: {
		id: string;
		status: string;
		type: string;
		title?: string;
		description?: string;
		onboardingUrl?: string | null;
	}[];
};

/** Documents Asaas still needs (call >= 15 s after creating the account). */
export function getPendingDocuments(subaccountApiKey: string) {
	return asaasRequest<PendingDocuments>("GET", "/myAccount/documents", {
		apiKey: subaccountApiKey,
	});
}

/** Maps Asaas `general` status to ours. */
export function toKycStatus(general: string): string {
	switch (general) {
		case "APPROVED":
			return "approved";
		case "AWAITING_APPROVAL":
			return "awaiting_approval";
		case "REJECTED":
			return "rejected";
		default:
			return "pending";
	}
}
