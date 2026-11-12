import { formatBRL } from "~/lib/br";

/**
 * Reservation rules shared by server (rule engine) and client (calendar).
 * Docs: docs/features/06.
 *
 * Times are stored in UTC and shown in São Paulo time. Brazil has had no
 * daylight saving since 2019, so São Paulo is a fixed UTC-3: converting a
 * local date/hour is plain arithmetic, the same in the browser and the server.
 */

const SP_OFFSET_HOURS = 3;
const HOUR = 3_600_000;
export const TIME_ZONE = "America/Sao_Paulo";

/** UTC instant of `hour` (0-24) on a São Paulo date "YYYY-MM-DD". */
export function spInstant(date: string, hour: number) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(
		Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1, hour + SP_OFFSET_HOURS),
	);
}

/** São Paulo date "YYYY-MM-DD" of an instant. */
export const spDate = (instant: Date) =>
	new Date(instant.getTime() - SP_OFFSET_HOURS * HOUR)
		.toISOString()
		.slice(0, 10);

/** São Paulo hour (0-23) of an instant. */
export const spHour = (instant: Date) =>
	new Date(instant.getTime() - SP_OFFSET_HOURS * HOUR).getUTCHours();

/** São Paulo month "YYYY-MM" of an instant. */
export const spMonth = (instant: Date) => spDate(instant).slice(0, 7);

/** Start (inclusive) and end (exclusive) instants of a São Paulo month. */
export function monthRange(month: string) {
	const [y, m] = month.split("-").map(Number);
	const next = new Date(Date.UTC(y ?? 0, m ?? 1, 1)).toISOString().slice(0, 7);
	return { from: spInstant(`${month}-01`, 0), to: spInstant(`${next}-01`, 0) };
}

/** "YYYY-MM-DD" one day after `date`. */
export function nextDate(date: string) {
	const [y, m, d] = date.split("-").map(Number);
	return new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, (d ?? 1) + 1))
		.toISOString()
		.slice(0, 10);
}

export type SlotRules = {
	slotType: string;
	opensHour: number;
	closesHour: number;
	maxHours: number | null;
	minAdvanceHours: number;
	maxAdvanceDays: number;
	/** Recurring closure: 0 = Sunday … 6 = Saturday. */
	closedWeekdays: number[];
	/** One-off closures that apply to this area (AreaBlock). */
	blocks?: Block[];
};

/** A one-off closure: inclusive São Paulo dates "YYYY-MM-DD". */
export type Block = { startsOn: string; endsOn: string; reason: string | null };

export const WEEKDAYS = [
	"domingo",
	"segunda",
	"terça",
	"quarta",
	"quinta",
	"sexta",
	"sábado",
];

/** Weekday (0 = Sunday) of a date "YYYY-MM-DD". */
export const weekdayOf = (date: string) =>
	new Date(`${date}T12:00:00Z`).getUTCDay();

const shortDate = (date: string) =>
	date.slice(5).split("-").reverse().join("/");

/** "28/11" or "28/11 a 30/11". */
export const rangeLabel = (startsOn: string, endsOn: string) =>
	startsOn === endsOn
		? shortDate(startsOn)
		: `${shortDate(startsOn)} a ${shortDate(endsOn)}`;

/** The block covering a date, if any. */
export const blockOn = (blocks: Block[] | undefined, date: string) =>
	blocks?.find((b) => b.startsOn <= date && date <= b.endsOn) ?? null;

/** Why the area is closed on a date (null = open). */
export function closedReason(rules: SlotRules, date: string): string | null {
	const block = blockOn(rules.blocks, date);
	if (block) {
		return block.reason
			? `Fechada nesta data: ${block.reason}.`
			: "Fechada nesta data pela administração.";
	}
	if (rules.closedWeekdays.includes(weekdayOf(date))) {
		return `Fechada às ${WEEKDAYS[weekdayOf(date)]}s.`;
	}
	return null;
}

export type Busy = { startsAt: Date | string; endsAt: Date | string };

