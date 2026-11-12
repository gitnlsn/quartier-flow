"use client";

import { cn } from "cn";
import { Plus, Users, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { formatPeriod } from "~/lib/billing-items";
import { formatBRL, parseBRLToCents } from "~/lib/br";
import { centsToMoneyInput } from "~/lib/masks";
import {
	RESERVATION_STATUS,
	WEEKDAYS,
	areaRules,
	hourLabel,
	rangeLabel,
	reservationStatus,
	slotLabel,
	spDate,
} from "~/lib/reservations";
import { type RouterOutputs, api } from "~/trpc/react";
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
	PageTitle,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";
import { useCondo } from "./condo-context";

type Area = RouterOutputs["reservation"]["module"]["areas"][number];
type Booking = RouterOutputs["reservation"]["list"]["reservations"][number];

const VIEWS = [
	{ module: "reservas", label: "Reservas" },
	{ module: "areas", label: "Áreas e regras" },
] as const;

/** Reservas module frame: title, on/off state and its two views. */
export function ReservationsFrame({ children }: { children: ReactNode }) {
	const condo = useCondo();
	const pathname = usePathname();
	const utils = api.useUtils();
	const state = api.reservation.module.useQuery({ condominiumId: condo.id });
	const toggle = api.reservation.setEnabled.useMutation({
		onSuccess: () => utils.reservation.module.invalidate(),
	});

	return (
		<div className="space-y-4">
			<PageTitle
				title="Reservas"
				subtitle={
					<span className="flex flex-wrap items-center gap-2">
						{condo.name}
						{state.data && !state.data.canManage && (
							<Badge>Somente visualização</Badge>
						)}
					</span>
				}
			/>
			{state.data && !state.data.enabled && (
				<Card
					title="Reservas desativadas"
					description="Ative para que os moradores reservem as áreas comuns pelo app, seguindo as regras de cada área."
				>
					<div className="flex flex-wrap items-center gap-3">
						{state.data.canManage ? (
							<Button
								pending={toggle.isPending}
								onClick={() =>
									toggle.mutate({ condominiumId: condo.id, enabled: true })
								}
							>
								Ativar reservas
							</Button>
						) : (
							<p className="text-muted-foreground text-sm">
								A administradora ou o síndico podem ativar.
							</p>
						)}
						{state.data.areas.length === 0 && state.data.canManage && (
							<p className="text-muted-foreground text-sm">
								Dica: cadastre as áreas antes de ativar.
							</p>
						)}
					</div>
					<ErrorMessage message={errorMessage(toggle.error)} />
				</Card>
			)}
			<nav
				aria-label="Visões de reservas"
				className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
			>
				<div className="inline-flex h-10 items-center rounded-lg bg-muted p-1 text-muted-foreground">
					{VIEWS.map((view) => {
						const href = condoPath(condo.id, view.module);
						const active = pathname === href;
						return (
							<a
								key={view.module}
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md px-3 font-medium text-sm transition-colors",
									active
										? "bg-background text-foreground shadow-sm"
										: "hover:text-foreground",
								)}
							>
								{view.label}
								{view.module === "reservas" && Boolean(state.data?.pending) && (
									<span className="rounded-full bg-warning px-1.5 text-warning-foreground text-xs">
										{state.data?.pending}
									</span>
								)}
							</a>
						);
					})}
				</div>
			</nav>
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export function BookingsView() {
	const condo = useCondo();
	const [view, setView] = useState<"upcoming" | "past">("upcoming");
	// Shown here: the canceled row itself leaves the list.
	const [notice, setNotice] = useState<string | null>(null);
	const pending = api.reservation.list.useQuery({
		condominiumId: condo.id,
		view: "pending",
	});
	const list = api.reservation.list.useQuery({
		condominiumId: condo.id,
		view,
	});

	if (pending.isLoading) return <Loading />;
	const canManage = pending.data?.canManage ?? false;
	const awaiting = pending.data?.reservations ?? [];

	return (
		<div className="space-y-6">
			<ErrorMessage message={errorMessage(pending.error ?? list.error)} />
			{notice && (
				<output className="block rounded-md border border-warning bg-warning/10 p-3 text-sm">
					{notice}
				</output>
			)}
			{awaiting.length > 0 && (
				<Card
					title="Aguardando aprovação"
					description="O horário fica reservado até você aprovar ou recusar."
				>
					<BookingList
						rows={awaiting}
						canManage={canManage}
						onNotice={setNotice}
					/>
				</Card>
			)}
			<BlocksCard />
			<Card
				title={view === "upcoming" ? "Próximas reservas" : "Anteriores"}
				action={
					<Select
						aria-label="Período"
						value={view}
						onChange={(e) => setView(e.target.value as typeof view)}
						className="h-9 w-auto"
					>
						<option value="upcoming">Próximas</option>
						<option value="past">Anteriores e canceladas</option>
					</Select>
				}
			>
				{list.isLoading ? (
					<Loading />
				) : list.data?.reservations.length ? (
					<BookingList
						rows={list.data.reservations}
						canManage={canManage}
						onNotice={setNotice}
					/>
				) : (
					<EmptyState
						title={
							view === "upcoming"
								? "Nenhuma reserva confirmada"
								: "Nenhuma reserva anterior"
						}
					>
						{view === "upcoming" &&
							"As reservas feitas pelos moradores aparecem aqui."}
					</EmptyState>
				)}
			</Card>
		</div>
	);
}

type OnNotice = (notice: string | null) => void;

function BookingList({
	rows,
	canManage,
	onNotice,
}: {
	rows: Booking[];
	canManage: boolean;
	onNotice: OnNotice;
}) {
	return (
		<ul className="divide-y">
			{rows.map((row) => (
				<BookingRow
					key={row.id}
					row={row}
					canManage={canManage}
					onNotice={onNotice}
				/>
			))}
		</ul>
	);
}

function BookingRow({
	row,
	canManage,
	onNotice,
}: {
	row: Booking;
	canManage: boolean;
	onNotice: OnNotice;
}) {
	const utils = api.useUtils();
	const [showGuests, setShowGuests] = useState(false);
	const [reason, setReason] = useState("");
	const refresh = () => {
		void utils.reservation.list.invalidate();
		void utils.reservation.module.invalidate();
	};
	const approve = api.reservation.approve.useMutation({ onSuccess: refresh });
	const reject = api.reservation.reject.useMutation({ onSuccess: refresh });
	const cancel = api.reservation.cancel.useMutation({
		onSuccess: (result) => {
			onNotice(
				result.feeKept
					? "Reserva cancelada. A taxa já foi cobrada no boleto do mês; se for o caso, devolva ao morador."
					: null,
			);
			refresh();
		},
	});
	const status = reservationStatus(row.status, row.endsAt);
	const badge = RESERVATION_STATUS[status];
	const active = row.status === "pending" || row.status === "confirmed";
	const future = new Date(row.endsAt) > new Date();
	const error = approve.error ?? reject.error ?? cancel.error;

	return (
		<li className="space-y-2 py-4 first:pt-0 last:pb-0">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<p className="font-medium">
						{row.area}{" "}
						<span className="text-muted-foreground">· Unidade {row.unit}</span>
					</p>
					<p className="text-sm">
						{slotLabel(row.slotType, row.startsAt, row.endsAt)}
					</p>
					<p className="text-muted-foreground text-sm">
						{[
							row.requestedBy && `Por ${row.requestedBy}`,
							row.feeCents > 0 &&
								`Taxa ${formatBRL(row.feeCents)}${row.feePeriod ? ` (cobrança de ${formatPeriod(row.feePeriod)})` : ""}`,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
					{row.notes && <p className="text-sm">“{row.notes}”</p>}
					{row.decisionNote && (
						<p className="text-muted-foreground text-sm">
							Motivo: {row.decisionNote}
						</p>
					)}
					{row.guestNames.length > 0 && (
						<button
							type="button"
							onClick={() => setShowGuests(!showGuests)}
							className="inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
						>
							<Users className="size-4" aria-hidden />
							{row.guestNames.length} convidado(s)
						</button>
					)}
					{showGuests && (
						<ul className="list-disc pl-5 text-sm">
							{row.guestNames.map((name, i) => (
								<li key={i}>{name}</li>
							))}
						</ul>
					)}
				</div>
				{badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
			</div>
			{canManage && active && future && (
				<div className="flex flex-wrap gap-2">
					{row.status === "pending" && (
						<Button
							size="sm"
							pending={approve.isPending}
							onClick={() => approve.mutate({ id: row.id })}
						>
							Aprovar
						</Button>
					)}
					<ConfirmButton
						variant="outline"
						title={
							row.status === "pending"
								? "Recusar reserva?"
								: "Cancelar reserva?"
						}
						description={
							<span className="block space-y-3">
								<span className="block">
									{row.area} · Unidade {row.unit} ·{" "}
									{slotLabel(row.slotType, row.startsAt, row.endsAt)}
								</span>
								<Input
									value={reason}
									maxLength={300}
									placeholder="Motivo (opcional, o morador verá)"
									onChange={(e) => setReason(e.target.value)}
								/>
							</span>
						}
						confirmLabel={
							row.status === "pending" ? "Recusar" : "Cancelar reserva"
						}
						pending={reject.isPending || cancel.isPending}
						onConfirm={() =>
							(row.status === "pending" ? reject : cancel).mutate({
								id: row.id,
								reason,
							})
						}
					>
						{row.status === "pending" ? "Recusar" : "Cancelar"}
					</ConfirmButton>
				</div>
			)}
			<ErrorMessage message={errorMessage(error)} />
		</li>
	);
}

// ---------------------------------------------------------------------------
// One-off closures
// ---------------------------------------------------------------------------

/**
 * Upcoming closures (maintenance, condominium events) and the action to add
 * one. Past ones drop off by themselves: nothing to keep up to date.
 */
function BlocksCard() {
	const condo = useCondo();
	const utils = api.useUtils();
	const state = api.reservation.module.useQuery({ condominiumId: condo.id });
	const [open, setOpen] = useState(false);
	const remove = api.reservation.removeBlock.useMutation({
		onSuccess: () => utils.reservation.module.invalidate(),
	});
	if (!state.data) return null;
	const { blocks, areas, canManage } = state.data;
	if (blocks.length === 0 && (!canManage || areas.length === 0)) return null;

	return (
		<Card
			title="Datas bloqueadas"
			description="Dias em que uma área (ou todas) fica fechada para reservas."
			action={
				canManage &&
				areas.length > 0 && (
					<Button size="sm" variant="outline" onClick={() => setOpen(true)}>
						Bloquear datas
					</Button>
				)
			}
		>
			{blocks.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Nenhum bloqueio programado.
				</p>
			) : (
				<ul className="divide-y">
					{blocks.map((block) => (
						<li
							key={block.id}
							className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
						>
							<div className="text-sm">
								<p className="font-medium">
									{rangeLabel(block.startsOn, block.endsOn)} ·{" "}
									{block.area ?? "Todas as áreas"}
								</p>
								{block.reason && (
									<p className="text-muted-foreground">{block.reason}</p>
								)}
							</div>
							{canManage && (
								<ConfirmButton
									title="Desbloquear estas datas?"
									description="As datas voltam a ficar disponíveis para reserva."
									confirmLabel="Desbloquear"
									pending={remove.isPending}
									onConfirm={() => remove.mutate({ id: block.id })}
								>
									Desbloquear
								</ConfirmButton>
							)}
						</li>
					))}
				</ul>
			)}
			<ErrorMessage message={errorMessage(remove.error)} />
			<Modal
				open={open}
				onOpenChange={setOpen}
				title="Bloquear datas"
				description="Os moradores veem o motivo no calendário da área."
			>
				{open && (
					<BlockForm
						condominiumId={condo.id}
						areas={areas}
						onDone={() => setOpen(false)}
					/>
				)}
			</Modal>
		</Card>
	);
}

function BlockForm({
	condominiumId,
	areas,
	onDone,
}: {
	condominiumId: string;
	areas: Area[];
	onDone: () => void;
}) {
	const utils = api.useUtils();
	const today = spDate(new Date());
	const [form, setForm] = useState({
		areaId: "",
		startsOn: today,
		endsOn: today,
		reason: "",
	});
	const add = api.reservation.addBlock.useMutation({
		onSuccess: async () => {
			await utils.reservation.module.invalidate();
			onDone();
		},
	});
	const errors = fieldErrors(add.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		add.mutate({
			condominiumId,
			areaId: form.areaId || null,
			startsOn: form.startsOn,
			endsOn: form.endsOn,
			reason: form.reason,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<Field label="Área">
				<Select
					value={form.areaId}
					onChange={(e) => setForm({ ...form, areaId: e.target.value })}
				>
					<option value="">Todas as áreas</option>
					{areas.map((a) => (
						<option key={a.id} value={a.id}>
							{a.name}
						</option>
					))}
				</Select>
			</Field>
			<div className="grid gap-4 sm:grid-cols-2">
				<Field label="De" error={errors.startsOn}>
					<Input
						type="date"
						min={today}
						value={form.startsOn}
						onChange={(e) =>
							setForm({
								...form,
								startsOn: e.target.value,
								endsOn:
									form.endsOn < e.target.value ? e.target.value : form.endsOn,
							})
						}
					/>
				</Field>
				<Field label="Até" error={errors.endsOn}>
					<Input
						type="date"
						min={form.startsOn}
						value={form.endsOn}
						onChange={(e) => setForm({ ...form, endsOn: e.target.value })}
					/>
				</Field>
			</div>
			<Field label="Motivo (opcional)" error={errors.reason}>
				<Input
					value={form.reason}
					maxLength={120}
					placeholder="Ex.: Dedetização, festa junina do condomínio"
					onChange={(e) => setForm({ ...form, reason: e.target.value })}
				/>
			</Field>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(add.error)}
			/>
			<div className="flex gap-2">
				<Button type="submit" pending={add.isPending}>
					Bloquear
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

// ---------------------------------------------------------------------------
// Areas and rules
// ---------------------------------------------------------------------------

export function AreasView() {
	const condo = useCondo();
	const utils = api.useUtils();
	const state = api.reservation.module.useQuery({ condominiumId: condo.id });
	const [editing, setEditing] = useState<Area | "new" | null>(null);
	const disable = api.reservation.setEnabled.useMutation({
		onSuccess: () => utils.reservation.module.invalidate(),
	});

	if (state.isLoading) return <Loading />;
	if (!state.data) return <ErrorMessage message={errorMessage(state.error)} />;
	const { areas, canManage, enabled } = state.data;

	return (
		<div className="space-y-6">
			{canManage && (
				<div>
					<Button onClick={() => setEditing("new")}>
						<Plus aria-hidden />
						Nova área
					</Button>
				</div>
			)}
			{areas.length === 0 ? (
				<EmptyState title="Nenhuma área cadastrada">
					Cadastre o salão de festas, a churrasqueira, a quadra... com as regras
					de reserva de cada uma.
				</EmptyState>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{areas.map((area) => (
						<AreaCard
							key={area.id}
							area={area}
							canManage={canManage}
							onEdit={() => setEditing(area)}
						/>
					))}
				</div>
			)}
			{canManage && enabled && (
				<Card
					title="Desativar reservas"
					description="Os moradores deixam de ver as áreas. Reservas já feitas continuam valendo."
				>
					<ConfirmButton
						variant="outline"
						size="default"
						title="Desativar reservas?"
						description="Os moradores não poderão mais reservar. As reservas existentes continuam valendo e podem ser canceladas aqui."
						confirmLabel="Desativar"
						pending={disable.isPending}
						onConfirm={() =>
							disable.mutate({ condominiumId: condo.id, enabled: false })
						}
					>
						Desativar reservas
					</ConfirmButton>
				</Card>
			)}
			<Modal
				open={editing !== null}
				onOpenChange={(open) => !open && setEditing(null)}
				title={editing === "new" ? "Nova área" : "Editar área"}
				size="lg"
			>
				{editing !== null && (
					<AreaForm
						condominiumId={condo.id}
						area={editing === "new" ? null : editing}
						onDone={() => setEditing(null)}
					/>
				)}
			</Modal>
		</div>
	);
}

function AreaCard({
	area,
	canManage,
	onEdit,
}: {
	area: Area;
	canManage: boolean;
	onEdit: () => void;
}) {
	const utils = api.useUtils();
	const archive = api.reservation.archiveArea.useMutation({
		onSuccess: () => utils.reservation.module.invalidate(),
	});
	return (
		<Card
			title={area.name}
			action={
				canManage && (
					<Button variant="outline" size="sm" onClick={onEdit}>
						Editar
					</Button>
				)
			}
		>
			<ul className="list-disc space-y-1 pl-5 text-sm">
				{areaRules(area).map((rule) => (
					<li key={rule}>{rule}</li>
				))}
			</ul>
			{canManage && (
				<div className="mt-4">
					<ConfirmButton
						variant="ghost"
						title={`Remover ${area.name}?`}
						description="A área deixa de aparecer para reserva. O histórico de reservas é mantido."
						confirmLabel="Remover"
						pending={archive.isPending}
						onConfirm={() => archive.mutate({ id: area.id })}
					>
						Remover área
					</ConfirmButton>
					<ErrorMessage message={errorMessage(archive.error)} />
				</div>
			)}
		</Card>
	);
}

const HOURS = Array.from({ length: 25 }, (_, h) => h);
const intOrNull = (value: string) => (value.trim() ? Number(value) : null);

function AreaForm({
	condominiumId,
	area,
	onDone,
}: {
	condominiumId: string;
	area: Area | null;
	onDone: () => void;
}) {
	const utils = api.useUtils();
	const save = api.reservation.saveArea.useMutation({
		onSuccess: async () => {
			await utils.reservation.module.invalidate();
			onDone();
		},
	});
	const [form, setForm] = useState({
		name: area?.name ?? "",
		description: area?.description ?? "",
		capacity: area?.capacity ? String(area.capacity) : "",
		fee: area?.feeCents ? centsToMoneyInput(area.feeCents) : "",
		slotType: area?.slotType ?? "day",
		opensHour: area?.opensHour ?? 8,
		closesHour: area?.closesHour ?? 22,
		maxHours: area?.maxHours ? String(area.maxHours) : "",
		requiresApproval: area?.requiresApproval ?? false,
		minAdvanceHours: String(area?.minAdvanceHours ?? 24),
		maxAdvanceDays: String(area?.maxAdvanceDays ?? 90),
		maxPerUnitPerMonth: area?.maxPerUnitPerMonth
			? String(area.maxPerUnitPerMonth)
			: "",
		cancelUntilHours: String(area?.cancelUntilHours ?? 48),
		blockDelinquent: area?.blockDelinquent ?? true,
		closedWeekdays: area?.closedWeekdays ?? [],
	});
	const [feeError, setFeeError] = useState<string>();
	const errors = fieldErrors(save.error);
	const key = (name: string) => errors[`area.${name}`] ?? errors[name];
	const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
		setForm((f) => ({ ...f, [k]: v }));

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const feeCents = form.fee.trim() ? parseBRLToCents(form.fee) : 0;
		setFeeError(feeCents === null ? "Valor inválido" : undefined);
		if (feeCents === null) return;
		save.mutate({
			condominiumId,
			id: area?.id,
			area: {
				name: form.name,
				description: form.description,
				capacity: intOrNull(form.capacity),
				feeCents,
				slotType: form.slotType as "day" | "hour",
				opensHour: form.opensHour,
				closesHour: form.closesHour,
				maxHours: intOrNull(form.maxHours),
				requiresApproval: form.requiresApproval,
				minAdvanceHours: Number(form.minAdvanceHours) || 0,
				maxAdvanceDays: Number(form.maxAdvanceDays) || 1,
				maxPerUnitPerMonth: intOrNull(form.maxPerUnitPerMonth),
				cancelUntilHours: Number(form.cancelUntilHours) || 0,
				blockDelinquent: form.blockDelinquent,
				closedWeekdays: form.closedWeekdays,
			},
		});
	}

	return (
		<form onSubmit={submit} className="space-y-6" noValidate>
			<div className="grid gap-4 md:grid-cols-2">
				<Field label="Nome" error={key("name")}>
					<Input
						value={form.name}
						placeholder="Ex.: Salão de festas"
						onChange={(e) => set("name", e.target.value)}
					/>
				</Field>
				<Field
					label="Capacidade (pessoas)"
					hint="Opcional"
					error={key("capacity")}
				>
					<Input
						type="number"
						min={1}
						inputMode="numeric"
						value={form.capacity}
						onChange={(e) => set("capacity", e.target.value)}
					/>
				</Field>
				<div className="md:col-span-2">
					<Field
						label="Regras de uso (opcional)"
						hint="O morador vê este texto antes de reservar."
						error={key("description")}
					>
						<textarea
							value={form.description}
							rows={3}
							maxLength={2000}
							placeholder="Ex.: Som até 22h. Entregar limpo. Proibido uso de confete."
							onChange={(e) => set("description", e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</Field>
				</div>
				<Field
					label="Taxa de uso (R$)"
					hint="Vazio = sem taxa. Entra na próxima cobrança mensal da unidade."
					error={feeError ?? key("feeCents")}
				>
					<MaskedInput
						mask="money"
						value={form.fee}
						placeholder="0,00"
						onValueChange={(fee) => set("fee", fee)}
					/>
				</Field>
				<Field label="Tipo de reserva" error={key("slotType")}>
					<Select
						value={form.slotType}
						onChange={(e) => set("slotType", e.target.value)}
					>
						<option value="day">Dia inteiro</option>
						<option value="hour">Por hora</option>
					</Select>
				</Field>
				{form.slotType === "hour" && (
					<>
						<Field label="Abre às" error={key("opensHour")}>
							<Select
								value={form.opensHour}
								onChange={(e) => set("opensHour", Number(e.target.value))}
							>
								{HOURS.slice(0, 24).map((h) => (
									<option key={h} value={h}>
										{hourLabel(h)}
									</option>
								))}
							</Select>
						</Field>
						<Field label="Fecha às" error={key("closesHour")}>
							<Select
								value={form.closesHour}
								onChange={(e) => set("closesHour", Number(e.target.value))}
							>
								{HOURS.slice(1).map((h) => (
									<option key={h} value={h}>
										{hourLabel(h)}
									</option>
								))}
							</Select>
						</Field>
						<Field
							label="Máximo de horas por reserva"
							hint="Vazio = sem limite"
							error={key("maxHours")}
						>
							<Input
								type="number"
								min={1}
								max={24}
								inputMode="numeric"
								value={form.maxHours}
								onChange={(e) => set("maxHours", e.target.value)}
							/>
						</Field>
					</>
				)}
			</div>

			<fieldset className="space-y-4">
				<legend className="mb-2 font-medium">Regras</legend>
				<div className="grid gap-4 md:grid-cols-2">
					<Field
						label="Antecedência mínima (horas)"
						hint="Ex.: 24 = reservar até a véspera"
						error={key("minAdvanceHours")}
					>
						<Input
							type="number"
							min={0}
							inputMode="numeric"
							value={form.minAdvanceHours}
							onChange={(e) => set("minAdvanceHours", e.target.value)}
						/>
					</Field>
					<Field
						label="Agenda aberta para os próximos (dias)"
						error={key("maxAdvanceDays")}
					>
						<Input
							type="number"
							min={1}
							max={365}
							inputMode="numeric"
							value={form.maxAdvanceDays}
							onChange={(e) => set("maxAdvanceDays", e.target.value)}
						/>
					</Field>
					<Field
						label="Reservas por unidade ao mês"
						hint="Vazio = sem limite"
						error={key("maxPerUnitPerMonth")}
					>
						<Input
							type="number"
							min={1}
							max={31}
							inputMode="numeric"
							value={form.maxPerUnitPerMonth}
							onChange={(e) => set("maxPerUnitPerMonth", e.target.value)}
						/>
					</Field>
					<Field
						label="Morador cancela até (horas antes)"
						hint="Depois disso, só a administração cancela."
						error={key("cancelUntilHours")}
					>
						<Input
							type="number"
							min={0}
							inputMode="numeric"
							value={form.cancelUntilHours}
							onChange={(e) => set("cancelUntilHours", e.target.value)}
						/>
					</Field>
				</div>
				<Toggle
					checked={form.requiresApproval}
					onChange={(v) => set("requiresApproval", v)}
					label="Exigir aprovação"
					hint="A reserva só é confirmada depois que o síndico ou a administradora aprovar."
				/>
				<Toggle
					checked={form.blockDelinquent}
					onChange={(v) => set("blockDelinquent", v)}
					label="Bloquear unidades inadimplentes"
					hint="Unidades com cobrança em atraso não conseguem reservar. Confira se a convenção permite."
				/>
			</fieldset>

			<fieldset className="space-y-3">
				<legend className="mb-2 font-medium">Dias de funcionamento</legend>
				<p className="text-muted-foreground text-sm">
					Desmarque os dias em que a área fecha toda semana. Para fechar em
					datas específicas (manutenção, evento), use "Bloquear datas" na aba
					Reservas.
				</p>
				<div className="flex flex-wrap gap-2">
					{WEEKDAYS.map((name, day) => {
						const open = !form.closedWeekdays.includes(day);
						return (
							<button
								key={name}
								type="button"
								aria-pressed={open}
								onClick={() =>
									set(
										"closedWeekdays",
										open
											? [...form.closedWeekdays, day]
											: form.closedWeekdays.filter((d) => d !== day),
									)
								}
								className={cn(
									"h-11 min-w-14 rounded-md border px-3 font-medium text-sm capitalize transition-colors",
									open
										? "border-primary bg-primary text-primary-foreground"
										: "text-muted-foreground line-through hover:bg-muted",
								)}
							>
								{name.slice(0, 3)}
							</button>
						);
					})}
				</div>
				{key("closedWeekdays") && (
					<p role="alert" className="text-destructive text-sm">
						{key("closedWeekdays")}
					</p>
				)}
			</fieldset>

			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(save.error)}
			/>
			<div className="flex gap-2">
				<Button type="submit" pending={save.isPending}>
					{area ? "Salvar" : "Cadastrar área"}
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

function Toggle({
	checked,
	onChange,
	label,
	hint,
}: {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label: string;
	hint: string;
}) {
	return (
		<label className="flex min-h-11 cursor-pointer items-start gap-3">
			<input
				type="checkbox"
				checked={checked}
				onChange={(e) => onChange(e.target.checked)}
				className="mt-1 size-5 accent-primary"
			/>
			<span>
				<span className="block font-medium text-sm">{label}</span>
				<span className="block text-muted-foreground text-sm">{hint}</span>
			</span>
		</label>
	);
}
