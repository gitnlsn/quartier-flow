"use client";

import { ArrowRight } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "cn";
import { formatPeriod } from "~/lib/billing-items";
import { formatCnpj } from "~/lib/br";
import { api } from "~/trpc/react";
import { condoPath } from "../../../_components/condo-nav";
import {
	Badge,
	HelpLink,
	PageTitle,
	RUN_STATUS_LABEL,
} from "../../../_components/ui";
import { ChargesTab, SettingsTab } from "./billing-tab";
import { useCondo } from "./condo-context";
import { DelinquencyTab } from "./delinquency-tab";
import { ExpensesTab } from "./expenses-tab";
import {
	BalanceSheetDetail,
	BalanceSheetsTab,
	FinanceOverview,
} from "./finance-tab";
import { FollowUpTab, HistoryTab } from "./history-tab";
import { OverviewTab } from "./overview-tab";
import { UnitsTab } from "./units-tab";

/** Title of a module page: the module name over the condominium's name. */
function ModuleTitle({
	title,
	actions,
	help,
}: {
	title: string;
	actions?: ReactNode;
	/** Central de ajuda article for this module. */
	help?: string;
}) {
	const condo = useCondo();
	return (
		<PageTitle
			title={title}
			subtitle={
				<span className="flex flex-wrap items-center gap-2">
					{condo.name}
					{!condo.canManage && <Badge>Somente visualização</Badge>}
				</span>
			}
			actions={
				actions || help ? (
					<>
						{help && <HelpLink slug={help} />}
						{actions}
					</>
				) : undefined
			}
		/>
	);
}

export function OverviewPage() {
	const condo = useCondo();
	const router = useRouter();
	return (
		<>
			<PageTitle
				title={condo.name}
				subtitle={
					<span className="flex flex-wrap items-center gap-2">
						{[condo.cnpj && `CNPJ ${formatCnpj(condo.cnpj)}`, condo.address]
							.filter(Boolean)
							.join(" · ")}
						{!condo.canManage && <Badge>Somente visualização</Badge>}
					</span>
				}
			/>
			<div className="space-y-6">
				<OverviewTab
					condo={condo}
					goTo={(module) => router.push(condoPath(condo.id, module))}
				/>
				<FinanceOverview condo={condo} />
			</div>
		</>
	);
}

const CHARGE_VIEWS = [
	{ module: "cobrancas", label: "Mês atual" },
	{ module: "acompanhamento", label: "Acompanhamento" },
	{ module: "historico", label: "Histórico" },
] as const;

/** Cobranças module frame: title, latest run shortcut and its three views. */
export function ChargesFrame({ children }: { children: ReactNode }) {
	const condo = useCondo();
	const pathname = usePathname();
	const runs = api.billing.listRuns.useQuery({ condominiumId: condo.id });
	const latest = runs.data?.[0];

	return (
		<div className="space-y-4">
			<ModuleTitle
				title="Cobranças"
				help="enviar-cobrancas-do-mes"
				actions={
					latest && (
						<a
							href={`${condoPath(condo.id, "cobrancas")}/${latest.id}`}
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
			<nav
				aria-label="Visões de cobrança"
				className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
			>
				<div className="inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground">
					{CHARGE_VIEWS.map((view) => {
						const href = condoPath(condo.id, view.module);
						const active = pathname === href;
						return (
							<a
								key={view.module}
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"inline-flex h-8 items-center whitespace-nowrap rounded-md px-3 font-medium text-sm transition-colors",
									active
										? "bg-background text-foreground shadow-sm"
										: "hover:text-foreground",
								)}
							>
								{view.label}
							</a>
						);
					})}
				</div>
			</nav>
			{children}
		</div>
	);
}

export function ChargesPage() {
	return <ChargesTab condo={useCondo()} />;
}

export function FollowUpPage() {
	return <FollowUpTab condo={useCondo()} />;
}

export function HistoryPage() {
	return <HistoryTab condo={useCondo()} />;
}

export function ExpensesPage() {
	return (
		<>
			<ModuleTitle title="Despesas" help="despesas-e-notas" />
			<ExpensesTab condo={useCondo()} />
		</>
	);
}

export function BalanceSheetsPage() {
	return (
		<>
			<ModuleTitle title="Balancetes" help="balancetes-e-prestacao-de-contas" />
			<BalanceSheetsTab condo={useCondo()} />
		</>
	);
}

export function BalanceSheetPage({ period }: { period: string }) {
	return (
		<>
			<ModuleTitle title="Balancete" help="balancetes-e-prestacao-de-contas" />
			<BalanceSheetDetail condo={useCondo()} period={period} />
		</>
	);
}

export function DelinquencyPage() {
	return (
		<>
			<ModuleTitle title="Inadimplência" help="inadimplencia-e-acordos" />
			<DelinquencyTab condo={useCondo()} />
		</>
	);
}

export function UnitsPage() {
	return (
		<>
			<ModuleTitle
				title="Unidades e moradores"
				help="convidar-moradores-e-sindicos"
			/>
			<UnitsTab condo={useCondo()} />
		</>
	);
}

export function SettingsPage() {
	return (
		<>
			<ModuleTitle title="Configurações" help="enviar-cobrancas-do-mes" />
			<SettingsTab condo={useCondo()} />
		</>
	);
}
