"use client";

import { cn } from "cn";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

import { buttonVariants } from "~/components/ui/button";
import { formatBRL, formatDate } from "~/lib/br";
import {
	type BalanceSheetData,
	balanceSheetCsvLines,
	chargeTypeLabel,
	periodShortLabel,
} from "~/lib/finance";
import { downloadCsv } from "./spreadsheet";
import { Button, Card } from "./ui";

/**
 * Balancete pieces shared by the management area and the resident view
 * (docs/features/05).
 */

function Row({
	label,
	cents,
	strong,
	muted,
}: {
	label: string;
	cents: number;
	strong?: boolean;
	muted?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex items-baseline justify-between gap-4 py-2",
				strong ? "font-semibold" : "border-b",
				muted && "text-muted-foreground",
			)}
		>
			<span>{label}</span>
			<span className="whitespace-nowrap tabular-nums">
				{formatBRL(cents || 0)}
			</span>
		</div>
	);
}

function Stat({
	label,
	value,
	tone,
}: {
	label: string;
	value: string;
	tone?: string;
}) {
	return (
		<div className="rounded-lg bg-muted/60 p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p
				className={cn(
					"font-semibold text-xl tabular-nums tracking-tight",
					tone,
				)}
			>
				{value}
			</p>
		</div>
	);
}

/** The whole balancete, read-only. */
export function BalanceSheetView({
	data,
	notes,
}: {
	data: BalanceSheetData;
	notes?: string | null;
}) {
	const d = data.delinquency;
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<Stat label="Saldo inicial" value={formatBRL(data.openingCents)} />
				<Stat label="Receita líquida" value={formatBRL(data.netIncomeCents)} />
				<Stat label="Despesas" value={formatBRL(data.expensesCents)} />
				<Stat
					label="Saldo final"
					value={formatBRL(data.closingCents)}
					tone={data.closingCents < 0 ? "text-destructive" : undefined}
				/>
			</div>

			{notes && (
				<Card title="Observações da administração">
					<p className="whitespace-pre-line">{notes}</p>
				</Card>
			)}

			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Receitas" description="Pagamentos dos moradores no mês">
					{data.income.length === 0 && (
						<p className="pb-2 text-muted-foreground text-sm">
							Nenhum pagamento recebido no mês.
						</p>
					)}
					{data.income.map((i) => (
						<Row
							key={i.type}
							label={`${chargeTypeLabel(i.type)} (${i.count})`}
							cents={i.cents}
						/>
					))}
					<Row
						label="Tarifas bancárias (Asaas)"
						cents={-data.feesCents}
						muted
					/>
					<Row label="Receita líquida" cents={data.netIncomeCents} strong />
				</Card>

				<Card title="Despesas por categoria">
					{data.expensesByCategory.length === 0 && (
						<p className="pb-2 text-muted-foreground text-sm">
							Nenhuma despesa no mês.
						</p>
					)}
					{data.expensesByCategory.map((c) => (
						<Row key={c.category} label={c.category} cents={c.cents} />
					))}
					<Row label="Total de despesas" cents={data.expensesCents} strong />
				</Card>
			</div>

			<Card title="Resumo do mês">
				<Row label="Saldo inicial" cents={data.openingCents} />
				<Row label="Receita líquida" cents={data.netIncomeCents} />
				<Row label="Despesas" cents={-data.expensesCents} />
				<Row label="Resultado do mês" cents={data.resultCents} />
				<Row label="Saldo final" cents={data.closingCents} strong />
				<p className="pt-2 text-muted-foreground text-sm">
					Inadimplência no fim do mês: {formatBRL(d.overdueCents)} em atraso,{" "}
					{d.units} de {d.unitsTotal}{" "}
					{d.unitsTotal === 1 ? "unidade" : "unidades"}.
				</p>
			</Card>

			{data.expenses.length > 0 && (
				<Card
					title="Despesas detalhadas"
					description={`${data.expenses.length} ${data.expenses.length === 1 ? "lançamento" : "lançamentos"}`}
				>
					<ul className="divide-y">
						{data.expenses.map((e, index) => (
							<li
								key={index}
								className="flex items-start justify-between gap-4 py-2.5"
							>
								<div className="min-w-0">
									<p className="font-medium">{e.description}</p>
									<p className="text-muted-foreground text-sm">
										{[formatDate(e.date), e.category, e.supplier]
											.filter(Boolean)
											.join(" · ")}
									</p>
								</div>
								<span className="whitespace-nowrap tabular-nums">
									{formatBRL(e.cents)}
								</span>
							</li>
						))}
					</ul>
				</Card>
			)}
		</div>
	);
}

