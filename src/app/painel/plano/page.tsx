"use client";

import { formatBRL } from "~/lib/br";
import { api } from "~/trpc/react";
import { PlanPicker } from "../_components/plan-picker";
import { Card, Loading, PageTitle } from "../_components/ui";

export default function PlanoPage() {
	const overview = api.administradora.overview.useQuery();
	if (overview.isLoading || !overview.data) return <Loading />;
	const { seats, plan, estimatedMonthlyCents } = overview.data;

	return (
		<div className="space-y-6">
			<PageTitle
				title="Plano"
				subtitle="Você paga por morador e síndico ativos na sua administradora."
			/>
			<Card title="Uso atual">
				<dl className="grid grid-cols-3 gap-4">
					<div>
						<dt className="text-muted-foreground text-sm">Moradores</dt>
						<dd className="font-semibold text-2xl">{seats.residents}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-sm">Síndicos</dt>
						<dd className="font-semibold text-2xl">{seats.sindicos}</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-sm">Estimativa / mês</dt>
						<dd className="font-semibold text-2xl">
							{estimatedMonthlyCents === null
								? "—"
								: formatBRL(estimatedMonthlyCents)}
						</dd>
					</div>
				</dl>
			</Card>
			<PlanPicker currentPlanId={plan?.id} />
		</div>
	);
}
