import "server-only";

import { TRPCError } from "@trpc/server";

import {
	type BalanceSheetData,
	addMonths,
	balanceSheetDataSchema,
	currentPeriod,
	periodBounds,
} from "~/lib/finance";
import { db } from "~/server/db";

/**
 * Financial transparency (docs/features/05): a simple cash-flow ledger, not
 * double-entry accounting.
 *
 * - Income: charges `confirmed` or `received`, in the month of `paidAt`
 *   (gross `paidAmountCents`, Asaas `feeCents` as a separate line).
 *   Refunded, canceled and forgiven charges never count.
 * - Expenses: `Expense.amountCents` in the month of `paidAt`.
 * - Balance: the condominium's opening balance (cash before Quartier Flow,
 *   at the start of its month) plus every month's result since then.
 */

const PAID_STATUSES = ["confirmed", "received"];
/** Charges that were never really billed, or were undone. */
const NOT_BILLED = ["draft", "skipped", "failed", "canceled", "refunded"];
const DAY_MS = 24 * 60 * 60 * 1000;

type MonthTotals = {
	grossCents: number;
	feesCents: number;
	expensesCents: number;
};

/** Per-month totals (YYYY-MM, UTC) of a condominium's whole history. */
async function monthlyTotals(condominiumId: string) {
	const [income, expenses] = await Promise.all([
		db.$queryRaw<{ period: string; gross: bigint; fees: bigint }[]>`
			SELECT to_char("paidAt", 'YYYY-MM') AS period,
				COALESCE(SUM(COALESCE("paidAmountCents", "amountCents")), 0)::bigint AS gross,
				COALESCE(SUM(COALESCE("feeCents", 0)), 0)::bigint AS fees
			FROM "Charge"
			WHERE "condominiumId" = ${condominiumId}
				AND status IN ('confirmed', 'received')
				AND "paidAt" IS NOT NULL
			GROUP BY 1`,
		db.$queryRaw<{ period: string; total: bigint }[]>`
			SELECT to_char("paidAt", 'YYYY-MM') AS period,
				COALESCE(SUM("amountCents"), 0)::bigint AS total
			FROM "Expense"
			WHERE "condominiumId" = ${condominiumId}
			GROUP BY 1`,
	]);
	const totals = new Map<string, MonthTotals>();
	const get = (period: string) => {
		const entry = totals.get(period) ?? {
			grossCents: 0,
			feesCents: 0,
			expensesCents: 0,
		};
		totals.set(period, entry);
		return entry;
	};
	for (const row of income) {
		const entry = get(row.period);
		entry.grossCents = Number(row.gross);
		entry.feesCents = Number(row.fees);
	}
	for (const row of expenses) get(row.period).expensesCents = Number(row.total);
	return totals;
}

const resultOf = (t: MonthTotals | undefined) =>
	t ? t.grossCents - t.feesCents - t.expensesCents : 0;

type Opening = { openingBalanceCents: number; openingBalanceDate: Date | null };

const openingPeriod = (condo: Opening) =>
	condo.openingBalanceDate?.toISOString().slice(0, 7) ?? null;

/** Cash at the start of `period`. */
function balanceBefore(
	condo: Opening,
	totals: Map<string, MonthTotals>,
	period: string,
) {
	const start = openingPeriod(condo);
	let cents = condo.openingBalanceCents;
	for (const [p, t] of totals) {
		if ((start === null || p >= start) && p < period) cents += resultOf(t);
	}
	return cents;
}

/** Billed charges that may have been overdue at some point before `until`. */
function loadDelinquencyCharges(condominiumId: string, until: Date) {
	return db.charge.findMany({
		where: {
			condominiumId,
			dueDate: { lt: until },
			status: { notIn: NOT_BILLED },
		},
		select: {
			unitId: true,
			amountCents: true,
			dueDate: true,
			status: true,
			paidAt: true,
			forgivenAt: true,
			agreement: { select: { createdAt: true } },
		},
	});
}

type DelinquencyCharge = Awaited<
	ReturnType<typeof loadDelinquencyCharges>
>[number];

/**
 * What was overdue at `cutoff` (docs/features/04, "Delinquency indicators"):
 * due at least a day before and not yet paid then. Renegotiated charges count
 * until their acordo, forgiven ones until they were written off.
 */
