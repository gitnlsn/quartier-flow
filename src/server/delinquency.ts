import "server-only";

import type { Prisma } from "@prisma/client";

import { formatPeriod } from "~/lib/billing-items";
import { formatDate } from "~/lib/br";
import {
	type AgreementState,
	MAX_AGREEMENT_INSTALLMENTS,
	agreementPlan,
	daysLate,
	unitLabel,
} from "~/lib/delinquency";
import { AsaasError } from "~/server/asaas/client";
import { deletePayment, restorePayment } from "~/server/asaas/payments";
import { audit } from "~/server/audit";
import {
	BillingError,
	type SendContext,
	nextOpenPeriod,
	refreshDraftRun,
	sendCharge,
	sendContext,
} from "~/server/billing/runs";
import { db } from "~/server/db";

/**
 * Delinquency management (docs/features/04): the delinquency rule other
 * features use, the overview for the administradora/síndico, and acordos.
 */

const PAID = new Set(["confirmed", "received"]);

/**
 * A unit is delinquent while it has an overdue charge. A `confirmed` charge
 * (paid, funds not yet available) already counts as paid, and renegotiated
 * charges are replaced by their acordo.
 */
export async function isDelinquent(
	unitId: string,
	tx: Prisma.TransactionClient = db,
) {
	const overdue = await tx.charge.count({
		where: { unitId, status: "overdue" },
	});
	return overdue > 0;
}

/** Current financially responsible resident of each unit. */
async function responsibleByUnit(unitIds: string[]) {
	const memberships = await db.membership.findMany({
		where: {
			unitId: { in: unitIds },
			endedAt: null,
			financiallyResponsible: true,
		},
		orderBy: { createdAt: "asc" },
		select: {
			unitId: true,
			user: { select: { id: true, name: true, email: true, cpf: true } },
		},
	});
	const map = new Map<string, (typeof memberships)[number]["user"]>();
	for (const m of memberships) {
		if (m.unitId && !map.has(m.unitId)) map.set(m.unitId, m.user);
	}
	return map;
}

const agreementInclude = {
	unit: { select: { id: true, block: true, number: true } },
	billingItem: { select: { id: true, startPeriod: true, archivedAt: true } },
	downPaymentCharge: {
		select: {
			id: true,
			status: true,
			dueDate: true,
			amountCents: true,
			invoiceUrl: true,
			issue: true,
		},
	},
	originalCharges: {
		select: { id: true, status: true, dueDate: true, amountCents: true },
		orderBy: { dueDate: "asc" },
	},
} satisfies Prisma.AgreementInclude;

type AgreementRow = Prisma.AgreementGetPayload<{
	include: typeof agreementInclude;
}>;

/**
 * Acordos with their progress, derived from the monthly charges that carry
 * an installment line (ChargeLine.sourceId = billing item) and the entrada.
 */
async function withProgress(agreements: AgreementRow[]) {
	const itemIds = agreements
		.map((a) => a.billingItemId)
		.filter((id): id is string => Boolean(id));
	const lines = itemIds.length
		? await db.chargeLine.findMany({
				where: {
					sourceId: { in: itemIds },
					charge: { status: { notIn: ["draft", "skipped", "failed"] } },
				},
				select: {
					sourceId: true,
					installment: true,
					amountCents: true,
					charge: {
						select: { id: true, status: true, dueDate: true, invoiceUrl: true },
					},
				},
			})
		: [];

	return agreements.map((agreement) => {
		const mine = lines.filter((l) => l.sourceId === agreement.billingItemId);
		const paidLines = mine.filter((l) => PAID.has(l.charge.status));
		// An installment whose monthly charge was itself renegotiated by a
		// newer acordo is settled there: it no longer counts as owed here.
		const settled = mine.filter(
			(l) => PAID.has(l.charge.status) || l.charge.status === "renegotiated",
		);
		const entrada = agreement.downPaymentCharge;
		const entradaPaid =
			agreement.downPaymentCents === 0 ||
			(entrada ? PAID.has(entrada.status) : false);
		const paidCents =
			paidLines.reduce((sum, l) => sum + l.amountCents, 0) +
			(agreement.downPaymentCents > 0 && entradaPaid
				? agreement.downPaymentCents
				: 0);
		const late =
			mine.some((l) => l.charge.status === "overdue") ||
			entrada?.status === "overdue";

		let state: AgreementState;
		if (agreement.status === "pending") state = "pending";
		else if (agreement.status === "canceled") state = "canceled";
		else if (settled.length >= agreement.installments && entradaPaid)
			state = "completed";
		else if (agreement.status === "broken") state = "broken";
		else state = late ? "late" : "active";

		return {
			...agreement,
			state,
			paidInstallments: paidLines.length,
			issuedInstallments: mine.length,
			paidCents,
			remainingCents: Math.max(0, agreement.totalCents - paidCents),
			installmentCharges: mine
				.map((l) => ({
					installment: l.installment,
					amountCents: l.amountCents,
					...l.charge,
				}))
				.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
		};
	});
}

