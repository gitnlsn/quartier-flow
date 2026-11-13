"use client";

import { useRouter } from "next/navigation";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBRL, formatDate } from "~/lib/br";
import { periodTitle } from "~/lib/finance";
import { api } from "~/trpc/react";
import {
	EmptyState,
	ErrorMessage,
	HelpLink,
	Loading,
	PageTitle,
} from "../_components/ui";
import { useSelectedUnit } from "../_components/unit-context";

/** Published balancetes of the selected unit's condominium (docs/features/05). */
export default function BalancetesPage() {
	const router = useRouter();
	const { selected } = useSelectedUnit();
	const list = api.portal.balanceSheets.useQuery(
		{ unitId: selected?.id ?? "" },
		{ enabled: Boolean(selected) },
	);

	return (
		<div className="space-y-6">
			<PageTitle
				title="Balancetes"
				subtitle={
					selected
						? `Prestação de contas mensal do ${selected.condominiumName}, publicada pela administração.`
						: "Prestação de contas mensal do seu condomínio."
				}
				actions={<HelpLink slug="balancetes-e-prestacao-de-contas" />}
			/>
			{!selected ? (
				<EmptyState title="Nenhuma unidade selecionada" />
			) : list.isLoading ? (
				<Loading />
			) : !list.data ? (
				<ErrorMessage message={list.error?.message ?? "Algo deu errado."} />
			) : list.data.length === 0 ? (
				<EmptyState title="Nenhum balancete publicado ainda">
					Quando a administração publicar o balancete do mês, ele aparece aqui.
				</EmptyState>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Mês</TableHead>
								<TableHead className="hidden text-right sm:table-cell">
									Receitas
								</TableHead>
								<TableHead className="hidden text-right sm:table-cell">
									Despesas
								</TableHead>
								<TableHead className="text-right">Saldo final</TableHead>
								<TableHead className="hidden text-right md:table-cell">
									Publicado em
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{list.data.map((s) => {
								const href = `/painel/balancetes/${s.period}`;
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
										<TableCell className="hidden text-right tabular-nums sm:table-cell">
											{formatBRL(s.netIncomeCents)}
										</TableCell>
										<TableCell className="hidden text-right tabular-nums sm:table-cell">
											{formatBRL(s.expensesCents)}
										</TableCell>
										<TableCell className="text-right font-medium tabular-nums">
											{formatBRL(s.closingCents || 0)}
										</TableCell>
										<TableCell className="hidden text-right text-muted-foreground md:table-cell">
											{s.publishedAt ? formatDate(s.publishedAt) : "—"}
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
