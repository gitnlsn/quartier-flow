"use client";

import {
	ArrowRight,
	Building2,
	Circle,
	CircleCheck,
	Users,
} from "lucide-react";

import { formatBRL } from "~/lib/br";
import { api } from "~/trpc/react";
import { Badge, Card, KYC_LABEL, KYC_TONE, Loading, PageTitle } from "./ui";

function Stat({
	label,
	value,
	hint,
}: {
	label: string;
	value: string | number;
	hint?: string;
}) {
	return (
		<div className="rounded-xl border bg-card p-4 shadow-xs">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="mt-1 font-semibold text-2xl tracking-tight">{value}</p>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
		</div>
	);
}

function Step({
	done,
	children,
}: { done: boolean; children: React.ReactNode }) {
	return (
		<li className="flex items-center gap-3">
			{done ? (
				<CircleCheck className="size-5 text-success" aria-label="Concluído" />
			) : (
				<Circle
					className="size-5 text-muted-foreground"
					aria-label="Pendente"
				/>
			)}
			<span className={done ? "text-muted-foreground line-through" : ""}>
				{children}
			</span>
		</li>
	);
}

export function AdminOverview() {
	const overview = api.administradora.overview.useQuery();
	if (overview.isLoading || !overview.data) return <Loading />;
	const data = overview.data;
	const kyc = data.payoutAccount?.kycStatus ?? null;
	const setupDone =
		data.companyComplete && Boolean(data.plan) && kyc === "approved";

	return (
		<div className="space-y-6">
			<PageTitle title="Visão geral" subtitle={data.name} />

			{!setupDone && (
				<Card
					title="Conclua a configuração"
					description="Faltam alguns passos para começar a cobrar os moradores."
				>
					<ol className="mb-5 space-y-3">
						<Step done={data.companyComplete}>Dados da empresa</Step>
						<Step done={Boolean(data.plan)}>Escolha do plano</Step>
						<Step done={kyc === "approved"}>
							Conta de recebimento aprovada
							{kyc && kyc !== "approved" && (
								<span className="ml-2">
									<Badge tone={KYC_TONE[kyc]}>{KYC_LABEL[kyc] ?? kyc}</Badge>
								</span>
							)}
						</Step>
					</ol>
					<a
						href="/painel/onboarding"
						className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						Continuar configuração <ArrowRight className="size-4" aria-hidden />
					</a>
				</Card>
			)}

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat label="Condomínios" value={data._count.condominiums} />
				<Stat label="Moradores" value={data.seats.residents} />
				<Stat label="Síndicos" value={data.seats.sindicos} />
				<Stat
					label="Plano"
					value={data.plan?.name ?? "—"}
					hint={
						data.estimatedMonthlyCents !== null
							? `${formatBRL(data.estimatedMonthlyCents)} / mês (estimado)`
							: undefined
					}
				/>
			</div>

			<div className="grid gap-3 md:grid-cols-2">
				<a
					href="/painel/condominios"
					className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted"
				>
					<span className="flex items-center gap-3 font-medium">
						<Building2 className="size-5" aria-hidden /> Gerenciar condomínios
					</span>
					<ArrowRight className="size-4" aria-hidden />
				</a>
				<a
					href="/painel/onboarding"
					className="flex items-center justify-between rounded-xl border bg-card p-5 shadow-xs transition-colors hover:bg-muted"
				>
					<span className="flex items-center gap-3 font-medium">
						<Users className="size-5" aria-hidden /> Conta de recebimento
					</span>
					<Badge tone={kyc ? KYC_TONE[kyc] : "neutral"}>
						{kyc ? (KYC_LABEL[kyc] ?? kyc) : "Não criada"}
					</Badge>
				</a>
			</div>
		</div>
	);
}