export type AgreementWithProgress = Awaited<
	ReturnType<typeof withProgress>
>[number];

/** Delinquency overview of a condominium (management area only). */
export async function delinquencyOverview(condominiumId: string) {
	const [condo, overdue, agreements] = await Promise.all([
		db.condominium.findUniqueOrThrow({
			where: { id: condominiumId },
			select: {
				_count: { select: { units: true } },
				billingConfig: {
					select: { finePercent: true, interestPercent: true },
				},
			},
		}),
		db.charge.findMany({
			where: { condominiumId, status: "overdue" },
			orderBy: { dueDate: "asc" },
			select: {
				id: true,
				type: true,
				description: true,
				amountCents: true,
				dueDate: true,
				invoiceUrl: true,
				unit: { select: { id: true, block: true, number: true } },
				run: { select: { period: true } },
				lines: {
					select: { name: true },
					orderBy: { createdAt: "asc" },
					take: 1,
				},
			},
		}),
		db.agreement.findMany({
			where: { condominiumId, status: { not: "canceled" } },
			orderBy: { createdAt: "desc" },
			include: agreementInclude,
		}),
	]);

	const byUnit = new Map<
		string,
		{
			unit: { id: string; block: string; number: string };
			charges: (typeof overdue)[number][];
			totalCents: number;
		}
	>();
	for (const charge of overdue) {
		const entry = byUnit.get(charge.unit.id) ?? {
			unit: charge.unit,
			charges: [],
			totalCents: 0,
		};
		entry.charges.push(charge);
		entry.totalCents += charge.amountCents;
		byUnit.set(charge.unit.id, entry);
	}
	const responsible = await responsibleByUnit([...byUnit.keys()]);
	const progress = await withProgress(agreements);

	const units = [...byUnit.values()]
		.map((entry) => {
			const oldest = entry.charges[0]?.dueDate ?? new Date();
			const payer = responsible.get(entry.unit.id);
			return {
				unit: entry.unit,
				payer: payer ? { name: payer.name, email: payer.email } : null,
				payerHasCpf: Boolean(payer?.cpf),
				charges: entry.charges.map(
					({ run, unit: _unit, lines, ...charge }) => ({
						...charge,
						/** "Entrada de acordo", "Saldo do acordo encerrado"... */
						label:
							charge.type === "monthly"
								? null
								: (lines[0]?.name ?? charge.description),
						period: run?.period ?? charge.dueDate.toISOString().slice(0, 7),
						daysLate: daysLate(charge.dueDate),
					}),
				),
				totalCents: entry.totalCents,
				oldestDueDate: oldest,
				daysLate: daysLate(oldest),
				activeAgreement: progress.some(
					(a) =>
						a.unitId === entry.unit.id &&
						(a.state === "active" ||
							a.state === "late" ||
							a.state === "pending"),
				),
			};
		})
		.sort((a, b) => b.daysLate - a.daysLate || b.totalCents - a.totalCents);

	return {
		totalCents: units.reduce((sum, u) => sum + u.totalCents, 0),
		unitCount: units.length,
		unitsInCondominium: condo._count.units,
		finePercent: Number(condo.billingConfig?.finePercent ?? 0),
		interestPercent: Number(condo.billingConfig?.interestPercent ?? 0),
		units,
		agreements: progress,
	};
}

