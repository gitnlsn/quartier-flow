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
