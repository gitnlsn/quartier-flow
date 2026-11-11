/** Reading CSV/XLSX files in the browser and guessing column mappings. */

export const normalizeHeader = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");

function cellToText(value: unknown): string {
	if (value === null || value === undefined) return "";
	if (value instanceof Date) return value.toISOString().slice(0, 7);
	return String(value).trim();
}

/** Rows of the first sheet as text; the first row is the header. */
export async function readSpreadsheet(file: File): Promise<string[][]> {
	const name = file.name.toLowerCase();
	if (name.endsWith(".csv") || file.type === "text/csv") {
		const Papa = (await import("papaparse")).default;
		const text = await file.text();
		const parsed = Papa.parse<string[]>(text, {
			skipEmptyLines: "greedy",
			delimiter: "", // auto-detect "," or ";" (common in Brazilian Excel)
		});
		return parsed.data.map((row) => row.map(cellToText));
	}
	if (name.endsWith(".xlsx")) {
		const { readSheet } = await import("read-excel-file/browser");
		const data = await readSheet(file);
		return data
			.map((row) => row.map(cellToText))
			.filter((row) => row.some((cell) => cell !== ""));
	}
	throw new Error("Use um arquivo .csv ou .xlsx.");
}

/** Index of the first header matching one of the synonyms (or null). */
export function guessColumns<K extends string>(
	headers: string[],
	fields: { key: K; synonyms: string[] }[],
): Record<K, number | null> {
	const normalized = headers.map(normalizeHeader);
	const mapping = {} as Record<K, number | null>;
	for (const field of fields) {
		const index = normalized.findIndex((h) => field.synonyms.includes(h));
		mapping[field.key] = index >= 0 ? index : null;
	}
	return mapping;
}

/** Downloads a CSV template (with BOM so Excel opens accents correctly). */
export function downloadCsv(fileName: string, lines: string[]) {
	const blob = new Blob([`﻿${lines.join("\n")}`], {
		type: "text/csv;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	link.click();
	URL.revokeObjectURL(url);
}
