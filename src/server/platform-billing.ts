import "server-only";

import { env } from "~/env";
import { formatBRL } from "~/lib/br";
import { INVOICE_DUE_DAY } from "~/lib/onboarding";
import { AsaasError } from "~/server/asaas/client";
import { ensureAdministradoraCustomer } from "~/server/asaas/customers";
import { createPayment } from "~/server/asaas/payments";
import { deliver, sendEmail } from "~/server/auth/messaging";
import type { db as Db } from "~/server/db";
import { countSeats } from "~/server/seats";

/**
 * Monthly Quartier Flow invoice to each administradora (docs/features/18,
 * Termos de Uso 8.1-8.3):
 * - issued on the 1st for the previous calendar month;
 * - seats = residents and síndicos active at the end of the billed range;
 * - prorated by days: the first month from the signing day, the month of
 *   closing up to the closing day;
 * - boleto/Pix from our main Asaas account (no split), due on the 10th.
 */

/** Asaas doesn't issue boleto/Pix below this; smaller invoices are waived. */
export const MINIMUM_INVOICE_CENTS = 500;

const TZ = "America/Sao_Paulo";
/** Brazil has had no DST since 2019: local time is UTC-3. */
const UTC_OFFSET_HOURS = 3;

/** Calendar day of `date` in Brazil. */
export function localDay(date: Date) {
	const [y, m, d] = date
		.toLocaleDateString("en-CA", { timeZone: TZ })
		.split("-")
		.map(Number);
	return { year: y ?? 0, month: m ?? 1, day: d ?? 1 };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const periodKey = (year: number, month: number) =>
	`${year}-${pad(month)}`;

/** "2026-11" -> the month before, as a period key. */
export function previousPeriod(date: Date) {
	const { year, month } = localDay(date);
	return month === 1 ? periodKey(year - 1, 12) : periodKey(year, month - 1);
}

function parsePeriod(period: string) {
	const [y, m] = period.split("-").map(Number);
	return { year: y ?? 0, month: m ?? 1 };
}

const daysIn = (year: number, month: number) =>
	new Date(Date.UTC(year, month, 0)).getUTCDate();
/** Noon UTC of a calendar day: stable "date only" values. */
const dayDate = (year: number, month: number, day: number) =>
	new Date(Date.UTC(year, month - 1, day, 12));
/** Last instant of a local day in Brazil. */
const endOfLocalDay = (year: number, month: number, day: number) =>
	new Date(Date.UTC(year, month - 1, day + 1, UTC_OFFSET_HOURS) - 1);
const startOfLocalMonth = (year: number, month: number) =>
	new Date(Date.UTC(year, month - 1, 1, UTC_OFFSET_HOURS));

export const formatPeriodLong = (period: string) => {
	const { year, month } = parsePeriod(period);
	return dayDate(year, month, 1).toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
};

/**
 * What the administradora owes for `period`, or null when it had no plan in
 * that month. Pure calculation: nothing is written.
 */
export async function computeInvoice(
	db: typeof Db,
	administradoraId: string,
	period: string,
	/** Estimate as if closed at this moment (the closing screen). */
	assumeClosedAt?: Date,
) {
	const { year, month } = parsePeriod(period);
	const daysInMonth = daysIn(year, month);
	const [administradora, subscriptions] = await Promise.all([
		db.administradora.findUniqueOrThrow({
			where: { id: administradoraId },
			select: { closedAt: true },
		}),
		db.administradoraPlan.findMany({
			where: { administradoraId },
			include: { plan: true },
			orderBy: { startedAt: "asc" },
		}),
	]);
	const first = subscriptions[0];
	if (!first) return null;

	// First billed day: the signing day in its month, else the 1st.
	const signed = localDay(first.startedAt);
	const signedKey = periodKey(signed.year, signed.month);
	if (signedKey > period) return null;
	const startDay = signedKey === period ? signed.day : 1;

	// Last billed day: the closing day in its month, else the month's last.
	let endDay = daysInMonth;
	let seatsAt = endOfLocalDay(year, month, daysInMonth);
	const closedAt = assumeClosedAt ?? administradora.closedAt;
	if (closedAt) {
		const closed = localDay(closedAt);
		const closedKey = periodKey(closed.year, closed.month);
		if (closedKey < period) return null;
		if (closedKey === period) {
			endDay = closed.day;
			seatsAt = closedAt;
		}
	}
	if (endDay < startDay) return null;

	// Price: the plan in force at the end of the range (changes apply from
	// the next invoice), falling back to the latest one started before it.
	const started = subscriptions.filter((s) => s.startedAt <= seatsAt);
	const subscription =
		started.filter((s) => !s.endedAt || s.endedAt >= seatsAt).at(-1) ??
		started.at(-1);
	if (!subscription) return null;
	const { plan } = subscription;

	const seats = await countSeats(db, administradoraId, seatsAt);
	const billedDays = endDay - startDay + 1;
	const fullMonthCents =
		seats.residents * plan.residentSeatCents +
		seats.sindicos * plan.sindicoSeatCents;
	const totalCents = Math.round((fullMonthCents * billedDays) / daysInMonth);
	const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

	return {
		period,
		periodStart: dayDate(year, month, startDay),
		periodEnd: dayDate(year, month, endDay),
		planId: plan.id,
		planName: plan.name,
		residentSeats: seats.residents,
		sindicoSeats: seats.sindicos,
		residentSeatCents: plan.residentSeatCents,
		sindicoSeatCents: plan.sindicoSeatCents,
		billedDays,
		daysInMonth,
		totalCents,
		dueDate: dayDate(next.y, next.m, INVOICE_DUE_DAY),
	};
}

const plural = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

/** Due date for (re)sending: the 10th, or 3 days from today if that passed. */
function sendableDueDate(dueDate: Date, today: Date) {
	const { year, month, day } = localDay(today);
	const soonest = dayDate(year, month, day + 3);
	return dueDate < dayDate(year, month, day) ? soonest : dueDate;
}

export type IssueResult =
	| { status: "skipped"; reason: string }
	| {
			status: "issued" | "waived" | "failed";
			invoiceId: string;
			issue?: string;
	  };

/**
 * Issues (or retries) the invoice of `period`. Idempotent: an invoice that
 * isn't `failed` is left alone; the Asaas payment is keyed by invoice id.
 */
export async function issueInvoice(
	db: typeof Db,
	administradoraId: string,
	period: string,
	today = new Date(),
): Promise<IssueResult> {
	const existing = await db.platformInvoice.findUnique({
		where: { administradoraId_period: { administradoraId, period } },
	});
	if (existing && existing.status !== "failed") {
		return { status: "skipped", reason: `already ${existing.status}` };
	}

	let invoice = existing;
	if (!invoice) {
		const computed = await computeInvoice(db, administradoraId, period);
		if (!computed) return { status: "skipped", reason: "no plan in period" };
		const waived = computed.totalCents < MINIMUM_INVOICE_CENTS;
		invoice = await db.platformInvoice.create({
			data: {
				administradoraId,
				...computed,
				status: waived ? "waived" : "failed",
				issue: waived ? null : "Ainda não enviada ao Asaas.",
			},
		});
		if (waived) return { status: "waived", invoiceId: invoice.id };
	}

	const administradora = await db.administradora.findUniqueOrThrow({
		where: { id: administradoraId },
		select: {
			id: true,
			name: true,
			email: true,
			cnpj: true,
			asaasCustomerId: true,
		},
	});
	const dueDate = sendableDueDate(invoice.dueDate, today);
	const label = formatPeriodLong(period);
	try {
		const customerId = await ensureAdministradoraCustomer(administradora);
		const payment = await createPayment({
			customerId,
			amountCents: invoice.totalCents,
			dueDate: isoDay(dueDate),
			description: `Quartier Flow, ${label}: ${plural(invoice.residentSeats, "morador", "moradores")} e ${plural(invoice.sindicoSeats, "síndico", "síndicos")}, plano ${invoice.planName}.`,
			externalReference: invoice.id,
		});
		invoice = await db.platformInvoice.update({
			where: { id: invoice.id },
			data: {
				status: "pending",
				issue: null,
				dueDate,
				asaasPaymentId: payment.id,
				invoiceUrl: payment.invoiceUrl,
			},
		});
	} catch (error) {
		const issue =
			error instanceof AsaasError
				? error.userMessage
				: "Falha ao comunicar com o Asaas.";
		console.error("[platform-billing] issue failed", invoice.id, error);
		await db.platformInvoice.update({
			where: { id: invoice.id },
			data: { status: "failed", issue },
		});
		return { status: "failed", invoiceId: invoice.id, issue };
	}

	deliver(
		sendEmail({
			to: administradora.email,
			subject: `Fatura Quartier Flow: ${label}`,
			text: [
				`Olá! A fatura do Quartier Flow de ${label} para ${administradora.name} está disponível.`,
				"",
				`Plano ${invoice.planName}, assentos ativos em ${invoice.periodEnd.toLocaleDateString("pt-BR", { timeZone: "UTC" })}:`,
				`- ${plural(invoice.residentSeats, "morador", "moradores")} x ${formatBRL(invoice.residentSeatCents)}`,
				`- ${plural(invoice.sindicoSeats, "síndico", "síndicos")} x ${formatBRL(invoice.sindicoSeatCents)}`,
				invoice.billedDays < invoice.daysInMonth
					? `Proporcional a ${invoice.billedDays} de ${invoice.daysInMonth} dias.`
					: "Mês completo.",
				"",
				`Total: ${formatBRL(invoice.totalCents)}`,
				`Vencimento: ${dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`,
				`Pagar (boleto ou Pix): ${invoice.invoiceUrl}`,
				"",
				`Todas as faturas: ${new URL("/painel/faturas", env.BETTER_AUTH_URL).toString()}`,
			].join("\n"),
		}),
	);
	return { status: "issued", invoiceId: invoice.id };
}

/**
 * Daily job: issues last month's invoice for every administradora (active
 * or closed) that had a plan in it, and retries failed ones.
 */
export async function runPlatformBilling(db: typeof Db, today = new Date()) {
	const period = previousPeriod(today);
	const { year, month } = localDay(today);
	const candidates = await db.administradora.findMany({
		where: {
			// Signed before this month began...
			plans: { some: { startedAt: { lt: startOfLocalMonth(year, month) } } },
			// ...and not closed before the billed month began.
			OR: [
				{ closedAt: null },
				{ closedAt: { gte: startOfLocalMonth(...prevMonth(year, month)) } },
			],
			NOT: {
				platformInvoices: {
					some: { period, status: { not: "failed" } },
				},
			},
		},
		select: { id: true, name: true },
	});

	const results = [];
	for (const administradora of candidates) {
		try {
			results.push({
				administradora: administradora.name,
				...(await issueInvoice(db, administradora.id, period, today)),
			});
		} catch (error) {
			console.error("[platform-billing]", administradora.id, error);
			results.push({
				administradora: administradora.name,
				status: "error" as const,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	return { period, results };
}

function prevMonth(year: number, month: number): [number, number] {
	return month === 1 ? [year - 1, 12] : [year, month - 1];
}
