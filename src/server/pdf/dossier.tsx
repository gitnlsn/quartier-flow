import "server-only";

import {
	Document,
	Page,
	StyleSheet,
	Text,
	View,
	renderToBuffer,
} from "@react-pdf/renderer";

import { formatBRL, formatCnpj, formatCpf, formatDate } from "~/lib/br";
import { STAGE_LABEL, TIMELINE_LABEL } from "~/lib/collection";
import { AGREEMENT_STATE_LABEL } from "~/lib/delinquency";
import type { CaseDetail } from "~/server/collection";

/**
 * Unit dossiê for legal collection (docs/features/04, item 3). Same look as
 * the balancete PDF; Helvetica covers Portuguese accents.
 */

const s = StyleSheet.create({
	page: { padding: 40, fontSize: 9, fontFamily: "Helvetica", color: "#111" },
	header: { marginBottom: 14 },
	title: { fontSize: 16, fontFamily: "Helvetica-Bold" },
	subtitle: { fontSize: 10, color: "#555", marginTop: 2 },
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
		paddingVertical: 2.5,
		borderBottomWidth: 0.5,
		borderBottomColor: "#ddd",
	},
	head: {
		flexDirection: "row",
		paddingVertical: 2.5,
		fontFamily: "Helvetica-Bold",
		borderBottomWidth: 0.5,
		borderBottomColor: "#999",
	},
	total: {
		flexDirection: "row",
		paddingVertical: 3,
		fontFamily: "Helvetica-Bold",
	},
	kv: { flexDirection: "row", paddingVertical: 1.5 },
	key: { width: 130, color: "#555" },
	muted: { color: "#666" },
	note: { color: "#444", marginTop: 1, lineHeight: 1.35 },
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

const right = { textAlign: "right" as const };

function KV({ label, value }: { label: string; value: string }) {
	return (
		<View style={s.kv}>
			<Text style={s.key}>{label}</Text>
			<Text style={{ flex: 1 }}>{value}</Text>
		</View>
	);
}

function Dossier({ d }: { d: CaseDetail }) {
	const generated = new Date();
	const cpf = d.payer && "cpf" in d.payer ? d.payer.cpf : null;
	return (
		<Document
			title={`Dossiê de cobrança · ${d.condominium.name} · ${d.unitLabel}`}
		>
			<Page size="A4" style={s.page}>
				<View style={s.header}>
					<Text style={s.title}>
						Dossiê de cobrança · Unidade {d.unitLabel}
					</Text>
					<Text style={s.subtitle}>
						{d.condominium.name}
						{d.condominium.cnpj
							? ` · CNPJ ${formatCnpj(d.condominium.cnpj)}`
							: ""}
					</Text>
					{d.condominium.address && (
						<Text style={s.subtitle}>{d.condominium.address}</Text>
					)}
				</View>

				<View style={s.section}>
					<Text style={s.sectionTitle}>Devedor e cobrança</Text>
					<KV
						label="Responsável financeiro"
						value={d.payer?.name || "Sem responsável cadastrado"}
					/>
					<KV label="CPF" value={cpf ? formatCpf(cpf) : "Não cadastrado"} />
					<KV label="E-mail" value={d.payer?.email ?? "-"} />
					<KV label="Etapa" value={STAGE_LABEL[d.stage]} />
					<KV label="Responsável pela cobrança" value={d.handler ?? "-"} />
					<KV label="Aberta em" value={formatDate(d.openedAt)} />
					{d.closedAt && (
						<KV label="Encerrada em" value={formatDate(d.closedAt)} />
					)}
					<KV label="Administradora" value={d.condominium.administradora} />
				</View>

				<View style={s.section}>
					<Text style={s.sectionTitle}>Débitos em aberto</Text>
					{d.debts.length === 0 ? (
						<Text style={s.muted}>Nenhuma cobrança vencida em aberto.</Text>
					) : (
						<>
							<View style={s.head}>
								<Text style={{ flex: 1 }}>Cobrança</Text>
								<Text style={{ width: 62 }}>Vencimento</Text>
								<Text style={{ width: 40, ...right }}>Dias</Text>
								<Text style={{ width: 72, ...right }}>Valor</Text>
								<Text style={{ width: 80, ...right }}>Multa e juros*</Text>
							</View>
							{d.debts.map((debt) => (
								<View key={debt.id} style={s.row} wrap={false}>
									<Text style={{ flex: 1, paddingRight: 6 }}>{debt.label}</Text>
									<Text style={{ width: 62 }}>{formatDate(debt.dueDate)}</Text>
									<Text style={{ width: 40, ...right }}>{debt.daysLate}</Text>
									<Text style={{ width: 72, ...right }}>
										{formatBRL(debt.amountCents)}
									</Text>
									<Text style={{ width: 80, ...right }}>
										{formatBRL(debt.estimateCents)}
									</Text>
								</View>
							))}
							<View style={s.total}>
								<Text style={{ flex: 1 }}>Total</Text>
								<Text style={{ width: 72, ...right }}>
									{formatBRL(d.debtTotals.amountCents)}
								</Text>
								<Text style={{ width: 80, ...right }}>
									{formatBRL(d.debtTotals.estimateCents)}
								</Text>
							</View>
							<Text style={s.muted}>
								* Estimativa com multa de{" "}
								{d.finePercent.toLocaleString("pt-BR")}% e juros de{" "}
								{d.interestPercent.toLocaleString("pt-BR")}% ao mês pro rata.
								Valor atualizado:{" "}
								{formatBRL(
									d.debtTotals.amountCents + d.debtTotals.estimateCents,
								)}
								.
							</Text>
						</>
					)}
				</View>

				{d.agreements.length > 0 && (
					<View style={s.section}>
						<Text style={s.sectionTitle}>Acordos</Text>
						{d.agreements.map((a) => (
							<View key={a.id} style={{ marginBottom: 6 }} wrap={false}>
								<Text style={{ fontFamily: "Helvetica-Bold" }}>
									Acordo de {formatDate(a.createdAt)} ·{" "}
									{a.replaced ? "Substituído" : AGREEMENT_STATE_LABEL[a.state]}
								</Text>
								<Text>
									{formatBRL(a.totalCents)}
									{a.downPaymentCents > 0
										? ` (entrada ${formatBRL(a.downPaymentCents)} + `
										: " ("}
									{a.installments}× {formatBRL(a.installmentCents)}) · pagas{" "}
									{a.paidInstallments}/{a.installments} · pago{" "}
									{formatBRL(a.paidCents)} · falta {formatBRL(a.remainingCents)}
								</Text>
								{a.installmentCharges.length > 0 && (
									<Text style={s.muted}>
										Parcelas emitidas:{" "}
										{a.installmentCharges
											.map(
												(i) =>
													`${i.installment ?? ""} venc. ${formatDate(i.dueDate)} (${i.status === "confirmed" || i.status === "received" ? "paga" : i.status === "overdue" ? "em atraso" : "em aberto"})`,
											)
											.join("; ")}
									</Text>
								)}
							</View>
						))}
					</View>
				)}

				<View style={s.section}>
					<Text style={s.sectionTitle}>Histórico</Text>
					{d.timeline.map((e) => (
						<View key={e.id} style={s.row} wrap={false}>
							<Text style={{ width: 62 }}>{formatDate(e.at)}</Text>
							<View style={{ flex: 1 }}>
								<Text style={{ fontFamily: "Helvetica-Bold" }}>
									{TIMELINE_LABEL[e.kind] ?? e.kind}
									{e.actor ? ` · ${e.actor}` : ""}
								</Text>
								{e.text ? <Text style={s.note}>{e.text}</Text> : null}
								{e.file ? (
									<Text style={s.muted}>Anexo: {e.file.name}</Text>
								) : null}
							</View>
						</View>
					))}
				</View>

				<View style={s.footer} fixed>
					<Text>
						Gerado em{" "}
						{generated.toLocaleString("pt-BR", {
							timeZone: "America/Sao_Paulo",
						})}{" "}
						· Quartier Flow · Documento com dados pessoais (LGPD): uso restrito
						à cobrança.
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

export function renderDossierPdf(detail: CaseDetail) {
	return renderToBuffer(<Dossier d={detail} />);
}
