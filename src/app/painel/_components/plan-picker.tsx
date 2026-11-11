"use client";

import { cn } from "cn";
import { Check } from "lucide-react";

import { formatBRL } from "~/lib/br";
import { api } from "~/trpc/react";
import { Badge, Button, ErrorMessage, Loading, errorMessage } from "./ui";

export function PlanPicker({
	currentPlanId,
}: { currentPlanId?: string | null }) {
	const utils = api.useUtils();
	const plans = api.administradora.plans.useQuery();
	const choose = api.administradora.choosePlan.useMutation({
		onSuccess: () => utils.administradora.overview.invalidate(),
	});

	if (plans.isLoading) return <Loading />;

	return (
		<div className="space-y-4">
			<div className="grid gap-4 md:grid-cols-2">
				{plans.data?.map((plan) => {
					const current = plan.id === currentPlanId;
					return (
						<div
							key={plan.id}
							className={cn(
								"flex flex-col rounded-xl border bg-card p-5 shadow-xs",
								current && "border-primary ring-2 ring-primary/15",
							)}
						>
							<div className="mb-1 flex items-center justify-between gap-2">
								<h3 className="font-semibold text-lg">{plan.name}</h3>
								{current && <Badge tone="info">Plano atual</Badge>}
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
							{!current && (
								<Button
									variant="outline"
									className="mt-auto"
									pending={
										choose.isPending && choose.variables?.planId === plan.id
									}
									onClick={() => choose.mutate({ planId: plan.id })}
								>
									Escolher {plan.name}
								</Button>
							)}
						</div>
					);
				})}
			</div>
			<ErrorMessage message={errorMessage(choose.error)} />
			<p className="text-muted-foreground text-xs">
				Valores de exemplo: os preços finais ainda serão definidos. Recursos
				adicionais (como reservas de áreas comuns) terão mensalidade própria.
			</p>
		</div>
	);
}
