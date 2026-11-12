"use client";

import { ArrowRight, Building2 } from "lucide-react";

import { api } from "~/trpc/react";
import { AdminOverview } from "./_components/admin-overview";
import { MyCharges } from "./_components/my-charges";
import { TermsUpdateCard } from "./_components/terms-update";
import { Card, Loading, PageTitle } from "./_components/ui";
import { useSelectedUnit } from "./_components/unit-context";
import {
	BecomeAdminCard,
	FinishSignupCard,
	OpenInvoicesCard,
	Welcome,
} from "./_components/welcome";

/**
 * Home for every user. Administradora admins get the management overview;
 * residents see their open charges first; síndicos get their condominiums.
 */
export default function PainelHome() {
	const access = api.portal.access.useQuery();
	const { selected: selectedUnit } = useSelectedUnit();
	if (access.isLoading || !access.data) return <Loading />;
	const {
		isAdmin,
		isSindico,
		isResident,
		firstName,
		email,
		hasRole,
		adminNeedsPlan,
		openInvoices,
		closedAdministradora,
		termsOutdated,
	} = access.data;
	const invoices = openInvoices.count > 0 && (
		<OpenInvoicesCard {...openInvoices} />
	);

	if (!hasRole) {
		return (
			<div className="space-y-6">
				{invoices}
				<Welcome
					firstName={firstName}
					email={email}
					closedAdministradora={closedAdministradora?.name}
				/>
			</div>
		);
	}
	if (adminNeedsPlan) {
		return (
			<div className="space-y-6">
				<PageTitle title={firstName ? `Olá, ${firstName}!` : "Olá!"} />
				<FinishSignupCard />
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{invoices}
			{termsOutdated && <TermsUpdateCard />}
			{isAdmin ? (
				<AdminOverview />
			) : (
				<PageTitle
					title={firstName ? `Olá, ${firstName}!` : "Olá!"}
					subtitle="Aqui você acompanha e paga as cobranças do seu condomínio."
				/>
			)}

			{(isResident || !isAdmin) && (
				<section className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-lg">
							Cobranças em aberto
							{selectedUnit && (
								<span className="block font-normal text-muted-foreground text-sm">
									Unidade {selectedUnit.label} · {selectedUnit.condominiumName}
								</span>
							)}
						</h2>
						<a
							href="/painel/cobrancas"
							className="inline-flex items-center gap-1 font-medium text-sm hover:underline"
						>
							Ver todas <ArrowRight className="size-4" aria-hidden />
						</a>
					</div>
					<MyCharges onlyOpen />
				</section>
			)}

			{isSindico && !isAdmin && (
				<Card
					title="Você é síndico"
					description="Acompanhe unidades, moradores e cobranças dos seus condomínios."
				>
					<a
						href="/painel/condominios"
						className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						<Building2 className="size-4" aria-hidden />
						Meus condomínios
					</a>
				</Card>
			)}

			{!isAdmin && (
				<BecomeAdminCard closedAdministradora={closedAdministradora?.name} />
			)}
		</div>
	);
}
