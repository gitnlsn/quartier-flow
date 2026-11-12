import "server-only";

import type { Prisma } from "@prisma/client";

import { addMonths, itemForPeriod } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import { spMonth } from "~/lib/reservations";
import { AsaasError } from "~/server/asaas/client";
import { ensureCustomer } from "~/server/asaas/customers";
import {
	type ReminderSettings,
	applyReminders,
	reminderSettings,
} from "~/server/asaas/notifications";
import { createPayment } from "~/server/asaas/payments";
import { audit } from "~/server/audit";
import { db } from "~/server/db";

type LineDraft = {
	kind: "shared" | "individual";
	sourceId: string;
	name: string;
	description: string | null;
	installment: string | null;
	amountCents: number;
};

/** Boleto description with the item breakdown (Asaas limit: 500 chars). */
function asaasDescription(
	title: string,
	lines: { name: string; installment: string | null; amountCents: number }[],
) {
	const items = lines
		.map(
			(line) =>
				`${line.name}${line.installment ? ` (${line.installment})` : ""}: ${formatBRL(line.amountCents)}`,
		)
		.join("; ");
	const text = items ? `${title}. ${items}` : title;
	return text.length > 500 ? `${text.slice(0, 497)}...` : text;
}

export class BillingError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BillingError";
	}
}

/** "2026-12" for a Date (UTC). */
export const periodOf = (date: Date) => date.toISOString().slice(0, 7);

/** Due date (UTC midnight) for a period and due day. */
export function dueDateFor(period: string, dueDay: number) {
	const [year, month] = period.split("-").map(Number);
	return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, dueDay));
}

const todayUtc = () => {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
};

const unitLabel = (unit: { block: string; number: string }) =>
	unit.block ? `${unit.block}-${unit.number}` : unit.number;

/**
 * First month whose monthly charge can still take a new item: the one after
 * the latest run already sent, and never a month whose due date has passed
 * (sendRun refuses those). An item starting in a month that will never be
 * sent would silently never be billed.
 */
export async function nextOpenPeriod(
	tx: Prisma.TransactionClient,
	condominiumId: string,
) {
	const now = new Date();
	const config = await tx.billingConfig.findUnique({
		where: { condominiumId },
		select: { dueDay: true },
	});
	const thisMonth = spMonth(now);
	const pastDue =
		config !== null && dueDateFor(thisMonth, config.dueDay) < todayUtc();
	const current = pastDue ? addMonths(thisMonth, 1) : thisMonth;
	const latestSent = await tx.billingRun.findFirst({
		where: { condominiumId, status: { not: "draft" } },
		orderBy: { period: "desc" },
		select: { period: true },
	});
	const next = latestSent ? addMonths(latestSent.period, 1) : current;
	return next > current ? next : current;
}

/** Keeps a draft monthly run in sync after a unit item was added or removed. */
export async function refreshDraftRun(
	condominiumId: string,
	period: string,
	actorUserId: string,
) {
	const run = await db.billingRun.findUnique({
		where: { condominiumId_period: { condominiumId, period } },
		select: { status: true },
	});
	if (run?.status !== "draft") return;
	await prepareRun({ condominiumId, period, actorUserId }).catch((error) => {
		console.error("[billing] draft run refresh failed", error);
	});
}

export type SendContext = {
	walletId: string;
	finePercent: number;
	interestPercent: number;
	reminders: ReminderSettings;
};

/** Context for sending charges of a condominium, or a BillingError. */
export async function sendContext(condominiumId: string): Promise<SendContext> {
	const condo = await db.condominium.findUniqueOrThrow({
		where: { id: condominiumId },
		include: {
			billingConfig: true,
			administradora: { include: { payoutAccount: true } },
		},
	});
	const payout = condo.administradora.payoutAccount;
	if (!payout || payout.kycStatus !== "approved") {
		throw new BillingError(
			"A conta de recebimento da administradora ainda não foi aprovada pelo Asaas.",
		);
	}
	const config = condo.billingConfig;
	if (!config) throw new BillingError("Cobrança mensal não configurada.");
	return {
		walletId: payout.walletId,
		finePercent: Number(config.finePercent),
		interestPercent: Number(config.interestPercent),
		reminders: reminderSettings(config),
	};
}

/**
 * Issues one draft charge on Asaas: a boleto (with Pix) split 100% (net) to
 * the administradora wallet. Sets the charge to `pending`, or `failed` with
 * the reason. Returns whether it was sent.
 */
