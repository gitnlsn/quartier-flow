"use client";

import { cn } from "cn";
import { Handshake, ListOrdered, Plus, Send, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Switch } from "~/components/ui/switch";
import {
	type CollectionAudience,
	type CollectionStepInput,
	DEFAULT_COLLECTION_STEPS,
	MAX_COLLECTION_STEPS,
	MAX_STEP_OFFSET,
	MIN_STEP_OFFSET,
	type ReminderSender,
	sortSteps,
	stepLabel,
} from "~/lib/reminders";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Button,
	ConfirmButton,
	ErrorMessage,
	Field,
	Input,
	Loading,
	Select,
	errorMessage,
} from "../../../_components/ui";
import { Preview, RemindersForm, Section } from "./settings-form";

type Condo = RouterOutputs["condominium"]["get"];

/**
 * Reminders and collection rules of a condominium (docs/features/04):
 * who sends the reminders (per administradora), the Asaas settings or the
 * app's steps, and the automatic end of late acordos.
 */
export function CollectionSettings({ condo }: { condo: Condo }) {
	const setup = api.delinquency.reminderSetup.useQuery(
		{ condominiumId: condo.id },
		{ enabled: Boolean(condo.billingConfig) },
	);
	if (!condo.billingConfig) return null;
	if (setup.isLoading) return <Loading />;
	if (setup.error || !setup.data) {
		return <ErrorMessage message={errorMessage(setup.error)} />;
	}
	const data = setup.data;
	return (
		<div className="mt-6 space-y-4">
			<SenderSection sender={data.sender} />
			{data.sender === "asaas" ? (
				<RemindersForm condo={condo} />
			) : (
				<StepsForm
					condominiumId={condo.id}
					initial={data.steps}
					isDefault={data.isDefault}
				/>
			)}
			<AutoBreakForm
				condominiumId={condo.id}
				initial={data.agreementAutoBreakDays}
			/>
		</div>
	);
}

const SENDERS: {
	value: ReminderSender;
	title: string;
	text: string;
}[] = [
	{
		value: "asaas",
		title: "Asaas",
		text: "E-mail, SMS e WhatsApp. Tarifa do Asaas por mensagem. Até 2 lembretes antes e 2 depois do vencimento.",
	},
	{
		value: "app",
		title: "Quartier Flow",
		text: "E-mail e aviso no app, sem tarifa por mensagem. Quantas etapas quiser, inclusive avisos à administração.",
	},
];

function SenderSection({ sender }: { sender: ReminderSender }) {
	const utils = api.useUtils();
	const save = api.delinquency.setReminderSender.useMutation({
		onSuccess: () => utils.delinquency.reminderSetup.invalidate(),
	});
	const other = SENDERS.find((s) => s.value !== sender);
	return (
		<Section
			icon={<Send />}
			title="Quem envia os lembretes"
			description="Vale para todos os condomínios da administradora: o Asaas guarda a configuração por pagador, então os dois nunca enviam ao mesmo tempo."
		>
			<div className="grid gap-2 sm:grid-cols-2">
				{SENDERS.map((option) => (
					<div
						key={option.value}
						className={cn(
							"rounded-md border p-3 text-sm",
							option.value === sender && "border-primary bg-muted/60",
						)}
					>
						<p className="font-medium">
							{option.title}
							{option.value === sender && (
								<span className="ml-2 text-muted-foreground text-xs">
									(atual)
								</span>
							)}
						</p>
						<p className="text-muted-foreground">{option.text}</p>
					</div>
				))}
			</div>
			{other && (
				<div className="mt-3 flex flex-wrap items-center justify-end gap-3">
					{save.isSuccess && !save.isPending && (
						<span
							aria-live="polite"
							className="text-sm text-success-foreground"
						>
							Aplicando a {save.data.payers} responsável(is).
						</span>
					)}
					<ConfirmButton
						variant="outline"
						size="default"
						title={`Passar a enviar pelo ${other.title}?`}
						description={
							other.value === "app"
								? "Os lembretes do Asaas serão desligados para os pagadores de todos os condomínios da administradora, e o Quartier Flow passa a enviar pelas etapas de cada condomínio. O e-mail do Asaas com o boleto novo continua."
								: "O Quartier Flow para de enviar lembretes, e o Asaas volta a enviar com a configuração de cada condomínio, para os pagadores de todos os condomínios da administradora."
						}
						confirmLabel="Trocar"
						pending={save.isPending}
						onConfirm={() => save.mutate({ sender: other.value })}
					>
						Enviar pelo {other.title}
					</ConfirmButton>
				</div>
			)}
			<ErrorMessage message={errorMessage(save.error)} />
		</Section>
	);
}

