"use client";

import {
	ChevronDown,
	ChevronRight,
	Download,
	Gavel,
	Handshake,
	Repeat,
} from "lucide-react";
import Link from "next/link";
import { Fragment, useMemo, useState } from "react";

import { buttonVariants } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatPeriod } from "~/lib/billing-items";
import { formatBRL, formatDate, parseBRLToCents } from "~/lib/br";
import { STAGE_LABEL, STAGE_TONE, stageOf } from "~/lib/collection";
import {
	AGREEMENT_STATE_LABEL,
	AGREEMENT_STATE_TONE,
	MAX_AGREEMENT_INSTALLMENTS,
	agreementPlan,
	estimatedCharges,
	unitLabel,
} from "~/lib/delinquency";
import { periodShortLabel } from "~/lib/finance";
import { centsToMoneyInput } from "~/lib/masks";
import { type RouterOutputs, api } from "~/trpc/react";
import { condoPath } from "../../../_components/condo-nav";
import { downloadCsv } from "../../../_components/spreadsheet";
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
	fieldErrors,
} from "../../../_components/ui";
import { CasesCard, OpenCaseModal } from "./collection-case";

type Condo = RouterOutputs["condominium"]["get"];
type Overview = RouterOutputs["delinquency"]["overview"];
type DelinquentUnit = Overview["units"][number];
type Agreement = Overview["agreements"][number];

function Stat({
	label,
	value,
	hint,
}: {
	label: string;
	value: string;
	hint?: string;
}) {
	return (
		<div className="rounded-lg bg-muted/60 p-3">
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="font-semibold text-xl tracking-tight">{value}</p>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
		</div>
	);
}

/** CSV cell: quoted, with inner quotes doubled; `;` separator for Excel pt-BR. */
const cell = (value: string | number) =>
	`"${String(value).replace(/"/g, '""')}"`;

