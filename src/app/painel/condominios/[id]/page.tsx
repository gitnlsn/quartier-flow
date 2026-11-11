"use client";

import { ArrowLeft } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { formatCnpj } from "~/lib/br";
import { api } from "~/trpc/react";
import { Badge, ErrorMessage, Loading, PageTitle } from "../../_components/ui";
import { BillingTab } from "./_components/billing-tab";
import { PeopleTab } from "./_components/people-tab";
import { UnitsTab } from "./_components/units-tab";

const TABS = ["unidades", "pessoas", "cobranca"] as const;
type Tab = (typeof TABS)[number];

function CondominiumDetail() {
	const { id } = useParams<{ id: string }>();
	const router = useRouter();
	const search = useSearchParams();
	const requested = search.get("aba") as Tab | null;
	const active: Tab =
		requested && TABS.includes(requested) ? requested : "unidades";
	const condo = api.condominium.get.useQuery({ id });

	if (condo.isLoading) return <Loading />;
	if (!condo.data) {
		return (
			<ErrorMessage
				message={condo.error?.message ?? "Condomínio não encontrado."}
			/>
		);
	}

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
			/>
			<Tabs
				value={active}
				onValueChange={(value) =>
					router.replace(`/painel/condominios/${id}?aba=${value}`, {
						scroll: false,
					})
				}
			>
				<TabsList className="w-full sm:w-auto">
					<TabsTrigger value="unidades">Unidades</TabsTrigger>
					<TabsTrigger value="pessoas">Moradores</TabsTrigger>
					<TabsTrigger value="cobranca">Cobrança</TabsTrigger>
				</TabsList>
				<TabsContent value="unidades" className="mt-4">
					<UnitsTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="pessoas" className="mt-4">
					<PeopleTab condo={condo.data} />
				</TabsContent>
				<TabsContent value="cobranca" className="mt-4">
					<BillingTab condo={condo.data} />
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