type StepRow = {
	key: number;
	before: boolean;
	days: string;
	audience: CollectionAudience;
};

let nextKey = 1;
const toRow = (step: CollectionStepInput): StepRow => ({
	key: nextKey++,
	before: step.offsetDays < 0,
	days: String(Math.abs(step.offsetDays)),
	audience: step.audience,
});
const toStep = (row: StepRow): CollectionStepInput | null => {
	const days = Number(row.days);
	if (!Number.isInteger(days) || days < 0) return null;
	return { offsetDays: row.before ? -days : days, audience: row.audience };
};

function StepsForm({
	condominiumId,
	initial,
	isDefault,
}: {
	condominiumId: string;
	initial: readonly CollectionStepInput[];
	isDefault: boolean;
}) {
	const utils = api.useUtils();
	const [rows, setRows] = useState<StepRow[]>(() => initial.map(toRow));
	useEffect(() => setRows(initial.map(toRow)), [initial]);
	const save = api.delinquency.saveCollectionSteps.useMutation({
		onSuccess: () => utils.delinquency.reminderSetup.invalidate(),
	});

	const steps = rows.map(toStep);
	const invalid = steps.some(
		(s) =>
			s === null ||
			s.offsetDays < MIN_STEP_OFFSET ||
			s.offsetDays > MAX_STEP_OFFSET ||
			(s.audience === "managers" && s.offsetDays <= 0),
	);
	const valid = steps.filter((s): s is CollectionStepInput => s !== null);
	const update = (key: number, patch: Partial<StepRow>) =>
		setRows((current) =>
			current.map((r) => (r.key === key ? { ...r, ...patch } : r)),
		);

	return (
		<form
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				save.mutate({ condominiumId, steps: sortSteps(valid) });
			}}
			className="space-y-4"
		>
			<Section
				icon={<ListOrdered />}
				title="Régua de cobrança"
				description={
					isDefault
						? "Etapas sugeridas, ainda não salvas para este condomínio. Ajuste e salve."
						: "Enviadas uma vez por cobrança e etapa, todos os dias pela manhã."
				}
			>
				<div className="space-y-2">
					{rows.map((row) => {
						const step = toStep(row);
						const managersTooEarly =
							row.audience === "managers" &&
							step !== null &&
							step.offsetDays <= 0;
						return (
							<div
								key={row.key}
								className="grid grid-cols-[5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-md border p-2 sm:grid-cols-[5rem_10rem_minmax(0,1fr)_auto]"
							>
								<Input
									type="number"
									min={0}
									max={row.before ? -MIN_STEP_OFFSET : MAX_STEP_OFFSET}
									aria-label="Dias"
									value={row.days}
									onChange={(e) => update(row.key, { days: e.target.value })}
								/>
								<Select
									aria-label="Antes ou depois do vencimento"
									value={row.before ? "before" : "after"}
									onChange={(e) =>
										update(row.key, { before: e.target.value === "before" })
									}
								>
									<option value="before">dia(s) antes</option>
									<option value="after">dia(s) depois</option>
								</Select>
								<Select
									aria-label="Para quem"
									className="max-sm:col-span-2 max-sm:row-start-2"
									value={row.audience}
									onChange={(e) =>
										update(row.key, {
											audience: e.target.value as CollectionAudience,
										})
									}
								>
									<option value="payer">
										Lembrete ao responsável financeiro
									</option>
									<option value="managers">
										Aviso à administração e síndico
									</option>
								</Select>
								<Button
									variant="ghost"
									size="icon"
									aria-label="Remover etapa"
									className="max-sm:col-start-3 max-sm:row-start-1"
									onClick={() =>
										setRows((current) =>
											current.filter((r) => r.key !== row.key),
										)
									}
								>
									<Trash2 aria-hidden />
								</Button>
								{managersTooEarly && (
									<p className="col-span-full text-destructive text-xs">
										Avisos à administração só depois do vencimento.
									</p>
								)}
							</div>
						);
					})}
					{rows.length === 0 && (
						<p className="text-muted-foreground text-sm">
							Sem etapas: nenhum lembrete será enviado.
						</p>
					)}
					<div className="flex flex-wrap gap-2">
						<Button
							variant="outline"
							size="default"
							disabled={rows.length >= MAX_COLLECTION_STEPS}
							onClick={() =>
								setRows((current) => [
									...current,
									toRow({ offsetDays: 10, audience: "payer" }),
								])
							}
						>
							<Plus aria-hidden />
							Adicionar etapa
						</Button>
						<Button
							variant="ghost"
							size="default"
							onClick={() => setRows(DEFAULT_COLLECTION_STEPS.map(toRow))}
						>
							Restaurar sugestão
						</Button>
					</div>
				</div>
				<Preview>
					{valid.length > 0 ? (
						<ul className="space-y-0.5">
							{sortSteps(valid).map((s) => (
								<li key={`${s.offsetDays}-${s.audience}`}>
									{stepLabel(s.offsetDays)} do vencimento:{" "}
									{s.audience === "payer"
										? "lembrete ao responsável (e-mail e app)"
										: "aviso à administradora e ao síndico"}
								</li>
							))}
						</ul>
					) : (
						<p>Nenhum lembrete será enviado.</p>
					)}
					<p className="mt-1 text-muted-foreground text-xs">
						As mensagens não mostram valores: levam a Minhas cobranças, onde
						está o boleto. Cada pessoa escolhe em Notificações se quer
						recebê-las por e-mail.
					</p>
				</Preview>
			</Section>
			<div className="flex items-center justify-end gap-3">
				{save.isSuccess && !save.isPending && (
					<span aria-live="polite" className="text-sm text-success-foreground">
						Salvo.
					</span>
				)}
				<Button type="submit" disabled={invalid} pending={save.isPending}>
					Salvar régua
				</Button>
			</div>
			<ErrorMessage message={errorMessage(save.error)} />
		</form>
	);
}