/** One row per overdue charge, for legal collection (full CPF: audited). */
export async function exportRows(condominiumId: string) {
	const charges = await db.charge.findMany({
		where: { condominiumId, status: "overdue" },
		orderBy: [
			{ unit: { block: "asc" } },
			{ unit: { number: "asc" } },
			{ dueDate: "asc" },
		],
		select: {
			description: true,
			amountCents: true,
			dueDate: true,
			invoiceUrl: true,
			unit: { select: { id: true, block: true, number: true } },
			run: { select: { period: true } },
		},
	});
	const responsible = await responsibleByUnit([
		...new Set(charges.map((c) => c.unit.id)),
	]);
	return charges.map((charge) => {
		const payer = responsible.get(charge.unit.id);
		return {
			unit: unitLabel(charge.unit),
			payerName: payer?.name ?? "",
			payerCpf: payer?.cpf ?? "",
			payerEmail: payer?.email ?? "",
			period: charge.run?.period
				? formatPeriod(charge.run.period)
				: formatDate(charge.dueDate),
			description: charge.description,
			dueDate: charge.dueDate.toISOString().slice(0, 10),
			amountCents: charge.amountCents,
			daysLate: daysLate(charge.dueDate),
			invoiceUrl: charge.invoiceUrl ?? "",
		};
	});
}

const todayUtc = () => {
	const now = new Date();
	return new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
	);
};

/**
 * Creates an acordo for a unit: the chosen overdue charges are replaced by an
 * optional entrada (issued now) plus N installments on the next monthly
 * charges. Asaas work happens in `finalizeAgreement`, which can be retried.
 */
