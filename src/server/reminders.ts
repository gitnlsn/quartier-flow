import "server-only";

import { formatPeriod } from "~/lib/billing-items";
import { formatDate } from "~/lib/br";
import { unitLabel } from "~/lib/delinquency";
import {
	type CollectionStepInput,
	DEFAULT_COLLECTION_STEPS,
	stepLabel,
} from "~/lib/reminders";
import { db } from "~/server/db";
import { notify } from "~/server/notifications";
import { condominiumManagers } from "~/server/notifications/recipients";

/**
 * Payment reminders sent by the app (docs/features/04, item 6), for
 * administradoras with `reminderSender = "app"`. Asaas reminders are switched
 * off for their payers (`reminderSettings`), so a payer never gets both.
 *
 * The daily cron walks each condominium's steps (or the defaults) and finds
 * the charges whose due date + offset is today. Each (charge, step) is
 * recorded in ReminderLog before anything is sent, so a re-run (or two runs
 * at once) never sends it twice. A step missed by up to CATCH_UP_DAYS (the
 * cron didn't run) is still sent; older ones are skipped.
 *
 * Texts never carry amounts (they end up in email previews): they link to
 * Minhas cobranças, where the payer sees the boleto.
 */

const DAY_MS = 86_400_000;
const CATCH_UP_DAYS = 2;

const startOfDayUtc = (date: Date) =>
	new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);

/** Steps of a condominium: its own, or the defaults when it never saved any. */
export async function collectionSteps(
	condominiumId: string,
): Promise<{ steps: CollectionStepInput[]; isDefault: boolean }> {
	const rows = await db.collectionStep.findMany({
		where: { condominiumId },
		orderBy: [{ offsetDays: "asc" }, { audience: "asc" }],
		select: { offsetDays: true, audience: true },
	});
	if (rows.length === 0) {
		return { steps: DEFAULT_COLLECTION_STEPS, isDefault: true };
	}
	return {
		steps: rows.map((r) => ({
			offsetDays: r.offsetDays,
			audience: r.audience === "managers" ? "managers" : "payer",
		})),
		isDefault: false,
	};
}

type DueCharge = {
	id: string;
	payerUserId: string | null;
	dueDate: Date;
	type: string;
	unit: { id: string; block: string; number: string };
	run: { period: string } | null;
	lines: { name: string }[];
};

/** "taxa condominial de 11/2026", "Acordo - entrada"... */
const chargeName = (charge: DueCharge) =>
	charge.type === "monthly" && charge.run
		? `a taxa condominial de ${formatPeriod(charge.run.period)}`
		: `a cobrança "${charge.lines[0]?.name ?? "avulsa"}"`;

async function sendStep(
	condo: { id: string; name: string },
	step: CollectionStepInput,
	today: Date,
) {
	// Charges whose due date + offset falls in [today - catch-up, today].
	const latest = new Date(today.getTime() - step.offsetDays * DAY_MS);
	const earliest = new Date(latest.getTime() - CATCH_UP_DAYS * DAY_MS);
	const charges: DueCharge[] = await db.charge.findMany({
		where: {
			condominiumId: condo.id,
			dueDate: { gte: earliest, lte: latest },
			// Before/on the due date: still open. After: overdue.
			status: step.offsetDays <= 0 ? "pending" : "overdue",
			// The payer can only pay what is on Asaas (not a "Saldo do acordo
			// encerrado"); managers hear about every overdue charge.
			...(step.audience === "payer"
				? { asaasPaymentId: { not: null }, payerUserId: { not: null } }
				: {}),
			reminders: {
				none: { offsetDays: step.offsetDays, audience: step.audience },
			},
		},
		select: {
			id: true,
			payerUserId: true,
			dueDate: true,
			type: true,
			unit: { select: { id: true, block: true, number: true } },
			run: { select: { period: true } },
			lines: {
				select: { name: true },
				orderBy: { createdAt: "asc" },
				take: 1,
			},
		},
	});
	if (charges.length === 0) return 0;

	// Claim first: only the rows this run inserted are sent.
	const claimed = await db.reminderLog.createManyAndReturn({
		data: charges.map((c) => ({
			chargeId: c.id,
			offsetDays: step.offsetDays,
			audience: step.audience,
		})),
		skipDuplicates: true,
		select: { chargeId: true },
	});
	const mine = new Set(claimed.map((c) => c.chargeId));
	const toSend = charges.filter((c) => mine.has(c.id));

	if (step.audience === "managers") {
		// One notification per unit, however many charges reached the step.
		const byUnit = new Map<string, DueCharge>();
		for (const c of toSend) {
			if (!byUnit.has(c.unit.id)) byUnit.set(c.unit.id, c);
		}
		const managers = await condominiumManagers(condo.id);
		for (const charge of byUnit.values()) {
			await notify({
				userIds: managers,
				type: "delinquency.escalation",
				title: `Unidade ${unitLabel(charge.unit)}: ${stepLabel(step.offsetDays)} do vencimento`,
				body: `A unidade ${unitLabel(charge.unit)} em ${condo.name} tem uma cobrança vencida em ${formatDate(charge.dueDate)} e ainda não paga. Veja a situação e as opções (acordo, cobrança jurídica) em Inadimplência.`,
				url: `/painel/condominios/${condo.id}/inadimplencia`,
				condominiumId: condo.id,
				data: { unitId: charge.unit.id, offsetDays: step.offsetDays },
			});
		}
		return byUnit.size;
	}

	for (const charge of toSend) {
		const what = chargeName(charge);
		const due = formatDate(charge.dueDate);
		const where = `${condo.name}, unidade ${unitLabel(charge.unit)}`;
		const overdue = step.offsetDays > 0;
		await notify({
			userIds: [charge.payerUserId],
			type: overdue ? "charge.overdue_reminder" : "charge.due_reminder",
			title: overdue
				? "Cobrança em atraso"
				: step.offsetDays === 0
					? "Sua cobrança vence hoje"
					: `Sua cobrança vence em ${due}`,
			body: overdue
				? `Não identificamos o pagamento de ${what} (${where}), que venceu em ${due}. O boleto atualizado, com Pix, está em Minhas cobranças. Se você já pagou, desconsidere esta mensagem.`
				: `Lembrete: ${what} (${where}) vence ${step.offsetDays === 0 ? "hoje" : `em ${due}`}. O boleto e o Pix estão em Minhas cobranças.`,
			url: "/painel/cobrancas",
			condominiumId: condo.id,
			data: { chargeId: charge.id, offsetDays: step.offsetDays },
		});
	}
	return toSend.length;
}

/** Daily: every step of every condominium whose administradora uses the app. */
export async function sendCollectionReminders(now: Date) {
	const today = startOfDayUtc(now);
	const condos = await db.condominium.findMany({
		where: {
			billingConfig: { isNot: null },
			administradora: { closedAt: null, reminderSender: "app" },
		},
		select: { id: true, name: true },
	});
	const results: {
		condominiumId: string;
		sent: number;
		error?: string;
	}[] = [];
	for (const condo of condos) {
		let sent = 0;
		try {
			const { steps } = await collectionSteps(condo.id);
			for (const step of steps) sent += await sendStep(condo, step, today);
			results.push({ condominiumId: condo.id, sent });
		} catch (error) {
			console.error(`[reminders] ${condo.id} failed`, error);
			results.push({
				condominiumId: condo.id,
				sent,
				error: error instanceof Error ? error.message : "Erro inesperado",
			});
		}
	}
	return results;
}