function AutoBreakForm({
	condominiumId,
	initial,
}: {
	condominiumId: string;
	initial: number | null;
}) {
	const utils = api.useUtils();
	const [enabled, setEnabled] = useState(initial !== null);
	const [days, setDays] = useState(String(initial ?? 30));
	const save = api.delinquency.saveAutoBreak.useMutation({
		onSuccess: () => utils.delinquency.reminderSetup.invalidate(),
	});
	const n = Number(days);
	const valid = !enabled || (Number.isInteger(n) && n >= 1 && n <= 365);

	return (
		<form
			className="space-y-4"
			onSubmit={(event: FormEvent) => {
				event.preventDefault();
				save.mutate({ condominiumId, days: enabled ? n : null });
			}}
		>
			<Section
				icon={<Handshake />}
				title="Encerrar acordos em atraso"
				description="Por padrão, a administradora decide caso a caso. Com a regra ligada, um acordo com parcela ou entrada vencida há mais dias que o limite é encerrado automaticamente."
				action={
					<Switch
						aria-label="Encerrar acordos automaticamente"
						checked={enabled}
						onCheckedChange={setEnabled}
					/>
				}
			>
				{enabled && (
					<div className="max-w-xs">
						<Field label="Dias de atraso" hint="De 1 a 365.">
							<Input
								type="number"
								min={1}
								max={365}
								value={days}
								onChange={(e) => setDays(e.target.value)}
							/>
						</Field>
					</div>
				)}
				<Preview>
					{enabled && valid ? (
						<p>
							Uma parcela ou entrada vencida há mais de {n} dia(s) encerra o
							acordo: as parcelas não emitidas viram um saldo em aberto, o
							morador e a administração são avisados.
						</p>
					) : (
						<p>Acordos só são encerrados quando a administradora decidir.</p>
					)}
				</Preview>
			</Section>
			<div className="flex items-center justify-end gap-3">
				{save.isSuccess && !save.isPending && (
					<span aria-live="polite" className="text-sm text-success-foreground">
						Salvo.
					</span>
				)}
				<Button type="submit" disabled={!valid} pending={save.isPending}>
					Salvar regra
				</Button>
			</div>
			<ErrorMessage message={errorMessage(save.error)} />
		</form>
	);
}
