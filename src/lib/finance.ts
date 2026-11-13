import { z } from "zod";

/**
 * Financial transparency (docs/features/05): the balancete shape shared by
 * the server (ledger, PDF), the management area and the resident view.
 *
 * Cash basis: a charge counts as income in the month of its `paidAt` once it
 * is `confirmed` or `received`; Asaas fees are shown as their own line. A
 * published balancete stores this object as a frozen snapshot.
 */

export const PERIOD_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const CHARGE_TYPE_LABEL: Record<string, string> = {
	monthly: "Taxas condominiais",
	extra: "Cobranças extras",
	reservation: "Reservas de áreas comuns",
	fine: "Multas",
	agreement: "Acordos (entradas)",
};

export const chargeTypeLabel = (type: string) =>
	CHARGE_TYPE_LABEL[type] ?? "Outras receitas";

export const balanceSheetDataSchema = z.object({
	version: z.literal(1),
	period: z.string(),
	condominium: z.object({ name: z.string(), cnpj: z.string().nullable() }),
	openingCents: z.number().int(),
	income: z.array(
		z.object({
			type: z.string(),
			cents: z.number().int(),
			count: z.number().int(),
		}),
	),
	grossIncomeCents: z.number().int(),
	feesCents: z.number().int(),
	netIncomeCents: z.number().int(),
	expensesByCategory: z.array(
		z.object({ category: z.string(), cents: z.number().int() }),
	),
	expensesCents: z.number().int(),
	expenses: z.array(
		z.object({
			date: z.string(),
			category: z.string(),
			supplier: z.string().nullable(),
			description: z.string(),
			cents: z.number().int(),
		}),
	),
	/** Net income minus expenses. */
	resultCents: z.number().int(),
	closingCents: z.number().int(),
	/** Overdue at the end of the month (or now, for the current month). */
	delinquency: z.object({
		overdueCents: z.number().int(),
		units: z.number().int(),
		unitsTotal: z.number().int(),
	}),
	generatedAt: z.string(),
});

export type BalanceSheetData = z.infer<typeof balanceSheetDataSchema>;

/** The month we're in, in Brazil (YYYY-MM). */
export function currentPeriod(now = new Date()) {
	return now
		.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
		.slice(0, 7);
}

export function addMonths(period: string, months: number) {
	const [y = 0, m = 1] = period.split("-").map(Number);
	const d = new Date(Date.UTC(y, m - 1 + months, 1));
	return d.toISOString().slice(0, 7);
}

/** UTC bounds [from, to) of a YYYY-MM period. */
export function periodBounds(period: string) {
	const from = new Date(`${period}-01T00:00:00Z`);
	const to = new Date(`${addMonths(period, 1)}-01T00:00:00Z`);
	return { from, to };
}

const MONTHS = [
	"janeiro",
	"fevereiro",
	"março",
	"abril",
	"maio",
	"junho",
	"julho",
	"agosto",
	"setembro",
	"outubro",
	"novembro",
	"dezembro",
];

/** "novembro de 2026" */
export function periodLongLabel(period: string) {
	const [y, m = 1] = period.split("-").map(Number);
	return `${MONTHS[m - 1] ?? ""} de ${y}`;
}

/** "Novembro de 2026" for titles (CSS `capitalize` would also change "De"). */
export function periodTitle(period: string) {
	const label = periodLongLabel(period);
	return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "nov/26" for chart axes. */
export function periodShortLabel(period: string) {
	const [y = 0, m = 1] = period.split("-").map(Number);
	return `${(MONTHS[m - 1] ?? "").slice(0, 3)}/${String(y).slice(2)}`;
}

/** Rows for the CSV export (one table: section, item, value in reais). */
export function balanceSheetCsvRows(data: BalanceSheetData) {
	const reais = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
	const rows: string[][] = [
		["Seção", "Data", "Descrição", "Categoria", "Fornecedor", "Valor (R$)"],
		["Saldo inicial", "", "", "", "", reais(data.openingCents)],
	];
	for (const i of data.income) {
		rows.push([
			"Receita",
			"",
			`${chargeTypeLabel(i.type)} (${i.count})`,
			"",
			"",
			reais(i.cents),
		]);
	}
	rows.push([
		"Tarifas bancárias (Asaas)",
		"",
		"",
		"",
		"",
		reais(-data.feesCents),
	]);
	for (const e of data.expenses) {
		rows.push([
			"Despesa",
			e.date.split("-").reverse().join("/"),
			e.description,
			e.category,
			e.supplier ?? "",
			reais(-e.cents),
		]);
	}
	rows.push(["Resultado do mês", "", "", "", "", reais(data.resultCents)]);
	rows.push(["Saldo final", "", "", "", "", reais(data.closingCents)]);
	return rows;
}

/** CSV lines (`;` separator, quoted cells: opens directly in Excel pt-BR). */
export const balanceSheetCsvLines = (data: BalanceSheetData) =>
	balanceSheetCsvRows(data).map((row) =>
		row.map((v) => `"${v.replace(/"/g, '""')}"`).join(";"),
	);
