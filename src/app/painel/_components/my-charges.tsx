"use client";

import { ExternalLink } from "lucide-react";

import { formatPeriod } from "~/lib/billing-items";
import { formatBRL, formatDate } from "~/lib/br";
import {
	AGREEMENT_STATE_LABEL,
	AGREEMENT_STATE_TONE,
	unitLabel,
} from "~/lib/delinquency";
import { api } from "~/trpc/react";
import {
	Badge,
	CHARGE_STATUS_LABEL,
	CHARGE_STATUS_TONE,
	EmptyState,
	Loading,
} from "./ui";
import { useSelectedUnit } from "./unit-context";

const OPEN = new Set(["pending", "overdue"]);
const PAID = new Set(["confirmed", "received"]);

/** "Novembro de 2026": capitalize only the first letter (not "De"). */
const monthTitle = (date: Date | string) => {
	const text = new Date(date).toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
	return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Resident view of their charges, shared by the home page and /painel/cobrancas. */
export function MyCharges({ onlyOpen = false }: { onlyOpen?: boolean }) {
	const { selected } = useSelectedUnit();
	const charges = api.portal.myCharges.useQuery({
		unitId: selected?.id ?? null,
	});
	if (charges.isLoading) return <Loading />;

	// What needs paying first (overdue, then due soonest), then the history.
	const rank = (status: string) =>
		status === "overdue" ? 0 : status === "pending" ? 1 : 2;
	const list = (charges.data ?? [])
		.filter((c) => !onlyOpen || OPEN.has(c.status))
		.sort((a, b) => {
			const byStatus = rank(a.status) - rank(b.status);
			if (byStatus !== 0) return byStatus;
			const ta = new Date(a.dueDate).getTime();
			const tb = new Date(b.dueDate).getTime();
			return rank(a.status) < 2 ? ta - tb : tb - ta;
		});
	if (list.length === 0) {
		return (
			<EmptyState
				title={onlyOpen ? "Tudo em dia!" : "Você ainda não tem cobranças."}
			>
				{onlyOpen
					? "Nenhuma cobrança em aberto no momento."
					: "Quando o condomínio emitir uma cobrança para você, ela aparece aqui."}
			</EmptyState>
		);
	}

	return (
		<ul className="space-y-3">
			{list.map((charge) => {
				const open = OPEN.has(charge.status);
				return (
					<li
						key={charge.id}
						className="rounded-xl border bg-card p-4 shadow-xs md:p-5"
					>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="space-y-1">
								<p className="text-muted-foreground text-sm">
									{monthTitle(charge.dueDate)}
								</p>
								<p className="font-semibold text-2xl tracking-tight">
									{formatBRL(charge.paidAmountCents ?? charge.amountCents)}
								</p>
								<p className="text-muted-foreground text-sm">
									{charge.condominium} · Unidade {charge.unit} · vence{" "}
									{formatDate(charge.dueDate)}
								</p>
								<Badge tone={CHARGE_STATUS_TONE[charge.status]}>
									{CHARGE_STATUS_LABEL[charge.status] ?? charge.status}
								</Badge>
								{charge.lines.length > 0 && (
									<details className="pt-2 text-sm">
										<summary className="cursor-pointer text-muted-foreground">
											Ver itens ({charge.lines.length})
										</summary>
										<ul className="mt-2 space-y-1">
											{charge.lines.map((line) => (
												<li
													key={line.id}
													className="flex justify-between gap-4"
												>
													<span>
														{line.name}
														{line.installment && (
															<span className="text-muted-foreground">
																{" "}
																({line.installment})
															</span>
														)}
														{line.description && (
															<span className="block text-muted-foreground text-xs">
																{line.description}
															</span>
														)}
													</span>
													<span className="whitespace-nowrap">
														{formatBRL(line.amountCents)}
													</span>
												</li>
											))}
										</ul>
									</details>
								)}
							</div>
							{charge.invoiceUrl && (open || PAID.has(charge.status)) && (
								<a
									href={charge.invoiceUrl}
									target="_blank"
									rel="noreferrer"
									className={
										open
											? "inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
											: "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 font-medium hover:bg-muted"
									}
								>
									{open ? "Pagar com Pix ou boleto" : "Ver comprovante"}
									<ExternalLink className="size-4" aria-hidden />
								</a>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}

/**
 * Acordos the resident pays (docs/features/04): progress and what is left.
 * The installments themselves show up as "Acordo (2/6)" in the monthly charge.
 */
export function MyAgreements() {
	const { selected } = useSelectedUnit();
	const agreements = api.portal.myAgreements.useQuery({
		unitId: selected?.id ?? null,
	});
	const list = agreements.data ?? [];
	if (list.length === 0) return null;

	return (
		<ul className="space-y-3">
			{list.map((a) => {
				const percent = Math.round(
					(a.paidCents / Math.max(1, a.totalCents)) * 100,
				);
				const entradaOpen = a.entrada && OPEN.has(a.entrada.status);
				return (
					<li
						key={a.id}
						className="rounded-xl border bg-card p-4 shadow-xs md:p-5"
					>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
							<div className="min-w-0 flex-1 space-y-2">
								<p className="flex flex-wrap items-center gap-2 font-semibold">
									Seu acordo · Unidade {unitLabel(a.unit)}
									<Badge tone={AGREEMENT_STATE_TONE[a.state]}>
										{AGREEMENT_STATE_LABEL[a.state]}
									</Badge>
								</p>
								<p className="text-sm">
									{a.downPaymentCents > 0 &&
										`Entrada de ${formatBRL(a.downPaymentCents)} + `}
									{a.installments}× {formatBRL(a.installmentCents)}
									{a.startPeriod &&
										`, nas cobranças mensais a partir de ${formatPeriod(a.startPeriod)}`}
									.
								</p>
								<div
									className="h-2 overflow-hidden rounded-full bg-muted"
									aria-hidden
								>
									<div
										className="h-full bg-success"
										style={{ width: `${percent}%` }}
									/>
								</div>
								<p className="text-muted-foreground text-sm">
									{a.paidInstallments} de {a.installments} parcela(s) paga(s) ·
									pago {formatBRL(a.paidCents)} · falta{" "}
									{formatBRL(a.remainingCents)}
								</p>
							</div>
							{entradaOpen && a.entrada?.invoiceUrl && (
								<a
									href={a.entrada.invoiceUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground hover:bg-primary/90"
								>
									Pagar entrada · vence {formatDate(a.entrada.dueDate)}
									<ExternalLink className="size-4" aria-hidden />
								</a>
							)}
						</div>
					</li>
				);
			})}
		</ul>
	);
}
