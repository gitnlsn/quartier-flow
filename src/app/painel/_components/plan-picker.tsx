"use client";

import { cn } from "cn";
import { Check } from "lucide-react";

import { formatBRL } from "~/lib/br";
import { INVOICE_DUE_DAY } from "~/lib/onboarding";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Button,
	ConfirmButton,
	ErrorMessage,
	Loading,
	errorMessage,
} from "./ui";

export type PlanOption = RouterOutputs["administradora"]["plans"][number];

/**
 * Plan cards.
 * - `select`: onboarding; only highlights the choice (signed later, with the terms).
 * - `change`: /painel/plano; switching asks for confirmation first.
 */
export function PlanPicker(
	props:
		| { mode?: "change"; currentPlanId?: string | null }
		| {
				mode: "select";
				selectedId: string | null;
				onSelect: (plan: PlanOption) => void;
		  },
) {
	const utils = api.useUtils();
	const plans = api.administradora.plans.useQuery();
	const choose = api.administradora.choosePlan.useMutation({
		onSuccess: () => utils.administradora.overview.invalidate(),
	});

	if (plans.isLoading) return <Loading />;
	const highlighted =
		props.mode === "select" ? props.selectedId : props.currentPlanId;

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				{plans.data?.map((plan) => {
					const active = plan.id === highlighted;
					return (
						<div
							key={plan.id}
							className={cn(
								"flex flex-col rounded-xl border bg-card p-5 shadow-xs",
								active && "border-primary ring-2 ring-primary/15",
							)}
						>
							<div className="mb-1 flex items-center justify-between gap-2">
								<h3 className="font-semibold text-lg">{plan.name}</h3>
								{active && (
									<Badge tone="info">
										{props.mode === "select" ? "Selecionado" : "Plano atual"}
									</Badge>
								)}
							</div>
							<p className="mb-4 text-muted-foreground text-sm">
								{plan.description}
							</p>
							<ul className="mb-5 space-y-2 text-sm">
								<li className="flex items-center gap-2">
									<Check className="size-4 text-success" aria-hidden />
									<span>
										<strong>{formatBRL(plan.residentSeatCents)}</strong> por
										morador / mês
									</span>
								</li>
								<li className="flex items-center gap-2">
									<Check className="size-4 text-success" aria-hidden />
									<span>
										<strong>{formatBRL(plan.sindicoSeatCents)}</strong> por
										síndico / mês
									</span>
								</li>
							</ul>
							{props.mode === "select" ? (
								<Button
									variant={active ? "default" : "outline"}
									className="mt-auto"
									aria-pressed={active}
									onClick={() => props.onSelect(plan)}
								>
									{active ? "Selecionado" : `Escolher ${plan.name}`}
								</Button>
							) : (
								!active && (
									<ConfirmButton
										variant="outline"
										size="lg"
										className="mt-auto"
										title={`Trocar para o plano ${plan.name}?`}
										description={`Os novos preços (${formatBRL(plan.residentSeatCents)} por morador e ${formatBRL(plan.sindicoSeatCents)} por síndico ativos, por mês) valem a partir da próxima fatura, emitida no dia 1º e com vencimento no dia ${INVOICE_DUE_DAY}.`}
										confirmLabel={`Trocar para ${plan.name}`}
										pending={
											choose.isPending && choose.variables?.planId === plan.id
										}
										onConfirm={() => choose.mutate({ planId: plan.id })}
									>
										Trocar para {plan.name}
									</ConfirmButton>
								)
							)}
						</div>
					);
				})}
			</div>
			<ErrorMessage message={errorMessage(choose.error)} />
			<p className="text-muted-foreground text-xs">
				Valores de exemplo: os preços finais ainda serão definidos. Recursos
				adicionais (como reservas de áreas comuns) terão mensalidade própria,
				informada antes de serem ativados.
			</p>
		</div>
	);
}
