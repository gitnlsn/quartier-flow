"use client";

import { ExternalLink } from "lucide-react";

import { formatBRL, formatDate } from "~/lib/br";
import { api } from "~/trpc/react";
import {
	Badge,
	CHARGE_STATUS_LABEL,
	CHARGE_STATUS_TONE,
	EmptyState,
	Loading,
} from "./ui";

const OPEN = new Set(["pending", "overdue"]);

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
	const charges = api.portal.myCharges.useQuery();
	if (charges.isLoading) return <Loading />;

	const list = (charges.data ?? []).filter(
		(c) => !onlyOpen || OPEN.has(c.status),
	);
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
							</div>
							{charge.invoiceUrl && (
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