export async function createAgreement(input: {
	condominiumId: string;
	unitId: string;
	chargeIds: string[];
	totalCents: number;
	downPaymentCents: number;
	downPaymentDueDate: string | null; // YYYY-MM-DD
	installments: number;
	notes: string | null;
	actorUserId: string;
}) {
	if (input.chargeIds.length === 0) {
		throw new BillingError("Selecione ao menos uma cobrança em atraso.");
	}
	if (
		input.installments < 1 ||
		input.installments > MAX_AGREEMENT_INSTALLMENTS
	) {
		throw new BillingError(
			`O acordo pode ter de 1 a ${MAX_AGREEMENT_INSTALLMENTS} parcelas.`,
		);
	}
	if (input.downPaymentCents < 0 || input.totalCents <= 0) {
		throw new BillingError("Informe o valor do acordo.");
	}
	if (input.downPaymentCents >= input.totalCents) {
		throw new BillingError(
			"A entrada deve ser menor que o valor total do acordo.",
		);
	}

	const charges = await db.charge.findMany({
		where: {
			id: { in: input.chargeIds },
			condominiumId: input.condominiumId,
			unitId: input.unitId,
		},
		select: { id: true, status: true, agreementId: true, amountCents: true },
	});
	if (
		charges.length !== input.chargeIds.length ||
		charges.some((c) => c.status !== "overdue" || c.agreementId)
	) {
		throw new BillingError(
			"Alguma cobrança selecionada não está mais em atraso. Atualize a página.",
		);
	}

	const payer = (await responsibleByUnit([input.unitId])).get(input.unitId);
	if (!payer) {
		throw new BillingError(
			"A unidade não tem responsável financeiro. Cadastre um antes do acordo.",
		);
	}
	if (!payer.cpf) {
		throw new BillingError(
			"O responsável financeiro não tem CPF cadastrado, necessário para o boleto.",
		);
	}

	let downPaymentDueDate: Date | null = null;
	if (input.downPaymentCents > 0) {
		if (!input.downPaymentDueDate) {
			throw new BillingError("Informe o vencimento da entrada.");
		}
		downPaymentDueDate = new Date(`${input.downPaymentDueDate}T00:00:00Z`);
		const max = new Date(todayUtc().getTime() + 30 * 86_400_000);
		if (
			Number.isNaN(downPaymentDueDate.getTime()) ||
			downPaymentDueDate < todayUtc() ||
			downPaymentDueDate > max
		) {
			throw new BillingError(
				"O vencimento da entrada deve ser entre hoje e os próximos 30 dias.",
			);
		}
		// Fails early (before touching Asaas) if the account can't issue boletos.
		await sendContext(input.condominiumId);
	}

	const plan = agreementPlan(input);
	const agreement = await db.$transaction(async (tx) => {
		const created = await tx.agreement.create({
			data: {
				condominiumId: input.condominiumId,
				unitId: input.unitId,
				payerUserId: payer.id,
				status: "pending",
				originalCents: charges.reduce((sum, c) => sum + c.amountCents, 0),
				totalCents: plan.totalCents,
				downPaymentCents: input.downPaymentCents,
				downPaymentDueDate,
				installments: input.installments,
				installmentCents: plan.installmentCents,
				notes: input.notes,
				createdById: input.actorUserId,
			},
		});
		const linked = await tx.charge.updateMany({
			where: {
				id: { in: input.chargeIds },
				status: "overdue",
				agreementId: null,
			},
			data: { agreementId: created.id },
		});
		if (linked.count !== input.chargeIds.length) {
			throw new BillingError(
				"Alguma cobrança selecionada mudou enquanto o acordo era criado. Tente novamente.",
			);
		}
		return created;
	});

	const condo = await db.condominium.findUniqueOrThrow({
		where: { id: input.condominiumId },
		select: { administradoraId: true },
	});
	await audit({
		administradoraId: condo.administradoraId,
		actorUserId: input.actorUserId,
		action: "agreement.create",
		entity: "agreement",
		entityId: agreement.id,
		data: {
			unitId: input.unitId,
			chargeIds: input.chargeIds,
			totalCents: plan.totalCents,
			downPaymentCents: input.downPaymentCents,
			installments: input.installments,
			installmentCents: plan.installmentCents,
		},
	});

	return finalizeAgreement(agreement.id, input.actorUserId);
}

const asaasMessage = (error: unknown) =>
	error instanceof AsaasError
		? error.userMessage
		: error instanceof Error
			? error.message
			: "Erro desconhecido";

/**
 * Finishes an acordo; safe to run again ("Tentar novamente"):
 * 1. deletes each renegotiated charge on Asaas and marks it `renegotiated`;
 * 2. creates the installments item and the entrada charge, sets it active;
 * 3. issues the entrada (or re-issues it if it failed).
 */