/** "Baixar PDF" and "Exportar CSV". */
export function BalanceSheetExports({
	condominiumId,
	data,
}: {
	condominiumId: string;
	data: BalanceSheetData;
}) {
	const slug = data.condominium.name
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-");
	return (
		<>
			<a
				href={`/api/condominios/${condominiumId}/balancetes/${data.period}/pdf`}
				className={cn(buttonVariants({ variant: "outline", size: "default" }))}
			>
				<FileText aria-hidden /> Baixar PDF
			</a>
			<Button
				variant="outline"
				size="default"
				onClick={() =>
					downloadCsv(
						`balancete-${slug}-${data.period}.csv`,
						balanceSheetCsvLines(data),
					)
				}
			>
				<Download aria-hidden /> Exportar CSV
			</Button>
		</>
	);
}

/**
 * Income vs. expenses per month: paired columns from one baseline
 * (validated categorical slots 1 and 2), hover/focus tooltip and a table view.
 */
const INCOME_COLOR = "#2a78d6";
const EXPENSE_COLOR = "#eb6834";

export function IncomeExpenseChart({
	series,
}: {
	series: { period: string; netIncomeCents: number; expensesCents: number }[];
}) {
	const [active, setActive] = useState<string | null>(null);
	const [showTable, setShowTable] = useState(false);
	const max = Math.max(
		1,
		...series.flatMap((s) => [s.netIncomeCents, s.expensesCents]),
	);
	const height = 160;
	const bar = (cents: number) =>
		cents > 0 ? Math.max(2, Math.round((cents / max) * height)) : 0;
	const activeRow = series.find((s) => s.period === active);

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
				<div className="flex flex-wrap gap-4">
					<span className="inline-flex items-center gap-1.5">
						<span
							className="size-2.5 rounded-sm"
							style={{ background: INCOME_COLOR }}
						/>
						Receita líquida
					</span>
					<span className="inline-flex items-center gap-1.5">
						<span
							className="size-2.5 rounded-sm"
							style={{ background: EXPENSE_COLOR }}
						/>
						Despesas
					</span>
				</div>
				<button
					type="button"
					className="text-muted-foreground underline-offset-2 hover:underline"
					onClick={() => setShowTable((v) => !v)}
				>
					{showTable ? "Ver gráfico" : "Ver tabela"}
				</button>
			</div>

			{showTable ? (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead className="text-left text-muted-foreground">
							<tr>
								<th className="py-1.5 font-medium">Mês</th>
								<th className="py-1.5 text-right font-medium">
									Receita líquida
								</th>
								<th className="py-1.5 text-right font-medium">Despesas</th>
								<th className="py-1.5 text-right font-medium">Resultado</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{series.map((s) => (
								<tr key={s.period}>
									<td className="py-1.5">{periodShortLabel(s.period)}</td>
									<td className="py-1.5 text-right tabular-nums">
										{formatBRL(s.netIncomeCents)}
									</td>
									<td className="py-1.5 text-right tabular-nums">
										{formatBRL(s.expensesCents)}
									</td>
									<td className="py-1.5 text-right tabular-nums">
										{formatBRL(s.netIncomeCents - s.expensesCents)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<div className="relative">
					<div className="h-12 text-sm" aria-live="polite">
						{activeRow ? (
							<div className="inline-block rounded-md border bg-popover px-3 py-1.5 shadow-sm">
								<p className="font-medium">
									{periodShortLabel(activeRow.period)}
								</p>
								<p className="text-muted-foreground tabular-nums">
									Receita {formatBRL(activeRow.netIncomeCents)} · Despesas{" "}
									{formatBRL(activeRow.expensesCents)}
								</p>
							</div>
						) : (
							<p className="pt-3 text-muted-foreground">
								Passe o dedo ou o mouse sobre um mês para ver os valores.
							</p>
						)}
					</div>
					<div
						className="flex items-end gap-0.5 border-b sm:gap-1"
						style={{ height }}
						onMouseLeave={() => setActive(null)}
					>
						{series.map((s) => (
							<button
								key={s.period}
								type="button"
								aria-label={`${periodShortLabel(s.period)}: receita líquida ${formatBRL(s.netIncomeCents)}, despesas ${formatBRL(s.expensesCents)}`}
								onMouseEnter={() => setActive(s.period)}
								onFocus={() => setActive(s.period)}
								onClick={() => setActive(s.period)}
								className={cn(
									"flex h-full flex-1 items-end justify-center gap-0.5 rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
									active === s.period && "bg-muted/70",
								)}
							>
								<span
									className="w-full max-w-3 rounded-t"
									style={{
										height: bar(s.netIncomeCents),
										background: INCOME_COLOR,
									}}
								/>
								<span
									className="w-full max-w-3 rounded-t"
									style={{
										height: bar(s.expensesCents),
										background: EXPENSE_COLOR,
									}}
								/>
							</button>
						))}
					</div>
					<div className="mt-1 flex gap-0.5 text-[10px] text-muted-foreground sm:gap-1 sm:text-xs">
						{series.map((s, i) => (
							<span key={s.period} className="flex-1 text-center">
								{/* Every other label on phones, so they don't collide. */}
								<span className={i % 2 ? "max-sm:invisible" : undefined}>
									{periodShortLabel(s.period)}
								</span>
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