function delinquencyAt(
	charges: DelinquencyCharge[],
	cutoff: Date,
	unitsTotal: number,
) {
	let overdueCents = 0;
	const units = new Set<string>();
	for (const c of charges) {
		if (c.dueDate.getTime() >= cutoff.getTime() - DAY_MS) continue;
		if (c.paidAt && c.paidAt < cutoff) continue;
		if (c.status === "renegotiated") {
			const createdAt = c.agreement?.createdAt;
			if (!createdAt || createdAt < cutoff) continue;
		}
		if (c.status === "forgiven" && (!c.forgivenAt || c.forgivenAt < cutoff)) {
			continue;
		}
		overdueCents += c.amountCents;
		units.add(c.unitId);
	}
	return { overdueCents, units: units.size, unitsTotal };
}

async function loadCondo(condominiumId: string) {
	const condo = await db.condominium.findUnique({
		where: { id: condominiumId },
		select: {
			name: true,
			cnpj: true,
			openingBalanceCents: true,
			openingBalanceDate: true,
			_count: { select: { units: true } },
		},
	});
	if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
	return condo;
}

/** The balancete of a month, computed live from charges and expenses. */
export async function monthLedger(
	condominiumId: string,
	period: string,
): Promise<BalanceSheetData> {
	const { from, to } = periodBounds(period);
	const now = new Date();
	const cutoff = to < now ? to : now;
	const [condo, totals, paid, expenses, delinquencyCharges] = await Promise.all(
		[
			loadCondo(condominiumId),
			monthlyTotals(condominiumId),
			db.charge.findMany({
				where: {
					condominiumId,
					status: { in: PAID_STATUSES },
					paidAt: { gte: from, lt: to },
				},
				select: {
					type: true,
					amountCents: true,
					paidAmountCents: true,
					feeCents: true,
				},
			}),
			db.expense.findMany({
				where: { condominiumId, paidAt: { gte: from, lt: to } },
				orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
				select: {
					category: true,
					supplier: true,
					description: true,
					amountCents: true,
					paidAt: true,
				},
			}),
			loadDelinquencyCharges(condominiumId, cutoff),
		],
	);

	const byType = new Map<string, { cents: number; count: number }>();
	let grossIncomeCents = 0;
	let feesCents = 0;
	for (const c of paid) {
		const cents = c.paidAmountCents ?? c.amountCents;
		const entry = byType.get(c.type) ?? { cents: 0, count: 0 };
		entry.cents += cents;
		entry.count += 1;
		byType.set(c.type, entry);
		grossIncomeCents += cents;
		feesCents += c.feeCents ?? 0;
	}

	const byCategory = new Map<string, number>();
	let expensesCents = 0;
	for (const e of expenses) {
		byCategory.set(
			e.category,
			(byCategory.get(e.category) ?? 0) + e.amountCents,
		);
		expensesCents += e.amountCents;
	}

	const openingCents = balanceBefore(condo, totals, period);
	const netIncomeCents = grossIncomeCents - feesCents;
	const resultCents = netIncomeCents - expensesCents;
	return {
		version: 1,
		period,
		condominium: { name: condo.name, cnpj: condo.cnpj },
		openingCents,
		income: [...byType]
			.map(([type, v]) => ({ type, ...v }))
			.sort((a, b) => b.cents - a.cents),
		grossIncomeCents,
		feesCents,
		netIncomeCents,
		expensesByCategory: [...byCategory]
			.map(([category, cents]) => ({ category, cents }))
			.sort((a, b) => b.cents - a.cents),
		expensesCents,
		expenses: expenses.map((e) => ({
			date: e.paidAt.toISOString().slice(0, 10),
			category: e.category,
			supplier: e.supplier,
			description: e.description,
			cents: e.amountCents,
		})),
		resultCents,
		closingCents: openingCents + resultCents,
		delinquency: delinquencyAt(delinquencyCharges, cutoff, condo._count.units),
		generatedAt: now.toISOString(),
	};
}

/** Reads a published snapshot (throws if the JSON doesn't match). */
export const parseSnapshot = (snapshot: unknown) =>
	balanceSheetDataSchema.parse(snapshot);

/**
 * Every month with activity (or a balancete) from the start of the ledger up
 * to the current month, newest first. Published ones show their frozen
 * numbers; drafts show live ones.
 */