export async function finalizeAgreement(
	agreementId: string,
	actorUserId: string,
) {
	const agreement = await db.agreement.findUniqueOrThrow({
		where: { id: agreementId },
		include: {
			originalCharges: true,
			unit: { select: { block: true, number: true } },
			condominium: { select: { name: true, administradoraId: true } },
			downPaymentCharge: { include: { lines: true } },
		},
	});
	if (agreement.status === "broken" || agreement.status === "canceled") {
		throw new BillingError("Este acordo foi encerrado.");
	}

	let ctx: SendContext | null = null;
	if (agreement.downPaymentCents > 0) {
		ctx = await sendContext(agreement.condominiumId);
	}

	if (agreement.status === "pending") {
		for (const charge of agreement.originalCharges) {
			if (charge.status === "renegotiated") continue;
			if (PAID.has(charge.status)) {
				throw new BillingError(
					`A cobrança "${charge.description}" foi paga enquanto o acordo era criado. Cancele este acordo e crie outro.`,
				);
			}
			if (charge.asaasPaymentId) {
				try {
					await deletePayment(charge.asaasPaymentId);
				} catch (error) {
					throw new BillingError(
						`Não foi possível cancelar no Asaas a cobrança "${charge.description}": ${asaasMessage(error)} Tente novamente.`,
					);
				}
			}
			await db.charge.update({
				where: { id: charge.id },
				data: { status: "renegotiated" },
			});
		}

		const label = unitLabel(agreement.unit);
		const created = formatDate(agreement.createdAt);
		await db.$transaction(async (tx) => {
			const current = await tx.agreement.findUniqueOrThrow({
				where: { id: agreement.id },
				select: { status: true },
			});
			if (current.status !== "pending") return;
			const period = await nextOpenPeriod(tx, agreement.condominiumId);
			const item = await tx.unitBillingItem.create({
				data: {
					condominiumId: agreement.condominiumId,
					unitId: agreement.unitId,
					name: "Acordo",
					description: `Acordo de ${created}`,
					amountCents: agreement.installmentCents,
					recurrence: agreement.installments > 1 ? "installments" : "once",
					installments:
						agreement.installments > 1 ? agreement.installments : null,
					startPeriod: period,
					source: "agreement",
				},
			});
			let downPaymentChargeId: string | null = null;
			if (agreement.downPaymentCents > 0 && agreement.downPaymentDueDate) {
				const charge = await tx.charge.create({
					data: {
						condominiumId: agreement.condominiumId,
						unitId: agreement.unitId,
						payerUserId: agreement.payerUserId,
						type: "agreement",
						description: `Acordo - entrada - ${agreement.condominium.name} - Unidade ${label}`,
						amountCents: agreement.downPaymentCents,
						dueDate: agreement.downPaymentDueDate,
						status: "draft",
						lines: {
							create: {
								kind: "individual",
								name: "Acordo - entrada",
								description: `Acordo de ${created}`,
								amountCents: agreement.downPaymentCents,
							},
						},
					},
				});
				downPaymentChargeId = charge.id;
			}
			await tx.agreement.update({
				where: { id: agreement.id },
				data: {
					status: "active",
					billingItemId: item.id,
					downPaymentChargeId,
				},
			});
		});

		const updated = await db.agreement.findUniqueOrThrow({
			where: { id: agreement.id },
			select: { billingItem: { select: { startPeriod: true } } },
		});
		if (updated.billingItem) {
			await refreshDraftRun(
				agreement.condominiumId,
				updated.billingItem.startPeriod,
				actorUserId,
			);
		}
		await audit({
			administradoraId: agreement.condominium.administradoraId,
			actorUserId,
			action: "agreement.activate",
			entity: "agreement",
			entityId: agreement.id,
			data: { renegotiated: agreement.originalCharges.map((c) => c.id) },
		});
	}

	// Issue the entrada (first time, or again after a failure).
	const entrada = await db.charge.findFirst({
		where: { downPaymentOf: { id: agreement.id } },
		include: { lines: true },
	});
	let entradaError: string | null = null;
	if (
		entrada &&
		ctx &&
		(entrada.status === "draft" || entrada.status === "failed")
	) {
		const sent = await sendCharge(entrada, ctx);
		if (!sent) {
			const failed = await db.charge.findUnique({
				where: { id: entrada.id },
				select: { issue: true },
			});
			entradaError = failed?.issue ?? "Erro ao emitir a entrada.";
		}
	}
	return { id: agreement.id, entradaError };
}

/**
 * Ends an acordo: no more installments on future monthly charges. Charges
 * already issued (installments, entrada) stay as they are and are still owed.
 * The installments never issued become one overdue charge "Saldo do acordo
 * encerrado" (not on Asaas), so the debt stays in the delinquency list, the
 * export and `isDelinquent`, and can go to a new acordo or be forgiven.
 */