export async function sendCharge(
	charge: {
		id: string;
		payerUserId: string | null;
		amountCents: number;
		dueDate: Date;
		description: string;
		lines: { name: string; installment: string | null; amountCents: number }[];
	},
	ctx: SendContext,
): Promise<boolean> {
	try {
		if (!charge.payerUserId) {
			throw new BillingError("Unidade sem responsável financeiro");
		}
		const payer = await db.user.findUniqueOrThrow({
			where: { id: charge.payerUserId },
			select: { id: true, name: true, email: true, cpf: true },
		});
		if (!payer.cpf) throw new BillingError("Responsável financeiro sem CPF");
		const customerId = await ensureCustomer({ ...payer, cpf: payer.cpf });
		await applyReminders(
			{ userId: payer.id, asaasCustomerId: customerId },
			ctx.reminders,
		);
		const payment = await createPayment({
			customerId,
			amountCents: charge.amountCents,
			dueDate: charge.dueDate.toISOString().slice(0, 10),
			description: asaasDescription(charge.description, charge.lines),
			externalReference: charge.id,
			finePercent: ctx.finePercent,
			interestPercent: ctx.interestPercent,
			splitWalletId: ctx.walletId,
		});
		await db.charge.update({
			where: { id: charge.id },
			data: {
				status: "pending",
				issue: null,
				asaasPaymentId: payment.id,
				invoiceUrl: payment.invoiceUrl,
				bankSlipUrl: payment.bankSlipUrl ?? null,
			},
		});
		return true;
	} catch (error) {
		const message =
			error instanceof AsaasError
				? error.userMessage
				: error instanceof Error
					? error.message
					: "Erro desconhecido";
		console.error(`[billing] charge ${charge.id} failed`, error);
		await db.charge.update({
			where: { id: charge.id },
			data: { status: "failed", issue: message },
		});
		return false;
	}
}

/**
 * Builds (or rebuilds, while still a draft) the run for a period: one charge per
 * unit with its amount and payer, plus an `issue` explaining anything that
 * prevents sending. This is what the administradora audits before sending.
 */
export async function prepareRun(input: {
	condominiumId: string;
	period: string;
	actorUserId: string | null;
}) {
	const condo = await db.condominium.findUniqueOrThrow({
		where: { id: input.condominiumId },
		include: {
			billingConfig: true,
			billingItems: {
				where: { archivedAt: null },
				orderBy: { createdAt: "asc" },
				include: { overrides: true },
			},
			units: {
				orderBy: [{ block: "asc" }, { number: "asc" }],
				include: {
					memberships: {
						where: { endedAt: null, financiallyResponsible: true },
						include: { user: { select: { id: true, cpf: true } } },
						take: 1,
					},
					items: {
						where: { archivedAt: null },
						orderBy: { createdAt: "asc" },
					},
				},
			},
		},
	});
	const config = condo.billingConfig;
	if (!config) {
		throw new BillingError(
			"Configure a cobrança mensal deste condomínio primeiro.",
		);
	}

	const existing = await db.billingRun.findUnique({
		where: {
			condominiumId_period: {
				condominiumId: condo.id,
				period: input.period,
			},
		},
	});
	if (existing && existing.status !== "draft") return existing;

	const dueDate = dueDateFor(input.period, config.dueDay);
	const [year, month] = input.period.split("-");
	const description = `Condomínio ${month}/${year} - ${condo.name}`;

	// Items of each unit for this period: shared (with per-unit exception)
	// then the unit's own items. Copied into ChargeLine as a snapshot.
	const plan = condo.units.map((unit) => {
		const lines: LineDraft[] = [];
		for (const item of condo.billingItems) {
			const applies = itemForPeriod(item, input.period);
			if (!applies) continue;
			const override = item.overrides.find((o) => o.unitId === unit.id);
			lines.push({
				kind: "shared",
				sourceId: item.id,
				name: item.name,
				description: item.description,
				installment: applies.installment,
				amountCents: override?.amountCents ?? item.amountCents,
			});
		}
		for (const item of unit.items) {
			const applies = itemForPeriod(item, input.period);
			if (!applies) continue;
			lines.push({
				kind: "individual",
				sourceId: item.id,
				name: item.name,
				description: item.description,
				installment: applies.installment,
				amountCents: item.amountCents,
			});
		}
		const amountCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
		const payer = unit.memberships[0]?.user;
		const issue =
			lines.length === 0
				? "Nenhum item de cobrança neste mês"
				: amountCents <= 0
					? "Valor total da unidade é zero"
					: !payer
						? "Unidade sem responsável financeiro"
						: !payer.cpf
							? "Responsável financeiro sem CPF"
							: null;
		return { unit, lines, amountCents, payer, issue };
	});

	const run = await db.$transaction(async (tx) => {
		const saved = existing
			? await tx.billingRun.update({
					where: { id: existing.id },
					data: { mode: config.mode, dueDate },
				})
			: await tx.billingRun.create({
					data: {
						condominiumId: condo.id,
						period: input.period,
						mode: config.mode,
						dueDate,
					},
				});
		await tx.charge.deleteMany({ where: { runId: saved.id, status: "draft" } });

		for (const entry of plan) {
			await tx.charge.create({
				data: {
					condominiumId: condo.id,
					unitId: entry.unit.id,
					runId: saved.id,
					payerUserId: entry.payer?.id ?? null,
					type: "monthly",
					description: `${description} - Unidade ${unitLabel(entry.unit)}`,
					amountCents: entry.amountCents,
					dueDate,
					status: "draft",
					issue: entry.issue,
					lines: { create: entry.lines },
				},
			});
		}
		return saved;
	});

	await audit({
		administradoraId: condo.administradoraId,
		actorUserId: input.actorUserId,
		action: existing ? "billing_run.rebuild" : "billing_run.prepare",
		entity: "billing_run",
		entityId: run.id,
		data: { period: input.period, units: condo.units.length },
	});
	return run;
}

