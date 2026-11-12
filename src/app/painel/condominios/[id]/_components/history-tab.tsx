"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import { type ReactNode, useState } from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatPeriod } from "~/lib/billing-items";
import { formatBRL, formatDate } from "~/lib/br";
import { daysLate, unitLabel } from "~/lib/delinquency";
import { type RouterInputs, type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	CHARGE_STATUS_LABEL,
	CHARGE_STATUS_TONE,
	Card,
	EmptyState,
	Field,
	Input,
	Loading,
	Modal,
	Select,
} from "../../../_components/ui";

type Condo = RouterOutputs["condominium"]["get"];
type Charge = RouterOutputs["billing"]["charges"][number];
type StatusFilter = RouterInputs["billing"]["charges"]["status"];

const PAID = new Set(["received", "confirmed"]);

const sum = (charges: Charge[]) =>
	charges.reduce((total, c) => total + (c.paidAmountCents ?? c.amountCents), 0);

/** Link to the charge on Asaas (boleto/Pix page or receipt). */
function AsaasLink({ charge }: { charge: Charge }) {
	if (!charge.invoiceUrl)
		return <span className="text-muted-foreground">—</span>;
	return (
		<a
			href={charge.invoiceUrl}
			target="_blank"
			rel="noreferrer"
			onClick={(e) => e.stopPropagation()}
			className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-sm hover:underline"
		>
			Abrir no Asaas <ExternalLink className="size-3.5" aria-hidden />
		</a>
	);
}