export async function breakAgreement(agreementId: string, actorUserId: string) {
	const agreement = await db.agreement.findUniqueOrThrow({
		where: { id: agreementId },
		include: {
			billingItem: true,
			unit: { select: { block: true, number: true } },
			condominium: { select: { name: true, administradoraId: true } },
		},
	});
	if (agreement.status !== "active") {
		throw new BillingError("Só acordos ativos podem ser encerrados.");
	}
	await db.$transaction(async (tx) => {
		await tx.agreement.update({
			where: { id: agreement.id },
			data: {
				status: "broken",
				brokenAt: new Date(),
				brokenById: actorUserId,
			},
		});
		if (agreement.billingItem && !agreement.billingItem.archivedAt) {
			await tx.unitBillingItem.update({
				where: { id: agreement.billingItem.id },
				data: { archivedAt: new Date() },
			});
		}
	});
	// A draft run of the next month must lose the installment line.
	const nextPeriod = await nextOpenPeriod(db, agreement.condominiumId);
	await refreshDraftRun(agreement.condominiumId, nextPeriod, actorUserId);

	// Installments already on a charge (sent, paid, overdue or failed and
	// retryable) stay there; the rest becomes the remaining balance.
	const issued = agreement.billingItemId
		? await db.chargeLine.count({
				where: {
					sourceId: agreement.billingItemId,
					charge: { status: { notIn: ["draft", "skipped"] } },
				},
			})
		: 0;
	const unbilled = Math.max(0, agreement.installments - issued);
	let balanceChargeId: string | null = null;
	if (unbilled > 0) {
		const amountCents = unbilled * agreement.installmentCents;
		const today = new Date();
		const charge = await db.charge.create({
			data: {
				condominiumId: agreement.condominiumId,
				unitId: agreement.unitId,
				payerUserId: agreement.payerUserId,
				type: "agreement",
				description: `Saldo do acordo encerrado - ${agreement.condominium.name} - Unidade ${unitLabel(agreement.unit)}`,
				amountCents,
				dueDate: new Date(
					Date.UTC(
						today.getUTCFullYear(),
						today.getUTCMonth(),
						today.getUTCDate(),
					),
				),
				status: "overdue",
				lines: {
					create: {
						kind: "individual",
						name: "Saldo do acordo encerrado",
						description: `${unbilled} parcela(s) não emitida(s) do acordo de ${formatDate(agreement.createdAt)}`,
						amountCents,
					},
				},
			},
		});
		balanceChargeId = charge.id;
	}
	await audit({
		administradoraId: agreement.condominium.administradoraId,
		actorUserId,
		action: "agreement.break",
		entity: "agreement",
		entityId: agreement.id,
		data: { unbilledInstallments: unbilled, balanceChargeId },
	});
}

/**
 * Forgives (writes off) overdue charges of a unit: each one is deleted on
 * Asaas when it is there, then marked `forgiven` with who, when and why.
 * Stops at the first Asaas failure; the ones already done stay forgiven.
 */
export async function forgiveCharges(input: {
	condominiumId: string;
	unitId: string;
	chargeIds: string[];
	reason: string;
	actorUserId: string;
	administradoraId: string;
}) {
	const reason = input.reason.trim();
	if (reason.length < 5) {
		throw new BillingError(
			"Explique o motivo do perdão (mínimo 5 caracteres).",
		);
	}
	if (input.chargeIds.length === 0) {
		throw new BillingError("Selecione ao menos uma cobrança.");
	}
	const charges = await db.charge.findMany({
		where: {
			id: { in: input.chargeIds },
			condominiumId: input.condominiumId,
			unitId: input.unitId,
		},
	});
	if (
		charges.length !== input.chargeIds.length ||
		charges.some((c) => c.status !== "overdue" || c.agreementId)
	) {
		throw new BillingError(
			"Alguma cobrança selecionada não está mais em atraso. Atualize a página.",
		);
	}

	const forgiven: string[] = [];
	for (const charge of charges) {
		if (charge.asaasPaymentId) {
			try {
				await deletePayment(charge.asaasPaymentId);
			} catch (error) {
				await logForgiveness(input, forgiven, reason);
				throw new BillingError(
					`Não foi possível cancelar no Asaas a cobrança "${charge.description}": ${asaasMessage(error)}${forgiven.length ? ` ${forgiven.length} cobrança(s) já foram perdoadas.` : ""} Tente novamente.`,
				);
			}
		}
		await db.charge.update({
			where: { id: charge.id },
			data: {
				status: "forgiven",
				forgivenAt: new Date(),
				forgivenById: input.actorUserId,
				forgivenReason: reason,
			},
		});
		forgiven.push(charge.id);
	}
	await logForgiveness(input, forgiven, reason);
	return { forgiven: forgiven.length };
}