export function DelinquencyTab({ condo }: { condo: Condo }) {
	const utils = api.useUtils();
	const overview = api.delinquency.overview.useQuery({
		condominiumId: condo.id,
	});
	const [expanded, setExpanded] = useState<string | null>(null);
	const [proposing, setProposing] = useState<DelinquentUnit | null>(null);
	const [forgiving, setForgiving] = useState<DelinquentUnit | null>(null);
	const [renegotiating, setRenegotiating] = useState<Agreement | null>(null);
	const [openingCase, setOpeningCase] = useState<DelinquentUnit | null>(null);

	const exportRows = api.delinquency.exportRows.useMutation({
		onSuccess: (rows) => {
			const header = [
				"Unidade",
				"Responsável financeiro",
				"CPF",
				"E-mail",
				"Competência",
				"Descrição",
				"Vencimento",
				"Valor (R$)",
				"Dias em atraso",
				"Link do boleto",
			];
			downloadCsv(
				`inadimplencia-${condo.name.toLowerCase().replace(/\W+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`,
				[
					header.map(cell).join(";"),
					...rows.map((r) =>
						[
							r.unit,
							r.payerName,
							r.payerCpf,
							r.payerEmail,
							r.period,
							r.description,
							formatDate(r.dueDate),
							centsToMoneyInput(r.amountCents),
							r.daysLate,
							r.invoiceUrl,
						]
							.map(cell)
							.join(";"),
					),
				],
			);
		},
	});

	if (overview.isLoading) return <Loading />;
	if (overview.error || !overview.data) {
		return <ErrorMessage message={errorMessage(overview.error)} />;
	}
	const data = overview.data;
	const canManage = data.canManage;
	const openAgreements = data.agreements.filter(
		(a) => a.state === "active" || a.state === "late" || a.state === "pending",
	);
	const percent =
		data.unitsInCondominium > 0
			? Math.round((data.unitCount / data.unitsInCondominium) * 1000) / 10
			: 0;

	return (
		<div className="space-y-6">
			<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
				<Stat label="Total vencido" value={formatBRL(data.totalCents)} />
				<Stat
					label="Unidades inadimplentes"
					value={String(data.unitCount)}
					hint={`${percent.toLocaleString("pt-BR")}% de ${data.unitsInCondominium} unidades`}
				/>
				<Stat
					label="Acordos em andamento"
					value={String(openAgreements.length)}
				/>
				<Stat
					label="Acordos em atraso"
					value={String(
						data.agreements.filter((a) => a.state === "late").length,
					)}
				/>
			</div>

			<IndicatorsCard data={data} />

			<Card
				title="Unidades com cobranças vencidas"
				description="Só a administradora e o síndico veem esta lista. Nunca a divulgue aos moradores."
				action={
					canManage && data.units.length > 0 ? (
						<Button
							variant="outline"
							size="default"
							pending={exportRows.isPending}
							onClick={() => exportRows.mutate({ condominiumId: condo.id })}
						>
							<Download aria-hidden />
							Exportar CSV
						</Button>
					) : undefined
				}
			>
				<ErrorMessage message={errorMessage(exportRows.error)} />
				{data.units.length === 0 ? (
					<EmptyState title="Nenhuma unidade em atraso">
						Quando uma cobrança vencer sem pagamento, a unidade aparece aqui.
					</EmptyState>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unidade</TableHead>
								<TableHead className="hidden sm:table-cell">
									Responsável
								</TableHead>
								<TableHead className="text-right">Vencido</TableHead>
								<TableHead className="text-right">Atraso</TableHead>
								{canManage && <TableHead className="hidden sm:table-cell" />}
							</TableRow>
						</TableHeader>
						<TableBody>
							{data.units.map((row) => {
								const open = expanded === row.unit.id;
								return (
									<Fragment key={row.unit.id}>
										<TableRow
											className="cursor-pointer"
											onClick={() => setExpanded(open ? null : row.unit.id)}
										>
											<TableCell className="font-medium">
												<span className="flex items-center gap-1">
													{open ? (
														<ChevronDown className="size-4" aria-hidden />
													) : (
														<ChevronRight className="size-4" aria-hidden />
													)}
													{unitLabel(row.unit)}
												</span>
												{row.collectionCase && (
													<span className="mt-1 block">
														<Badge
															tone={
																STAGE_TONE[stageOf(row.collectionCase.stage)]
															}
														>
															{STAGE_LABEL[stageOf(row.collectionCase.stage)]}
														</Badge>
													</span>
												)}
											</TableCell>
											<TableCell className="hidden sm:table-cell">
												{row.payer?.name ?? (
													<span className="text-muted-foreground">
														Sem responsável
													</span>
												)}
											</TableCell>
											<TableCell className="text-right">
												{formatBRL(row.totalCents)}
												<span className="block text-muted-foreground text-xs">
													{row.charges.length} cobrança(s)
												</span>
											</TableCell>
											<TableCell className="text-right">
												<Badge tone={row.daysLate > 30 ? "danger" : "warning"}>
													{row.daysLate} dia(s)
												</Badge>
											</TableCell>
											{canManage && (
												<TableCell className="hidden text-right sm:table-cell">
													{row.activeAgreement ? (
														<Badge tone="info">Em acordo</Badge>
													) : (
														<Button
															variant="outline"
															size="sm"
															onClick={(event) => {
																event.stopPropagation();
																setProposing(row);
															}}
														>
															<Handshake aria-hidden />
															Propor acordo
														</Button>
													)}
												</TableCell>
											)}
										</TableRow>
										{open && (
											<TableRow className="bg-muted/30 hover:bg-muted/30">
												<TableCell colSpan={canManage ? 5 : 4}>
													<ul className="space-y-1 text-sm">
														{row.charges.map((charge) => (
															<li
																key={charge.id}
																className="flex flex-wrap justify-between gap-2"
															>
																<span>
																	{charge.label ?? formatPeriod(charge.period)}{" "}
																	· venceu em {formatDate(charge.dueDate)} (
																	{charge.daysLate} dia(s))
																</span>
																<span className="font-medium">
																	{formatBRL(charge.amountCents)}
																</span>
															</li>
														))}
													</ul>
													<div className="mt-3 flex flex-wrap items-center justify-between gap-2">
														<p className="text-muted-foreground text-xs">
															{row.payer?.email
																? `Contato: ${row.payer.email}`
																: "Sem responsável financeiro na unidade."}
														</p>
														{(canManage || row.collectionCase) && (
															<div className="flex flex-wrap gap-2">
																{row.collectionCase ? (
																	<Link
																		href={`${condoPath(condo.id, "inadimplencia")}/cobrancas/${row.collectionCase.id}`}
																		className={buttonVariants({
																			variant: "outline",
																			size: "sm",
																		})}
																	>
																		<Gavel aria-hidden />
																		Ver cobrança jurídica
																	</Link>
																) : (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => setOpeningCase(row)}
																	>
																		<Gavel aria-hidden />
																		Abrir cobrança jurídica
																	</Button>
																)}
																{/* Phones: the actions column is hidden. */}
																{canManage && !row.activeAgreement && (
																	<Button
																		size="sm"
																		className="sm:hidden"
																		onClick={() => setProposing(row)}
																	>
																		<Handshake aria-hidden />
																		Propor acordo
																	</Button>
																)}
																{canManage && (
																	<Button
																		variant="outline"
																		size="sm"
																		onClick={() => setForgiving(row)}
																	>
																		Perdoar cobranças
																	</Button>
																)}
															</div>
														)}
													</div>
												</TableCell>
											</TableRow>
										)}
									</Fragment>
								);
							})}
						</TableBody>
					</Table>
				)}
			</Card>

			<AgreementsCard
				agreements={data.agreements}
				canManage={canManage}
				onRenegotiate={setRenegotiating}
			/>

			<CasesCard condominiumId={condo.id} />

			{openingCase && (
				<OpenCaseModal
					condominiumId={condo.id}
					row={openingCase}
					onClose={() => setOpeningCase(null)}
				/>
			)}

			{renegotiating && (
				<AgreementModal
					condominiumId={condo.id}
					unit={renegotiating.unit}
					payerName={
						data.units.find((u) => u.unit.id === renegotiating.unit.id)?.payer
							?.name ?? null
					}
					charges={
						data.units.find((u) => u.unit.id === renegotiating.unit.id)
							?.charges ?? []
					}
					replacing={renegotiating}
					finePercent={data.finePercent}
					interestPercent={data.interestPercent}
					onClose={() => setRenegotiating(null)}
					onCreated={() => {
						setRenegotiating(null);
						void utils.delinquency.overview.invalidate();
					}}
				/>
			)}

			{forgiving && (
				<ForgiveModal
					condominiumId={condo.id}
					row={forgiving}
					onClose={() => setForgiving(null)}
					onDone={() => {
						setForgiving(null);
						void utils.delinquency.overview.invalidate();
					}}
				/>
			)}

			{proposing && (
				<AgreementModal
					condominiumId={condo.id}
					unit={proposing.unit}
					payerName={proposing.payer?.name ?? null}
					charges={proposing.charges}
					finePercent={data.finePercent}
					interestPercent={data.interestPercent}
					onClose={() => setProposing(null)}
					onCreated={() => {
						setProposing(null);
						void utils.delinquency.overview.invalidate();
					}}
				/>
			)}
		</div>
	);
}