/**
 * Sends a draft run to Asaas. Charges with an `issue` are skipped; each sent
 * charge is a boleto (with Pix) split 100% (net) to the administradora wallet.
 * `actorUserId` null = sent automatically.
 */
export async function sendRun(input: {
	runId: string;
	actorUserId: string | null;
}) {
	const run = await db.billingRun.findUniqueOrThrow({
		where: { id: input.runId },
		include: { condominium: { select: { administradoraId: true } } },
	});
	if (run.status !== "draft") {
		throw new BillingError("Esta execução já foi enviada.");
	}
	const ctx = await sendContext(run.condominiumId);
	if (run.dueDate < todayUtc()) {
		throw new BillingError(
			"A data de vencimento já passou. Ajuste o dia de vencimento e prepare novamente.",
		);
	}

	// Claim the run so two senders (cron + click) can't send it twice.
	const claimed = await db.billingRun.updateMany({
		where: { id: run.id, status: "draft" },
		data: {
			status: "sending",
			approvedById: input.actorUserId,
			approvedAt: new Date(),
		},
	});
	if (claimed.count === 0)
		throw new BillingError("Esta execução já está sendo enviada.");

	const charges = await db.charge.findMany({
		where: { runId: run.id, status: "draft" },
		include: { lines: { orderBy: { createdAt: "asc" } } },
	});
	let sent = 0;
	let failed = 0;
	let skipped = 0;

	for (const charge of charges) {
		if (charge.issue || !charge.payerUserId) {
			await db.charge.update({
				where: { id: charge.id },
				data: { status: "skipped" },
			});
			skipped++;
			continue;
		}
		if (await sendCharge(charge, ctx)) sent++;
		else failed++;
	}

	const status = failed > 0 ? "partially_failed" : "sent";
	await db.billingRun.update({ where: { id: run.id }, data: { status } });
	await audit({
		administradoraId: run.condominium.administradoraId,
		actorUserId: input.actorUserId,
		action: input.actorUserId
			? "billing_run.send"
			: "billing_run.send_automatic",
		entity: "billing_run",
		entityId: run.id,
		data: { sent, failed, skipped },
	});
	return { status, sent, failed, skipped };
}

/** Retries charges that failed in a run (e.g. after fixing data in Asaas). */
export async function retryFailed(input: {
	runId: string;
	actorUserId: string;
}) {
	const reset = await db.charge.updateMany({
		where: { runId: input.runId, status: "failed" },
		data: { status: "draft", issue: null },
	});
	if (reset.count === 0)
		return { status: "sent", sent: 0, failed: 0, skipped: 0 };
	await db.billingRun.update({
		where: { id: input.runId },
		data: { status: "draft" },
	});
	// Only the reset charges are drafts now; skipped/pending ones are untouched.
	return sendRun(input);
}
