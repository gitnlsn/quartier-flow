import "server-only";

import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	renderToBuffer,
} from "@react-pdf/renderer";

import { formatBRL, formatDate } from "~/lib/br";
import {
	type BalanceSheetData,
	chargeTypeLabel,
	periodLongLabel,
} from "~/lib/finance";

/**
 * Balancete PDF (docs/features/05). Built-in Helvetica covers Portuguese
 * accents (WinAnsi), so no font files are needed.
 */

const s = StyleSheet.create({
	page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
	header: { marginBottom: 16 },
	title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
	subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
	draft: {
		position: "absolute",
		top: 360,
		left: 90,
		fontSize: 72,
		color: "#e5e5e5",
		transform: "rotate(-30deg)",
		fontFamily: "Helvetica-Bold",
	},
	section: { marginTop: 14 },
	sectionTitle: {
		fontSize: 10,
		fontFamily: "Helvetica-Bold",
		borderBottomWidth: 1,
		borderBottomColor: "#111",
		paddingBottom: 3,
		marginBottom: 4,
	},
	row: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 2.5,
		borderBottomWidth: 0.5,
		borderBottomColor: "#ddd",
	},
	total: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 3,
		fontFamily: "Helvetica-Bold",
	},
	muted: { color: "#666" },
	expenseRow: {
		flexDirection: "row",
		paddingVertical: 2.5,
		borderBottomWidth: 0.5,
		borderBottomColor: "#ddd",
	},
	notes: { marginTop: 4, lineHeight: 1.4 },
	footer: {
		position: "absolute",
		bottom: 24,
		left: 40,
		right: 40,
		fontSize: 7,
		color: "#888",
		flexDirection: "row",
		justifyContent: "space-between",
	},
});

function Line({
	label,
	cents,
	bold,
}: { label: string; cents: number; bold?: boolean }) {
	return (
		<View style={bold ? s.total : s.row}>
			<Text>{label}</Text>
			<Text>{formatBRL(cents || 0)}</Text>
		</View>
	);
}

function BalanceSheetDocument({
	data,
	notes,
	publishedAt,
}: {
	data: BalanceSheetData;
	notes: string | null;
	publishedAt: Date | null;
}) {
	const d = data.delinquency;
	return (
		<Document
			title={`Balancete ${data.period} - ${data.condominium.name}`}
			language="pt-BR"
		>
			<Page size="A4" style={s.page}>
				{!publishedAt && (
					<Text style={s.draft} fixed>
						RASCUNHO
					</Text>
				)}
				<View style={s.header}>
					<Text style={s.title}>
						Balancete de {periodLongLabel(data.period)}
					</Text>
					<Text style={s.subtitle}>
						{data.condominium.name}
						{data.condominium.cnpj ? ` · CNPJ ${data.condominium.cnpj}` : ""}
					</Text>
				</View>

				<View style={s.section}>
					<Text style={s.sectionTitle}>Resumo</Text>
					<Line label="Saldo inicial" cents={data.openingCents} />
					<Line label="Receitas (bruto)" cents={data.grossIncomeCents} />
					<Line label="Tarifas bancárias (Asaas)" cents={-data.feesCents} />
					<Line label="Despesas" cents={-data.expensesCents} />
					<Line label="Resultado do mês" cents={data.resultCents} />
					<Line label="Saldo final" cents={data.closingCents} bold />
				</View>

				<View style={s.section}>
					<Text style={s.sectionTitle}>Receitas</Text>
					{data.income.length === 0 && (
						<Text style={s.muted}>Nenhum pagamento recebido no mês.</Text>
					)}
					{data.income.map((i) => (
						<Line
							key={i.type}
							label={`${chargeTypeLabel(i.type)} (${i.count})`}
							cents={i.cents}
						/>
					))}
					<Line label="Tarifas bancárias (Asaas)" cents={-data.feesCents} />
					<Line label="Receita líquida" cents={data.netIncomeCents} bold />
				</View>

				<View style={s.section}>
					<Text style={s.sectionTitle}>Despesas por categoria</Text>
					{data.expensesByCategory.length === 0 && (
						<Text style={s.muted}>Nenhuma despesa no mês.</Text>
					)}
					{data.expensesByCategory.map((c) => (
						<Line key={c.category} label={c.category} cents={c.cents} />
					))}
					<Line label="Total de despesas" cents={data.expensesCents} bold />
				</View>

				{data.expenses.length > 0 && (
					<View style={s.section}>
						<Text style={s.sectionTitle}>Despesas detalhadas</Text>
						{data.expenses.map((e, index) => (
							<View key={index} style={s.expenseRow} wrap={false}>
								<Text style={{ width: 52 }}>{formatDate(e.date)}</Text>
								<Text style={{ width: 70 }}>{e.category}</Text>
								<Text style={{ flex: 1, paddingRight: 6 }}>
									{e.description}
									{e.supplier ? ` · ${e.supplier}` : ""}
								</Text>
								<Text style={{ width: 70, textAlign: "right" }}>
									{formatBRL(e.cents)}
								</Text>
							</View>
						))}
					</View>
				)}

				<View style={s.section}>
					<Text style={s.sectionTitle}>Inadimplência no fim do mês</Text>
					<Line label="Valor em atraso" cents={d.overdueCents} />
					<View style={s.row}>
						<Text>Unidades em atraso</Text>
						<Text>
							{d.units} de {d.unitsTotal}
						</Text>
					</View>
				</View>

				{notes && (
					<View style={s.section}>
						<Text style={s.sectionTitle}>Observações da administração</Text>
						<Text style={s.notes}>{notes}</Text>
					</View>
				)}

				<View style={s.footer} fixed>
					<Text>
						{publishedAt
							? `Publicado em ${publishedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`
							: "Rascunho: valores ainda podem mudar"}
						{" · Quartier Flow"}
					</Text>
					<Text
						render={({ pageNumber, totalPages }) =>
							`${pageNumber}/${totalPages}`
						}
					/>
				</View>
			</Page>
		</Document>
	);
}

export function renderBalanceSheetPdf(props: {
	data: BalanceSheetData;
	notes: string | null;
	publishedAt: Date | null;
}) {
	return renderToBuffer(<BalanceSheetDocument {...props} />);
}