function AgreementsCard({
	agreements,
	canManage,
	onRenegotiate,
}: {
	agreements: Agreement[];
	canManage: boolean;
	onRenegotiate: (agreement: Agreement) => void;
}) {
	const utils = api.useUtils();
	const refresh = () => utils.delinquency.overview.invalidate();
	const retry = api.delinquency.retryAgreement.useMutation({
		onSettled: refresh,
	});
	const end = api.delinquency.breakAgreement.useMutation({
		onSuccess: refresh,
	});
	const cancel = api.delinquency.cancelAgreement.useMutation({
		onSuccess: refresh,
	});
	const error = retry.error ?? end.error ?? cancel.error;
	const entradaError = retry.data?.entradaError;

	return (
		<Card
			title="Acordos"
			description="As parcelas entram nas próximas cobranças mensais da unidade; a entrada é um boleto à parte."
		>
			<ErrorMessage message={errorMessage(error) ?? entradaError} />
			{agreements.length === 0 ? (
				<EmptyState title="Nenhum acordo">
					Proponha um acordo a partir de uma unidade em atraso.
				</EmptyState>
			) : (
				<ul className="divide-y">
					{agreements.map((a) => {
						const entradaFailed = a.downPaymentCharge?.status === "failed";
						return (
							<li
								key={a.id}
								className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"
							>
								<div className="space-y-1">
									<p className="flex flex-wrap items-center gap-2 font-medium">
										Unidade {unitLabel(a.unit)}
										{a.replacedBy ? (
											<Badge>Substituído</Badge>
										) : (
											<Badge tone={AGREEMENT_STATE_TONE[a.state]}>
												{AGREEMENT_STATE_LABEL[a.state]}
											</Badge>
										)}
									</p>
									<p className="text-sm">
										{formatBRL(a.totalCents)} ·{" "}
										{a.downPaymentCents > 0 &&
											`entrada ${formatBRL(a.downPaymentCents)} + `}
										{a.installments}× {formatBRL(a.installmentCents)}
										{a.billingItem &&
											` a partir de ${formatPeriod(a.billingItem.startPeriod)}`}
									</p>
									<p className="text-muted-foreground text-xs">
										Criado em {formatDate(a.createdAt)} · renegociou{" "}
										{a.originalCharges.length} cobrança(s) de{" "}
										{formatBRL(a.originalCents)} · {a.paidInstallments}/
										{a.installments} parcela(s) paga(s) · falta{" "}
										{formatBRL(a.remainingCents)}
									</p>
									{a.downPaymentCharge && (
										<p className="text-muted-foreground text-xs">
											Entrada vence em {formatDate(a.downPaymentCharge.dueDate)}
											{entradaFailed &&
												` · não emitida: ${a.downPaymentCharge.issue ?? "erro"}`}
										</p>
									)}
									{a.notes && (
										<p className="text-muted-foreground text-xs">
											Obs.: {a.notes}
										</p>
									)}
								</div>
								{canManage && (
									<div className="flex flex-wrap gap-2">
										{(a.state === "pending" || entradaFailed) && (
											<Button
												variant="outline"
												size="sm"
												pending={
													retry.isPending &&
													retry.variables?.agreementId === a.id
												}
												onClick={() => retry.mutate({ agreementId: a.id })}
											>
												Tentar novamente
											</Button>
										)}
										{a.state === "pending" && (
											<ConfirmButton
												title="Cancelar este acordo?"
												description="As cobranças já canceladas no Asaas serão restauradas e voltam a constar como vencidas."
												confirmLabel="Cancelar acordo"
												pending={cancel.isPending}
												onConfirm={() => cancel.mutate({ agreementId: a.id })}
											>
												Cancelar
											</ConfirmButton>
										)}
										{a.status === "active" &&
											(a.state === "active" || a.state === "late") && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => onRenegotiate(a)}
												>
													<Repeat aria-hidden />
													Renegociar saldo
												</Button>
											)}
										{(a.state === "active" || a.state === "late") && (
											<ConfirmButton
												title="Encerrar este acordo?"
												description="As parcelas que ainda não foram cobradas saem das próximas cobranças mensais. Parcelas e entrada já emitidas continuam devidas."
												confirmLabel="Encerrar acordo"
												pending={end.isPending}
												onConfirm={() => end.mutate({ agreementId: a.id })}
											>
												Encerrar
											</ConfirmButton>
										)}
									</div>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</Card>
	);
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Proposes an acordo over overdue charges, or ("Renegociar saldo", with
 * `replacing`) ends an active acordo and replaces it with a new one over its
 * remaining balance plus, optionally, other overdue charges of the unit.
 */
function AgreementModal({
	condominiumId,
	unit,
	payerName,
	charges,
	replacing,
	finePercent,
	interestPercent,
	onClose,
	onCreated,
}: {
	condominiumId: string;
	unit: { id: string; block: string; number: string };
	payerName: string | null;
	charges: DelinquentUnit["charges"];
	replacing?: Agreement;
	finePercent: number;
	interestPercent: number;
	onClose: () => void;
	onCreated: () => void;
}) {
	// Installments never issued: they become the "Saldo do acordo encerrado".
	const unbilled = replacing
		? Math.max(0, replacing.installments - replacing.issuedInstallments)
		: 0;
	const saldoCents = replacing ? unbilled * replacing.installmentCents : 0;
	const [selected, setSelected] = useState<Set<string>>(
		() => new Set(replacing ? [] : charges.map((c) => c.id)),
	);
	const sums = (ids: Set<string>) => {
		const list = charges.filter((c) => ids.has(c.id));
		const original =
			saldoCents + list.reduce((sum, c) => sum + c.amountCents, 0);
		const estimate = list.reduce(
			(sum, c) =>
				sum +
				estimatedCharges({
					amountCents: c.amountCents,
					daysLate: c.daysLate,
					finePercent,
					interestPercent,
				}),
			0,
		);
		return { list, original, estimate };
	};
	const { list: chosen, original: originalCents, estimate } = sums(selected);

	const [total, setTotal] = useState(() =>
		centsToMoneyInput(originalCents + estimate),
	);
	const toggle = (id: string, checked: boolean) => {
		const next = new Set(selected);
		if (checked) next.add(id);
		else next.delete(id);
		setSelected(next);
		// Suggest the new amount; the administradora can still change it.
		const updated = sums(next);
		setTotal(
			updated.original > 0
				? centsToMoneyInput(updated.original + updated.estimate)
				: "",
		);
	};
	const [entrada, setEntrada] = useState("");
	const [entradaDue, setEntradaDue] = useState(() =>
		isoDate(new Date(Date.now() + 5 * 86_400_000)),
	);
	const [installments, setInstallments] = useState("6");
	const [notes, setNotes] = useState("");

	const totalCents = parseBRLToCents(total) ?? 0;
	const downPaymentCents = parseBRLToCents(entrada) ?? 0;
	const n = Number(installments) || 0;
	const plan = useMemo(
		() => agreementPlan({ totalCents, downPaymentCents, installments: n }),
		[totalCents, downPaymentCents, n],
	);

	const createAgreement = api.delinquency.createAgreement.useMutation({
		onSuccess: onCreated,
	});
	const renegotiate = api.delinquency.renegotiateAgreement.useMutation({
		onSuccess: onCreated,
	});
	const create = replacing ? renegotiate : createAgreement;
	const errors = fieldErrors(create.error);

	const valid =
		(chosen.length > 0 || saldoCents > 0) &&
		totalCents > 0 &&
		downPaymentCents < totalCents &&
		n >= 1 &&
		n <= MAX_AGREEMENT_INSTALLMENTS;

	return (
		<Modal
			open
			onOpenChange={(open) => !open && onClose()}
			size="lg"
			title={`${replacing ? "Renegociar saldo" : "Acordo"} · Unidade ${unitLabel(unit)}`}
			description={
				payerName
					? `Responsável: ${payerName}`
					: replacing
						? "O acordo atual é encerrado e substituído por este."
						: "A unidade não tem responsável financeiro."
			}
		>
			<form
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					const common = {
						totalCents,
						downPaymentCents,
						downPaymentDueDate: downPaymentCents > 0 ? entradaDue : null,
						installments: n,
						notes: notes.trim() || null,
					};
					if (replacing) {
						renegotiate.mutate({
							agreementId: replacing.id,
							extraChargeIds: chosen.map((c) => c.id),
							...common,
						});
					} else {
						createAgreement.mutate({
							condominiumId,
							unitId: unit.id,
							chargeIds: chosen.map((c) => c.id),
							...common,
						});
					}
				}}
			>
				<fieldset className="space-y-2">
					<legend className="mb-2 font-medium text-sm">
						Cobranças renegociadas
					</legend>
					{replacing && (
						<div className="flex min-h-11 items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 text-sm">
							<Checkbox checked disabled aria-label="Saldo do acordo atual" />
							<span className="flex-1">
								Saldo do acordo atual{" "}
								<span className="text-muted-foreground">
									· {unbilled} parcela(s) não emitida(s)
								</span>
							</span>
							<span className="font-medium">{formatBRL(saldoCents)}</span>
						</div>
					)}
					{replacing && charges.length > 0 && (
						<p className="text-muted-foreground text-xs">
							Inclua também, se quiser, cobranças em atraso da unidade (como
							parcelas já emitidas e não pagas):
						</p>
					)}
					{charges.map((charge) => (
						<label
							key={charge.id}
							htmlFor={`renegotiate-${charge.id}`}
							className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm"
						>
							<Checkbox
								id={`renegotiate-${charge.id}`}
								checked={selected.has(charge.id)}
								onCheckedChange={(checked) =>
									toggle(charge.id, checked === true)
								}
							/>
							<span className="flex-1">
								{charge.label ?? formatPeriod(charge.period)}{" "}
								<span className="text-muted-foreground">
									· {charge.daysLate} dia(s) de atraso
								</span>
							</span>
							<span className="font-medium">
								{formatBRL(charge.amountCents)}
							</span>
						</label>
					))}
					<p className="text-muted-foreground text-xs">
						Valor original {formatBRL(originalCents)} + multa e juros estimados{" "}
						{formatBRL(estimate)} = {formatBRL(originalCents + estimate)}.
						Estimativa: o Asaas calcula o valor exato no pagamento. As cobranças
						escolhidas são canceladas no Asaas ao criar o acordo.
						{replacing &&
							" O acordo atual é encerrado: parcelas já emitidas continuam nas cobranças mensais em que estão."}
					</p>
				</fieldset>

				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Valor negociado (R$)"
						hint="Pode incluir multa e juros, ou um desconto."
						error={errors.totalCents}
					>
						<MaskedInput
							mask="money"
							inputMode="numeric"
							value={total}
							onValueChange={setTotal}
						/>
					</Field>
					<Field
						label="Parcelas"
						hint="Uma por mês, junto da cobrança mensal."
						error={errors.installments}
					>
						<Input
							type="number"
							min={1}
							max={MAX_AGREEMENT_INSTALLMENTS}
							value={installments}
							onChange={(e) => setInstallments(e.target.value)}
						/>
					</Field>
					<Field
						label="Entrada (R$, opcional)"
						hint="Boleto à parte, emitido agora."
						error={errors.downPaymentCents}
					>
						<MaskedInput
							mask="money"
							inputMode="numeric"
							value={entrada}
							onValueChange={setEntrada}
						/>
					</Field>
					{downPaymentCents > 0 && (
						<Field
							label="Vencimento da entrada"
							hint="Até 30 dias a partir de hoje."
							error={errors.downPaymentDueDate}
						>
							<Input
								type="date"
								value={entradaDue}
								min={isoDate(new Date())}
								onChange={(e) => setEntradaDue(e.target.value)}
							/>
						</Field>
					)}
				</div>

				<Field label="Observações (opcional)" error={errors.notes}>
					<Input
						value={notes}
						maxLength={500}
						onChange={(e) => setNotes(e.target.value)}
						placeholder="Ex.: negociado por telefone com o proprietário"
					/>
				</Field>

				{valid && (
					<div className="rounded-lg bg-muted/60 p-3 text-sm">
						<p className="font-medium">Na prática</p>
						<p>
							{downPaymentCents > 0 &&
								`Entrada de ${formatBRL(downPaymentCents)} em ${formatDate(entradaDue)} + `}
							{n}× {formatBRL(plan.installmentCents)} nas próximas cobranças
							mensais. Total {formatBRL(plan.totalCents)}.
						</p>
						{plan.totalCents !== totalCents && (
							<p className="text-muted-foreground text-xs">
								A parcela foi arredondada para cima no centavo.
							</p>
						)}
					</div>
				)}

				<ErrorMessage
					message={
						Object.keys(errors).length > 0 ? null : errorMessage(create.error)
					}
				/>

				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="ghost" onClick={onClose}>
						Voltar
					</Button>
					<Button type="submit" disabled={!valid} pending={create.isPending}>
						{replacing ? "Renegociar" : "Criar acordo"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}

/**
 * Writes off overdue charges (e.g. a unit whose payer left, or a goodwill
 * decision). Requires a reason, kept with each charge and in the audit log.
 */
function ForgiveModal({
	condominiumId,
	row,
	onClose,
	onDone,
}: {
	condominiumId: string;
	row: DelinquentUnit;
	onClose: () => void;
	onDone: () => void;
}) {
	const [selected, setSelected] = useState<Set<string>>(
		() => new Set(row.charges.map((c) => c.id)),
	);
	const [reason, setReason] = useState("");
	const forgive = api.delinquency.forgiveCharges.useMutation({
		onSuccess: onDone,
	});
	const errors = fieldErrors(forgive.error);
	const chosen = row.charges.filter((c) => selected.has(c.id));
	const total = chosen.reduce((sum, c) => sum + c.amountCents, 0);

	return (
		<Modal
			open
			onOpenChange={(open) => !open && onClose()}
			title={`Perdoar cobranças · Unidade ${unitLabel(row.unit)}`}
			description="As cobranças escolhidas são canceladas no Asaas e deixam de ser cobradas. Não dá para desfazer."
		>
			<form
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					forgive.mutate({
						condominiumId,
						unitId: row.unit.id,
						chargeIds: chosen.map((c) => c.id),
						reason,
					});
				}}
			>
				<fieldset className="space-y-2">
					<legend className="mb-2 font-medium text-sm">Cobranças</legend>
					{row.charges.map((charge) => (
						<label
							key={charge.id}
							htmlFor={`forgive-${charge.id}`}
							className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm"
						>
							<Checkbox
								id={`forgive-${charge.id}`}
								checked={selected.has(charge.id)}
								onCheckedChange={(checked) =>
									setSelected((current) => {
										const next = new Set(current);
										if (checked === true) next.add(charge.id);
										else next.delete(charge.id);
										return next;
									})
								}
							/>
							<span className="flex-1">
								{charge.label ?? formatPeriod(charge.period)}{" "}
								<span className="text-muted-foreground">
									· {charge.daysLate} dia(s) de atraso
								</span>
							</span>
							<span className="font-medium">
								{formatBRL(charge.amountCents)}
							</span>
						</label>
					))}
				</fieldset>
				<Field
					label="Motivo"
					hint="Fica registrado na cobrança e no histórico. Ex.: proprietário anterior falecido, decisão da assembleia de 10/11/2026."
					error={errors.reason}
				>
					<Input
						value={reason}
						maxLength={500}
						onChange={(e) => setReason(e.target.value)}
					/>
				</Field>
				<ErrorMessage
					message={
						Object.keys(errors).length > 0 ? null : errorMessage(forgive.error)
					}
				/>
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="ghost" onClick={onClose}>
						Voltar
					</Button>
					<Button
						type="submit"
						variant="destructive"
						disabled={chosen.length === 0 || reason.trim().length < 5}
						pending={forgive.isPending}
					>
						Perdoar {formatBRL(total)}
					</Button>
				</div>
			</form>
		</Modal>
	);
}

const percentLabel = (rate: number) =>
	`${(Math.round(rate * 1000) / 10).toLocaleString("pt-BR")}%`;

/**
 * Is delinquency getting better or worse: aging of the overdue amount, the
 * month-end rate of the last 12 months (same rule as the balancete, 05) and
 * what the acordos hold and recovered.
 */
function IndicatorsCard({ data }: { data: Overview }) {
	const [active, setActive] = useState<string | null>(null);
	const [showTable, setShowTable] = useState(false);
	const maxAging = Math.max(1, ...data.aging.map((b) => b.cents));
	const maxRate = Math.max(0.05, ...data.history.map((m) => m.rate));
	const height = 120;
	const activeMonth =
		data.history.find((m) => m.period === active) ?? data.history.at(-1);

	return (
		<Card
			title="Indicadores"
			description="Inadimplência no fim de cada mês: unidades com cobrança vencida há mais de um dia e não paga até lá."
		>
			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-3">
					<p className="font-medium text-sm">
						Valor vencido por tempo de atraso
					</p>
					<ul className="space-y-2">
						{data.aging.map((bucket) => (
							<li key={bucket.label} className="space-y-1 text-sm">
								<div className="flex justify-between gap-2">
									<span>{bucket.label}</span>
									<span className="tabular-nums">
										{formatBRL(bucket.cents)}
										<span className="text-muted-foreground">
											{" "}
											· {bucket.charges}
										</span>
									</span>
								</div>
								<div className="h-2 rounded-full bg-muted">
									<div
										className="h-2 rounded-full bg-destructive/70"
										style={{
											width: `${bucket.cents > 0 ? Math.max(2, (bucket.cents / maxAging) * 100) : 0}%`,
										}}
									/>
								</div>
							</li>
						))}
					</ul>
					<div className="grid grid-cols-3 gap-2 pt-2">
						<Stat
							label="Em acordos"
							value={formatBRL(data.agreementTotals.openCents)}
							hint="a receber"
						/>
						<Stat
							label="Acordos atrasados"
							value={formatBRL(data.agreementTotals.lateCents)}
						/>
						<Stat
							label="Recuperado"
							value={formatBRL(data.agreementTotals.recoveredCents)}
							hint="pago em acordos"
						/>
					</div>
				</div>

				<div className="space-y-3">
					<div className="flex flex-wrap items-center justify-between gap-2 text-sm">
						<p className="font-medium">Unidades inadimplentes, 12 meses</p>
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
										<th className="py-1.5 text-right font-medium">Unidades</th>
										<th className="py-1.5 text-right font-medium">Taxa</th>
										<th className="py-1.5 text-right font-medium">Vencido</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{data.history.map((m) => (
										<tr key={m.period}>
											<td className="py-1.5">{periodShortLabel(m.period)}</td>
											<td className="py-1.5 text-right tabular-nums">
												{m.units}/{m.unitsTotal}
											</td>
											<td className="py-1.5 text-right tabular-nums">
												{percentLabel(m.rate)}
											</td>
											<td className="py-1.5 text-right tabular-nums">
												{formatBRL(m.overdueCents)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<>
							<p className="text-sm tabular-nums" aria-live="polite">
								{activeMonth && (
									<>
										<span className="font-medium">
											{periodShortLabel(activeMonth.period)}:
										</span>{" "}
										{percentLabel(activeMonth.rate)} ({activeMonth.units} de{" "}
										{activeMonth.unitsTotal}) ·{" "}
										{formatBRL(activeMonth.overdueCents)} vencido
									</>
								)}
							</p>
							<div
								className="flex items-end gap-0.5 border-b sm:gap-1"
								style={{ height }}
								onMouseLeave={() => setActive(null)}
							>
								{data.history.map((m) => (
									<button
										key={m.period}
										type="button"
										aria-label={`${periodShortLabel(m.period)}: ${percentLabel(m.rate)} das unidades, ${formatBRL(m.overdueCents)} vencido`}
										onMouseEnter={() => setActive(m.period)}
										onFocus={() => setActive(m.period)}
										onClick={() => setActive(m.period)}
										className="flex h-full flex-1 items-end justify-center rounded-t-sm outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-muted/70"
										data-active={active === m.period}
									>
										<span
											className="w-full max-w-5 rounded-t bg-destructive/70"
											style={{
												height:
													m.rate > 0
														? Math.max(
																2,
																Math.round((m.rate / maxRate) * height),
															)
														: 0,
											}}
										/>
									</button>
								))}
							</div>
							<div className="flex justify-between text-muted-foreground text-xs">
								<span>{periodShortLabel(data.history[0]?.period ?? "")}</span>
								<span>
									{periodShortLabel(data.history.at(-1)?.period ?? "")}
								</span>
							</div>
						</>
					)}
				</div>
			</div>
		</Card>
	);
}