export const overlaps = (a: Busy, b: Busy) =>
	new Date(a.startsAt) < new Date(b.endsAt) &&
	new Date(b.startsAt) < new Date(a.endsAt);

/** Interval of a booking: the whole day, or `hours` from `startHour`. */
export function slotInterval(
	rules: Pick<SlotRules, "slotType">,
	date: string,
	startHour?: number | null,
	hours?: number | null,
) {
	if (rules.slotType === "day") {
		return { startsAt: spInstant(date, 0), endsAt: spInstant(date, 24) };
	}
	const start = startHour ?? 0;
	return {
		startsAt: spInstant(date, start),
		endsAt: spInstant(date, start + (hours ?? 1)),
	};
}

/**
 * Why a slot can't be booked under the area's time rules (null = it can).
 * Per-unit limits, delinquency and conflicts are checked on the server.
 */
export function slotProblem(
	rules: SlotRules,
	slot: { startsAt: Date; endsAt: Date },
	now = new Date(),
): string | null {
	const date = spDate(slot.startsAt);
	const closed = closedReason(rules, date);
	if (closed) return closed;
	if (rules.slotType === "hour") {
		const start = spHour(slot.startsAt);
		const hours = (slot.endsAt.getTime() - slot.startsAt.getTime()) / HOUR;
		if (start < rules.opensHour || start + hours > rules.closesHour) {
			return `Horário fora do funcionamento (${hourLabel(rules.opensHour)} às ${hourLabel(rules.closesHour)}).`;
		}
		if (rules.maxHours && hours > rules.maxHours) {
			return `Reserva de no máximo ${rules.maxHours} hora(s).`;
		}
	}
	const advance = slot.startsAt.getTime() - now.getTime();
	if (advance < rules.minAdvanceHours * HOUR) {
		return rules.minAdvanceHours > 0
			? `Reserve com pelo menos ${advanceLabel(rules.minAdvanceHours)} de antecedência.`
			: "Este horário já passou.";
	}
	if (advance > rules.maxAdvanceDays * 24 * HOUR) {
		return `Reservas abrem com até ${rules.maxAdvanceDays} dias de antecedência.`;
	}
	return null;
}

/** Hours a booking starting at `startHour` can last (all free, within hours). */
export function durationsFrom(
	rules: SlotRules,
	date: string,
	startHour: number,
	busy: Busy[],
) {
	const result: number[] = [];
	const limit = Math.min(
		rules.closesHour - startHour,
		rules.maxHours ?? Number.POSITIVE_INFINITY,
	);
	for (let hours = 1; hours <= limit; hours++) {
		const hour = slotInterval(rules, date, startHour + hours - 1, 1);
		if (busy.some((b) => overlaps(b, hour))) break;
		result.push(hours);
	}
	return result;
}

/** Start hours of a date that can be booked (at least one free hour). */
export function freeStartHours(
	rules: SlotRules,
	date: string,
	busy: Busy[],
	now = new Date(),
) {
	const hours: number[] = [];
	for (let h = rules.opensHour; h < rules.closesHour; h++) {
		const slot = slotInterval(rules, date, h, 1);
		if (slotProblem(rules, slot, now)) continue;
		if (busy.some((b) => overlaps(b, slot))) continue;
		hours.push(h);
	}
	return hours;
}

/** Whether a date has room: "free", "partial" (hourly), "full" or "closed". */
export function dayStatus(
	rules: SlotRules,
	date: string,
	busy: Busy[],
	now = new Date(),
): "free" | "partial" | "full" | "closed" {
	if (rules.slotType === "day") {
		const slot = slotInterval(rules, date);
		if (slotProblem(rules, slot, now)) return "closed";
		return busy.some((b) => overlaps(b, slot)) ? "full" : "free";
	}
	const day = slotInterval({ slotType: "day" }, date);
	if (closedReason(rules, date)) return "closed";
	const free = freeStartHours(rules, date, busy, now);
	if (free.length === 0) {
		// Nothing free: closed by the rules, or taken by other bookings.
		const anyOpen = Array.from(
			{ length: rules.closesHour - rules.opensHour },
			(_, i) => slotInterval(rules, date, rules.opensHour + i, 1),
		).some((slot) => !slotProblem(rules, slot, now));
		return anyOpen ? "full" : "closed";
	}
	return busy.some((b) => overlaps(b, day)) ? "partial" : "free";
}

