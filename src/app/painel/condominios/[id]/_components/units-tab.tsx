"use client";

import {
	ChevronRight,
	FileSpreadsheet,
	Pencil,
	Plus,
	UserPlus,
} from "lucide-react";
import { type FormEvent, useState } from "react";

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
import { formatBRL, parseBRLToCents } from "~/lib/br";
import { centsToMoneyInput } from "~/lib/masks";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Button,
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
import { ImportPeople } from "./import-people";
import { ItemForm, currentPeriod } from "./item-form";
import { InviteForm, MemberActions, RESIDENT_TYPE } from "./people";

type Condo = RouterOutputs["condominium"]["get"];
type Unit = Condo["units"][number];
type Items = RouterOutputs["billing"]["items"];

const unitLabel = (unit: Pick<Unit, "block" | "number">) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;

/** What a unit pays in a period: shared items (with its own amount) + its items. */
function unitTotal(items: Items, unitId: string, period: string) {
	let total = 0;
	for (const item of items.shared) {
		if (!itemForPeriod(item, period)) continue;
		const override = item.overrides.find((o) => o.unitId === unitId);
		total += override?.amountCents ?? item.amountCents;
	}
	for (const item of items.individual) {
		if (item.unitId === unitId && itemForPeriod(item, period)) {
			total += item.amountCents;
		}
	}
	return total;
}

function AddUnitsForm({ condominiumId }: { condominiumId: string }) {
	const utils = api.useUtils();
	const [block, setBlock] = useState("");
	const [numbers, setNumbers] = useState("");
	const add = api.condominium.addUnits.useMutation({
		onSuccess: () => {
			setNumbers("");
			return utils.condominium.get.invalidate({ id: condominiumId });
		},
	});
	const errors = fieldErrors(add.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		add.mutate({ condominiumId, block, numbers });
	}

	return (
		<form onSubmit={submit} className="space-y-3" noValidate>
			<div className="grid gap-3 md:grid-cols-[1fr_3fr_auto] md:items-start">
				<Field label="Bloco (opcional)" error={errors.block}>
					<Input value={block} onChange={(e) => setBlock(e.target.value)} />
				</Field>
				<Field
					label="Unidades"
					hint='Separe por vírgula ou use intervalos: "101, 102, 201-204"'
					error={errors.numbers}
				>
					<Input value={numbers} onChange={(e) => setNumbers(e.target.value)} />
				</Field>
				<Button type="submit" pending={add.isPending} className="md:mt-6">
					Adicionar
				</Button>
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(add.error)}
			/>
			{add.data && (
				<p aria-live="polite" className="text-sm text-success-foreground">
					{add.data.created} unidade(s) adicionada(s). Unidades repetidas são
					ignoradas.
				</p>
			)}
		</form>
	);
}

