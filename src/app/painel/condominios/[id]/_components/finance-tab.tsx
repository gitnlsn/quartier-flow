"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBRL, formatDate, parseBRLToCents } from "~/lib/br";
import {
	addMonths,
	currentPeriod,
	periodLongLabel,
	periodShortLabel,
	periodTitle,
} from "~/lib/finance";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	BalanceSheetExports,
	BalanceSheetView,
	IncomeExpenseChart,
} from "../../../_components/balance-sheet";
import { condoPath } from "../../../_components/condo-nav";
import {
	Badge,
	Button,
	Card,
	ConfirmButton,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	Loading,
	MaskedInput,
	Modal,
	errorMessage,
} from "../../../_components/ui";

type Condo = RouterOutputs["condominium"]["get"];

const percent = (rate: number) =>
	rate.toLocaleString("pt-BR", { style: "percent", maximumFractionDigits: 1 });

function Stat({
	label,
	value,
	hint,
}: { label: string; value: string; hint?: string }) {
	return (
		<div className="rounded-lg bg-muted/60 p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-semibold text-xl tabular-nums tracking-tight">
				{value}
			</p>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
		</div>
	);
}

/** "Finanças" section of the condominium's Visão geral (docs/features/05). */
export function FinanceOverview({ condo }: { condo: Condo }) {
	const dashboard = api.finance.dashboard.useQuery({ condominiumId: condo.id });
	if (dashboard.isLoading) return <Loading />;
	if (!dashboard.data) {
		return (
			<ErrorMessage message={dashboard.error?.message ?? "Algo deu errado."} />
		);
	}
	const d = dashboard.data;
	return (
		<Card
			title="Finanças"
			description="Receita líquida (pagamentos menos tarifas) e despesas, por mês de pagamento"
			action={
				<a
					href={condoPath(condo.id, "balancetes")}
					className="inline-flex h-10 items-center gap-1 rounded-md px-3 font-medium text-sm hover:bg-muted"
				>
					Balancetes <ChevronRight className="size-4" aria-hidden />
				</a>
			}
		>
			<div className="space-y-5">
				<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
					<Stat
						label="Saldo em caixa"
						value={formatBRL(d.balanceCents)}
						hint={
							d.hasOpeningBalance ? undefined : "Sem saldo inicial informado"
						}
					/>
					<Stat
						label={`Receita de ${periodShortLabel(d.current)}`}
						value={formatBRL(d.thisMonth.netIncomeCents)}
					/>
					<Stat
						label={`Despesas de ${periodShortLabel(d.current)}`}
						value={formatBRL(d.thisMonth.expensesCents)}
					/>
					<Stat
						label="Inadimplência hoje"
						value={percent(d.delinquency.rate)}
						hint={`${d.delinquency.units} de ${d.delinquency.unitsTotal} unidades · ${formatBRL(d.delinquency.overdueCents)}`}
					/>
				</div>
				<IncomeExpenseChart series={d.series} />
				{d.topCategories.length > 0 && (
					<div className="space-y-2">
						<p className="font-medium text-sm">Maiores despesas em 12 meses</p>
						<div className="flex flex-wrap gap-2">
							{d.topCategories.map((c) => (
								<Badge key={c.category}>
									{c.category} · {formatBRL(c.cents)}
								</Badge>
							))}
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}

/** Cash before Quartier Flow: the starting point of every balance. */
function OpeningBalanceForm({
	condominiumId,
	initial,
	onDone,
}: {
	condominiumId: string;
	initial: { cents: number; period: string | null };
	onDone: () => void;
}) {
	const utils = api.useUtils();
	const [amount, setAmount] = useState(
		initial.cents ? formatBRL(initial.cents).replace(/^R\$\s*/, "") : "",
	);
	const [period, setPeriod] = useState(
		initial.period ?? addMonths(currentPeriod(), -1),
	);
	const [error, setError] = useState<string>();
	const save = api.finance.saveOpeningBalance.useMutation({
		onSuccess: () => {
			void utils.finance.invalidate();
			onDone();
		},
	});
	return (
		<form
			className="space-y-4"
			onSubmit={(e) => {
				e.preventDefault();
				const cents = amount.trim() ? parseBRLToCents(amount) : 0;
				if (cents === null) return setError("Valor inválido");
				setError(undefined);
				save.mutate({ condominiumId, cents, period });
			}}
		>
			<Field
				label="Saldo em caixa (R$)"
				error={error}
				hint="Soma das contas do condomínio no primeiro dia do mês abaixo."
			>
				<MaskedInput
					mask="money"
					value={amount}
					onValueChange={setAmount}
					placeholder="0,00"
				/>
			</Field>
			<Field
				label="No início de"
				hint="Pagamentos e despesas a partir deste mês entram no saldo."
			>
				<Input
					type="month"
					value={period}
					max={currentPeriod()}
					onChange={(e) => e.target.value && setPeriod(e.target.value)}
				/>
			</Field>
			<ErrorMessage message={errorMessage(save.error)} />
			<div className="flex justify-end gap-2">
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
				<Button type="submit" pending={save.isPending}>
					Salvar saldo inicial
				</Button>
			</div>
		</form>
	);
}

/** Balancetes module: one row per month, published or draft. */
export function BalanceSheetsTab({ condo }: { condo: Condo }) {
	const router = useRouter();
	const list = api.finance.balanceSheets.useQuery({ condominiumId: condo.id });
	const [editingOpening, setEditingOpening] = useState(false);

	if (list.isLoading) return <Loading />;
	if (!list.data) {
		return <ErrorMessage message={list.error?.message ?? "Algo deu errado."} />;
	}
	const { canManage, opening, sheets } = list.data;
	const hasPublished = sheets.some((s) => s.status === "published");

	return (
		<div className="space-y-4">
			<Card
				title="Saldo inicial"
				description={
					opening.period
						? `${formatBRL(opening.cents)} no início de ${periodLongLabel(opening.period)}`
						: "Informe quanto o condomínio tinha em caixa antes do Quartier Flow, para o saldo dos balancetes ficar correto."
				}
				action={
					canManage && (
						<Button
							variant="outline"
							size="default"
							disabled={hasPublished}
							onClick={() => setEditingOpening(true)}
						>
							{opening.period ? "Alterar" : "Informar saldo inicial"}
						</Button>
					)
				}
			>
				{canManage && hasPublished && (
					<p className="text-muted-foreground text-sm">
						Para alterar o saldo inicial, despublique os balancetes já
						publicados.
					</p>
				)}
			</Card>

			<Modal
				open={editingOpening}
				onOpenChange={setEditingOpening}
				title="Saldo inicial"
			>
				<OpeningBalanceForm
					condominiumId={condo.id}
					initial={opening}
					onDone={() => setEditingOpening(false)}
				/>
			</Modal>

			{sheets.length === 0 ? (
				<EmptyState title="Nenhum mês para mostrar">
					Os balancetes aparecem quando houver pagamentos ou despesas.
				</EmptyState>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Mês</TableHead>
								<TableHead>Situação</TableHead>
								<TableHead className="hidden text-right sm:table-cell">
									Receita líquida
								</TableHead>
								<TableHead className="hidden text-right sm:table-cell">
									Despesas
								</TableHead>
								<TableHead className="hidden text-right md:table-cell">
									Resultado
								</TableHead>
								<TableHead className="text-right">Saldo final</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sheets.map((s) => {
								const href = `${condoPath(condo.id, "balancetes")}/${s.period}`;
								return (
									<TableRow
										key={s.period}
										className="cursor-pointer"
										onClick={() => router.push(href)}
									>
										<TableCell className="font-medium">
											<a href={href} className="hover:underline">
												{periodTitle(s.period)}
											</a>
										</TableCell>
										<TableCell>
											{s.status === "published" ? (
												<Badge tone="success">Publicado</Badge>
											) : s.isCurrent ? (
												<Badge>Em andamento</Badge>
											) : (
												<Badge tone="warning">Rascunho</Badge>
											)}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums sm:table-cell">
											{formatBRL(s.netIncomeCents)}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums sm:table-cell">
											{formatBRL(s.expensesCents)}
										</TableCell>
										<TableCell
											className={`hidden text-right tabular-nums md:table-cell ${s.resultCents < 0 ? "text-destructive" : ""}`}
										>
											{formatBRL(s.resultCents || 0)}
										</TableCell>
										<TableCell className="text-right font-medium tabular-nums">
											{formatBRL(s.closingCents || 0)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

/** One month's balancete, with publish/unpublish for the administradora. */
export function BalanceSheetDetail({
	condo,
	period,
}: {
	condo: Condo;
	period: string;
}) {
	const utils = api.useUtils();
	const sheet = api.finance.balanceSheet.useQuery({
		condominiumId: condo.id,
		period,
	});
	const [publishing, setPublishing] = useState(false);
	const [notes, setNotes] = useState("");
	const invalidate = () => {
		void utils.finance.invalidate();
		void utils.expense.list.invalidate();
	};
	const publish = api.finance.publish.useMutation({
		onSuccess: () => {
			setPublishing(false);
			invalidate();
		},
	});
	const unpublish = api.finance.unpublish.useMutation({
		onSuccess: invalidate,
	});

	const back = (
		<a
			href={condoPath(condo.id, "balancetes")}
			className="inline-flex h-10 items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
		>
			<ArrowLeft className="size-4" aria-hidden /> Todos os balancetes
		</a>
	);
	if (sheet.isLoading) return <Loading />;
	if (!sheet.data) {
		return (
			<div className="space-y-4">
				{back}
				<ErrorMessage message={sheet.error?.message ?? "Algo deu errado."} />
			</div>
		);
	}
	const s = sheet.data;
	const published = s.status === "published";

	return (
		<div className="space-y-4">
			{back}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<h2 className="font-semibold text-xl">{periodTitle(period)}</h2>
					<p className="flex flex-wrap items-center gap-2 text-muted-foreground text-sm">
						{published ? (
							<>
								<Badge tone="success">Publicado</Badge>
								{s.publishedAt && `em ${formatDate(s.publishedAt)}`} · visível
								para os moradores
							</>
						) : (
							<>
								<Badge tone="warning">Rascunho</Badge>
								Valores atualizados agora; os moradores ainda não veem.
							</>
						)}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<BalanceSheetExports condominiumId={condo.id} data={s.data} />
					{s.canManage &&
						(published && s.id ? (
							<ConfirmButton
								variant="outline"
								size="default"
								title="Despublicar balancete?"
								description="Os moradores deixam de ver este balancete e as despesas do mês voltam a poder ser alteradas. Publique de novo depois de corrigir."
								confirmLabel="Despublicar"
								pending={unpublish.isPending}
								onConfirm={() => s.id && unpublish.mutate({ id: s.id })}
							>
								Despublicar
							</ConfirmButton>
						) : (
							<Button
								size="default"
								disabled={!s.canPublish}
								onClick={() => {
									setNotes(s.notes ?? "");
									setPublishing(true);
								}}
							>
								Publicar
							</Button>
						))}
				</div>
			</div>
			{s.canManage && !published && !s.canPublish && (
				<p className="text-muted-foreground text-sm">
					O balancete pode ser publicado quando o mês terminar.
				</p>
			)}
			<ErrorMessage message={errorMessage(unpublish.error)} />

			<Modal
				open={publishing}
				onOpenChange={setPublishing}
				title={`Publicar balancete de ${periodLongLabel(period)}`}
				description="Os valores ficam congelados e os moradores passam a ver o balancete. As despesas do mês ficam bloqueadas até você despublicar."
			>
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault();
						publish.mutate({ condominiumId: condo.id, period, notes });
					}}
				>
					<Field
						label="Observações para os moradores (opcional)"
						hint="Ex.: explicação de uma despesa fora do comum."
					>
						<textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							maxLength={2000}
							rows={4}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</Field>
					<ErrorMessage message={errorMessage(publish.error)} />
					<div className="flex justify-end gap-2">
						<Button variant="ghost" onClick={() => setPublishing(false)}>
							Cancelar
						</Button>
						<Button type="submit" pending={publish.isPending}>
							Publicar
						</Button>
					</div>
				</form>
			</Modal>

			<BalanceSheetView
				data={s.data}
				notes={s.notes && published ? s.notes : null}
			/>
		</div>
	);
}
