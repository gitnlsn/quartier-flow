"use client";

import { cn } from "cn";
import {
	AlertTriangle,
	ArrowRight,
	BellRing,
	CalendarClock,
	Hand,
	Percent,
	Power,
	Zap,
} from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { Switch } from "~/components/ui/switch";
import { nextCycle } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import {
	REMINDER_AFTER_OPTIONS,
	REMINDER_BEFORE_OPTIONS,
	pickReminder,
} from "~/lib/reminders";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Button,
	ErrorMessage,
	Field,
	Input,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";

type Condo = RouterOutputs["condominium"]["get"];
type Mode = "manual" | "automatic";

/** A titled block that explains one decision and holds its fields. */
function Section({
	icon,
	title,
	description,
	action,
	children,
}: {
	icon: ReactNode;
	title: string;
	description: ReactNode;
	/** Control aligned to the right of the title (e.g. a switch). */
	action?: ReactNode;
	children?: ReactNode;
}) {
	return (
		<section className="rounded-xl border bg-card p-5 shadow-xs">
			<div className={`flex gap-3 ${children ? "mb-4" : ""}`}>
				<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted [&_svg]:size-4">
					{icon}
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="font-semibold">{title}</h3>
					<p className="text-muted-foreground text-sm">{description}</p>
				</div>
				{action && <div className="shrink-0 self-center">{action}</div>}
			</div>
			{children}
		</section>
	);
}

/** Example box under a section: shows the effect of the current values. */
function Preview({ children }: { children: ReactNode }) {
	return (
		<div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
			<p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
				Na prática
			</p>
			{children}
		</div>
	);
}

const toNumber = (value: string) => Number(value.replace(",", "."));

/**
 * Billing settings as explained sections: on/off, sending mode, dates and
 * late fees, each with a live example of its effect.
 */
