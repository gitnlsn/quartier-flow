import "server-only";

import { AsaasError } from "~/server/asaas/client";
import { ensureCustomer } from "~/server/asaas/customers";
import { createPayment } from "~/server/asaas/payments";
import { audit } from "~/server/audit";
import { db } from "~/server/db";

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
			units: {
				orderBy: [{ block: "asc" }, { number: "asc" }],
				include: {
					memberships: {
						where: { endedAt: null, financiallyResponsible: true },
						include: { user: { select: { id: true, cpf: true } } },
						take: 1,
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
	const description = `Taxa condominial ${month}/${year} - ${condo.name}`;

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

		await tx.charge.createMany({
			data: condo.units.map((unit) => {
				const amountCents =
					unit.monthlyAmountCents ?? config.defaultAmountCents;
				const payer = unit.memberships[0]?.user;
				const issue =
					amountCents <= 0
						? "Valor da unidade é zero"
						: !payer
							? "Unidade sem responsável financeiro"
							: !payer.cpf
								? "Responsável financeiro sem CPF"
								: null;
				return {
					condominiumId: condo.id,
					unitId: unit.id,
					runId: saved.id,
					payerUserId: payer?.id ?? null,
					type: "monthly",
					description: `${description} - Unidade ${unitLabel(unit)}`,
					amountCents,
					dueDate,
					status: "draft",
					issue,
				};
			}),
		});
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
		include: {
			condominium: {
				include: {
					billingConfig: true,
					administradora: { include: { payoutAccount: true } },
				},
			},
		},
	});
	if (run.status !== "draft") {
		throw new BillingError("Esta execução já foi enviada.");
	}
	const payout = run.condominium.administradora.payoutAccount;
	if (!payout || payout.kycStatus !== "approved") {
		throw new BillingError(
			"A conta de recebimento da administradora ainda não foi aprovada pelo Asaas.",
		);
	}
	if (run.dueDate < todayUtc()) {
		throw new BillingError(
			"A data de vencimento já passou. Ajuste o dia de vencimento e prepare novamente.",
		);
	}
	const config = run.condominium.billingConfig;
	if (!config) throw new BillingError("Cobrança mensal não configurada.");

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
		try {
			const payer = await db.user.findUniqueOrThrow({
				where: { id: charge.payerUserId },
				select: { id: true, name: true, email: true, cpf: true },
			});
			if (!payer.cpf) throw new BillingError("Responsável financeiro sem CPF");
			const customerId = await ensureCustomer({ ...payer, cpf: payer.cpf });
			const payment = await createPayment({
				customerId,
				amountCents: charge.amountCents,
				dueDate: charge.dueDate.toISOString().slice(0, 10),
				description: charge.description,
				externalReference: charge.id,
				finePercent: Number(config.finePercent),
				interestPercent: Number(config.interestPercent),
				splitWalletId: payout.walletId,
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
			sent++;
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
			failed++;
		}
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
