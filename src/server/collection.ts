import "server-only";

import { formatPeriod } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import {
	type CollectionStage,
	STAGE_LABEL,
	type TimelineKind,
	stageOf,
} from "~/lib/collection";
import { daysLate, estimatedCharges, unitLabel } from "~/lib/delinquency";
import { stepLabel } from "~/lib/reminders";
import { audit } from "~/server/audit";
import { BillingError } from "~/server/billing/runs";
import { db } from "~/server/db";
import { responsibleByUnit, unitAgreements } from "~/server/delinquency";

/**
 * Legal collection (docs/features/04, item 3): one case per unit while the
 * administradora chases its debt outside the app (extrajudicial, then
 * judicial). The timeline merges the case's own events (notes, files, stage
 * and handler changes) with events derived from the unit's data, so acordos,
 * payments, forgiveness and reminders show up without being written twice.
 */

const DAY_MS = 86_400_000;
const PAID = new Set(["confirmed", "received"]);

export type TimelineEntry = {
	id: string;
	at: Date;
	kind: TimelineKind;
	text: string;
	actor: string | null;
	file: { eventId: string; name: string; type: string; size: number } | null;
};

export async function listCases(condominiumId: string) {
	const cases = await db.collectionCase.findMany({
		where: { condominiumId },
		orderBy: [
			{ closedAt: { sort: "desc", nulls: "first" } },
			{ openedAt: "desc" },
		],
		take: 100,
		select: {
			id: true,
			stage: true,
			handler: true,
			openedAt: true,
			closedAt: true,
			unit: { select: { id: true, block: true, number: true } },
			_count: { select: { events: true } },
		},
	});
	return cases.map((c) => ({ ...c, stage: stageOf(c.stage) }));
}

export async function openCase(input: {
	condominiumId: string;
	unitId: string;
	handler: string | null;
	note: string | null;
	actorUserId: string;
	administradoraId: string;
}) {
	const unit = await db.unit.findFirst({
		where: { id: input.unitId, condominiumId: input.condominiumId },
		select: { id: true },
	});
	if (!unit) throw new BillingError("Unidade não encontrada.");
	const existing = await db.collectionCase.findFirst({
		where: { unitId: input.unitId, closedAt: null },
		select: { id: true },
	});
	if (existing) {
		throw new BillingError("Esta unidade já tem uma cobrança jurídica aberta.");
	}
	const created = await db.collectionCase.create({
		data: {
			condominiumId: input.condominiumId,
			unitId: input.unitId,
			handler: input.handler,
			openedById: input.actorUserId,
			events: {
				create: {
					kind: "opened",
					text: input.note,
					actorId: input.actorUserId,
				},
			},
		},
		select: { id: true },
	});
	await audit({
		administradoraId: input.administradoraId,
		actorUserId: input.actorUserId,
		action: "collection_case.open",
		entity: "collection_case",
		entityId: created.id,
		data: { unitId: input.unitId, handler: input.handler },
	});
	return created;
}

async function openCaseOrThrow(caseId: string) {
	const found = await db.collectionCase.findUniqueOrThrow({
		where: { id: caseId },
		select: { id: true, stage: true, handler: true, closedAt: true },
	});
	if (found.closedAt) {
		throw new BillingError(
			"Esta cobrança está encerrada. Abra uma nova para a unidade.",
		);
	}
	return found;
}

/**
 * Moves a case between extrajudicial and judicial, or closes it (final: a
 * new case is opened if the unit falls behind again).
 */
export async function setStage(input: {
	caseId: string;
	stage: CollectionStage;
	note: string | null;
	actorUserId: string;
	administradoraId: string;
}) {
	const current = await openCaseOrThrow(input.caseId);
	if (current.stage === input.stage) return;
	await db.$transaction([
		db.collectionCase.update({
			where: { id: input.caseId },
			data: {
				stage: input.stage,
				...(input.stage === "closed" ? { closedAt: new Date() } : {}),
			},
		}),
		db.collectionEvent.create({
			data: {
				caseId: input.caseId,
				kind: "stage",
				text: `${STAGE_LABEL[stageOf(current.stage)]} → ${STAGE_LABEL[input.stage]}${input.note ? `\n${input.note}` : ""}`,
				actorId: input.actorUserId,
			},
		}),
	]);
	await audit({
		administradoraId: input.administradoraId,
		actorUserId: input.actorUserId,
		action: "collection_case.stage",
		entity: "collection_case",
		entityId: input.caseId,
		data: { from: current.stage, to: input.stage },
	});
}

export async function setHandler(input: {
	caseId: string;
	handler: string | null;
	actorUserId: string;
}) {
	const current = await openCaseOrThrow(input.caseId);
	if ((current.handler ?? null) === input.handler) return;
	await db.$transaction([
		db.collectionCase.update({
			where: { id: input.caseId },
			data: { handler: input.handler },
		}),
		db.collectionEvent.create({
			data: {
				caseId: input.caseId,
				kind: "handler",
				text: input.handler
					? `Responsável: ${input.handler}`
					: "Responsável removido",
				actorId: input.actorUserId,
			},
		}),
	]);
}