export function SettingsForm({ condo }: { condo: Condo }) {
	const utils = api.useUtils();
	const config = condo.billingConfig;
	const [form, setForm] = useState({
		enabled: config?.enabled ?? false,
		mode: (config?.mode ?? "manual") as Mode,
		dueDay: String(config?.dueDay ?? 10),
		generationDay: String(config?.generationDay ?? 1),
		finePercent: String(config?.finePercent ?? 2),
		interestPercent: String(config?.interestPercent ?? 1),
	});
	const save = api.billing.saveConfig.useMutation({
		onSuccess: () =>
			Promise.all([
				utils.condominium.get.invalidate({ id: condo.id }),
				utils.condominium.list.invalidate(),
			]),
	});
	const errors = fieldErrors(save.error);

	const dueDay = Math.min(28, Math.max(1, Number(form.dueDay) || 1));
	const generationDay = Math.min(
		28,
		Math.max(1, Number(form.generationDay) || 1),
	);
	const fine = toNumber(form.finePercent) || 0;
	const interest = toNumber(form.interestPercent) || 0;
	const cycle = nextCycle(generationDay, dueDay);
	const exampleCents = 100_000;
	const daysLate = 10;
	const fineCents = Math.round((exampleCents * fine) / 100);
	const interestCents = Math.round(
		(exampleCents * interest * daysLate) / 100 / 30,
	);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		save.mutate({
			condominiumId: condo.id,
			enabled: form.enabled,
			mode: form.mode,
			dueDay: Number(form.dueDay),
			generationDay: Number(form.generationDay),
			finePercent: fine,
			interestPercent: interest,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<Section
				icon={<Power />}
				title="Cobrança mensal"
				description="Quando ativada, o sistema prepara todo mês uma cobrança por unidade com a soma dos itens do mês."
				action={
					<label htmlFor="billing-enabled" className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm">
							{form.enabled ? "Ativada" : "Desativada"}
						</span>
						<Switch
							id="billing-enabled"
							checked={form.enabled}
							onCheckedChange={(checked) =>
								setForm({ ...form, enabled: checked })
							}
						/>
					</label>
				}
			>
				{!form.enabled && (
					<p className="mt-2 text-muted-foreground text-sm">
						Nada é preparado nem enviado automaticamente. Você ainda pode
						preparar um mês manualmente na aba Cobrança do mês.
					</p>
				)}
			</Section>

			<Section
				icon={<Zap />}
				title="Envio automático"
				description="Desativado: você confere e envia. Ativado: as cobranças são enviadas sozinhas no dia de preparação."
				action={
					<label
						htmlFor="billing-automatic"
						className="flex items-center gap-2"
					>
						<span className="text-muted-foreground text-sm">
							{form.mode === "automatic" ? "Automático" : "Manual"}
						</span>
						<Switch
							id="billing-automatic"
							checked={form.mode === "automatic"}
							onCheckedChange={(checked) =>
								setForm({ ...form, mode: checked ? "automatic" : "manual" })
							}
						/>
					</label>
				}
			>
				<Preview>
					<ol className="list-inside list-decimal space-y-0.5">
						{(form.mode === "automatic"
							? [
									"No dia de preparação, as cobranças são preparadas e enviadas aos moradores.",
									"Não há conferência antes do envio.",
									"Tudo fica registrado no histórico de auditoria.",
								]
							: [
									"No dia de preparação, as cobranças ficam prontas.",
									"Você confere a auditoria (valores e responsáveis).",
									"Você clica em Enviar e os moradores recebem.",
								]
						).map((step) => (
							<li key={step}>{step}</li>
						))}
					</ol>
					{form.mode === "manual" && (
						<p className="mt-2 text-muted-foreground text-xs">
							Recomendado no início, até você confiar nos valores de cada mês.
						</p>
					)}
				</Preview>
				{errors.mode && (
					<p role="alert" className="mt-2 text-destructive text-sm">
						{errors.mode}
					</p>
				)}
			</Section>

			<Section
				icon={<CalendarClock />}
				title="Datas"
				description="Em que dia as cobranças são preparadas e em que dia vencem (de 1 a 28, para existir em todos os meses)."
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Dia de preparação"
						hint={
							form.mode === "automatic"
								? "As cobranças são preparadas e enviadas neste dia."
								: "As cobranças ficam prontas para sua conferência neste dia."
						}
						error={errors.generationDay}
					>
						<Input
							type="number"
							min={1}
							max={28}
							value={form.generationDay}
							onChange={(e) =>
								setForm({ ...form, generationDay: e.target.value })
							}
						/>
					</Field>
					<Field
						label="Dia do vencimento"
						hint="Último dia para pagar sem multa e juros."
						error={errors.dueDay}
					>
						<Input
							type="number"
							min={1}
							max={28}
							value={form.dueDay}
							onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
						/>
					</Field>
				</div>
				<Preview>
					<p className="flex flex-wrap items-center gap-2">
						<span>
							Preparação em <strong>{cycle.prepare}</strong>
						</span>
						<ArrowRight className="size-4 text-muted-foreground" aria-hidden />
						<span>
							vencimento em <strong>{cycle.due}</strong>
						</span>
						<span className="text-muted-foreground">
							(cobrança de {cycle.reference})
						</span>
					</p>
					{cycle.nextMonth && (
						<p className="mt-2 flex items-start gap-2 text-warning-foreground">
							<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />O
							vencimento é igual ou anterior ao dia de preparação, então a
							cobrança vence no mês seguinte.
						</p>
					)}
					{dueDay - generationDay > 0 && dueDay - generationDay < 5 && (
						<p className="mt-2 flex items-start gap-2 text-warning-foreground">
							<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
							Menos de 5 dias entre preparação e vencimento: os moradores terão
							pouco tempo para pagar.
						</p>
					)}
				</Preview>
			</Section>

			<Section
				icon={<Percent />}
				title="Atraso"
				description="Multa e juros aplicados automaticamente pelo Asaas quando o pagamento é feito após o vencimento."
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field
						label="Multa (%)"
						hint="Cobrada uma vez. Máximo de 2% para taxas de condomínio (Código Civil, art. 1.336)."
						error={errors.finePercent}
					>
						<Input
							value={form.finePercent}
							inputMode="decimal"
							onChange={(e) =>
								setForm({ ...form, finePercent: e.target.value })
							}
						/>
					</Field>
					<Field
						label="Juros ao mês (%)"
						hint="Proporcional aos dias de atraso. O usual é 1% ao mês."
						error={errors.interestPercent}
					>
						<Input
							value={form.interestPercent}
							inputMode="decimal"
							onChange={(e) =>
								setForm({ ...form, interestPercent: e.target.value })
							}
						/>
					</Field>
				</div>
				<Preview>
					<p>
						Uma cobrança de <strong>{formatBRL(exampleCents)}</strong> paga{" "}
						{daysLate} dias atrasada:
					</p>
					<ul className="mt-1 space-y-0.5">
						<li>
							Multa de {fine}% = <strong>{formatBRL(fineCents)}</strong>
						</li>
						<li>
							Juros de {interest}% ao mês por {daysLate} dias ={" "}
							<strong>{formatBRL(interestCents)}</strong>
						</li>
						<li>
							Total a pagar:{" "}
							<strong>
								{formatBRL(exampleCents + fineCents + interestCents)}
							</strong>
						</li>
					</ul>
					{fine > 2 && (
						<p className="mt-2 flex items-start gap-2 text-destructive">
							<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />A
							multa não pode passar de 2%.
						</p>
					)}
				</Preview>
			</Section>

			<div className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm">
					{form.enabled ? (
						<>
							Todo dia <strong>{generationDay}</strong> as cobranças do mês são{" "}
							{form.mode === "automatic" ? (
								<strong>preparadas e enviadas automaticamente</strong>
							) : (
								<strong>preparadas para sua conferência</strong>
							)}
							, com vencimento no dia <strong>{dueDay}</strong>, multa de{" "}
							<strong>{fine}%</strong> e juros de{" "}
							<strong>{interest}% ao mês</strong>.
						</>
					) : (
						"A cobrança mensal está desativada."
					)}
				</p>
				<div className="flex shrink-0 items-center gap-3">
					{save.isSuccess && !save.isPending && (
						<span
							aria-live="polite"
							className="text-sm text-success-foreground"
						>
							Salvo.
						</span>
					)}
					<Button type="submit" pending={save.isPending}>
						Salvar configuração
					</Button>
				</div>
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(save.error)}
			/>
		</form>
	);
}