export async function balanceSheetList(condominiumId: string) {
	const [condo, totals, sheets] = await Promise.all([
		loadCondo(condominiumId),
		monthlyTotals(condominiumId),
		db.balanceSheet.findMany({
			where: { condominiumId },
			select: {
				id: true,
				period: true,
				status: true,
				snapshot: true,
				publishedAt: true,
			},
		}),
	]);
	const current = currentPeriod();
	// The ledger starts at the opening balance's month: earlier activity is
	// already part of that balance.
	const start = openingPeriod(condo);
	const candidates = [
		...totals.keys(),
		...sheets.map((s) => s.period),
		start,
	].filter(
		(p): p is string =>
			p !== null && p <= current && (start === null || p >= start),
	);
	let period = candidates.sort()[0] ?? current;

	const byPeriod = new Map(sheets.map((s) => [s.period, s]));
	const rows = [];
	let balance = balanceBefore(condo, totals, period);
	while (period <= current) {
		const t = totals.get(period);
		const resultCents = resultOf(t);
		balance += resultCents;
		const sheet = byPeriod.get(period);
		const published =
			sheet?.status === "published" && sheet.snapshot
				? parseSnapshot(sheet.snapshot)
				: null;
		rows.push({
			period,
			id: sheet?.id ?? null,
			status: published ? ("published" as const) : ("draft" as const),
			publishedAt: published ? (sheet?.publishedAt ?? null) : null,
			netIncomeCents: published
				? published.netIncomeCents
				: (t?.grossCents ?? 0) - (t?.feesCents ?? 0),
			expensesCents: published
				? published.expensesCents
				: (t?.expensesCents ?? 0),
			resultCents: published ? published.resultCents : resultCents,
			closingCents: published ? published.closingCents : balance,
			isCurrent: period === current,
		});
		period = addMonths(period, 1);
	}
	return rows.reverse();
}

/** Management dashboard: the last 12 months and where things stand now. */
export async function financeDashboard(condominiumId: string, months = 12) {
	const current = currentPeriod();
	const first = addMonths(current, -(months - 1));
	const now = new Date();
	const [condo, totals, charges, categories] = await Promise.all([
		loadCondo(condominiumId),
		monthlyTotals(condominiumId),
		loadDelinquencyCharges(condominiumId, now),
		db.expense.groupBy({
			by: ["category"],
			where: {
				condominiumId,
				paidAt: { gte: periodBounds(first).from },
			},
			_sum: { amountCents: true },
		}),
	]);

	const series = [];
	for (let i = 0; i < months; i++) {
		const period = addMonths(first, i);
		const t = totals.get(period);
		const { to } = periodBounds(period);
		const d = delinquencyAt(charges, to < now ? to : now, condo._count.units);
		series.push({
			period,
			netIncomeCents: (t?.grossCents ?? 0) - (t?.feesCents ?? 0),
			expensesCents: t?.expensesCents ?? 0,
			delinquencyRate: d.unitsTotal ? d.units / d.unitsTotal : 0,
		});
	}

	const delinquency = delinquencyAt(charges, now, condo._count.units);
	const thisMonth = series[series.length - 1];
	return {
		balanceCents: balanceBefore(condo, totals, addMonths(current, 1)),
		hasOpeningBalance: condo.openingBalanceDate !== null,
		current,
		thisMonth: {
			netIncomeCents: thisMonth?.netIncomeCents ?? 0,
			expensesCents: thisMonth?.expensesCents ?? 0,
		},
		delinquency: {
			...delinquency,
			rate: delinquency.unitsTotal
				? delinquency.units / delinquency.unitsTotal
				: 0,
		},
		series,
		topCategories: categories
			.map((c) => ({ category: c.category, cents: c._sum.amountCents ?? 0 }))
			.sort((a, b) => b.cents - a.cents)
			.slice(0, 5),
	};
}

/**
 * Refuses to change expenses of a month whose balancete is published:
 * residents saw those numbers. Unpublish first.
 */
export async function assertMonthOpen(condominiumId: string, date: Date) {
	const period = date.toISOString().slice(0, 7);
	const sheet = await db.balanceSheet.findUnique({
		where: { condominiumId_period: { condominiumId, period } },
		select: { status: true },
	});
	if (sheet?.status === "published") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: `O balancete de ${period.split("-").reverse().join("/")} já foi publicado. Despublique-o para alterar as despesas desse mês.`,
		});
	}
}
