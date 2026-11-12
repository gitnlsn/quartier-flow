import "server-only";

import { audit } from "~/server/audit";
import { db } from "~/server/db";
import { toKycStatus } from "./accounts";
import { reaisToCents } from "./client";
import type { AsaasPayment } from "./payments";

export type AsaasEvent = {
	id: string;
	event: string;
	dateCreated?: string;
	payment?: AsaasPayment;
	account?: { id: string };
	accountStatus?: { id?: string; general?: string };
};

/** Charge status for each payment event (docs/features/17). */
const PAYMENT_STATUS: Record<string, string> = {
	PAYMENT_CREATED: "pending",
	PAYMENT_CONFIRMED: "confirmed",
	PAYMENT_RECEIVED: "received",
	PAYMENT_OVERDUE: "overdue",
	PAYMENT_DELETED: "canceled",
	PAYMENT_REFUNDED: "refunded",
	PAYMENT_PARTIALLY_REFUNDED: "refunded",
	PAYMENT_RECEIVED_IN_CASH_UNDONE: "pending",
};

const ACCOUNT_GENERAL: Record<string, string> = {
	ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED: "APPROVED",
	ACCOUNT_STATUS_GENERAL_APPROVAL_AWAITING_APPROVAL: "AWAITING_APPROVAL",
	ACCOUNT_STATUS_GENERAL_APPROVAL_PENDING: "PENDING",
	ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED: "REJECTED",
};

/** Don't let an old event move a paid charge back (events may be redelivered). */
const FINAL_PAID = new Set(["received", "refunded"]);

async function handlePayment(event: AsaasEvent) {
	const payment = event.payment;
	if (!payment) return;
	let status = PAYMENT_STATUS[event.event];
	if (event.event === "PAYMENT_RESTORED") {
		// A restored past-due payment comes back as OVERDUE.
		status = payment.status === "OVERDUE" ? "overdue" : "pending";
	}
	if (event.event === "PAYMENT_UPDATED") status = undefined;

	const charge = await db.charge.findFirst({
		where: {
			OR: [
				{ asaasPaymentId: payment.id },
				...(payment.externalReference
					? [{ id: payment.externalReference }]
					: []),
			],
		},
	});
	if (!charge) {
		await handlePlatformInvoicePayment(payment, status);
		return;
	}

	if (status && FINAL_PAID.has(charge.status) && status !== "refunded") {
		status = undefined;
	}
	// Replaced by an acordo or forgiven (docs/features/04): we deleted it on
	// Asaas ourselves, so its events (PAYMENT_DELETED, late OVERDUE) change nothing.
	if (charge.status === "renegotiated" || charge.status === "forgiven") return;
	// A late PAYMENT_OVERDUE must not revive a deleted charge.
	if (charge.status === "canceled" && status === "overdue") status = undefined;
	const paid = status === "confirmed" || status === "received";
	await db.charge.update({
		where: { id: charge.id },
		data: {
			asaasPaymentId: payment.id,
			invoiceUrl: payment.invoiceUrl ?? charge.invoiceUrl,
			// Asaas is the source of truth for the due date (it can change on
			// PAYMENT_UPDATED, e.g. a renegotiated due date).
			...(payment.dueDate
				? { dueDate: new Date(`${payment.dueDate}T00:00:00Z`) }
				: {}),
			...(status ? { status } : {}),
			...(paid
				? {
						paidAt: new Date(
							payment.clientPaymentDate ?? payment.paymentDate ?? Date.now(),
						),
						paidAmountCents: reaisToCents(payment.value),
					}
				: {}),
			...(payment.netValue !== undefined && paid
				? { feeCents: reaisToCents(payment.value - payment.netValue) }
				: {}),
		},
	});
}

/** Charge status -> PlatformInvoice status (docs/features/18). */
const INVOICE_STATUS: Record<string, string> = {
	pending: "pending",
	confirmed: "paid",
	received: "paid",
	overdue: "overdue",
	canceled: "canceled",
	refunded: "canceled",
};

/** Our Quartier Flow invoice to an administradora, if the payment is one. */
async function handlePlatformInvoicePayment(
	payment: NonNullable<AsaasEvent["payment"]>,
	chargeStatus: string | undefined,
) {
	const invoice = await db.platformInvoice.findFirst({
		where: {
			OR: [
				{ asaasPaymentId: payment.id },
				...(payment.externalReference
					? [{ id: payment.externalReference }]
					: []),
			],
		},
	});
	if (!invoice) return; // not ours (other systems on the same account)

	let status = chargeStatus ? INVOICE_STATUS[chargeStatus] : undefined;
	// A paid invoice only moves back on a refund or cancellation.
	if (invoice.status === "paid" && status !== "canceled") status = undefined;
	await db.platformInvoice.update({
		where: { id: invoice.id },
		data: {
			asaasPaymentId: payment.id,
			invoiceUrl: payment.invoiceUrl ?? invoice.invoiceUrl,
			...(payment.dueDate
				? { dueDate: new Date(`${payment.dueDate}T12:00:00Z`) }
				: {}),
			...(status ? { status } : {}),
			...(status === "paid"
				? {
						paidAt: new Date(
							payment.clientPaymentDate ?? payment.paymentDate ?? Date.now(),
						),
					}
				: {}),
		},
	});
	if (status && status !== invoice.status) {
		await audit({
			administradoraId: invoice.administradoraId,
			actorUserId: null,
			action: `platform_invoice.${status}`,
			entity: "platform_invoice",
			entityId: invoice.id,
		});
	}
}

async function handleAccountStatus(event: AsaasEvent) {
	const general = ACCOUNT_GENERAL[event.event];
	const accountId = event.account?.id ?? event.accountStatus?.id;
	if (!general || !accountId) return;
	const payout = await db.payoutAccount.findUnique({
		where: { asaasAccountId: accountId },
	});
	if (!payout) return;
	await db.payoutAccount.update({
		where: { id: payout.id },
		data: { kycStatus: toKycStatus(general) },
	});
	await audit({
		administradoraId: payout.administradoraId,
		actorUserId: null,
		action: "payout_account.kyc_status",
		entity: "payout_account",
		entityId: payout.asaasAccountId,
		data: { event: event.event },
	});
}

/** Processes a stored event once; records errors for later inspection. */
export async function processWebhookEvent(eventId: string) {
	const stored = await db.webhookEvent.findUnique({ where: { id: eventId } });
	if (!stored || stored.status === "processed") return;
	const event = stored.payload as unknown as AsaasEvent;
	try {
		if (event.event.startsWith("PAYMENT_")) await handlePayment(event);
		else if (event.event.startsWith("ACCOUNT_STATUS_")) {
			await handleAccountStatus(event);
		}
		await db.webhookEvent.update({
			where: { id: eventId },
			data: { status: "processed", processedAt: new Date(), error: null },
		});
	} catch (error) {
		console.error(`[asaas] webhook ${eventId} failed`, error);
		await db.webhookEvent.update({
			where: { id: eventId },
			data: {
				status: "error",
				error: error instanceof Error ? error.message : String(error),
			},
		});
	}
}