/** One unit's charge: items, status, dates and the payment link. */
function ChargeDetails({
	charge,
	condoId,
}: { charge: Charge; condoId: string }) {
	const open = charge.status === "pending" || charge.status === "overdue";
	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-4">
				<div>
					<p className="text-muted-foreground text-sm">
						Vence {formatDate(charge.dueDate)}
					</p>
					<p className="font-semibold text-2xl tracking-tight">
						{formatBRL(charge.paidAmountCents ?? charge.amountCents)}
					</p>
				</div>
				<Badge tone={CHARGE_STATUS_TONE[charge.status]}>
					{CHARGE_STATUS_LABEL[charge.status] ?? charge.status}
				</Badge>
			</div>

			<dl className="grid grid-cols-2 gap-3 text-sm">
				<div>
					<dt className="text-muted-foreground">Responsável</dt>
					<dd className="font-medium">
						{charge.payer ? charge.payer.name || charge.payer.email : "—"}
					</dd>
					{charge.payer?.cpfMasked && (
						<dd className="text-muted-foreground text-xs">
							CPF {charge.payer.cpfMasked}
						</dd>
					)}
				</div>
				<div>
					<dt className="text-muted-foreground">
						{charge.status === "overdue" ? "Em atraso" : "Pago em"}
					</dt>
					<dd className="font-medium">
						{charge.status === "overdue"
							? `${daysLate(charge.dueDate)} dia(s)`
							: charge.paidAt
								? formatDate(charge.paidAt)
								: "—"}
					</dd>
				</div>
				{charge.feeCents !== null && (
					<div>
						<dt className="text-muted-foreground">Tarifa Asaas</dt>
						<dd className="font-medium">{formatBRL(charge.feeCents)}</dd>
					</div>
				)}
				{charge.forgivenReason && (
					<div className="col-span-2">
						<dt className="text-muted-foreground">
							Perdoada
							{charge.forgivenAt && ` em ${formatDate(charge.forgivenAt)}`}
						</dt>
						<dd className="font-medium">{charge.forgivenReason}</dd>
					</div>
				)}
				{charge.issue && (
					<div className="col-span-2">
						<dt className="text-muted-foreground">Observação</dt>
						<dd>{charge.issue}</dd>
					</div>
				)}
			</dl>

			{charge.lines.length > 0 && (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead>Tipo</TableHead>
								<TableHead className="text-right">Valor</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{charge.lines.map((line) => (
								<TableRow key={line.id}>
									<TableCell className="whitespace-normal">
										<div>
											{line.name}
											{line.installment && (
												<span className="text-muted-foreground">
													{" "}
													({line.installment})
												</span>
											)}
										</div>
										{line.description && (
											<div className="text-muted-foreground text-xs">
												{line.description}
											</div>
										)}
									</TableCell>
									<TableCell>
										<Badge tone={line.kind === "shared" ? "info" : "warning"}>
											{line.kind === "shared" ? "Comum" : "Individual"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										{formatBRL(line.amountCents)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<div className="flex flex-wrap gap-2">
				{charge.invoiceUrl && (
					<a
						href={charge.invoiceUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm hover:bg-primary/90"
					>
						{open ? "Abrir boleto / Pix no Asaas" : "Ver comprovante no Asaas"}
						<ExternalLink className="size-4" aria-hidden />
					</a>
				)}
				{charge.runId && (
					<a
						href={`/painel/condominios/${condoId}/cobrancas/${charge.runId}`}
						className="inline-flex h-10 items-center gap-2 rounded-md border px-4 font-medium text-sm hover:bg-muted"
					>
						Auditoria do mês <ArrowRight className="size-4" aria-hidden />
					</a>
				)}
			</div>
		</div>
	);
}

type Column =
	| "month"
	| "unit"
	| "payer"
	| "amount"
	| "status"
	| "due"
	| "late"
	| "paid";

/** Charges table: row click opens details; the last column links to Asaas. */
function ChargesTable({
	condoId,
	charges,
	columns,
	empty,
}: {
	condoId: string;
	charges: Charge[];
	columns: Column[];
	empty: string;
}) {
	const [selected, setSelected] = useState<Charge | null>(null);
	const head: Record<Column, ReactNode> = {
		month: "Referência",
		unit: "Unidade",
		payer: "Responsável",
		amount: <span className="block text-right">Valor</span>,
		status: "Situação",
		due: "Vencimento",
		late: <span className="block text-right">Atraso</span>,
		paid: "Pago em",
	};
	const cell = (c: Charge, column: Column): ReactNode => {
		switch (column) {
			case "month":
				return formatPeriod(c.period);
			case "unit":
				return (
					<button
						type="button"
						className="font-medium underline-offset-4 hover:underline"
						aria-label={`Detalhes da cobrança da unidade ${unitLabel(c.unit)} em ${formatPeriod(c.period)}`}
						onClick={(e) => {
							e.stopPropagation();
							setSelected(c);
						}}
					>
						{unitLabel(c.unit)}
					</button>
				);
			case "payer":
				return c.payer ? (
					c.payer.name || c.payer.email
				) : (
					<span className="text-muted-foreground">—</span>
				);
			case "amount":
				return (
					<span className="block text-right">
						{formatBRL(c.paidAmountCents ?? c.amountCents)}
					</span>
				);
			case "status":
				return (
					<Badge tone={CHARGE_STATUS_TONE[c.status]}>
						{CHARGE_STATUS_LABEL[c.status] ?? c.status}
					</Badge>
				);
			case "due":
				return formatDate(c.dueDate);
			case "late":
				return (
					<span className="block text-right font-medium text-destructive">
						{daysLate(c.dueDate)} dia(s)
					</span>
				);
			case "paid":
				return c.paidAt ? (
					formatDate(c.paidAt)
				) : (
					<span className="text-muted-foreground">—</span>
				);
		}
	};

	if (charges.length === 0) return <EmptyState title={empty} />;

	return (
		<>
			<div className="overflow-x-auto rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							{columns.map((column) => (
								<TableHead key={column}>{head[column]}</TableHead>
							))}
							<TableHead>Cobrança</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{charges.map((c) => (
							<TableRow
								key={c.id}
								className="cursor-pointer"
								onClick={() => setSelected(c)}
								onKeyDown={(e) => e.key === "Enter" && setSelected(c)}
							>
								{columns.map((column) => (
									<TableCell key={column}>{cell(c, column)}</TableCell>
								))}
								<TableCell>
									<AsaasLink charge={c} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
			<Modal
				open={selected !== null}
				onOpenChange={(open) => !open && setSelected(null)}
				title={
					selected
						? `Unidade ${unitLabel(selected.unit)} · ${formatPeriod(selected.period)}`
						: ""
				}
				description={selected?.description}
				size="lg"
			>
				{selected && <ChargeDetails charge={selected} condoId={condoId} />}
			</Modal>
		</>
	);
}

function Totals({
	items,
}: {
	items: { label: string; cents: number; tone?: string }[];
}) {
	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{items.map((item) => (
				<div key={item.label} className="rounded-lg bg-muted/60 p-3">
					<p className="text-muted-foreground text-xs">{item.label}</p>
					<p
						className={`font-semibold text-xl tracking-tight ${item.tone ?? ""}`}
					>
						{formatBRL(item.cents)}
					</p>
				</div>
			))}
		</div>
	);
}

/** Working area: the latest month's charges and every overdue charge. */
export function FollowUpTab({ condo }: { condo: Condo }) {
	const now = new Date();
	const [dueMonth, setDueMonth] = useState(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
	);
	const monthQuery = api.billing.charges.useQuery({
		condominiumId: condo.id,
		dueMonth,
	});
	const overdue = api.billing.charges.useQuery({
		condominiumId: condo.id,
		status: "overdue",
	});

	if (overdue.isLoading) return <Loading />;
	// Every charge due in the month: a unit can appear more than once.
	const monthCharges = [...(monthQuery.data ?? [])].sort(
		(a, b) =>
			unitLabel(a.unit).localeCompare(unitLabel(b.unit), "pt-BR", {
				numeric: true,
			}) || a.period.localeCompare(b.period),
	);
	const sent = monthCharges.filter(
		(c) => !["skipped", "failed"].includes(c.status),
	);
	// Same unit's overdue charges together, oldest month first.
	const overdueList = [...(overdue.data ?? [])].sort(
		(a, b) =>
			unitLabel(a.unit).localeCompare(unitLabel(b.unit), "pt-BR", {
				numeric: true,
			}) || a.period.localeCompare(b.period),
	);
	const byUnit = new Map<
		string,
		{ label: string; payer: string; count: number; cents: number }
	>();
	for (const c of overdueList) {
		const entry = byUnit.get(c.unit.id) ?? {
			label: unitLabel(c.unit),
			payer: c.payer ? c.payer.name || c.payer.email : "",
			count: 0,
			cents: 0,
		};
		entry.count += 1;
		entry.cents += c.paidAmountCents ?? c.amountCents;
		byUnit.set(c.unit.id, entry);
	}

	return (
		<div className="space-y-6">
			<Card
				title="Cobranças vencidas"
				description="Todas as cobranças em atraso, de qualquer mês. Uma unidade com mais de um mês vencido aparece em várias linhas."
			>
				<div className="space-y-4">
					{overdueList.length > 0 && (
						<>
							<p className="text-sm">
								{overdueList.length} cobrança(s) vencida(s) em {byUnit.size}{" "}
								unidade(s), somando{" "}
								<strong className="text-destructive">
									{formatBRL(sum(overdueList))}
								</strong>
							</p>
							<ul className="flex flex-wrap gap-2">
								{[...byUnit.values()].map((entry) => (
									<li
										key={entry.label}
										className="rounded-lg border bg-destructive/5 px-3 py-2 text-sm"
									>
										<span className="font-medium">{entry.label}</span>
										{entry.payer && (
											<span className="text-muted-foreground">
												{" "}
												· {entry.payer}
											</span>
										)}
										<span className="block text-xs">
											{entry.count} cobrança(s) ·{" "}
											<strong className="text-destructive">
												{formatBRL(entry.cents)}
											</strong>
										</span>
									</li>
								))}
							</ul>
						</>
					)}
					<ChargesTable
						condoId={condo.id}
						charges={overdueList}
						columns={["month", "unit", "payer", "amount", "due", "late"]}
						empty="Nenhuma cobrança vencida. Tudo em dia!"
					/>
				</div>
			</Card>

			<Card
				title={`Cobranças com vencimento em ${formatPeriod(dueMonth)}`}
				description="Todas as cobranças que vencem no mês escolhido, de qualquer mês de referência. Clique para ver a cobrança; o link abre no Asaas."
				action={
					<Input
						type="month"
						aria-label="Mês de vencimento"
						className="w-44"
						value={dueMonth}
						onChange={(e) => e.target.value && setDueMonth(e.target.value)}
					/>
				}
			>
				{monthQuery.isLoading ? (
					<Loading />
				) : (
					<div className="space-y-4">
						<Totals
							items={[
								{ label: "Cobrado", cents: sum(sent) },
								{
									label: "Recebido",
									cents: sum(sent.filter((c) => PAID.has(c.status))),
									tone: "text-success-foreground",
								},
								{
									label: "A receber",
									cents: sum(sent.filter((c) => c.status === "pending")),
								},
								{
									label: "Vencido",
									cents: sum(sent.filter((c) => c.status === "overdue")),
									tone: "text-destructive",
								},
							]}
						/>
						<ChargesTable
							condoId={condo.id}
							charges={monthCharges}
							columns={[
								"unit",
								"month",
								"payer",
								"amount",
								"status",
								"due",
								"paid",
							]}
							empty={`Nenhuma cobrança vence em ${formatPeriod(dueMonth)}.`}
						/>
					</div>
				)}
			</Card>
		</div>
	);
}

/** Every charge since the beginning, filtered by month/year, unit and status. */
export function HistoryTab({ condo }: { condo: Condo }) {
	const [period, setPeriod] = useState("");
	const [unitId, setUnitId] = useState("");
	const [status, setStatus] = useState("");
	const charges = api.billing.charges.useQuery({
		condominiumId: condo.id,
		period: period || undefined,
		unitId: unitId || undefined,
		status: (status || undefined) as StatusFilter,
	});
	const list = charges.data ?? [];
	const sentOnly = list.filter(
		(c) => !["skipped", "failed"].includes(c.status),
	);

	return (
		<Card
			title="Histórico de cobranças"
			description="Todas as cobranças desde o início. Filtre por mês e ano, unidade ou situação."
		>
			<div className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-4">
					<Field label="Mês e ano">
						<Input
							type="month"
							value={period}
							onChange={(e) => setPeriod(e.target.value)}
						/>
					</Field>
					<Field label="Unidade">
						<Select value={unitId} onChange={(e) => setUnitId(e.target.value)}>
							<option value="">Todas</option>
							{condo.units.map((unit) => (
								<option key={unit.id} value={unit.id}>
									{unitLabel(unit)}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Situação">
						<Select value={status} onChange={(e) => setStatus(e.target.value)}>
							<option value="">Todas</option>
							<option value="pending">A vencer</option>
							<option value="overdue">Vencidas</option>
							<option value="received">Pagas</option>
							<option value="confirmed">Pagas (compensando)</option>
							<option value="renegotiated">Renegociadas</option>
							<option value="forgiven">Perdoadas</option>
							<option value="skipped">Não enviadas</option>
							<option value="failed">Com falha</option>
							<option value="canceled">Canceladas</option>
							<option value="refunded">Estornadas</option>
						</Select>
					</Field>
					<div className="flex items-end">
						{(period || unitId || status) && (
							<button
								type="button"
								className="h-11 text-sm underline underline-offset-4"
								onClick={() => {
									setPeriod("");
									setUnitId("");
									setStatus("");
								}}
							>
								Limpar filtros
							</button>
						)}
					</div>
				</div>

				{charges.isLoading ? (
					<Loading />
				) : (
					<>
						<p className="text-muted-foreground text-sm">
							{list.length} cobrança(s) · {formatBRL(sum(sentOnly))} cobrados
							{list.length > sentOnly.length &&
								` · ${list.length - sentOnly.length} não enviada(s)`}
						</p>
						<ChargesTable
							condoId={condo.id}
							charges={list}
							columns={[
								"month",
								"unit",
								"payer",
								"amount",
								"status",
								"due",
								"paid",
							]}
							empty="Nenhuma cobrança com esses filtros."
						/>
					</>
				)}
			</div>
		</Card>
	);
}
