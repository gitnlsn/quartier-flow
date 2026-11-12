"use client";

import { cn } from "cn";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { type FormEvent, useState } from "react";

import { addMonths, formatPeriod } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import {
	RESERVATION_STATUS,
	TIME_ZONE,
	areaRules,
	closedReason,
	dayStatus,
	durationsFrom,
	freeStartHours,
	hourLabel,
	rangeLabel,
	reservationStatus,
	slotLabel,
	spDate,
	spMonth,
} from "~/lib/reservations";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Button,
	Card,
	ConfirmButton,
	EmptyState,
	ErrorMessage,
	Field,
	Loading,
	Modal,
	Select,
	errorMessage,
} from "./ui";
import { useSelectedUnit } from "./unit-context";

type Condo = RouterOutputs["reservation"]["myOptions"][number];
type Area = Condo["areas"][number];
type Mine = RouterOutputs["reservation"]["mine"][number];

/** Resident area: book common areas and follow their bookings (docs/features/06). */
export function BookArea() {
	const options = api.reservation.myOptions.useQuery();
	// "Minha área" belongs to the unit picked in the sidebar.
	const { selected } = useSelectedUnit();
	const [booking, setBooking] = useState<Area | null>(null);
	const [booked, setBooked] = useState<string | null>(null);

	if (options.isLoading) return <Loading />;
	const condo = options.data?.find((c) => c.id === selected?.condominiumId);
	const unit = condo?.units.find((u) => u.id === selected?.id);

	return (
		<div className="space-y-8">
			<ErrorMessage message={errorMessage(options.error)} />
			{!condo || !unit ? (
				<EmptyState title="Reservas indisponíveis">
					Seu condomínio ainda não ativou as reservas de áreas comuns.
				</EmptyState>
			) : (
				<section className="space-y-4">
					<h2 className="font-semibold text-lg">Áreas</h2>
					{booked && (
						<output className="block rounded-md border border-success/40 bg-success/10 p-3 text-sm">
							{booked}
						</output>
					)}
					{condo.areas.length === 0 ? (
						<EmptyState title="Nenhuma área disponível">
							A administração ainda não cadastrou as áreas.
						</EmptyState>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							{condo.areas.map((area) => (
								<Card
									key={area.id}
									title={area.name}
									action={
										<Button
											size="sm"
											onClick={() => {
												setBooked(null);
												setBooking(area);
											}}
										>
											Reservar
										</Button>
									}
								>
									<ul className="list-disc space-y-1 pl-5 text-sm">
										{areaRules(area).map((rule) => (
											<li key={rule}>{rule}</li>
										))}
									</ul>
									{area.description && (
										<p className="mt-3 whitespace-pre-line text-muted-foreground text-sm">
											{area.description}
										</p>
									)}
								</Card>
							))}
						</div>
					)}
				</section>
			)}

			<MyReservations />

			<Modal
				open={booking !== null}
				onOpenChange={(open) => !open && setBooking(null)}
				title={booking ? `Reservar ${booking.name}` : ""}
				description={
					condo && unit ? `${condo.name} · Unidade ${unit.label}` : undefined
				}
				size="lg"
			>
				{booking && unit && (
					<BookingForm
						area={booking}
						units={[unit]}
						onDone={(message) => {
							setBooking(null);
							setBooked(message);
						}}
					/>
				)}
			</Modal>
		</div>
	);
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
/** "Novembro de 2026": capitalize only the first letter (not "De"). */
const monthName = (month: string) => {
	const text = new Date(`${month}-15T12:00:00Z`).toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});
	return text.charAt(0).toUpperCase() + text.slice(1);
};

