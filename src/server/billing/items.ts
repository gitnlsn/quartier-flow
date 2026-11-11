import "server-only";

import { z } from "zod";

import { parsePeriod } from "~/lib/billing-items";
import { parseBRLToCents } from "~/lib/br";
import { db } from "~/server/db";

const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido");

/** Name, description, amount and schedule of an item (shared or individual). */
export const itemFields = z
	.object({
		name: z.string().trim().min(2, "Informe o nome do item").max(80),
		description: z
			.string()
			.trim()
			.max(200)
			.optional()
			.transform((v) => v || null),
		amountCents: z.number().int().positive("O valor deve ser maior que zero"),
		recurrence: z.enum(["monthly", "installments", "once"]),
		startPeriod: period,
		installments: z.number().int().min(2).max(120).nullable(),
	})
	.refine((v) => v.recurrence !== "installments" || v.installments, {
		message: "Informe o número de parcelas",
		path: ["installments"],
	})
	.transform((v) => ({
		...v,
		installments: v.recurrence === "installments" ? v.installments : null,
	}));

// ---------------------------------------------------------------------------
// Spreadsheet import of individual items (e.g. a month's gas consumption)
// ---------------------------------------------------------------------------

export type ItemImportRow = {
	block: string;
	unit: string;
	name: string;
	description: string;
	amount: string;
	period: string;
};

export type ItemImportResult = {
	line: number;
	status: "create" | "skip" | "error";
	messages: string[];
	data: {
		unit: string;
		name: string;
		description: string;
		amountCents: number | null;
		period: string | null;
	};
};

const unitKey = (block: string, number: string) =>
	`${block.trim().toUpperCase()}|${number.trim().toUpperCase()}`;

/** Spreadsheet amounts: "1.234,56", "1234.56", "R$ 85,00" or numbers. */
function parseAmount(value: string): number | null {
	const text = value.trim();
	if (/^\d+(\.\d{1,2})?$/.test(text)) return Math.round(Number(text) * 100);
	return parseBRLToCents(text);
}

/**
 * Validates rows without saving. Each valid row becomes a one-off item of the
 * unit in its month (column or the default month chosen on screen).
 */
export async function validateItemImport(input: {
	condominiumId: string;
	defaultPeriod: string;
	rows: ItemImportRow[];
}): Promise<ItemImportResult[]> {
	const [units, existing] = await Promise.all([
		db.unit.findMany({
			where: { condominiumId: input.condominiumId },
			select: { id: true, block: true, number: true },
		}),
		db.unitBillingItem.findMany({
			where: {
				condominiumId: input.condominiumId,
				archivedAt: null,
				recurrence: "once",
			},
			select: { unitId: true, name: true, startPeriod: true },
		}),
	]);
	const unitByKey = new Map(units.map((u) => [unitKey(u.block, u.number), u]));
	const existingKeys = new Set(
		existing.map((e) => `${e.unitId}|${e.name.toLowerCase()}|${e.startPeriod}`),
	);
	const seen = new Set<string>();

	return input.rows.map((row, index) => {
		const messages: string[] = [];
		let error = false;
		const fail = (message: string) => {
			error = true;
			messages.push(message);
		};

		const unit = unitByKey.get(unitKey(row.block, row.unit));
		const name = row.name.trim();
		const amountCents = parseAmount(row.amount);
		const rowPeriod = row.period.trim()
			? parsePeriod(row.period)
			: input.defaultPeriod;

		if (!row.unit.trim()) fail("Unidade ausente.");
		else if (!unit) fail("Unidade não existe neste condomínio.");
		if (name.length < 2) fail("Nome do item ausente.");
		if (amountCents === null) fail(`Valor inválido: "${row.amount}".`);
		else if (amountCents <= 0) fail("O valor deve ser maior que zero.");
		if (!rowPeriod) fail(`Mês inválido: "${row.period}".`);

		let status: ItemImportResult["status"] = error ? "error" : "create";
		if (!error && unit && rowPeriod) {
			const key = `${unit.id}|${name.toLowerCase()}|${rowPeriod}`;
			if (seen.has(key)) {
				status = "error";
				messages.push("Linha repetida na planilha.");
			} else if (existingKeys.has(key)) {
				status = "skip";
				messages.push("Já existe este item neste mês: será ignorado.");
			}
			seen.add(key);
		}

		return {
			line: index + 2,
			status,
			messages,
			data: {
				unit: [row.block.trim(), row.unit.trim()].filter(Boolean).join(" · "),
				name,
				description: row.description.trim(),
				amountCents,
				period: rowPeriod,
			},
		};
	});
}

/** Creates the valid rows as one-off items of each unit. */
export async function runItemImport(input: {
	condominiumId: string;
	defaultPeriod: string;
	rows: ItemImportRow[];
}) {
	const results = await validateItemImport(input);
	const units = await db.unit.findMany({
		where: { condominiumId: input.condominiumId },
		select: { id: true, block: true, number: true },
	});
	const unitByKey = new Map(
		units.map((u) => [unitKey(u.block, u.number), u.id]),
	);

	const data = results
		.filter((r) => r.status === "create")
		.map((r) => {
			const raw = input.rows[r.line - 2];
			const unitId = raw
				? unitByKey.get(unitKey(raw.block, raw.unit))
				: undefined;
			if (!unitId || r.data.amountCents === null || !r.data.period) return null;
			return {
				condominiumId: input.condominiumId,
				unitId,
				name: r.data.name,
				description: r.data.description || null,
				amountCents: r.data.amountCents,
				recurrence: "once",
				startPeriod: r.data.period,
				source: "import",
			};
		})
		.filter((row): row is NonNullable<typeof row> => row !== null);

	const created = await db.unitBillingItem.createMany({ data });
	return {
		created: created.count,
		skipped: results.filter((r) => r.status === "skip").length,
		invalid: results.filter((r) => r.status === "error").length,
		totalCents: data.reduce((sum, row) => sum + row.amountCents, 0),
	};
}