/** Sets this unit's own amount for a common item (empty = default amount). */
function OverrideEditor({
	condo,
	unit,
	item,
	onDone,
}: {
	condo: Condo;
	unit: Unit;
	item: Items["shared"][number];
	onDone: () => void;
}) {
	const utils = api.useUtils();
	const override = item.overrides.find((o) => o.unitId === unit.id);
	const [value, setValue] = useState(
		override ? centsToMoneyInput(override.amountCents) : "",
	);
	const [invalid, setInvalid] = useState(false);
	const save = api.billing.setOverride.useMutation({
		onSuccess: async () => {
			await utils.billing.items.invalidate({ condominiumId: condo.id });
			onDone();
		},
	});

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const cents = value.trim() === "" ? null : parseBRLToCents(value);
		setInvalid(value.trim() !== "" && cents === null);
		if (value.trim() !== "" && cents === null) return;
		save.mutate({
			condominiumId: condo.id,
			itemId: item.id,
			unitId: unit.id,
			amountCents: cents,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<p className="text-sm">
				Valor de <strong>{item.name}</strong> para a unidade {unitLabel(unit)}.
				Valor padrão: {formatBRL(item.amountCents)}.
			</p>
			<div className="flex flex-wrap items-end gap-2">
				<Field
					label="Valor desta unidade (R$)"
					hint="Vazio = usar o valor padrão."
				>
					<MaskedInput
						mask="money"
						className="w-40"
						value={value}
						placeholder={centsToMoneyInput(item.amountCents)}
						onValueChange={setValue}
						autoFocus
					/>
				</Field>
				<Button type="submit" pending={save.isPending}>
					Salvar
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
			</div>
			{invalid && (
				<p role="alert" className="text-destructive text-sm">
					Valor inválido
				</p>
			)}
			<ErrorMessage message={errorMessage(save.error)} />
		</form>
	);
}

/** Everything about a unit: residents, payer, items and monthly total. */
function UnitDetails({
	condo,
	unit,
	items,
}: {
	condo: Condo;
	unit: Unit;
	items: Items;
}) {
	const utils = api.useUtils();
	const [editing, setEditing] = useState<
		{ kind: "shared" | "individual"; id: string } | { kind: "new" } | null
	>(null);
	const refresh = () =>
		utils.billing.items.invalidate({ condominiumId: condo.id });
	const save = api.billing.saveUnitItem.useMutation({
		onSuccess: () => {
			setEditing(null);
			return refresh();
		},
	});
	const archive = api.billing.archiveUnitItem.useMutation({
		onSuccess: refresh,
	});
	const [inviting, setInviting] = useState(false);
	const own = items.individual.filter((item) => item.unitId === unit.id);
	const residents = condo.memberships.filter((m) => m.unitId === unit.id);
	const period = currentPeriod();
	// Common and individual items in one list (common first).
	const rows = [
		...items.shared.map((item) => {
			const override = item.overrides.find((o) => o.unitId === unit.id);
			return {
				kind: "shared" as const,
				id: item.id,
				name: item.name,
				description: item.description,
				schedule: scheduleLabel(item),
				applies: itemForPeriod(item, period),
				amountCents: override?.amountCents ?? item.amountCents,
				defaultCents: item.amountCents,
			};
		}),
		...own.map((item) => ({
			kind: "individual" as const,
			id: item.id,
			name: item.name,
			description: item.description,
			schedule: scheduleLabel(item),
			applies: itemForPeriod(item, period),
			amountCents: item.amountCents,
			defaultCents: item.amountCents,
		})),
	];
	const editingShared =
		editing?.kind === "shared"
			? items.shared.find((i) => i.id === editing.id)
			: undefined;
	const editingOwn =
		editing?.kind === "individual"
			? own.find((i) => i.id === editing.id)
			: undefined;

	return (
		<div className="space-y-6">
			<div className="rounded-lg bg-muted/60 p-4">
				<p className="text-muted-foreground text-sm">
					Total em {formatPeriod(period)}
				</p>
				<p className="font-semibold text-2xl tracking-tight">
					{formatBRL(unitTotal(items, unit.id, period))}
				</p>
			</div>

			<section className="space-y-2">
				<h3 className="font-semibold">Moradores</h3>
				{residents.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Ninguém nesta unidade ainda.
					</p>
				) : (
					<ul className="divide-y rounded-lg border">
						{residents.map((m) => (
							<li
								key={m.id}
								className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
							>
								<span className="min-w-0">
									<span className="block truncate font-medium">
										{m.user.name || m.user.email}
									</span>
									<span className="block truncate text-muted-foreground text-xs">
										{m.user.email}
										{m.user.cpfMasked && ` · CPF ${m.user.cpfMasked}`}
									</span>
									<span className="mt-1 flex flex-wrap gap-1">
										<Badge>
											{RESIDENT_TYPE[m.residentType ?? ""] ?? "Morador"}
										</Badge>
										{m.financiallyResponsible && (
											<Badge tone="success">Paga a unidade</Badge>
										)}
									</span>
								</span>
								<MemberActions condo={condo} member={m} />
							</li>
						))}
					</ul>
				)}
				{condo.canManage &&
					(inviting ? (
						<div className="rounded-lg border p-3">
							<InviteForm condo={condo} defaultUnitId={unit.id} />
							<Button
								variant="ghost"
								className="mt-2"
								onClick={() => setInviting(false)}
							>
								Fechar convite
							</Button>
						</div>
					) : (
						<Button variant="outline" onClick={() => setInviting(true)}>
							<UserPlus aria-hidden /> Convidar morador para esta unidade
						</Button>
					))}
			</section>

			<section className="space-y-3">
				<h3 className="font-semibold">Itens cobrados</h3>
				{rows.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Nenhum item. Crie itens comuns na aba Cobranças ou adicione um item
						individual abaixo.
					</p>
				) : (
					<div className="overflow-x-auto rounded-lg border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item</TableHead>
									<TableHead className="hidden sm:table-cell">Tipo</TableHead>
									<TableHead className="hidden sm:table-cell">Quando</TableHead>
									<TableHead className="text-right">Valor</TableHead>
									{condo.canManage && <TableHead className="w-0" />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.map((row) => (
									<TableRow
										key={`${row.kind}-${row.id}`}
										className={row.applies ? "" : "opacity-60"}
									>
										<TableCell className="whitespace-normal">
											<div className="font-medium">
												{row.name}
												{row.applies?.installment && (
													<span className="font-normal text-muted-foreground">
														{" "}
														({row.applies.installment})
													</span>
												)}
											</div>
											{row.description && (
												<div className="text-muted-foreground text-xs">
													{row.description}
												</div>
											)}
											<div className="text-muted-foreground text-xs sm:hidden">
												{row.kind === "shared" ? "Comum" : "Individual"} ·{" "}
												{row.schedule}
											</div>
										</TableCell>
										<TableCell className="hidden sm:table-cell">
											<Badge tone={row.kind === "shared" ? "info" : "warning"}>
												{row.kind === "shared" ? "Comum" : "Individual"}
											</Badge>
										</TableCell>
										<TableCell className="hidden whitespace-normal text-muted-foreground text-xs sm:table-cell">
											{row.schedule}
										</TableCell>
										<TableCell className="text-right">
											<div className="font-medium">
												{formatBRL(row.amountCents)}
											</div>
											{row.kind === "shared" && (
												<div className="text-muted-foreground text-xs">
													{row.defaultCents !== row.amountCents
														? `padrão ${formatBRL(row.defaultCents)}`
														: "padrão"}
												</div>
											)}
										</TableCell>
										{condo.canManage && (
											<TableCell>
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={
															row.kind === "shared"
																? `Valor de ${row.name} nesta unidade`
																: `Editar ${row.name}`
														}
														onClick={() =>
															setEditing({ kind: row.kind, id: row.id })
														}
													>
														<Pencil aria-hidden />
													</Button>
													{row.kind === "individual" && (
														<ConfirmButton
															title={`Remover "${row.name}"?`}
															description="O item deixa de entrar nas próximas cobranças desta unidade."
															confirmLabel="Remover"
															onConfirm={() =>
																archive.mutate({
																	condominiumId: condo.id,
																	itemId: row.id,
																})
															}
														>
															Remover
														</ConfirmButton>
													)}
												</div>
											</TableCell>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
				<p className="text-muted-foreground text-xs">
					Itens em cinza não entram em {formatPeriod(period)}.
				</p>

				{condo.canManage && editingShared && (
					<div className="rounded-lg border p-3">
						<OverrideEditor
							key={editingShared.id}
							condo={condo}
							unit={unit}
							item={editingShared}
							onDone={() => setEditing(null)}
						/>
					</div>
				)}
				{condo.canManage && (editingOwn || editing?.kind === "new") && (
					<div className="rounded-lg border p-3">
						<p className="mb-3 font-medium text-sm">
							{editingOwn
								? `Editar ${editingOwn.name}`
								: "Novo item individual"}
						</p>
						<ItemForm
							key={editingOwn?.id ?? "new"}
							initial={editingOwn ?? { recurrence: "once" }}
							submitLabel={editingOwn ? "Salvar item" : "Adicionar item"}
							pending={save.isPending}
							error={save.error}
							onCancel={() => setEditing(null)}
							onSubmit={(values) =>
								save.mutate({
									condominiumId: condo.id,
									unitId: unit.id,
									itemId: editingOwn?.id,
									item: {
										...values,
										description: values.description ?? undefined,
									},
								})
							}
						/>
					</div>
				)}
				{condo.canManage && !editing && (
					<Button variant="outline" onClick={() => setEditing({ kind: "new" })}>
						<Plus aria-hidden /> Adicionar item individual
					</Button>
				)}
				<ErrorMessage message={errorMessage(archive.error)} />
			</section>
		</div>
	);
}

export function UnitsTab({ condo }: { condo: Condo }) {
	const items = api.billing.items.useQuery({ condominiumId: condo.id });
	const [openUnitId, setOpenUnitId] = useState<string | null>(null);
	const [modal, setModal] = useState<"add" | "invite" | "import" | null>(null);
	const [search, setSearch] = useState("");
	const openUnit = condo.units.find((u) => u.id === openUnitId) ?? null;
	const period = currentPeriod();
	const byUnit = new Map<string, Condo["memberships"]>();
	for (const m of condo.memberships) {
		if (!m.unitId) continue;
		byUnit.set(m.unitId, [...(byUnit.get(m.unitId) ?? []), m]);
	}
	const sindicos = condo.memberships.filter((m) => m.role === "sindico");
	const term = search.trim().toLowerCase();
	const visible = condo.units.filter((unit) => {
		if (!term) return true;
		const people = byUnit.get(unit.id) ?? [];
		return (
			unitLabel(unit).toLowerCase().includes(term) ||
			people.some((m) =>
				`${m.user.name} ${m.user.email}`.toLowerCase().includes(term),
			)
		);
	});

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<Input
					aria-label="Buscar unidade ou morador"
					placeholder="Buscar unidade ou morador…"
					className="sm:max-w-xs"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
				{condo.canManage && (
					<div className="flex flex-wrap gap-2">
						<Button onClick={() => setModal("invite")}>
							<UserPlus aria-hidden /> Convidar
						</Button>
						<Button variant="outline" onClick={() => setModal("import")}>
							<FileSpreadsheet aria-hidden /> Importar planilha
						</Button>
						<Button variant="outline" onClick={() => setModal("add")}>
							<Plus aria-hidden /> Adicionar unidades
						</Button>
					</div>
				)}
			</div>

			{sindicos.length > 0 && (
				<div className="rounded-xl border bg-card p-4 shadow-xs">
					<p className="mb-2 font-medium text-sm">Síndico</p>
					<ul className="divide-y">
						{sindicos.map((m) => (
							<li
								key={m.id}
								className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
							>
								<span className="min-w-0">
									<span className="block truncate font-medium">
										{m.user.name || m.user.email}
									</span>
									<span className="block truncate text-muted-foreground text-xs">
										{m.user.email}
									</span>
								</span>
								<MemberActions condo={condo} member={m} />
							</li>
						))}
					</ul>
				</div>
			)}

			{condo.units.length === 0 ? (
				<EmptyState title="Nenhuma unidade cadastrada">
					{condo.canManage && 'Clique em "Adicionar unidades" para começar.'}
				</EmptyState>
			) : !items.data ? (
				<Loading />
			) : (
				<ul className="divide-y rounded-xl border bg-card shadow-xs">
					{visible.map((unit) => {
						const people = byUnit.get(unit.id) ?? [];
						const payer = people.find((m) => m.financiallyResponsible);
						const own =
							items.data?.individual.filter((i) => i.unitId === unit.id)
								.length ?? 0;
						return (
							<li key={unit.id}>
								<button
									type="button"
									onClick={() => setOpenUnitId(unit.id)}
									className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-muted sm:gap-4 sm:p-4"
								>
									<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted font-semibold text-sm">
										{unitLabel(unit)}
									</span>
									<span className="min-w-0 flex-1">
										<span
											className={
												payer
													? "block truncate font-medium"
													: "block truncate font-medium text-warning-foreground sm:text-foreground"
											}
										>
											{payer
												? payer.user.name || payer.user.email
												: "Sem responsável pelo pagamento"}
										</span>
										<span className="block truncate text-muted-foreground text-xs">
											{people.length} morador(es)
											{own > 0 && ` · ${own} item(ns) próprio(s)`}
										</span>
									</span>
									<span className="text-right">
										<span className="block font-semibold">
											{formatBRL(unitTotal(items.data, unit.id, period))}
										</span>
										<span className="block text-muted-foreground text-xs">
											{formatPeriod(period)}
										</span>
									</span>
									{/* Phones: the name line already says it (in warning color). */}
									{!payer && (
										<span className="hidden sm:inline-flex">
											<Badge tone="warning">Sem pagador</Badge>
										</span>
									)}
									<ChevronRight
										className="size-5 shrink-0 text-muted-foreground"
										aria-hidden
									/>
								</button>
							</li>
						);
					})}
					{visible.length === 0 && (
						<li className="p-6 text-center text-muted-foreground text-sm">
							Nada encontrado para &quot;{search}&quot;.
						</li>
					)}
				</ul>
			)}

			<Modal
				open={openUnit !== null}
				onOpenChange={(open) => !open && setOpenUnitId(null)}
				title={openUnit ? `Unidade ${unitLabel(openUnit)}` : ""}
				description="Quem mora, quem paga e o que esta unidade paga, item por item."
				size="lg"
			>
				{openUnit && items.data && (
					<UnitDetails condo={condo} unit={openUnit} items={items.data} />
				)}
			</Modal>

			<Modal
				open={modal === "add"}
				onOpenChange={(open) => !open && setModal(null)}
				title="Adicionar unidades"
				description="Informe um bloco (opcional) e os números das unidades."
			>
				<AddUnitsForm condominiumId={condo.id} />
			</Modal>
			<Modal
				open={modal === "invite"}
				onOpenChange={(open) => !open && setModal(null)}
				title="Convidar morador ou síndico"
				description="A pessoa recebe um convite por email para acessar o Quartier Flow."
				size="lg"
			>
				<InviteForm condo={condo} />
			</Modal>
			<Modal
				open={modal === "import"}
				onOpenChange={(open) => !open && setModal(null)}
				title="Importar moradores de planilha"
				description="CSV ou XLSX: escolha as colunas, confira a prévia e confirme."
				size="xl"
			>
				<ImportPeople condominiumId={condo.id} onDone={() => setModal(null)} />
			</Modal>
		</div>
	);
}