/** Note and/or file added to the timeline (the upload route stores the file). */
export async function addEvent(input: {
	caseId: string;
	text: string | null;
	file: { key: string; name: string; type: string; size: number } | null;
	actorUserId: string;
}) {
	await openCaseOrThrow(input.caseId);
	return db.collectionEvent.create({
		data: {
			caseId: input.caseId,
			kind: "note",
			text: input.text,
			fileKey: input.file?.key,
			fileName: input.file?.name,
			fileType: input.file?.type,
			fileSize: input.file?.size,
			actorId: input.actorUserId,
		},
		select: { id: true },
	});
}

const chargeLabel = (charge: {
	type: string;
	description: string;
	run: { period: string } | null;
	lines: { name: string }[];
}) =>
	charge.type === "monthly" && charge.run
		? `Taxa condominial ${formatPeriod(charge.run.period)}`
		: (charge.lines[0]?.name ?? charge.description);

/**
 * Everything about a case: the unit's open debts (with the fine/interest
 * estimate), its acordos and the merged timeline. `withCpf` only for the
 * administradora's dossiê (audited by the caller).
 */
export async function caseDetail(
	caseId: string,
	options: { withCpf?: boolean } = {},
) {
	const found = await db.collectionCase.findUniqueOrThrow({
		where: { id: caseId },
		include: {
			unit: { select: { id: true, block: true, number: true } },
			condominium: {
				select: {
					id: true,
					name: true,
					cnpj: true,
					address: true,
					administradoraId: true,
					administradora: { select: { name: true } },
					billingConfig: {
						select: { finePercent: true, interestPercent: true },
					},
				},
			},
			events: { orderBy: { createdAt: "asc" } },
		},
	});
	const unitId = found.unitId;

	const [charges, agreements, payerMap, reminders] = await Promise.all([
		db.charge.findMany({
			where: {
				unitId,
				status: {
					notIn: ["draft", "skipped", "failed", "canceled", "refunded"],
				},
			},
			orderBy: { dueDate: "asc" },
			select: {
				id: true,
				type: true,
				description: true,
				amountCents: true,
				paidAmountCents: true,
				dueDate: true,
				status: true,
				paidAt: true,
				invoiceUrl: true,
				createdAt: true,
				forgivenAt: true,
				forgivenById: true,
				forgivenReason: true,
				run: { select: { period: true } },
				lines: {
					select: { name: true },
					orderBy: { createdAt: "asc" },
					take: 1,
				},
			},
		}),
		unitAgreements(unitId),
		responsibleByUnit([unitId]),
		db.reminderLog.findMany({
			where: { charge: { unitId } },
			select: {
				id: true,
				offsetDays: true,
				audience: true,
				createdAt: true,
				charge: {
					select: {
						type: true,
						description: true,
						run: { select: { period: true } },
						lines: {
							select: { name: true },
							orderBy: { createdAt: "asc" },
							take: 1,
						},
					},
				},
			},
		}),
	]);

	const actorIds = new Set<string>();
	for (const e of found.events) if (e.actorId) actorIds.add(e.actorId);
	for (const a of agreements) {
		actorIds.add(a.createdById);
		if (a.brokenById) actorIds.add(a.brokenById);
	}
	for (const c of charges) if (c.forgivenById) actorIds.add(c.forgivenById);
	const actors = new Map(
		(
			await db.user.findMany({
				where: { id: { in: [...actorIds] } },
				select: { id: true, name: true, email: true },
			})
		).map((u) => [u.id, u.name || u.email]),
	);
	const actor = (id: string | null | undefined) =>
		id ? (actors.get(id) ?? null) : null;

	const timeline: TimelineEntry[] = found.events.map((e) => ({
		id: e.id,
		at: e.createdAt,
		kind: e.kind as TimelineKind,
		text: e.text ?? "",
		actor: actor(e.actorId),
		file:
			e.fileKey && e.fileName && e.fileType
				? {
						eventId: e.id,
						name: e.fileName,
						type: e.fileType,
						size: e.fileSize ?? 0,
					}
				: null,
	}));

	for (const c of charges) {
		const label = chargeLabel(c);
		// A charge is late the day after its due date; charges created already
		// overdue (the "Saldo do acordo encerrado") are late from the start.
		const lateAt =
			c.createdAt.getTime() >= c.dueDate.getTime()
				? c.createdAt
				: new Date(c.dueDate.getTime() + DAY_MS);
		const paidLate =
			PAID.has(c.status) && c.paidAt && c.paidAt.getTime() >= lateAt.getTime();
		const wasOverdue =
			c.status === "overdue" ||
			c.status === "renegotiated" ||
			c.status === "forgiven" ||
			paidLate;
		if (!wasOverdue) continue;
		timeline.push({
			id: `overdue-${c.id}`,
			at: lateAt,
			kind: "overdue",
			text: `${label} (${formatBRL(c.amountCents)}) venceu sem pagamento`,
			actor: null,
			file: null,
		});
		if (paidLate && c.paidAt) {
			timeline.push({
				id: `payment-${c.id}`,
				at: c.paidAt,
				kind: "payment",
				text: `${label} paga: ${formatBRL(c.paidAmountCents ?? c.amountCents)}`,
				actor: null,
				file: null,
			});
		}
		if (c.status === "forgiven" && c.forgivenAt) {
			timeline.push({
				id: `forgiven-${c.id}`,
				at: c.forgivenAt,
				kind: "forgiveness",
				text: `${label} (${formatBRL(c.amountCents)}) perdoada${c.forgivenReason ? `: ${c.forgivenReason}` : ""}`,
				actor: actor(c.forgivenById),
				file: null,
			});
		}
	}
	for (const a of agreements) {
		timeline.push({
			id: `agreement-${a.id}`,
			at: a.createdAt,
			kind: "agreement",
			text: `${a.replacesId ? "Acordo renegociado" : "Acordo"}: ${formatBRL(a.totalCents)}${a.downPaymentCents > 0 ? ` (entrada ${formatBRL(a.downPaymentCents)} +` : " ("}${a.installments}× ${formatBRL(a.installmentCents)}), renegociando ${a.originalCharges.length} cobrança(s)`,
			actor: actor(a.createdById),
			file: null,
		});
		if (a.brokenAt) {
			timeline.push({
				id: `agreement-broken-${a.id}`,
				at: a.brokenAt,
				kind: "agreement_broken",
				text: a.replacedBy
					? "Acordo substituído por um novo (saldo renegociado)"
					: a.brokenById
						? "Acordo encerrado"
						: "Acordo encerrado automaticamente (regra de atraso)",
				actor: actor(a.brokenById),
				file: null,
			});
		}
	}
	for (const r of reminders) {
		timeline.push({
			id: `reminder-${r.id}`,
			at: r.createdAt,
			kind: "reminder",
			text: `${r.audience === "managers" ? "Aviso à administração" : "Lembrete ao responsável"} (${stepLabel(r.offsetDays)} do vencimento): ${chargeLabel(r.charge)}`,
			actor: null,
			file: null,
		});
	}
	timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

	const finePercent = Number(found.condominium.billingConfig?.finePercent ?? 0);
	const interestPercent = Number(
		found.condominium.billingConfig?.interestPercent ?? 0,
	);
	const debts = charges
		.filter((c) => c.status === "overdue")
		.map((c) => {
			const late = daysLate(c.dueDate);
			return {
				id: c.id,
				label: chargeLabel(c),
				dueDate: c.dueDate,
				amountCents: c.amountCents,
				daysLate: late,
				estimateCents: estimatedCharges({
					amountCents: c.amountCents,
					daysLate: late,
					finePercent,
					interestPercent,
				}),
				invoiceUrl: c.invoiceUrl,
			};
		});

	const payer = payerMap.get(unitId);
	return {
		id: found.id,
		stage: stageOf(found.stage),
		handler: found.handler,
		openedAt: found.openedAt,
		closedAt: found.closedAt,
		unit: found.unit,
		unitLabel: unitLabel(found.unit),
		condominium: {
			id: found.condominium.id,
			name: found.condominium.name,
			cnpj: found.condominium.cnpj,
			address: found.condominium.address,
			administradoraId: found.condominium.administradoraId,
			administradora: found.condominium.administradora.name,
		},
		payer: payer
			? {
					name: payer.name,
					email: payer.email,
					...(options.withCpf ? { cpf: payer.cpf } : {}),
				}
			: null,
		finePercent,
		interestPercent,
		debts,
		debtTotals: {
			amountCents: debts.reduce((sum, d) => sum + d.amountCents, 0),
			estimateCents: debts.reduce((sum, d) => sum + d.estimateCents, 0),
		},
		agreements: agreements.map((a) => ({
			id: a.id,
			state: a.state,
			createdAt: a.createdAt,
			totalCents: a.totalCents,
			downPaymentCents: a.downPaymentCents,
			installments: a.installments,
			installmentCents: a.installmentCents,
			paidInstallments: a.paidInstallments,
			paidCents: a.paidCents,
			remainingCents: a.remainingCents,
			replaced: Boolean(a.replacedBy),
			installmentCharges: a.installmentCharges.map((i) => ({
				installment: i.installment,
				amountCents: i.amountCents,
				status: i.status,
				dueDate: i.dueDate,
			})),
		})),
		timeline,
	};
}

export type CaseDetail = Awaited<ReturnType<typeof caseDetail>>;
