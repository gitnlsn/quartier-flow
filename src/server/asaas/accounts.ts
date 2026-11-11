import "server-only";

import { env } from "~/env";

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
	rejectReasons?: string | null;
	data: {
		id: string;
		status: string;
		type: string;
		title?: string;
		description?: string;
		onboardingUrl?: string | null;
		onboardingUrlExpirationDate?: string | null;
		responsible?: { name?: string; type?: string } | null;
	}[];
};

/** Company data as Asaas has it (the holder may edit it there). */
export type CommercialInfo = {
	companyType?: string | null;
	mobilePhone?: string | null;
	incomeValue?: number | null;
	postalCode?: string | null;
	address?: string | null;
	addressNumber?: string | null;
	complement?: string | null;
	province?: string | null;
};

export function getCommercialInfo(subaccountApiKey: string) {
	return asaasRequest<CommercialInfo>("GET", "/myAccount/commercialInfo", {
		apiKey: subaccountApiKey,
	});
}

/** True when the app talks to the Asaas Sandbox (test money, fake KYC). */
export const isAsaasSandbox = () => env.ASAAS_BASE_URL.includes("sandbox");

/**
 * Sandbox only: approves a subaccount, standing in for the KYC review that
 * the Sandbox can't do (its document upload is a fake). Called with the
 * subaccount's own key: the endpoint approves "the authenticated account".
 * https://docs.asaas.com/reference/approve-account
 */
export function approveSandboxSubaccount(subaccountApiKey: string) {
	if (!isAsaasSandbox()) {
		throw new Error("approveSandboxSubaccount is only allowed in the Sandbox");
	}
	return asaasRequest<AccountStatus>("POST", "/sandbox/myAccount/approve", {
		apiKey: subaccountApiKey,
		body: {},
	});
}

/**
 * Where the account holder logs into Asaas to send documents that have no
 * onboarding link (e.g. the partners' identification, which the API refuses).
 */
export const asaasLoginUrl = () =>
	isAsaasSandbox()
		? "https://sandbox.asaas.com/login/auth"
		: "https://www.asaas.com/login/auth";

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