async function logForgiveness(
	input: { unitId: string; actorUserId: string; administradoraId: string },
	chargeIds: string[],
	reason: string,
) {
	if (chargeIds.length === 0) return;
	await audit({
		administradoraId: input.administradoraId,
		actorUserId: input.actorUserId,
		action: "charge.forgive",
		entity: "unit",
		entityId: input.unitId,
		data: { chargeIds, reason },
	});
}

/**
 * Cancels an acordo stuck in `pending` (e.g. a charge was paid meanwhile):
 * charges already deleted on Asaas are restored and become overdue again.
 */
export async function cancelPendingAgreement(
	agreementId: string,
	actorUserId: string,
) {
	const agreement = await db.agreement.findUniqueOrThrow({
		where: { id: agreementId },
		include: {
			originalCharges: true,
			condominium: { select: { administradoraId: true } },
		},
	});
	if (agreement.status !== "pending") {
		throw new BillingError(
			"Só acordos aguardando conclusão podem ser cancelados. Use Encerrar.",
		);
	}
	for (const charge of agreement.originalCharges) {
		if (charge.status === "renegotiated" && charge.asaasPaymentId) {
			try {
				const payment = await restorePayment(charge.asaasPaymentId);
				await db.charge.update({
					where: { id: charge.id },
					data: {
						status: payment.status === "OVERDUE" ? "overdue" : "pending",
						agreementId: null,
					},
				});
			} catch (error) {
				throw new BillingError(
					`Não foi possível restaurar no Asaas a cobrança "${charge.description}": ${asaasMessage(error)} Tente novamente.`,
				);
			}
		} else {
			await db.charge.update({
				where: { id: charge.id },
				data: {
					agreementId: null,
					...(charge.status === "renegotiated" ? { status: "overdue" } : {}),
				},
			});
		}
	}
	await db.agreement.update({
		where: { id: agreement.id },
		data: { status: "canceled" },
	});
	await audit({
		administradoraId: agreement.condominium.administradoraId,
		actorUserId,
		action: "agreement.cancel",
		entity: "agreement",
		entityId: agreement.id,
	});
}

/** Acordos of the units a resident pays for (Minha área). */
export async function residentAgreements(
	userId: string,
	unitId: string | null,
) {
	const agreements = await db.agreement.findMany({
		where: {
			payerUserId: userId,
			status: { in: ["active", "broken"] },
			...(unitId ? { unitId } : {}),
		},
		orderBy: { createdAt: "desc" },
		include: agreementInclude,
	});
	return (await withProgress(agreements)).map((a) => ({
		id: a.id,
		state: a.state,
		unit: a.unit,
		createdAt: a.createdAt,
		totalCents: a.totalCents,
		downPaymentCents: a.downPaymentCents,
		installments: a.installments,
		installmentCents: a.installmentCents,
		paidInstallments: a.paidInstallments,
		paidCents: a.paidCents,
		remainingCents: a.remainingCents,
		startPeriod: a.billingItem?.startPeriod ?? null,
		entrada: a.downPaymentCharge
			? {
					status: a.downPaymentCharge.status,
					dueDate: a.downPaymentCharge.dueDate,
					invoiceUrl: a.downPaymentCharge.invoiceUrl,
				}
			: null,
	}));
}
