"use client";

import {
	ArrowRight,
	ChevronRight,
	FileSpreadsheet,
	Pencil,
	Plus,
	Send,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Checkbox } from "~/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import {
	formatPeriod,
	itemForPeriod,
	scheduleLabel,
} from "~/lib/billing-items";
import { formatBRL, formatDate } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import { type CondoModule, condoPath } from "../../../_components/condo-nav";
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
	Modal,
	RUN_STATUS_LABEL,
	RUN_STATUS_TONE,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";
import { ImportItems } from "./import-items";
import { ItemForm, currentPeriod } from "./item-form";
import { RemindersForm, SettingsForm } from "./settings-form";

/** Unit items created by other modules: managed there, not edited here. */
const MANAGED_BY: Record<string, { module: CondoModule; label: string }> = {
	agreement: { module: "inadimplencia", label: "Gerenciar em Inadimplência" },
	reservation: { module: "reservas", label: "Gerenciar em Reservas" },
};

type Condo = RouterOutputs["condominium"]["get"];
type Items = RouterOutputs["billing"]["items"];

const unitLabel = (unit: { block: string; number: string }) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;

function ConfigSummary({ condo }: { condo: Condo }) {
	const config = condo.billingConfig;
	if (!config) return <EmptyState title="Cobrança mensal não configurada" />;
	const items = [
		["Situação", config.enabled ? "Ativada" : "Desativada"],
		["Envio", config.mode === "automatic" ? "Automático" : "Manual (auditado)"],
		["Vencimento", `Dia ${config.dueDay}`],
		[
			"Multa / juros",
			`${config.finePercent}% / ${config.interestPercent}% ao mês`,
		],
	];
	return (
		<dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
			{items.map(([label, value]) => (
				<div key={label}>
					<dt className="text-muted-foreground text-sm">{label}</dt>
					<dd className="font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}

/** Items every unit pays (common items): list, create, edit, archive. */
type SharedModal = { itemId?: string } | null;

function SharedItems({
	condo,
	items,
	month,
	modal,
	setModal,
}: {
	condo: Condo;
	items: Items;
	month: string;
	modal: SharedModal;
	setModal: (modal: SharedModal) => void;
}) {
	const utils = api.useUtils();
	const refresh = () =>
		utils.billing.items.invalidate({ condominiumId: condo.id });
	const save = api.billing.saveItem.useMutation({
		onSuccess: () => {
			setModal(null);
			return refresh();
		},
	});
	const archive = api.billing.archiveItem.useMutation({ onSuccess: refresh });
	const editing = modal?.itemId
		? items.shared.find((i) => i.id === modal.itemId)
		: undefined;
	const monthItems = items.shared.filter((item) => itemForPeriod(item, month));
	const monthTotal = monthItems.reduce(
		(sum, item) => sum + item.amountCents,
		0,
	);

	return (
		<div className="space-y-4">
			{items.shared.length === 0 ? (
				<EmptyState title="Nenhum item comum">
					{condo.canManage &&
						'Crie o primeiro, por exemplo "Taxa condominial".'}
				</EmptyState>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Item</TableHead>
								<TableHead>Quando</TableHead>
								<TableHead>Exceções</TableHead>
								<TableHead className="text-right">Valor</TableHead>
								{condo.canManage && <TableHead className="w-0" />}
							</TableRow>
						</TableHeader>
						<TableBody>
							{items.shared.map((item) => {
								const applies = itemForPeriod(item, month);
								return (
									<TableRow
										key={item.id}
										className={applies ? "" : "opacity-60"}
									>
										<TableCell className="whitespace-normal">
											<div className="font-medium">
												{item.name}
												{applies?.installment && (
													<span className="font-normal text-muted-foreground">
														{" "}
														({applies.installment})
													</span>
												)}
											</div>
											{item.description && (
												<div className="text-muted-foreground text-xs">
													{item.description}
												</div>
											)}
										</TableCell>
										<TableCell className="whitespace-normal text-muted-foreground text-sm">
											{scheduleLabel(item)}
											{!applies && (
												<div className="text-xs">
													Não entra em {formatPeriod(month)}
												</div>
											)}
										</TableCell>
										<TableCell className="text-muted-foreground text-sm">
											{item.overrides.length > 0
												? `${item.overrides.length} unidade(s) com valor próprio`
												: "—"}
										</TableCell>
										<TableCell className="text-right font-medium">
											{formatBRL(item.amountCents)}
										</TableCell>
										{condo.canManage && (
											<TableCell>
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Editar ${item.name}`}
														onClick={() => setModal({ itemId: item.id })}
													>
														<Pencil aria-hidden />
													</Button>
													<ConfirmButton
														title={`Arquivar "${item.name}"?`}
														description="O item deixa de entrar nas próximas cobranças. Cobranças já enviadas não mudam."
														confirmLabel="Arquivar"
														onConfirm={() =>
															archive.mutate({
																condominiumId: condo.id,
																itemId: item.id,
															})
														}
													>
														Arquivar
													</ConfirmButton>
												</div>
											</TableCell>
										)}
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				{items.shared.length > 0 ? (
					<p className="text-muted-foreground text-sm">
						Por unidade em {formatPeriod(month)}:{" "}
						<strong className="text-foreground">{formatBRL(monthTotal)}</strong>{" "}
						({monthItems.length} item(ns); unidades com valor próprio podem
						variar)
					</p>
				) : (
					<span />
				)}
			</div>
			<ErrorMessage message={errorMessage(archive.error)} />

			<Modal
				open={modal !== null}
				onOpenChange={(open) => !open && setModal(null)}
				title={editing ? `Editar ${editing.name}` : "Novo item comum"}
				description="Cobrado de todas as unidades. Valores diferentes para uma unidade são definidos no detalhe da unidade."
				size="lg"
			>
				<ItemForm
					key={editing?.id ?? "new"}
					initial={editing ?? { startPeriod: month }}
					submitLabel={editing ? "Salvar item" : "Criar item"}
					pending={save.isPending}
					error={save.error}
					onCancel={() => setModal(null)}
					onSubmit={(values) =>
						save.mutate({
							condominiumId: condo.id,
							itemId: editing?.id,
							item: { ...values, description: values.description ?? undefined },
						})
					}
				/>
			</Modal>
		</div>
	);
}

/**
 * Every unit-specific item in one table: filter by month/unit/item, add (with
 * unit selector), edit, remove and import from a spreadsheet.
 */
type IndividualModal =
	| { kind: "new" }
	| { kind: "edit"; itemId: string }
	| { kind: "import" }
	| null;

function IndividualItems({
	condo,
	items,
	month,
	modal,
	setModal,
}: {
	condo: Condo;
	items: Items;
	month: string;
	modal: IndividualModal;
	setModal: (modal: IndividualModal) => void;
}) {
	const utils = api.useUtils();
	const refresh = () =>
		utils.billing.items.invalidate({ condominiumId: condo.id });
	const [newUnitId, setNewUnitId] = useState("");
	const [search, setSearch] = useState("");
	const [onlyMonth, setOnlyMonth] = useState(true);
	const save = api.billing.saveUnitItem.useMutation({
		onSuccess: () => {
			setModal(null);
			setNewUnitId("");
			return refresh();
		},
	});
	const archive = api.billing.archiveUnitItem.useMutation({
		onSuccess: refresh,
	});
	const unitById = new Map(condo.units.map((u) => [u.id, u]));

	const term = search.trim().toLowerCase();
	const rows = items.individual
		.map((item) => ({
			item,
			unit: unitById.get(item.unitId),
			applies: itemForPeriod(item, month),
		}))
		.filter(({ item, unit, applies }) => {
			if (onlyMonth && !applies) return false;
			if (!term) return true;
			return `${unit ? unitLabel(unit) : ""} ${item.name} ${item.description ?? ""}`
				.toLowerCase()
				.includes(term);
		})
		.sort(
			(a, b) =>
				(a.unit ? unitLabel(a.unit) : "").localeCompare(
					b.unit ? unitLabel(b.unit) : "",
					"pt-BR",
					{ numeric: true },
				) || a.item.name.localeCompare(b.item.name, "pt-BR"),
		);
	const monthTotal = rows
		.filter((r) => r.applies)
		.reduce((sum, r) => sum + r.item.amountCents, 0);
	const editing =
		modal?.kind === "edit"
			? items.individual.find((i) => i.id === modal.itemId)
			: undefined;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end">
					<Input
						aria-label="Buscar item ou unidade"
						placeholder="Buscar item ou unidade…"
						className="sm:max-w-56"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Select
						aria-label="Período"
						className="sm:w-44"
						value={onlyMonth ? "month" : "all"}
						onChange={(e) => setOnlyMonth(e.target.value === "month")}
					>
						<option value="month">Itens de {formatPeriod(month)}</option>
						<option value="all">Todos os itens</option>
					</Select>
				</div>
			</div>

			{items.individual.length === 0 ? (
				<EmptyState title="Nenhum item individual">
					{condo.canManage &&
						"Adicione um item ou importe vários de uma planilha (ex.: leituras de gás do mês)."}
				</EmptyState>
			) : (
				<div className="overflow-x-auto rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unidade</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Quando</TableHead>
								<TableHead className="text-right">Valor</TableHead>
								{condo.canManage && <TableHead className="w-0" />}
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(({ item, unit, applies }) => (
								<TableRow key={item.id}>
									<TableCell className="font-medium">
										{unit ? unitLabel(unit) : "—"}
									</TableCell>
									<TableCell className="whitespace-normal">
										<div>
											{item.name}
											{applies?.installment && (
												<span className="text-muted-foreground">
													{" "}
													({applies.installment})
												</span>
											)}
										</div>
										{item.description && (
											<div className="text-muted-foreground text-xs">
												{item.description}
											</div>
										)}
									</TableCell>
									<TableCell className="text-muted-foreground text-sm">
										{scheduleLabel(item)}
									</TableCell>
									<TableCell className="text-right">
										{formatBRL(item.amountCents)}
									</TableCell>
									{condo.canManage && MANAGED_BY[item.source] !== undefined ? (
										<TableCell className="text-right">
											<Link
												href={condoPath(
													condo.id,
													MANAGED_BY[item.source]?.module ?? "visao",
												)}
												className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
											>
												{MANAGED_BY[item.source]?.label}
											</Link>
										</TableCell>
									) : (
										condo.canManage && (
											<TableCell>
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Editar ${item.name}`}
														onClick={() =>
															setModal({ kind: "edit", itemId: item.id })
														}
													>
														<Pencil aria-hidden />
													</Button>
													<ConfirmButton
														title={`Remover "${item.name}" da unidade ${unit ? unitLabel(unit) : ""}?`}
														description="O item deixa de entrar nas próximas cobranças. Cobranças já preparadas ou enviadas não mudam."
														confirmLabel="Remover"
														onConfirm={() =>
															archive.mutate({
																condominiumId: condo.id,
																itemId: item.id,
															})
														}
													>
														Remover
													</ConfirmButton>
												</div>
											</TableCell>
										)
									)}
								</TableRow>
							))}
							{rows.length === 0 && (
								<TableRow>
									<TableCell
										colSpan={condo.canManage ? 5 : 4}
										className="py-6 text-center text-muted-foreground"
									>
										{onlyMonth
											? `Nenhum item individual em ${formatPeriod(month)}.`
											: "Nenhum item encontrado."}
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</div>
			)}
			{onlyMonth && rows.length > 0 && (
				<p className="text-muted-foreground text-sm">
					Total de itens individuais em {formatPeriod(month)}:{" "}
					<strong className="text-foreground">{formatBRL(monthTotal)}</strong> ·{" "}
					{new Set(rows.map((r) => r.item.unitId)).size} unidade(s)
				</p>
			)}
			<ErrorMessage message={errorMessage(archive.error)} />

			<Modal
				open={modal?.kind === "new"}
				onOpenChange={(open) => !open && setModal(null)}
				title="Novo item individual"
				description="Cobrado apenas da unidade escolhida."
				size="lg"
			>
				<div className="space-y-4">
					<Field label="Unidade">
						<Select
							value={newUnitId}
							onChange={(e) => setNewUnitId(e.target.value)}
						>
							<option value="">Selecione</option>
							{condo.units.map((unit) => (
								<option key={unit.id} value={unit.id}>
									{unitLabel(unit)}
								</option>
							))}
						</Select>
					</Field>
					{newUnitId ? (
						<ItemForm
							initial={{ recurrence: "once", startPeriod: month }}
							submitLabel="Adicionar item"
							pending={save.isPending}
							error={save.error}
							onCancel={() => setModal(null)}
							onSubmit={(values) =>
								save.mutate({
									condominiumId: condo.id,
									unitId: newUnitId,
									item: {
										...values,
										description: values.description ?? undefined,
									},
								})
							}
						/>
					) : (
						<p className="text-muted-foreground text-sm">
							Escolha a unidade primeiro.
						</p>
					)}
				</div>
			</Modal>

			<Modal
				open={modal?.kind === "edit" && Boolean(editing)}
				onOpenChange={(open) => !open && setModal(null)}
				title={
					editing
						? `Editar item · Unidade ${
								unitById.get(editing.unitId)
									? unitLabel(
											unitById.get(editing.unitId) as Condo["units"][number],
										)
									: ""
							}`
						: "Editar item"
				}
				size="lg"
			>
				{editing && (
					<ItemForm
						key={editing.id}
						initial={editing}
						submitLabel="Salvar item"
						pending={save.isPending}
						error={save.error}
						onCancel={() => setModal(null)}
						onSubmit={(values) =>
							save.mutate({
								condominiumId: condo.id,
								unitId: editing.unitId,
								itemId: editing.id,
								item: {
									...values,
									description: values.description ?? undefined,
								},
							})
						}
					/>
				)}
			</Modal>

			<Modal
				open={modal?.kind === "import"}
				onOpenChange={(open) => !open && setModal(null)}
				title="Importar itens individuais"
				description="Uma linha por unidade e item (ex.: leituras de gás do mês)."
				size="xl"
			>
				<ImportItems condominiumId={condo.id} onDone={() => setModal(null)} />
			</Modal>
		</div>
	);
}

/** Expected total of a unit-less month: common items per unit + individual items. */
export function expectedTotal(condo: Condo, items: Items, month: string) {
	let total = 0;
	for (const unit of condo.units) {
		for (const item of items.shared) {
			if (!itemForPeriod(item, month)) continue;
			const override = item.overrides.find((o) => o.unitId === unit.id);
			total += override?.amountCents ?? item.amountCents;
		}
	}
	for (const item of items.individual) {
		if (itemForPeriod(item, month)) total += item.amountCents;
	}
	return total;
}

/** The month's charges: one button whose action follows the run state. */
function MonthCharges({
	condo,
	items,
	month,
}: {
	condo: Condo;
	items: Items;
	month: string;
}) {
	const router = useRouter();
	const runs = api.billing.listRuns.useQuery({ condominiumId: condo.id });
	const prepare = api.billing.prepareRun.useMutation({
		onSuccess: ({ runId }) =>
			router.push(`/painel/condominios/${condo.id}/cobrancas/${runId}`),
	});
	const run = runs.data?.find((r) => r.period === month);
	const runHref = (id: string) =>
		`/painel/condominios/${condo.id}/cobrancas/${id}`;

	return (
		<div className="space-y-5">
			<div className="flex flex-col gap-4 rounded-lg bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-muted-foreground text-sm">
						{run ? "Total das cobranças" : "Total previsto"} de{" "}
						{formatPeriod(month)}
					</p>
					<p className="font-semibold text-2xl tracking-tight">
						{formatBRL(
							run ? run.totalCents : expectedTotal(condo, items, month),
						)}
					</p>
					{run ? (
						<p className="mt-1 flex items-center gap-2 text-sm">
							<Badge tone={RUN_STATUS_TONE[run.status]}>
								{RUN_STATUS_LABEL[run.status] ?? run.status}
							</Badge>
							<span className="text-muted-foreground">
								Vence {formatDate(run.dueDate)}
							</span>
						</p>
					) : (
						<p className="text-muted-foreground text-xs">
							{condo.units.length} unidade(s) · itens comuns + individuais
						</p>
					)}
				</div>
				{run ? (
					<a
						href={runHref(run.id)}
						className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						{run.status === "draft" && condo.canManage ? (
							<>
								<Send className="size-4" aria-hidden /> Auditar e enviar
							</>
						) : (
							<>
								Ver cobranças <ArrowRight className="size-4" aria-hidden />
							</>
						)}
					</a>
				) : (
					condo.canManage && (
						<Button
							disabled={!condo.billingConfig}
							pending={prepare.isPending}
							onClick={() =>
								prepare.mutate({ condominiumId: condo.id, period: month })
							}
						>
							<Send aria-hidden /> Preparar cobranças de {formatPeriod(month)}
						</Button>
					)
				)}
			</div>
			{condo.canManage && !condo.billingConfig && (
				<p className="text-muted-foreground text-sm">
					Salve a configuração da cobrança (aba Configurações) antes.
				</p>
			)}
			{condo.canManage && !run && condo.billingConfig && (
				<p className="text-muted-foreground text-sm">
					Preparar não envia nada: você confere a auditoria e só então envia.
				</p>
			)}
			<ErrorMessage message={errorMessage(prepare.error)} />
		</div>
	);
}

/** Month's billing: common items, individual items, then prepare/send. */
export function ChargesTab({ condo }: { condo: Condo }) {
	const items = api.billing.items.useQuery({ condominiumId: condo.id });
	const [month, setMonth] = useState(currentPeriod());
	const [sharedModal, setSharedModal] = useState<SharedModal>(null);
	const [individualModal, setIndividualModal] = useState<IndividualModal>(null);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<Field label="Mês de referência">
					<Input
						type="month"
						className="sm:w-52"
						value={month}
						onChange={(e) => e.target.value && setMonth(e.target.value)}
					/>
				</Field>
				<p className="text-muted-foreground text-sm sm:text-right">
					Os três quadros abaixo mostram {formatPeriod(month)}.
				</p>
			</div>
			{!items.data ? (
				<Loading />
			) : (
				<>
					<Card
						title="1. Itens comuns"
						description="Cobrados de todas as unidades (ex.: taxa condominial, fundo de reserva, taxa extra parcelada)."
						action={
							condo.canManage && (
								<Button onClick={() => setSharedModal({})}>
									<Plus aria-hidden /> Novo item comum
								</Button>
							)
						}
					>
						<SharedItems
							condo={condo}
							items={items.data}
							month={month}
							modal={sharedModal}
							setModal={setSharedModal}
						/>
					</Card>
					<Card
						title="2. Itens individuais"
						description="Itens que só uma unidade paga (consumo de gás, vaga extra, multa…), nos meses indicados."
						action={
							condo.canManage && (
								<>
									<Button onClick={() => setIndividualModal({ kind: "new" })}>
										<Plus aria-hidden /> Novo item
									</Button>
									<Button
										variant="outline"
										onClick={() => setIndividualModal({ kind: "import" })}
									>
										<FileSpreadsheet aria-hidden /> Importar planilha
									</Button>
								</>
							)
						}
					>
						<IndividualItems
							condo={condo}
							items={items.data}
							month={month}
							modal={individualModal}
							setModal={setIndividualModal}
						/>
					</Card>
					<Card
						title={`3. Cobranças de ${formatPeriod(month)}`}
						description="Uma cobrança por unidade com a soma dos itens do mês."
					>
						<MonthCharges condo={condo} items={items.data} month={month} />
					</Card>
				</>
			)}
		</div>
	);
}

/** Billing settings: due day, manual/automatic sending, fine and interest. */
export function SettingsTab({ condo }: { condo: Condo }) {
	return condo.canManage ? (
		<>
			<SettingsForm condo={condo} />
			<RemindersForm condo={condo} />
		</>
	) : (
		<Card title="Cobrança mensal">
			<ConfigSummary condo={condo} />
		</Card>
	);
}
