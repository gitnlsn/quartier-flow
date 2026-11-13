/**
 * Delinquency rules shared by server and client (docs/features/04).
 */

/** "A · 101", or "101" when the building has no blocks. */
export const unitLabel = (unit: { block: string; number: string }) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;

/** Whole days since the due date (0 on the due date or before). */
export function daysLate(dueDate: Date | string, now = Date.now()) {
	const due = new Date(dueDate).getTime();
	return Math.max(0, Math.floor((now - due) / 86_400_000));
}

export const MAX_AGREEMENT_INSTALLMENTS = 60;

/** Aging of the overdue amount, by days since the due date. */
export const AGING_BUCKETS = [
	{ label: "Até 30 dias", maxDays: 30 },
	{ label: "31 a 60 dias", maxDays: 60 },
	{ label: "61 a 90 dias", maxDays: 90 },
	{ label: "Mais de 90 dias", maxDays: Number.POSITIVE_INFINITY },
] as const;

/**
 * Splits a negotiated total into entrada + N equal installments. The
 * installment is rounded up to the cent, so the final total can be a few
 * cents above the negotiated one; that final total is what gets stored.
 */
export function agreementPlan(input: {
	totalCents: number;
	downPaymentCents: number;
	installments: number;
}) {
	const rest = Math.max(0, input.totalCents - input.downPaymentCents);
	const n = Math.max(1, input.installments);
	const installmentCents = Math.ceil(rest / n);
	return {
		installmentCents,
		totalCents: input.downPaymentCents + installmentCents * n,
	};
}

/**
 * Fine + interest an overdue amount would have today, from the condominium's
 * settings. Only an estimate: Asaas computes the real value (pro rata daily).
 */
export function estimatedCharges(input: {
	amountCents: number;
	daysLate: number;
	finePercent: number;
	interestPercent: number; // per month
}) {
	if (input.daysLate <= 0) return 0;
	const fine = (input.amountCents * input.finePercent) / 100;
	const interest =
		(input.amountCents * input.interestPercent * input.daysLate) / 100 / 30;
	return Math.round(fine + interest);
}

/** Stored status + what the charges say. */
export type AgreementState =
	| "pending"
	| "active"
	| "late"
	| "completed"
	| "broken"
	| "canceled";

export const AGREEMENT_STATE_LABEL: Record<AgreementState, string> = {
	pending: "Aguardando",
	active: "Em dia",
	late: "Em atraso",
	completed: "Concluído",
	broken: "Encerrado",
	canceled: "Cancelado",
};

export const AGREEMENT_STATE_TONE: Record<
	AgreementState,
	"neutral" | "info" | "success" | "warning" | "danger"
> = {
	pending: "warning",
	active: "info",
	late: "danger",
	completed: "success",
	broken: "neutral",
	canceled: "neutral",
};
