/**
 * Billing item rules shared by server (runs) and client (labels, previews).
 * Periods are "YYYY-MM".
 */

export type Recurrence = "monthly" | "installments" | "once";

export type ItemSchedule = {
	recurrence: string;
	startPeriod: string;
	installments: number | null;
};

const toIndex = (period: string) => {
	const [year, month] = period.split("-").map(Number);
	return (year ?? 0) * 12 + ((month ?? 1) - 1);
};

export function addMonths(period: string, months: number) {
	const index = toIndex(period) + months;
	const year = Math.floor(index / 12);
	const month = (index % 12) + 1;
	return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Whether an item is charged in a period, and its installment label
 * ("2/6") when it has installments. Returns null when it doesn't apply.
 */
export function itemForPeriod(
	item: ItemSchedule,
	period: string,
): { installment: string | null } | null {
	const offset = toIndex(period) - toIndex(item.startPeriod);
	if (offset < 0) return null;
	switch (item.recurrence) {
		case "monthly":
			return { installment: null };
		case "once":
			return offset === 0 ? { installment: null } : null;
		case "installments": {
			const total = item.installments ?? 1;
			return offset < total ? { installment: `${offset + 1}/${total}` } : null;
		}
		default:
			return null;
	}
}

/** Last period an item is charged in (null = no end). */
export function lastPeriod(item: ItemSchedule): string | null {
	if (item.recurrence === "monthly") return null;
	if (item.recurrence === "once") return item.startPeriod;
	return addMonths(item.startPeriod, (item.installments ?? 1) - 1);
}

export const formatPeriod = (period: string) =>
	period.split("-").reverse().join("/");

/** Human label: "Todo mês desde 11/2026", "6 parcelas de 12/2026 a 05/2027"… */
export function scheduleLabel(item: ItemSchedule) {
	switch (item.recurrence) {
		case "monthly":
			return `Todo mês desde ${formatPeriod(item.startPeriod)}`;
		case "once":
			return `Só em ${formatPeriod(item.startPeriod)}`;
		case "installments":
			return `${item.installments ?? 1} parcela(s): ${formatPeriod(item.startPeriod)} a ${formatPeriod(lastPeriod(item) ?? item.startPeriod)}`;
		default:
			return item.recurrence;
	}
}

/** "11/2026", "2026-11" or "nov/2026" → "2026-11"; null when invalid. */
export function parsePeriod(input: string): string | null {
	const value = input.trim().toLowerCase();
	const iso = /^(\d{4})-(\d{1,2})$/.exec(value);
	const br = /^(\d{1,2})\/(\d{4})$/.exec(value);
	const months = [
		"jan",
		"fev",
		"mar",
		"abr",
		"mai",
		"jun",
		"jul",
		"ago",
		"set",
		"out",
		"nov",
		"dez",
	];
	const named = /^([a-zç]{3})[a-zç]*\/(\d{4})$/.exec(value);
	let year: number | undefined;
	let month: number | undefined;
	if (iso) [year, month] = [Number(iso[1]), Number(iso[2])];
	else if (br) [year, month] = [Number(br[2]), Number(br[1])];
	else if (named) {
		const index = months.indexOf(named[1] ?? "");
		if (index >= 0) [year, month] = [Number(named[2]), index + 1];
	}
	if (!year || !month || month < 1 || month > 12) return null;
	return `${year}-${String(month).padStart(2, "0")}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Next billing cycle from `today`: preparation date and the due date of the
 * charge it prepares (due day <= preparation day falls in the next month).
 */
export function nextCycle(
	generationDay: number,
	dueDay: number,
	today = new Date(),
) {
	let year = today.getFullYear();
	let month = today.getMonth(); // 0-based month of the next preparation
	if (today.getDate() > generationDay) month += 1;
	if (month > 11) {
		month = 0;
		year += 1;
	}
	let dueMonth = month + (dueDay > generationDay ? 0 : 1);
	let dueYear = year;
	if (dueMonth > 11) {
		dueMonth = 0;
		dueYear += 1;
	}
	return {
		prepare: `${pad(generationDay)}/${pad(month + 1)}/${year}`,
		due: `${pad(dueDay)}/${pad(dueMonth + 1)}/${dueYear}`,
		reference: `${pad(dueMonth + 1)}/${dueYear}`,
		/** Reference period of the charge ("YYYY-MM"). */
		period: `${dueYear}-${pad(dueMonth + 1)}`,
		nextMonth: dueDay <= generationDay,
	};
}
