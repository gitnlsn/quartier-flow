"use client";

import { ExternalLink } from "lucide-react";
import { Fragment, useState } from "react";

import { formatBRL, formatDate } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Card,
	EmptyState,
	INVOICE_STATUS,
	Loading,
	PageTitle,
	type Tone,
} from "../_components/ui";

type Invoice = RouterOutputs["platformBilling"]["invoices"]["invoices"][number];

/** "2026-11" -> "Novembro de 2026" */
const monthLabel = (period: string) => {
	const label = new Date(`${period}-01T12:00:00Z`).toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
	return label.charAt(0).toUpperCase() + label.slice(1);
};

function Breakdown({ invoice }: { invoice: Invoice }) {
	return (
		<dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
			<div>
				<dt className="text-muted-foreground">Plano</dt>
				<dd>{invoice.planName}</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Período cobrado</dt>
				<dd>
					{formatDate(invoice.periodStart)} a {formatDate(invoice.periodEnd)}
					{invoice.billedDays < invoice.daysInMonth &&
						` (${invoice.billedDays} de ${invoice.daysInMonth} dias)`}
				</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Moradores ativos</dt>
				<dd>
					{invoice.residentSeats} × {formatBRL(invoice.residentSeatCents)}
				</dd>
			</div>
			<div>
				<dt className="text-muted-foreground">Síndicos ativos</dt>
				<dd>
					{invoice.sindicoSeats} × {formatBRL(invoice.sindicoSeatCents)}
				</dd>
			</div>
			{invoice.status === "waived" && (
				<p className="text-muted-foreground sm:col-span-2">
					Valor abaixo do mínimo de cobrança (R$ 5,00): nada a pagar.
				</p>
			)}
			{invoice.status === "failed" && (
				<p className="text-muted-foreground sm:col-span-2">
					A fatura está sendo emitida no Asaas. O boleto e o Pix aparecem aqui
					em breve.
				</p>
			)}
		</dl>
	);
}

/**
 * Quartier Flow invoices (docs/features/18). Stays in the menu after the
 * administradora is closed, so the last invoices can still be paid.
 */
export default function FaturasPage() {
	const query = api.platformBilling.invoices.useQuery();
	const [open, setOpen] = useState<string | null>(null);
	if (query.isLoading || !query.data) return <Loading />;
	const { invoices, administradoras } = query.data;
	const multiple = administradoras.length > 1;

	return (
		<div className="space-y-6">
			<PageTitle
				title="Faturas do Quartier Flow"
				subtitle="A mensalidade da plataforma: emitida no dia 1º, referente ao mês anterior, com vencimento no dia 10."
			/>
			{administradoras.some((a) => a.closedAt) && (
				<p className="rounded-lg bg-muted p-4 text-muted-foreground text-sm">
					Administradoras encerradas não recebem novas faturas. As faturas
					emitidas continuam disponíveis aqui para pagamento.
				</p>
			)}
			<Card>
				{invoices.length === 0 ? (
					<EmptyState title="Nenhuma fatura ainda">
						A primeira fatura sai no dia 1º do mês seguinte à assinatura.
					</EmptyState>
				) : (
					<ul className="divide-y">
						{invoices.map((invoice) => {
							const status = INVOICE_STATUS[invoice.status] ?? {
								label: invoice.status,
								tone: "neutral" as Tone,
							};
							const payable =
								(invoice.status === "pending" ||
									invoice.status === "overdue") &&
								invoice.invoiceUrl;
							return (
								<Fragment key={invoice.id}>
									<li className="flex flex-wrap items-center justify-between gap-3 py-3">
										<button
											type="button"
											className="min-w-0 text-left"
											aria-expanded={open === invoice.id}
											onClick={() =>
												setOpen(open === invoice.id ? null : invoice.id)
											}
										>
											<p className="font-medium">
												{monthLabel(invoice.period)}
											</p>
											<p className="text-muted-foreground text-sm">
												{multiple && `${invoice.administradoraName} · `}
												Vencimento {formatDate(invoice.dueDate)} ·{" "}
												<span className="underline underline-offset-2">
													{open === invoice.id ? "ocultar" : "ver"} detalhes
												</span>
											</p>
										</button>
										<div className="flex items-center gap-3">
											<span className="font-semibold">
												{formatBRL(invoice.totalCents)}
											</span>
											<Badge tone={status.tone}>{status.label}</Badge>
											{payable && (
												<a
													href={payable}
													target="_blank"
													rel="noreferrer"
													className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm hover:bg-primary/90"
												>
													Pagar
													<ExternalLink className="size-4" aria-hidden />
												</a>
											)}
										</div>
									</li>
									{open === invoice.id && (
										<li className="pb-4">
											<Breakdown invoice={invoice} />
										</li>
									)}
								</Fragment>
							);
						})}
					</ul>
				)}
			</Card>
		</div>
	);
}
