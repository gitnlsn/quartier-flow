"use client";

import { ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Checkbox } from "~/components/ui/checkbox";
import { formatBRL, formatDate, parseBRLToCents } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Button,
	Card,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	Loading,
	RUN_STATUS_LABEL,
	RUN_STATUS_TONE,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";

type Condo = RouterOutputs["condominium"]["get"];

const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function ConfigForm({ condo }: { condo: Condo }) {
	const utils = api.useUtils();
	const config = condo.billingConfig;
	const [form, setForm] = useState({
		enabled: config?.enabled ?? false,
		mode: (config?.mode ?? "manual") as "manual" | "automatic",
		defaultAmount: config ? toInput(config.defaultAmountCents) : "",
		dueDay: String(config?.dueDay ?? 10),
		generationDay: String(config?.generationDay ?? 1),
		finePercent: String(config?.finePercent ?? 2),
		interestPercent: String(config?.interestPercent ?? 1),
	});
	const [amountError, setAmountError] = useState<string>();
	const save = api.billing.saveConfig.useMutation({
		onSuccess: () =>
			Promise.all([
				utils.condominium.get.invalidate({ id: condo.id }),
				utils.condominium.list.invalidate(),
			]),
	});
	const errors = fieldErrors(save.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const cents = parseBRLToCents(form.defaultAmount || "0");
		setAmountError(cents === null ? "Valor inválido" : undefined);
		if (cents === null) return;
		save.mutate({
			condominiumId: condo.id,
			enabled: form.enabled,
			mode: form.mode,
			defaultAmountCents: cents,
			dueDay: Number(form.dueDay),
			generationDay: Number(form.generationDay),
			finePercent: Number(form.finePercent.replace(",", ".")),
			interestPercent: Number(form.interestPercent.replace(",", ".")),
		});
	}

	return (
		<form onSubmit={submit} className="space-y-5" noValidate>
			<label
				htmlFor="billing-enabled"
				className="flex items-center gap-3 rounded-lg border p-3"
			>
				<Checkbox
					id="billing-enabled"
					checked={form.enabled}
					onCheckedChange={(checked) =>
						setForm({ ...form, enabled: checked === true })
					}
				/>
				<span>
					<span className="block font-medium">Cobrança mensal ativada</span>
					<span className="block text-muted-foreground text-xs">
						Todo mês as cobranças das unidades são preparadas no dia escolhido.
					</span>
				</span>
			</label>
			<div className="grid gap-4 md:grid-cols-3">
				<Field
					label="Envio"
					hint={
						form.mode === "manual"
							? "Você audita e envia as cobranças todo mês."
							: "Enviadas automaticamente; a auditoria fica registrada."
					}
					error={errors.mode}
				>
					<Select
						value={form.mode}
						onChange={(e) =>
							setForm({
								...form,
								mode: e.target.value as "manual" | "automatic",
							})
						}
					>
						<option value="manual">Manual (auditar antes)</option>
						<option value="automatic">Automático</option>
					</Select>
				</Field>
				<Field
					label="Valor padrão por unidade (R$)"
					hint="Pode ser alterado por unidade."
					error={amountError ?? errors.defaultAmountCents}
				>
					<Input
						value={form.defaultAmount}
						inputMode="decimal"
						placeholder="850,00"
						onChange={(e) =>
							setForm({ ...form, defaultAmount: e.target.value })
						}
					/>
				</Field>
				<Field label="Dia do vencimento" hint="1 a 28" error={errors.dueDay}>
					<Input
						type="number"
						min={1}
						max={28}
						value={form.dueDay}
						onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
					/>
				</Field>
				<Field
					label="Dia de preparação"
					hint="Dia em que as cobranças são preparadas (e enviadas, se automático)."
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
					label="Multa por atraso (%)"
					hint="Máximo 2%"
					error={errors.finePercent}
				>
					<Input
						value={form.finePercent}
						inputMode="decimal"
						onChange={(e) => setForm({ ...form, finePercent: e.target.value })}
					/>
				</Field>
				<Field label="Juros ao mês (%)" error={errors.interestPercent}>
					<Input
						value={form.interestPercent}
						inputMode="decimal"
						onChange={(e) =>
							setForm({ ...form, interestPercent: e.target.value })
						}
					/>
				</Field>
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(save.error)}
			/>
			<div className="flex items-center gap-3">
				<Button type="submit" pending={save.isPending}>
					Salvar configuração
				</Button>
				{save.isSuccess && (
					<span aria-live="polite" className="text-sm text-success-foreground">
						Configuração salva.
					</span>
				)}
			</div>
		</form>
	);
}