const beforeLabel = (days: number) =>
	days === 0 ? "no dia do vencimento" : `${days} dias antes`;
const afterLabel = (days: number) =>
	days === 0
		? "quando vencer"
		: days === 1
			? "1 dia depois"
			: `${days} dias depois`;

/** Keeps 0 and at most one other value (older settings could have two). */
const normalize = (list: number[]) => {
	const extra = list.filter((v) => v !== 0).at(-1);
	return [
		...(list.includes(0) ? [0] : []),
		...(extra !== undefined ? [extra] : []),
	];
};

/**
 * Payment reminders sent by Asaas to each payer (docs/features/04). Asaas
 * has, per side of the due date, a fixed reminder (on the day / when it
 * becomes overdue) and one adjustable reminder: hence a switch + one choice.
 */
export function RemindersForm({ condo }: { condo: Condo }) {
	const utils = api.useUtils();
	const config = condo.billingConfig;
	const [form, setForm] = useState({
		before: normalize(config?.reminderBefore ?? [0, 10]),
		after: normalize(config?.reminderAfter ?? [0, 7]),
		email: config?.reminderEmail ?? true,
		sms: config?.reminderSms ?? true,
		whatsapp: config?.reminderWhatsapp ?? false,
	});
	const save = api.delinquency.saveReminders.useMutation({
		onSuccess: () => utils.condominium.get.invalidate({ id: condo.id }),
	});
	if (!config) return null;

	const anyChannel = form.email || form.sms || form.whatsapp;
	const sorted = (values: number[], desc = false) =>
		[...values].sort((a, b) => (desc ? b - a : a - b));
	const summary = [
		...sorted(form.before, true).map(beforeLabel),
		...sorted(form.after).map(afterLabel),
	];

	const fixedSwitch = (key: "before" | "after", label: string) => (
		<label
			htmlFor={`reminder-${key}-0`}
			className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm"
		>
			{label}
			<Switch
				id={`reminder-${key}-0`}
				checked={form[key].includes(0)}
				onCheckedChange={() =>
					setForm((f) => ({ ...f, [key]: pickReminder(f[key], 0) }))
				}
			/>
		</label>
	);

	const choices = (
		key: "before" | "after",
		options: readonly number[],
		label: (days: number) => string,
	) => {
		const current = form[key].find((v) => v !== 0);
		return (
			<div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
				{[undefined, ...options.filter((d) => d !== 0)].map((days) => {
					const checked = current === days;
					return (
						<label
							key={`${key}-${days ?? "none"}`}
							className={cn(
								"flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm",
								checked && "border-primary bg-muted/60",
							)}
						>
							<input
								type="radio"
								name={`reminder-${key}`}
								className="size-4"
								checked={checked}
								onChange={() =>
									setForm((f) => ({
										...f,
										[key]: [
											...f[key].filter((v) => v === 0),
											...(days !== undefined ? [days] : []),
										],
									}))
								}
							/>
							{days === undefined ? "Nenhum" : label(days)}
						</label>
					);
				})}
			</div>
		);
	};

	const channel = (key: "email" | "sms" | "whatsapp", label: string) => (
		<label
			htmlFor={`reminder-${key}`}
			className="flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm"
		>
			{label}
			<Switch
				id={`reminder-${key}`}
				checked={form[key]}
				onCheckedChange={(value) => setForm((f) => ({ ...f, [key]: value }))}
			/>
		</label>
	);

	return (
		<form
			className="mt-6 space-y-4"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				save.mutate({ condominiumId: condo.id, ...form });
			}}
		>
			<Section
				icon={<BellRing />}
				title="Lembretes de pagamento"
				description="Enviados pelo Asaas a cada responsável financeiro. Cada mensagem tem uma tarifa do Asaas, paga pela administradora."
			>
				<div className="space-y-4">
					<div className="space-y-2">
						<p className="font-medium text-sm">Antes do vencimento</p>
						{fixedSwitch("before", "Lembrete no dia do vencimento")}
						<p className="text-muted-foreground text-xs">Lembrete antecipado</p>
						{choices("before", REMINDER_BEFORE_OPTIONS, beforeLabel)}
					</div>
					<div className="space-y-2">
						<p className="font-medium text-sm">Depois do vencimento</p>
						{fixedSwitch("after", "Aviso quando a cobrança vencer")}
						<p className="text-muted-foreground text-xs">
							Lembrete de cobrança em atraso
						</p>
						{choices("after", REMINDER_AFTER_OPTIONS, afterLabel)}
					</div>
					<div>
						<p className="mb-2 font-medium text-sm">Canais</p>
						<div className="grid gap-2 sm:grid-cols-3">
							{channel("email", "E-mail")}
							{channel("sms", "SMS")}
							{channel("whatsapp", "WhatsApp")}
						</div>
					</div>
				</div>
				<Preview>
					{anyChannel && summary.length > 0 ? (
						<p>
							Lembretes: {summary.join(", ")}, por{" "}
							{[
								form.email && "e-mail",
								form.sms && "SMS",
								form.whatsapp && "WhatsApp",
							]
								.filter(Boolean)
								.join(", ")}
							. Ligações automáticas ficam sempre desligadas.
						</p>
					) : (
						<p>Nenhum lembrete será enviado.</p>
					)}
					<p className="mt-1 text-muted-foreground text-xs">
						SMS e WhatsApp só chegam a quem tem celular cadastrado no Asaas; os
						demais recebem só e-mail. A configuração vale por pessoa no Asaas:
						quem paga em dois condomínios recebe a configuração salva por
						último.
					</p>
				</Preview>
			</Section>
			<div className="flex items-center justify-end gap-3">
				{save.isSuccess && !save.isPending && (
					<span aria-live="polite" className="text-sm text-success-foreground">
						Salvo. Aplicando a {save.data.payers} responsável(is).
					</span>
				)}
				<Button type="submit" pending={save.isPending}>
					Salvar lembretes
				</Button>
			</div>
			<ErrorMessage message={errorMessage(save.error)} />
		</form>
	);
}
