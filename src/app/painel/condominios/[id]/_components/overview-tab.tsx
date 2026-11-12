"use client";

import { cn } from "cn";
import {
	AlertTriangle,
	ArrowRight,
	Check,
	CircleCheck,
	Clock,
	type LucideIcon,
	XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { formatPeriod } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import type { CondoModule } from "../../../_components/condo-nav";
import { Badge, Button, Card, Loading } from "../../../_components/ui";
import { expectedTotal } from "./billing-tab";

type Condo = RouterOutputs["condominium"]["get"];
type Charge = RouterOutputs["billing"]["charges"][number];

type Attention = {
	key: string;
	severity: number; // lower = more urgent
	icon: LucideIcon;
	tone: "warning" | "danger";
	text: ReactNode;
	action?: { label: string; onClick?: () => void; href?: string };
};

type StepState = "done" | "current" | "todo" | "skipped";

const pad = (n: number) => String(n).padStart(2, "0");
const PAID = new Set(["received", "confirmed"]);
const amount = (c: Charge) => c.paidAmountCents ?? c.amountCents;
const sum = (list: Charge[]) => list.reduce((total, c) => total + amount(c), 0);
const unitLabel = (unit: { block: string; number: string }) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;
const fmt = (date: Date) =>
	`${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;

/**
 * The cycle in progress: the charge whose due date is today or later.
 * Preparation is in the same month when dueDay > generationDay, otherwise
 * in the previous month.
 */
function currentCycle(
	generationDay: number,
	dueDay: number,
	today = new Date(),
) {
	let year = today.getFullYear();
	let month = today.getMonth(); // 0-based month of the due date
	if (today.getDate() > dueDay) month += 1;
	if (month > 11) {
		month = 0;
		year += 1;
	}
	const due = new Date(year, month, dueDay);
	const prepare =
		dueDay > generationDay
			? new Date(year, month, generationDay)
			: new Date(year, month - 1, generationDay);
	return { period: `${year}-${pad(month + 1)}`, due, prepare };
}

function Stat({
	label,
	value,
	hint,
	tone,
}: {
	label: string;
	value: ReactNode;
	hint?: ReactNode;
	tone?: string;
}) {
	return (
		<div className="rounded-lg bg-muted/60 p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className={cn("font-semibold text-xl tracking-tight", tone)}>
				{value}
			</p>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
		</div>
	);
}

function Timeline({
	steps,
}: {
	steps: { label: string; date?: string; state: StepState; note?: string }[];
}) {
	return (
		<ol className="grid gap-3 sm:grid-cols-4">
			{steps.map((step) => (
				<li
					key={step.label}
					className={cn(
						"rounded-lg border p-3",
						step.state === "current" && "border-primary ring-2 ring-primary/15",
						step.state === "skipped" && "opacity-50",
					)}
				>
					<span className="mb-1 flex items-center gap-2">
						<span
							className={cn(
								"flex size-6 items-center justify-center rounded-full border text-xs",
								step.state === "done" &&
									"border-transparent bg-success text-white",
								step.state === "current" &&
									"border-transparent bg-primary text-primary-foreground",
							)}
						>
							{step.state === "done" && (
								<Check className="size-3.5" aria-hidden />
							)}
						</span>
						<span className="font-medium text-sm">{step.label}</span>
						{step.state === "current" && (
							<span className="ml-auto text-muted-foreground text-xs">
								agora
							</span>
						)}
					</span>
					{step.date && (
						<p className="text-muted-foreground text-xs">{step.date}</p>
					)}
					{step.note && <p className="text-xs">{step.note}</p>}
				</li>
			))}
		</ol>
	);
}

/** Landing tab: money this month, what needs attention, the cycle and late units. */
export function OverviewTab({
	condo,
	goTo,
}: {
	condo: Condo;
	goTo: (module: CondoModule) => void;
}) {
	const now = new Date();
	const thisMonth = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
	const runs = api.billing.listRuns.useQuery({ condominiumId: condo.id });
	const items = api.billing.items.useQuery({ condominiumId: condo.id });
	const dueThisMonth = api.billing.charges.useQuery({
		condominiumId: condo.id,
		dueMonth: thisMonth,
	});
	const overdue = api.billing.charges.useQuery({
		condominiumId: condo.id,
		status: "overdue",
	});
	const admin = api.administradora.overview.useQuery(undefined, {
		enabled: condo.canManage,
	});

	if (
		runs.isLoading ||
		items.isLoading ||
		dueThisMonth.isLoading ||
		overdue.isLoading
	) {
		return <Loading />;
	}

	const config = condo.billingConfig;
	const allRuns = runs.data ?? [];
	const runHref = (runId: string) =>
		`/painel/condominios/${condo.id}/cobrancas/${runId}`;
	const monthCharges = (dueThisMonth.data ?? []).filter(
		(c) => !["skipped", "failed"].includes(c.status),
	);
	const pending = monthCharges.filter((c) => c.status === "pending");
	const overdueList = overdue.data ?? [];
	const overdueUnits = new Map<
		string,
		{ label: string; payer: string; count: number; cents: number }
	>();
	for (const c of overdueList) {
		const entry = overdueUnits.get(c.unit.id) ?? {
			label: unitLabel(c.unit),
			payer: c.payer ? c.payer.name || c.payer.email : "",
			count: 0,
			cents: 0,
		};
		entry.count += 1;
		entry.cents += amount(c);
		overdueUnits.set(c.unit.id, entry);
	}
	const topLate = [...overdueUnits.values()]
		.sort((a, b) => b.cents - a.cents)
		.slice(0, 5);

	const cycle = config
		? currentCycle(config.generationDay, config.dueDay)
		: null;
	const cycleRun = cycle
		? allRuns.find((r) => r.period === cycle.period)
		: undefined;
	const cycleExpected =
		cycle && items.data ? expectedTotal(condo, items.data, cycle.period) : 0;

	// ---- Needs attention, most urgent first ----
	const payerUnits = new Set(
		condo.memberships
			.filter((m) => m.financiallyResponsible && m.unitId)
			.map((m) => m.unitId),
	);
	const unitsWithoutPayer = condo.units.filter((u) => !payerUnits.has(u.id));
	const kyc = admin.data?.payoutAccount?.kycStatus ?? null;
	const attention: Attention[] = [];
	if (overdueList.length > 0) {
		attention.push({
			key: "overdue",
			severity: 0,
			icon: XCircle,
			tone: "danger",
			text: (
				<>
					{overdueList.length} cobrança(s) vencida(s) em {overdueUnits.size}{" "}
					unidade(s): <strong>{formatBRL(sum(overdueList))}</strong>
				</>
			),
			action: { label: "Ver vencidas", onClick: () => goTo("acompanhamento") },
		});
	}
	for (const run of allRuns.filter((r) => r.status === "partially_failed")) {
		attention.push({
			key: `failed-${run.id}`,
			severity: 1,
			icon: XCircle,
			tone: "danger",
			text: `Algumas cobranças de ${formatPeriod(run.period)} falharam no envio.`,
			action: { label: "Ver", href: runHref(run.id) },
		});
	}
	for (const run of allRuns.filter((r) => r.status === "draft")) {
		attention.push({
			key: `draft-${run.id}`,
			severity: 2,
			icon: Clock,
			tone: "warning",
			text: (
				<>
					Cobranças de {formatPeriod(run.period)} aguardando auditoria:{" "}
					<strong>{formatBRL(run.totalCents)}</strong>
				</>
			),
			action: {
				label: condo.canManage ? "Auditar" : "Ver",
				href: runHref(run.id),
			},
		});
	}
	if (condo.canManage && admin.data && kyc !== "approved") {
		attention.push({
			key: "kyc",
			severity: 3,
			icon: AlertTriangle,
			tone: "warning",
			text: "A conta de recebimento ainda não foi aprovada: as cobranças não podem ser enviadas.",
			action: { label: "Ver conta", href: "/painel/onboarding" },
		});
	}
	if (unitsWithoutPayer.length > 0) {
		attention.push({
			key: "payer",
			severity: 4,
			icon: AlertTriangle,
			tone: "warning",
			text: `${unitsWithoutPayer.length} unidade(s) sem responsável pelo pagamento: ${unitsWithoutPayer
				.slice(0, 6)
				.map(unitLabel)
				.join(", ")}${unitsWithoutPayer.length > 6 ? "…" : ""}`,
			action: { label: "Ver unidades", onClick: () => goTo("unidades") },
		});
	}
	if (!config?.enabled) {
		attention.push({
			key: "config",
			severity: 5,
			icon: AlertTriangle,
			tone: "warning",
			text: "A cobrança mensal não está ativada.",
			action: condo.canManage
				? { label: "Configurar", onClick: () => goTo("config") }
				: undefined,
		});
	}
	if ((items.data?.shared.length ?? 0) === 0) {
		attention.push({
			key: "items",
			severity: 6,
			icon: AlertTriangle,
			tone: "warning",
			text: "Nenhum item comum cadastrado (ex.: taxa condominial).",
			action: condo.canManage
				? { label: "Criar item", onClick: () => goTo("cobrancas") }
				: undefined,
		});
	}
	attention.sort((a, b) => a.severity - b.severity);

	// ---- Cycle timeline ----
	const manual = config?.mode !== "automatic";
	const sent = Boolean(cycleRun && cycleRun.status !== "draft");
	const steps: {
		label: string;
		date?: string;
		state: StepState;
		note?: string;
	}[] = cycle
		? [
				{
					label: "Preparação",
					date: fmt(cycle.prepare),
					state: cycleRun ? "done" : now >= cycle.prepare ? "current" : "todo",
					note: cycleRun ? undefined : `Previsto: ${formatBRL(cycleExpected)}`,
				},
				{
					label: "Auditoria",
					state: !manual
						? "skipped"
						: sent
							? "done"
							: cycleRun
								? "current"
								: "todo",
					note: manual ? undefined : "Não se aplica (envio automático)",
				},
				{
					label: "Envio",
					state: sent ? "done" : "todo",
					note: sent && cycleRun ? formatBRL(cycleRun.totalCents) : undefined,
				},
				{
					label: "Vencimento",
					date: fmt(cycle.due),
					state: sent ? (now > cycle.due ? "done" : "current") : "todo",
				},
			]
		: [];

	const residents = new Set(
		condo.memberships
			.filter((m) => m.role === "resident")
			.map((m) => m.user.id),
	);
	const sindicos = condo.memberships.filter((m) => m.role === "sindico");

	// Not set up yet: the to-do list matters more than a row of R$ 0,00.
	// (never billed: no run prepared yet, or no units at all).
	const settingUp = condo.units.length === 0 || (runs.data?.length ?? 0) === 0;

	return (
		<div className="flex flex-col gap-6">
			<Card
				title={`Resumo de ${formatPeriod(thisMonth)}`}
				description="Cobranças com vencimento neste mês, de qualquer mês de referência."
				action={
					<Button
						variant="outline"
						size="sm"
						onClick={() => goTo("acompanhamento")}
					>
						Acompanhamento <ArrowRight aria-hidden />
					</Button>
				}
			>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<Stat
						label="Recebido"
						value={formatBRL(
							sum(monthCharges.filter((c) => PAID.has(c.status))),
						)}
						tone="text-success-foreground"
						hint={`de ${formatBRL(sum(monthCharges))} cobrados`}
					/>
					<Stat
						label="A receber"
						value={formatBRL(sum(pending))}
						hint={`${pending.length} cobrança(s) a vencer`}
					/>
					<Stat
						label="Vencido (todos os meses)"
						value={formatBRL(sum(overdueList))}
						tone={overdueList.length > 0 ? "text-destructive" : undefined}
						hint={`${overdueUnits.size} unidade(s) em atraso`}
					/>
					<Stat
						label={
							cycle
								? `Cobrança de ${formatPeriod(cycle.period)}`
								: "Próxima cobrança"
						}
						value={formatBRL(cycleRun ? cycleRun.totalCents : cycleExpected)}
						hint={
							cycleRun
								? "já preparada"
								: cycle
									? `prevista · preparo em ${fmt(cycle.prepare)}`
									: "configure a cobrança"
						}
					/>
				</div>
			</Card>

			<Card
				title={settingUp ? "Primeiros passos" : "Precisa de atenção"}
				className={settingUp ? "order-first" : undefined}
			>
				{attention.length === 0 ? (
					<p className="flex items-center gap-2 text-success-foreground">
						<CircleCheck className="size-5 text-success" aria-hidden /> Tudo em
						ordem por aqui.
					</p>
				) : (
					<ul className="divide-y">
						{attention.map((entry) => (
							<li
								key={entry.key}
								className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<span className="flex items-start gap-3">
									<entry.icon
										className={
											entry.tone === "danger"
												? "mt-0.5 size-5 shrink-0 text-destructive"
												: "mt-0.5 size-5 shrink-0 text-warning-foreground"
										}
										aria-hidden
									/>
									<span className="text-sm">{entry.text}</span>
								</span>
								{entry.action &&
									(entry.action.href ? (
										<a
											href={entry.action.href}
											className="inline-flex h-9 shrink-0 items-center gap-1 self-start rounded-md border px-3 font-medium text-sm hover:bg-muted sm:self-auto"
										>
											{entry.action.label}{" "}
											<ArrowRight className="size-4" aria-hidden />
										</a>
									) : (
										<Button
											variant="outline"
											size="sm"
											className="shrink-0 self-start sm:self-auto"
											onClick={entry.action.onClick}
										>
											{entry.action.label}
										</Button>
									))}
							</li>
						))}
					</ul>
				)}
			</Card>

			{cycle && (
				<Card
					title={`Ciclo da cobrança de ${formatPeriod(cycle.period)}`}
					description={
						manual
							? "Envio manual: você confere a auditoria antes de enviar."
							: "Envio automático no dia da preparação."
					}
					action={
						cycleRun ? (
							<a
								href={runHref(cycleRun.id)}
								className="inline-flex h-8 items-center gap-1 rounded-md border px-3 font-medium text-sm hover:bg-muted"
							>
								Ver cobranças <ArrowRight className="size-4" aria-hidden />
							</a>
						) : (
							<Button
								variant="outline"
								size="sm"
								onClick={() => goTo("cobrancas")}
							>
								Cobrança do mês <ArrowRight aria-hidden />
							</Button>
						)
					}
				>
					<Timeline steps={steps} />
				</Card>
			)}

			<Card
				title="Unidades com atraso"
				action={
					topLate.length > 0 && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => goTo("acompanhamento")}
						>
							Ver todas <ArrowRight aria-hidden />
						</Button>
					)
				}
			>
				{topLate.length === 0 ? (
					<p className="flex items-center gap-2 text-success-foreground">
						<CircleCheck className="size-5 text-success" aria-hidden /> Nenhuma
						unidade em atraso.
					</p>
				) : (
					<ul className="divide-y">
						{topLate.map((entry) => (
							<li
								key={entry.label}
								className="flex items-center justify-between gap-3 py-2"
							>
								<span className="min-w-0">
									<span className="font-medium">Unidade {entry.label}</span>
									{entry.payer && (
										<span className="text-muted-foreground text-sm">
											{" "}
											· {entry.payer}
										</span>
									)}
								</span>
								<span className="flex shrink-0 items-center gap-2">
									<Badge tone="danger">{entry.count} vencida(s)</Badge>
									<strong className="text-destructive">
										{formatBRL(entry.cents)}
									</strong>
								</span>
							</li>
						))}
					</ul>
				)}
			</Card>

			<Card title="Condomínio">
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					<Stat label="Unidades" value={condo.units.length} />
					<Stat label="Moradores" value={residents.size} />
					<Stat
						label="Síndico"
						value={
							<span className="text-base">
								{sindicos.map((s) => s.user.name || s.user.email).join(", ") ||
									"—"}
							</span>
						}
					/>
					<Stat
						label="Envio"
						value={
							<span className="text-base">
								{config?.enabled
									? config.mode === "automatic"
										? `Automático, dia ${config.generationDay}`
										: "Manual (auditado)"
									: "Desativado"}
							</span>
						}
					/>
				</div>
			</Card>
		</div>
	);
}
