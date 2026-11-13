/**
 * Payment reminder options (docs/features/04), shared by the settings form
 * and the server. 0 is Asaas's fixed slot ("on the due date" / "when it
 * becomes overdue"); at most one other value per list (the adjustable slot).
 */
export const REMINDER_BEFORE_OPTIONS = [0, 5, 10, 15, 30] as const;
export const REMINDER_AFTER_OPTIONS = [0, 1, 7, 15, 30] as const;

/** Toggles 0; any other value replaces the current non-zero one. */
export function pickReminder(list: number[], value: number) {
	if (list.includes(value)) return list.filter((v) => v !== value);
	if (value === 0) return [0, ...list];
	return [...list.filter((v) => v === 0), value];
}

/** Valid: only allowed values, no repeats, at most one non-zero. */
export function validReminders(list: number[], allowed: readonly number[]) {
	return (
		list.every((v) => allowed.includes(v)) &&
		new Set(list).size === list.length &&
		list.filter((v) => v !== 0).length <= 1
	);
}

/**
 * Our own collection schedule (docs/features/04), used when the
 * administradora sends reminders through the app instead of Asaas.
 * offsetDays < 0: before the due date; 0: on the due date; > 0: overdue.
 * "managers" steps escalate to the administradora and síndicos.
 */
export type CollectionAudience = "payer" | "managers";
export type CollectionStepInput = {
	offsetDays: number;
	audience: CollectionAudience;
};

export const DEFAULT_COLLECTION_STEPS: CollectionStepInput[] = [
	{ offsetDays: -3, audience: "payer" },
	{ offsetDays: 0, audience: "payer" },
	{ offsetDays: 1, audience: "payer" },
	{ offsetDays: 7, audience: "payer" },
	{ offsetDays: 15, audience: "payer" },
	{ offsetDays: 30, audience: "managers" },
];

export const MIN_STEP_OFFSET = -30;
export const MAX_STEP_OFFSET = 120;
export const MAX_COLLECTION_STEPS = 12;

/** "3 dias antes", "No vencimento", "7 dias depois". */
export function stepLabel(offsetDays: number) {
	if (offsetDays === 0) return "No vencimento";
	const n = Math.abs(offsetDays);
	return `${n} dia${n === 1 ? "" : "s"} ${offsetDays < 0 ? "antes" : "depois"}`;
}

export const sortSteps = <T extends CollectionStepInput>(steps: T[]) =>
	[...steps].sort(
		(a, b) =>
			a.offsetDays - b.offsetDays || a.audience.localeCompare(b.audience),
	);

/** Who sends payment reminders, chosen per administradora. */
export type ReminderSender = "asaas" | "app";