function BookingForm({
	area,
	units,
	onDone,
}: {
	area: Area;
	units: Condo["units"];
	onDone: (message: string) => void;
}) {
	const utils = api.useUtils();
	const today = spDate(new Date());
	const [month, setMonth] = useState(spMonth(new Date()));
	const [date, setDate] = useState<string | null>(null);
	const [startHour, setStartHour] = useState<number | null>(null);
	const [hours, setHours] = useState(1);
	const [unitId, setUnitId] = useState(units[0]?.id ?? "");
	const [guests, setGuests] = useState("");
	const [notes, setNotes] = useState("");
	const busy = api.reservation.calendar.useQuery({ areaId: area.id, month });
	const book = api.reservation.book.useMutation({
		onSuccess: async (result) => {
			await Promise.all([
				utils.reservation.mine.invalidate(),
				utils.reservation.calendar.invalidate(),
			]);
			const fee =
				area.feeCents > 0 && result.feePeriod
					? ` A taxa de ${formatBRL(area.feeCents)} vem na cobrança de ${formatPeriod(result.feePeriod)}.`
					: "";
			onDone(
				result.status === "pending"
					? "Pedido enviado. A reserva fica confirmada quando a administração aprovar."
					: `Reserva confirmada.${fee}`,
			);
		},
	});

	const taken = busy.data?.busy ?? [];
	// The area's rules plus this month's one-off closures.
	const rules = { ...area, blocks: busy.data?.blocks ?? [] };
	const monthBlocks = rules.blocks.filter(
		(b) => b.endsOn >= `${month}-01` && b.startsOn <= `${month}-31`,
	);
	const now = new Date();
	const lastDay = spDate(
		new Date(now.getTime() + area.maxAdvanceDays * 86_400_000),
	);
	const canGoBack = month > spMonth(now);
	const canGoForward = month < lastDay.slice(0, 7);

	// Days of the month grid, padded to start on Sunday.
	const [y, m] = month.split("-").map(Number);
	const first = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, 1));
	const daysInMonth = new Date(Date.UTC(y ?? 0, m ?? 1, 0)).getUTCDate();
	const cells: (string | null)[] = [
		...Array.from({ length: first.getUTCDay() }, () => null),
		...Array.from(
			{ length: daysInMonth },
			(_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
		),
	];

	const startHours =
		date && area.slotType === "hour"
			? freeStartHours(rules, date, taken, now)
			: [];
	const durations =
		date && startHour !== null
			? durationsFrom(rules, date, startHour, taken)
			: [];
	const ready =
		date !== null && (area.slotType === "day" || startHour !== null);

	function pickDate(value: string) {
		setDate(value);
		setStartHour(null);
		setHours(1);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!date) return;
		book.mutate({
			areaId: area.id,
			unitId,
			date,
			startHour: area.slotType === "hour" ? startHour : null,
			hours: area.slotType === "hour" ? hours : null,
			guestNames: guests
				.split("\n")
				.map((g) => g.trim())
				.filter(Boolean),
			notes,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-5" noValidate>
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<Button
						variant="ghost"
						size="icon"
						aria-label="Mês anterior"
						disabled={!canGoBack}
						onClick={() => setMonth(addMonths(month, -1))}
					>
						<ChevronLeft aria-hidden />
					</Button>
					<p className="font-medium">{monthName(month)}</p>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Próximo mês"
						disabled={!canGoForward}
						onClick={() => setMonth(addMonths(month, 1))}
					>
						<ChevronRight aria-hidden />
					</Button>
				</div>
				{busy.isLoading ? (
					<Loading />
				) : (
					<div className="grid grid-cols-7 gap-1 text-center">
						{WEEKDAYS.map((d) => (
							<span key={d} className="py-1 text-muted-foreground text-xs">
								{d}
							</span>
						))}
						{cells.map((cell, i) => {
							if (!cell) {
								return <span key={i} />;
							}
							const status =
								cell < today ? "closed" : dayStatus(rules, cell, taken, now);
							const mine = taken.some(
								(t) => t.mine && spDate(new Date(t.startsAt)) === cell,
							);
							const selectable = status === "free" || status === "partial";
							return (
								<button
									key={cell}
									type="button"
									disabled={!selectable}
									aria-pressed={date === cell}
									aria-label={`${cell.split("-").reverse().join("/")}: ${STATUS_TEXT[status]}`}
									title={closedReason(rules, cell) ?? undefined}
									onClick={() => pickDate(cell)}
									className={cn(
										"relative flex h-11 items-center justify-center rounded-md text-sm transition-colors",
										date === cell
											? "bg-primary font-semibold text-primary-foreground"
											: status === "free"
												? "border hover:bg-muted"
												: status === "partial"
													? "border border-warning bg-warning/10 hover:bg-warning/20"
													: status === "full"
														? "bg-muted text-muted-foreground line-through"
														: "text-muted-foreground/50",
									)}
								>
									{Number(cell.slice(8))}
									{mine && (
										<span
											className="absolute bottom-1 size-1.5 rounded-full bg-success"
											aria-hidden
										/>
									)}
								</button>
							);
						})}
					</div>
				)}
				<p className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
					<span>Riscado: ocupado</span>
					{area.slotType === "hour" && <span>Amarelo: horários livres</span>}
					<span className="inline-flex items-center gap-1">
						<span className="size-1.5 rounded-full bg-success" /> sua reserva
					</span>
				</p>
				{monthBlocks.length > 0 && (
					<ul className="space-y-1 text-sm">
						{monthBlocks.map((b) => (
							<li key={`${b.startsOn}-${b.endsOn}`}>
								<span className="font-medium">
									{rangeLabel(b.startsOn, b.endsOn)}
								</span>
								: fechada{b.reason ? ` (${b.reason})` : ""}
							</li>
						))}
					</ul>
				)}
				<ErrorMessage message={errorMessage(busy.error)} />
			</div>

			{date && area.slotType === "hour" && (
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Início">
						<Select
							value={startHour ?? ""}
							onChange={(e) => {
								setStartHour(
									e.target.value === "" ? null : Number(e.target.value),
								);
								setHours(1);
							}}
						>
							<option value="">Escolha</option>
							{startHours.map((h) => (
								<option key={h} value={h}>
									{hourLabel(h)}
								</option>
							))}
						</Select>
					</Field>
					<Field label="Duração">
						<Select
							value={hours}
							disabled={startHour === null}
							onChange={(e) => setHours(Number(e.target.value))}
						>
							{(durations.length ? durations : [1]).map((d) => (
								<option key={d} value={d}>
									{d} hora(s)
									{startHour !== null && ` · até ${hourLabel(startHour + d)}`}
								</option>
							))}
						</Select>
					</Field>
				</div>
			)}

			{ready && (
				<>
					{units.length > 1 && (
						<Field label="Unidade">
							<Select
								value={unitId}
								onChange={(e) => setUnitId(e.target.value)}
							>
								{units.map((u) => (
									<option key={u.id} value={u.id}>
										{u.label}
									</option>
								))}
							</Select>
						</Field>
					)}
					<Field
						label="Convidados (opcional)"
						hint="Um nome por linha. A portaria usa a lista para liberar a entrada."
					>
						<textarea
							value={guests}
							rows={4}
							onChange={(e) => setGuests(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</Field>
					<Field label="Observações (opcional)">
						<textarea
							value={notes}
							rows={2}
							maxLength={500}
							placeholder="Ex.: aniversário, vou precisar das mesas extras"
							onChange={(e) => setNotes(e.target.value)}
							className="w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</Field>
					<div className="rounded-md bg-muted p-3 text-sm">
						<p className="font-medium">
							{date &&
								(area.slotType === "day"
									? slotLabel("day", `${date}T12:00:00Z`, `${date}T12:00:00Z`)
									: startHour !== null &&
										`${date.split("-").reverse().join("/")} · ${hourLabel(startHour)} às ${hourLabel(startHour + hours)}`)}
						</p>
						<p className="text-muted-foreground">
							{area.feeCents > 0
								? `Taxa de ${formatBRL(area.feeCents)}, cobrada na próxima cobrança do condomínio.`
								: "Sem taxa."}
							{area.requiresApproval &&
								" A reserva precisa ser aprovada pela administração."}
						</p>
					</div>
				</>
			)}

			<ErrorMessage message={errorMessage(book.error)} />
			<Button
				type="submit"
				pending={book.isPending}
				disabled={!ready || !unitId}
			>
				{area.requiresApproval ? "Pedir reserva" : "Confirmar reserva"}
			</Button>
		</form>
	);
}

const STATUS_TEXT = {
	free: "livre",
	partial: "alguns horários livres",
	full: "ocupado",
	closed: "indisponível",
} as const;

function MyReservations() {
	const { selected } = useSelectedUnit();
	const mine = api.reservation.mine.useQuery({ unitId: selected?.id ?? null });
	if (mine.isLoading) return <Loading />;
	const rows = mine.data ?? [];
	const now = new Date();
	const upcoming = rows
		.filter(
			(r) =>
				new Date(r.endsAt) > now && ["pending", "confirmed"].includes(r.status),
		)
		.reverse();
	const past = rows.filter((r) => !upcoming.includes(r));

	return (
		<section className="space-y-4">
			<h2 className="font-semibold text-lg">Minhas reservas</h2>
			<ErrorMessage message={errorMessage(mine.error)} />
			{upcoming.length === 0 ? (
				<EmptyState title="Nenhuma reserva marcada" />
			) : (
				<ul className="space-y-3">
					{upcoming.map((r) => (
						<MyReservation key={r.id} row={r} />
					))}
				</ul>
			)}
			{past.length > 0 && (
				<details className="group">
					<summary className="cursor-pointer py-2 font-medium text-sm">
						Anteriores e canceladas ({past.length})
					</summary>
					<ul className="mt-2 space-y-3">
						{past.map((r) => (
							<MyReservation key={r.id} row={r} />
						))}
					</ul>
				</details>
			)}
		</section>
	);
}

const deadlineFormat = new Intl.DateTimeFormat("pt-BR", {
	timeZone: TIME_ZONE,
	day: "2-digit",
	month: "2-digit",
	hour: "2-digit",
	minute: "2-digit",
});

function MyReservation({ row }: { row: Mine }) {
	const utils = api.useUtils();
	const cancel = api.reservation.cancel.useMutation({
		onSuccess: () =>
			Promise.all([
				utils.reservation.mine.invalidate(),
				utils.reservation.calendar.invalidate(),
			]),
	});
	const status = reservationStatus(row.status, row.endsAt);
	const badge = RESERVATION_STATUS[status];
	const active = row.status === "pending" || row.status === "confirmed";
	const now = new Date();
	const canCancel =
		active && new Date(row.endsAt) > now && new Date(row.cancelDeadline) > now;

	return (
		<li className="rounded-lg border p-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 space-y-1">
					<p className="font-medium">{row.area}</p>
					<p className="text-sm">
						{slotLabel(row.slotType, row.startsAt, row.endsAt)}
					</p>
					<p className="text-muted-foreground text-sm">
						{[
							`${row.condominium} · Unidade ${row.unit}`,
							row.feeCents > 0 &&
								row.feePeriod &&
								`Taxa ${formatBRL(row.feeCents)} na cobrança de ${formatPeriod(row.feePeriod)}`,
						]
							.filter(Boolean)
							.join(" · ")}
					</p>
					{row.guestNames.length > 0 && (
						<p className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
							<Users className="size-4" aria-hidden />
							{row.guestNames.length} convidado(s)
						</p>
					)}
					{row.decisionNote && (
						<p className="text-muted-foreground text-sm">
							Motivo: {row.decisionNote}
						</p>
					)}
				</div>
				{badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
			</div>
			{active && new Date(row.endsAt) > now && (
				<div className="mt-3">
					{canCancel ? (
						<ConfirmButton
							variant="outline"
							title="Cancelar reserva?"
							description={`${row.area} · ${slotLabel(row.slotType, row.startsAt, row.endsAt)}. ${row.feePeriod ? "Se a taxa ainda não foi cobrada, ela sai da sua próxima cobrança." : ""}`}
							confirmLabel="Cancelar reserva"
							pending={cancel.isPending}
							onConfirm={() => cancel.mutate({ id: row.id, reason: "" })}
						>
							Cancelar
						</ConfirmButton>
					) : (
						<p className="text-muted-foreground text-xs">
							Prazo para cancelar pelo app terminou em{" "}
							{deadlineFormat.format(new Date(row.cancelDeadline))}. Fale com a
							administração.
						</p>
					)}
					{canCancel && (
						<p className="mt-1 text-muted-foreground text-xs">
							Pode cancelar até{" "}
							{deadlineFormat.format(new Date(row.cancelDeadline))}.
						</p>
					)}
				</div>
			)}
			<ErrorMessage message={errorMessage(cancel.error)} />
		</li>
	);
}
