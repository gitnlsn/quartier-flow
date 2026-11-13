"use client";

import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

import { formatDate } from "~/lib/br";
import { PERIOD_REGEX, periodLongLabel } from "~/lib/finance";
import { api } from "~/trpc/react";
import {
	BalanceSheetExports,
	BalanceSheetView,
} from "../../_components/balance-sheet";
import {
	EmptyState,
	ErrorMessage,
	Loading,
	PageTitle,
} from "../../_components/ui";
import { useSelectedUnit } from "../../_components/unit-context";

/** One published balancete, read-only (residents never see drafts). */
export default function BalancetePage() {
	const { period = "" } = useParams<{ period: string }>();
	const { selected } = useSelectedUnit();
	const valid = PERIOD_REGEX.test(period);
	const sheet = api.portal.balanceSheet.useQuery(
		{ unitId: selected?.id ?? "", period },
		{ enabled: Boolean(selected) && valid, retry: false },
	);

	return (
		<div className="space-y-4">
			<a
				href="/painel/balancetes"
				className="inline-flex h-10 items-center gap-1.5 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden /> Todos os balancetes
			</a>
			<PageTitle
				title={valid ? `Balancete de ${periodLongLabel(period)}` : "Balancete"}
				subtitle={
					sheet.data
						? `${sheet.data.data.condominium.name}${sheet.data.publishedAt ? ` · publicado em ${formatDate(sheet.data.publishedAt)}` : ""}`
						: selected?.condominiumName
				}
				actions={
					selected &&
					sheet.data && (
						<BalanceSheetExports
							condominiumId={selected.condominiumId}
							data={sheet.data.data}
						/>
					)
				}
			/>
			{!selected || !valid ? (
				<EmptyState title="Balancete não encontrado" />
			) : sheet.isLoading ? (
				<Loading />
			) : !sheet.data ? (
				sheet.error?.data?.code === "NOT_FOUND" ? (
					<EmptyState title="Balancete não encontrado">
						Ele pode não ter sido publicado ainda.
					</EmptyState>
				) : (
					<ErrorMessage message={sheet.error?.message ?? "Algo deu errado."} />
				)
			) : (
				<BalanceSheetView data={sheet.data.data} notes={sheet.data.notes} />
			)}
		</div>
	);
}