function ConfigSummary({ condo }: { condo: Condo }) {
	const config = condo.billingConfig;
	if (!config) {
		return <EmptyState title="Cobrança mensal não configurada" />;
	}
	const items = [
		["Situação", config.enabled ? "Ativada" : "Desativada"],
		["Envio", config.mode === "automatic" ? "Automático" : "Manual (auditado)"],
		["Valor padrão", formatBRL(config.defaultAmountCents)],
		["Vencimento", `Dia ${config.dueDay}`],
		[
			"Multa / juros",
			`${config.finePercent}% / ${config.interestPercent}% ao mês`,
		],
	];
	return (
		<dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
			{items.map(([label, value]) => (
				<div key={label}>
					<dt className="text-muted-foreground text-sm">{label}</dt>
					<dd className="font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function Runs({ condo }: { condo: Condo }) {
	const router = useRouter();
	const runs = api.billing.listRuns.useQuery({ condominiumId: condo.id });
	const now = new Date();
	const [period, setPeriod] = useState(
		`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
	);
	const prepare = api.billing.prepareRun.useMutation({
		onSuccess: ({ runId }) =>
			router.push(`/painel/condominios/${condo.id}/cobrancas/${runId}`),
	});

	return (
		<div className="space-y-4">
			{condo.canManage && (
				<div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4 md:flex-row md:items-end">
					<Field label="Mês de referência">
						<Input
							type="month"
							value={period}
							onChange={(e) => setPeriod(e.target.value)}
						/>
					</Field>
					<Button
						disabled={!condo.billingConfig}
						pending={prepare.isPending}
						onClick={() => prepare.mutate({ condominiumId: condo.id, period })}
					>
						Preparar cobranças do mês
					</Button>
				</div>
			)}
			{condo.canManage && !condo.billingConfig && (
				<p className="text-muted-foreground text-sm">
					Salve a configuração antes.
				</p>
			)}
			<ErrorMessage message={errorMessage(prepare.error)} />
			{runs.isLoading ? (
				<Loading />
			) : runs.data?.length === 0 ? (
				<EmptyState title="Nenhuma cobrança preparada ainda" />
			) : (
				<ul className="divide-y rounded-lg border">
					{runs.data?.map((run) => (
						<li key={run.id}>
							<a
								href={`/painel/condominios/${condo.id}/cobrancas/${run.id}`}
								className="flex items-center gap-4 p-4 transition-colors hover:bg-muted"
							>
								<span className="min-w-0 flex-1">
									<span className="block font-semibold">
										{run.period.split("-").reverse().join("/")}
									</span>
									<span className="block text-muted-foreground text-sm">
										Vence {formatDate(run.dueDate)} ·{" "}
										{formatBRL(run.totalCents)} ·{" "}
										{run.mode === "automatic" ? "automático" : "manual"}
									</span>
								</span>
								<Badge tone={RUN_STATUS_TONE[run.status]}>
									{RUN_STATUS_LABEL[run.status] ?? run.status}
								</Badge>
								<ChevronRight
									className="size-5 text-muted-foreground"
									aria-hidden
								/>
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

export function BillingTab({ condo }: { condo: Condo }) {
	return (
		<div className="space-y-6">
			<Card title="Configuração">
				{condo.canManage ? (
					<ConfigForm condo={condo} />
				) : (
					<ConfigSummary condo={condo} />
				)}
			</Card>
			<Card title="Cobranças mensais">
				<Runs condo={condo} />
			</Card>
		</div>
	);
}