export const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}h`;

export function advanceLabel(hours: number) {
	if (hours % 24 === 0 && hours >= 24) {
		const days = hours / 24;
		return days === 1 ? "1 dia" : `${days} dias`;
	}
	return hours === 1 ? "1 hora" : `${hours} horas`;
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", {
	timeZone: TIME_ZONE,
	weekday: "short",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
});

/** "sáb., 21/11/2026 · Dia inteiro" or "sáb., 21/11/2026 · 14h às 18h". */
export function slotLabel(
	slotType: string,
	startsAt: Date | string,
	endsAt: Date | string,
) {
	const start = new Date(startsAt);
	const day = dateFormat.format(start);
	if (slotType === "day") return `${day} · Dia inteiro`;
	const end = new Date(endsAt);
	const endHour = spHour(end) === 0 ? 24 : spHour(end);
	return `${day} · ${hourLabel(spHour(start))} às ${hourLabel(endHour)}`;
}

/** Status shown for a reservation (a past confirmed one is "Realizada"). */
export function reservationStatus(
	status: string,
	endsAt: Date | string,
	now = new Date(),
) {
	if (status === "confirmed" && new Date(endsAt) <= now) return "completed";
	return status;
}

export const RESERVATION_STATUS: Record<
	string,
	{ label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
	pending: { label: "Aguardando aprovação", tone: "warning" },
	confirmed: { label: "Confirmada", tone: "success" },
	completed: { label: "Realizada", tone: "neutral" },
	rejected: { label: "Recusada", tone: "danger" },
	canceled: { label: "Cancelada", tone: "neutral" },
};

/** Statuses that hold the slot. */
export const ACTIVE_STATUSES = ["pending", "confirmed"];

/** Plain-language summary of an area's rules (also shown to residents). */
export function areaRules(
	area: SlotRules & {
		capacity: number | null;
		feeCents: number;
		maxPerUnitPerMonth: number | null;
		cancelUntilHours: number;
		requiresApproval: boolean;
		blockDelinquent: boolean;
	},
): string[] {
	return [
		area.slotType === "day"
			? "Reserva por dia inteiro"
			: `Por hora, das ${hourLabel(area.opensHour)} às ${hourLabel(area.closesHour)}${area.maxHours ? `, até ${area.maxHours}h por reserva` : ""}`,
		area.capacity ? `Até ${area.capacity} pessoas` : null,
		area.feeCents > 0
			? `Taxa de ${formatBRL(area.feeCents)}, na próxima cobrança do condomínio`
			: "Sem taxa",
		area.minAdvanceHours > 0
			? `Antecedência mínima de ${advanceLabel(area.minAdvanceHours)}`
			: null,
		`Agenda aberta para os próximos ${area.maxAdvanceDays} dias`,
		area.maxPerUnitPerMonth
			? `Até ${area.maxPerUnitPerMonth} reserva(s) por unidade ao mês`
			: null,
		area.cancelUntilHours > 0
			? `Cancelamento até ${advanceLabel(area.cancelUntilHours)} antes`
			: "Cancelamento até o início da reserva",
		area.closedWeekdays.length
			? `Fechada: ${[...area.closedWeekdays]
					.sort()
					.map((d) => WEEKDAYS[d])
					.join(", ")}`
			: null,
		area.requiresApproval ? "Precisa de aprovação do síndico" : null,
		area.blockDelinquent
			? "Unidades com cobranças em atraso não reservam"
			: null,
	].filter((rule): rule is string => Boolean(rule));
}
