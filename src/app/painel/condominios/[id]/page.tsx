"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatPeriod } from "~/lib/billing-items";
import { formatCnpj } from "~/lib/br";
import { api } from "~/trpc/react";
import {
	Badge,
	ErrorMessage,
	Loading,
	PageTitle,
	RUN_STATUS_LABEL,
} from "../../_components/ui";
import { ChargesTab, SettingsTab } from "./_components/billing-tab";
import { FollowUpTab, HistoryTab } from "./_components/history-tab";
import { OverviewTab, type TabKey } from "./_components/overview-tab";
import { UnitsTab } from "./_components/units-tab";

const TABS: { key: TabKey; label: string }[] = [
	{ key: "visao", label: "Visão geral" },
	{ key: "unidades", label: "Unidades e moradores" },
	{ key: "cobrancas", label: "Cobrança do mês" },
	{ key: "acompanhamento", label: "Acompanhamento" },
	{ key: "historico", label: "Histórico" },
	{ key: "config", label: "Configurações" },
];

function CondominiumDetail() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const search = useSearchParams();
	const raw = search.get("aba");
	// "moradores" was merged into "unidades"
	const requested = (raw === "moradores" ? "unidades" : raw) as TabKey | null;
	const active: TabKey =
		requested && TABS.some((t) => t.key === requested) ? requested : "visao";
	const condo = api.condominium.get.useQuery({ id });
	const runs = api.billing.listRuns.useQuery({ condominiumId: id });

	if (condo.isLoading) return <Loading />;
	if (!condo.data) {
		return (
			<ErrorMessage
				message={condo.error?.message ?? "Condomínio não encontrado."}
			/>
		);
	}

	const goTo = (tab: TabKey) =>
		router.replace(`/painel/condominios/${id}?aba=${tab}`, { scroll: false });
	const latest = runs.data?.[0];

	return (
		<div className="space-y-4">
			<a
				href="/painel/condominios"
				className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden /> Condomínios
			</a>
			<PageTitle
				title={condo.data.name}
				subtitle={
					<span className="flex flex-wrap items-center gap-2">
						{[
							condo.data.cnpj && `CNPJ ${formatCnpj(condo.data.cnpj)}`,
							condo.data.address,
						]
							.filter(Boolean)
							.join(" · ")}
						{!condo.data.canManage && <Badge>Somente visualização</Badge>}
					</span>
				}
				actions={
					latest && (
						<a
							href={`/painel/condominios/${id}/cobrancas/${latest.id}`}
							className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm hover:bg-primary/90"
						>
							Cobranças de {formatPeriod(latest.period)}
							<span className="opacity-70">
								· {RUN_STATUS_LABEL[latest.status] ?? latest.status}
							</span>
							<ArrowRight className="size-4" aria-hidden />
						</a>
					)
				}
			/>
			<Tabs value={active} onValueChange={(value) => goTo(value as TabKey)}>
				<div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
					<TabsList>
						{TABS.map((tab) => (
							<TabsTrigger key={tab.key} value={tab.key}>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				</div>
				<TabsContent value="visao" className="mt-4">
					<OverviewTab condo={condo.data} goTo={goTo} />
				</TabsContent>
				<TabsContent value="unidades" className="mt-4">
					<UnitsTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="cobrancas" className="mt-4">
					<ChargesTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="acompanhamento" className="mt-4">
					<FollowUpTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="historico" className="mt-4">
					<HistoryTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="config" className="mt-4">
					<SettingsTab condo={condo.data} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function CondominiumPage() {
	return (
		<Suspense fallback={<Loading />}>
			<CondominiumDetail />
		</Suspense>
	);
}
