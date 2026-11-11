"use client";

import { ArrowLeft, CheckCircle2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState } from "react";

import { TermsContent } from "~/app/_components/terms-content";
import { formatBRL, formatCnpj } from "~/lib/br";
import { BILLING_RULES, firstInvoice, nextSteps } from "~/lib/onboarding";
import { termsVersionLabel } from "~/lib/terms";
import { type RouterOutputs, api } from "~/trpc/react";
import { type PlanOption, PlanPicker } from "../_components/plan-picker";
import {
	Button,
	Card,
	ErrorMessage,
	Field,
	Input,
	Loading,
	MaskedInput,
	PageTitle,
	StepTitle,
	errorMessage,
	fieldErrors,
} from "../_components/ui";

type State = RouterOutputs["onboarding"]["state"];
type Step = 1 | 2 | 3 | 4;

const STEPS: { n: Step; label: string }[] = [
	{ n: 1, label: "Você" },
	{ n: 2, label: "Administradora" },
	{ n: 3, label: "Plano" },
	{ n: 4, label: "Termos e assinatura" },
];

function Progress({ step }: { step: Step }) {
	return (
		<ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Etapas">
			{STEPS.map((s) => (
				<li key={s.n} aria-current={s.n === step ? "step" : undefined}>
					<span
						className={
							s.n <= step
								? "block h-1.5 rounded-full bg-primary"
								: "block h-1.5 rounded-full bg-muted"
						}
					/>
					<span
						className={
							s.n === step
								? "mt-1.5 block font-medium text-xs"
								: "mt-1.5 block text-muted-foreground text-xs"
						}
					>
						{s.n}. {s.label}
					</span>
				</li>
			))}
		</ol>
	);
}

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<Button variant="ghost" onClick={onClick}>
			<ArrowLeft aria-hidden /> Voltar
		</Button>
	);
}

function NameStep({ state, onDone }: { state: State; onDone: () => void }) {
	const [name, setName] = useState(state.name);
	const save = api.onboarding.saveName.useMutation({ onSuccess: onDone });
	const errors = fieldErrors(save.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		save.mutate({ name });
	}

	return (
		<Card title={<StepTitle n={1} title="Você" done={false} />}>
			<form onSubmit={submit} className="space-y-4" noValidate>
				<p className="text-muted-foreground">
					Vamos cadastrar sua administradora em 4 passos. Nada é contratado nem
					cobrado antes da sua confirmação no último passo, depois de ler os
					Termos de Uso.
				</p>
				<Field
					label="Seu nome"
					hint={`Você entrou como ${state.email}.`}
					error={errors.name}
				>
					<Input
						value={name}
						autoComplete="name"
						onChange={(e) => setName(e.target.value)}
					/>
				</Field>
				<ErrorMessage
					message={Object.keys(errors).length ? null : errorMessage(save.error)}
				/>
				<div className="flex justify-end">
					<Button type="submit" pending={save.isPending}>
						Continuar
					</Button>
				</div>
			</form>
		</Card>
	);
}

function CompanyStep({
	state,
	onBack,
	onDone,
}: {
	state: State;
	onBack: () => void;
	onDone: () => void;
}) {
	const router = useRouter();
	const [form, setForm] = useState({
		companyName: state.administradora?.name ?? "",
		cnpj: state.administradora ? formatCnpj(state.administradora.cnpj) : "",
	});
	const save = api.onboarding.saveAdministradora.useMutation({
		onSuccess: () => {
			router.refresh(); // sidebar: "Concluir cadastro"
			onDone();
		},
	});
	const errors = fieldErrors(save.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		save.mutate(form);
	}

	return (
		<Card title={<StepTitle n={2} title="Sua administradora" done={false} />}>
			<form onSubmit={submit} className="space-y-4" noValidate>
				<p className="text-muted-foreground">
					A administradora é a empresa que contrata o Quartier Flow, cadastra os
					condomínios e recebe os repasses das cobranças dos moradores. Você
					será a pessoa administradora desta conta.
				</p>
				<div className="grid gap-4 md:grid-cols-2">
					<Field label="Razão social" error={errors.companyName}>
						<Input
							value={form.companyName}
							autoComplete="organization"
							onChange={(e) =>
								setForm({ ...form, companyName: e.target.value })
							}
						/>
					</Field>
					<Field label="CNPJ" error={errors.cnpj}>
						<MaskedInput
							mask="cnpj"
							value={form.cnpj}
							placeholder="00.000.000/0000-00"
							onValueChange={(cnpj) => setForm({ ...form, cnpj })}
						/>
					</Field>
				</div>
				<p className="text-muted-foreground text-sm">
					Os demais dados da empresa (endereço, telefone, faturamento) são
					pedidos depois da assinatura, para criar a conta de recebimento.
				</p>
				<ErrorMessage
					message={Object.keys(errors).length ? null : errorMessage(save.error)}
				/>
				<div className="flex justify-between gap-2">
					<BackButton onClick={onBack} />
					<Button type="submit" pending={save.isPending}>
						Continuar
					</Button>
				</div>
			</form>
		</Card>
	);
}

/** Example monthly bill so per-seat pricing is concrete. */
function PriceExample({ plan }: { plan: PlanOption }) {
	const residents = 40;
	const sindicos = 1;
	const total =
		residents * plan.residentSeatCents + sindicos * plan.sindicoSeatCents;
	return (
		<p className="rounded-lg bg-muted p-3 text-sm">
			<strong>Exemplo no plano {plan.name}:</strong> um condomínio com{" "}
			{residents} moradores e {sindicos} síndico ativos = {residents} ×{" "}
			{formatBRL(plan.residentSeatCents)} + {sindicos} ×{" "}
			{formatBRL(plan.sindicoSeatCents)} ={" "}
			<strong>{formatBRL(total)} por mês</strong>.
		</p>
	);
}

function PlanStep({
	selected,
	onSelect,
	onBack,
	onDone,
}: {
	selected: PlanOption | null;
	onSelect: (plan: PlanOption) => void;
	onBack: () => void;
	onDone: () => void;
}) {
	return (
		<Card title={<StepTitle n={3} title="Plano" done={false} />}>
			<div className="space-y-4">
				<p className="text-muted-foreground">
					Você paga por <strong className="text-foreground">assento</strong>:
					cada morador e cada síndico ativos nos seus condomínios. Sem taxa de
					adesão e sem período gratuito: a cobrança começa no mês da assinatura,
					proporcional aos dias.
				</p>
				<PlanPicker
					mode="select"
					selectedId={selected?.id ?? null}
					onSelect={onSelect}
				/>
				{selected && <PriceExample plan={selected} />}
				<div className="flex justify-between gap-2">
					<BackButton onClick={onBack} />
					<Button disabled={!selected} onClick={onDone}>
						Revisar e ler os termos
					</Button>
				</div>
			</div>
		</Card>
	);
}

function Summary({ rows }: { rows: [string, ReactNode][] }) {
	return (
		<dl className="divide-y rounded-lg border">
			{rows.map(([label, value]) => (
				<div
					key={label}
					className="grid gap-1 p-3 text-sm sm:grid-cols-[12rem_1fr]"
				>
					<dt className="text-muted-foreground">{label}</dt>
					<dd className="font-medium">{value}</dd>
				</div>
			))}
		</dl>
	);
}

function NextStepsList({ steps }: { steps: ReturnType<typeof nextSteps> }) {
	return (
		<ol className="space-y-4">
			{steps.map((step, i) => (
				<li key={step.title} className="flex gap-3">
					<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm">
						{i + 1}
					</span>
					<div className="space-y-0.5">
						<p className="font-medium">{step.title}</p>
						<p className="text-muted-foreground text-sm">{step.text}</p>
					</div>
				</li>
			))}
		</ol>
	);
}

const CHECKS = [
	{
		key: "acceptTerms",
		label: () =>
			`Li e aceito os Termos de Uso do Quartier Flow (versão de ${termsVersionLabel()}).`,
	},
	{
		key: "acceptBilling",
		label: () =>
			"Entendi as regras de cobrança: sem período gratuito, fatura mensal pelos moradores e síndicos ativos, emitida no dia 1º e paga por boleto ou Pix.",
	},
	{
		key: "acceptFees",
		label: () =>
			"Concordo que as tarifas do meio de pagamento são descontadas dos repasses e com os termos de uso do Asaas para a conta de recebimento (seção 8.4).",
	},
] as const;

type CheckKey = (typeof CHECKS)[number]["key"];

function TermsStep({
	state,
	plan,
	onBack,
}: {
	state: State;
	plan: PlanOption;
	onBack: () => void;
}) {
	const router = useRouter();
	const utils = api.useUtils();
	const [checked, setChecked] = useState<Record<CheckKey, boolean>>({
		acceptTerms: false,
		acceptBilling: false,
		acceptFees: false,
	});
	const sign = api.onboarding.signPlan.useMutation({
		onSuccess: async () => {
			await utils.onboarding.state.invalidate();
			await utils.portal.access.invalidate();
			router.refresh(); // sidebar: full administradora menu
		},
	});
	const allChecked = CHECKS.every((c) => checked[c.key]);
	const invoice = firstInvoice(new Date());
	const admin = state.administradora;

	return (
		<Card title={<StepTitle n={4} title="Termos e assinatura" done={false} />}>
			<div className="space-y-6">
				<section className="space-y-2">
					<h3 className="font-semibold">Resumo da assinatura</h3>
					<Summary
						rows={[
							[
								"Administradora",
								admin ? `${admin.name} · CNPJ ${formatCnpj(admin.cnpj)}` : "—",
							],
							["Responsável", `${state.name} · ${state.email}`],
							["Plano", plan.name],
							[
								"Preço por assento",
								`${formatBRL(plan.residentSeatCents)} por morador e ${formatBRL(plan.sindicoSeatCents)} por síndico ativos, por mês`,
							],
							["Período gratuito", "Não há"],
							[
								"Primeira fatura",
								`${invoice.issueDate}, proporcional aos ${invoice.billedDays} dias restantes de ${invoice.periodLabel}; vencimento em ${invoice.dueDate}`,
							],
							["Depois", "Uma fatura todo dia 1º, com vencimento no dia 10"],
						]}
					/>
				</section>

				<section className="space-y-2">
					<div className="flex flex-wrap items-baseline justify-between gap-2">
						<h3 className="font-semibold">
							Termos de Uso{" "}
							<span className="font-normal text-muted-foreground text-sm">
								versão de {termsVersionLabel()}
							</span>
						</h3>
						<a
							href="/termos"
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
						>
							Abrir em nova aba{" "}
							<ExternalLink className="size-3.5" aria-hidden />
						</a>
					</div>
					<div className="max-h-80 overflow-y-auto rounded-lg border bg-background p-4">
						<TermsContent variant="app" />
					</div>
				</section>

				<section className="space-y-2">
					<h3 className="font-semibold">Regras de cobrança</h3>
					<ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
						{BILLING_RULES.map((rule) => (
							<li key={rule}>{rule}</li>
						))}
					</ul>
				</section>

				<section className="space-y-2">
					<h3 className="font-semibold">O que acontece depois da assinatura</h3>
					<NextStepsList
						steps={nextSteps({ planName: plan.name, signedAt: new Date() })}
					/>
				</section>

				<fieldset className="space-y-2">
					<legend className="mb-2 font-semibold">Confirmação</legend>
					{CHECKS.map((check) => (
						<label
							key={check.key}
							className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted"
						>
							<input
								type="checkbox"
								className="mt-0.5 size-5 shrink-0 accent-primary"
								checked={checked[check.key]}
								onChange={(e) =>
									setChecked({ ...checked, [check.key]: e.target.checked })
								}
							/>
							{check.label()}
						</label>
					))}
				</fieldset>

				<ErrorMessage message={errorMessage(sign.error)} />
				<div className="flex flex-col-reverse justify-between gap-2 sm:flex-row">
					<BackButton onClick={onBack} />
					<Button
						disabled={!allChecked}
						pending={sign.isPending}
						onClick={() =>
							sign.mutate({
								planId: plan.id,
								termsVersion: state.termsVersion,
								acceptTerms: true,
								acceptBilling: true,
								acceptFees: true,
							})
						}
					>
						Assinar plano {plan.name}
					</Button>
				</div>
				{!allChecked && (
					<p className="text-right text-muted-foreground text-sm">
						Marque as três confirmações para assinar.
					</p>
				)}
			</div>
		</Card>
	);
}

function Done({ state }: { state: State }) {
	const plan = state.plan;
	if (!plan) return null;
	const signedAt = new Date(plan.signedAt);
	return (
		<div className="space-y-6">
			<PageTitle
				title="Assinatura confirmada"
				subtitle={`${state.administradora?.name ?? ""} · plano ${plan.name}, assinado em ${signedAt.toLocaleDateString("pt-BR")}`}
			/>
			<Card>
				<div className="flex items-start gap-3">
					<CheckCircle2
						className="mt-0.5 size-6 shrink-0 text-success"
						aria-hidden
					/>
					<p>
						Tudo certo! Enviamos a confirmação para{" "}
						<strong>{state.email}</strong>, com o resumo do plano e a versão dos
						Termos de Uso aceita.
					</p>
				</div>
			</Card>
			<Card title="O que acontece agora">
				<NextStepsList steps={nextSteps({ planName: plan.name, signedAt })} />
			</Card>
			<div className="flex flex-col gap-2 sm:flex-row">
				<a
					href="/painel/onboarding"
					className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
				>
					Continuar: conta de recebimento
				</a>
				<a
					href="/painel/condominios"
					className="inline-flex h-11 items-center justify-center rounded-md border px-5 font-medium hover:bg-muted"
				>
					Criar primeiro condomínio
				</a>
			</div>
		</div>
	);
}

/**
 * Becoming an administradora (docs/features/19): who you are, the company,
 * the plan, then the full Termos de Uso, billing rules and what happens next
 * before signing. Resumable: progress lives on the server.
 */
export default function ComecarPage() {
	const state = api.onboarding.state.useQuery();
	const [step, setStep] = useState<Step | null>(null);
	const [plan, setPlan] = useState<PlanOption | null>(null);

	if (state.isLoading || !state.data) return <Loading />;
	const data = state.data;
	if (data.plan) return <Done state={data} />;

	const initial: Step = !data.name.trim() ? 1 : !data.administradora ? 2 : 3;
	const current = step ?? initial;

	return (
		<div className="mx-auto max-w-3xl">
			<PageTitle
				title={
					data.administradora?.closedAt
						? `Reabrir ${data.administradora.name}`
						: "Cadastre sua administradora"
				}
				subtitle={
					data.administradora?.closedAt
						? "A administradora está encerrada. Para voltar a gerenciar os condomínios, confira os dados, escolha um plano e aceite os Termos de Uso novamente."
						: "Leva poucos minutos. Você revisa tudo antes de assinar."
				}
			/>
			<Progress step={current} />
			{current === 1 && (
				<NameStep
					state={data}
					onDone={async () => {
						await state.refetch();
						setStep(data.administradora ? 3 : 2);
					}}
				/>
			)}
			{current === 2 && (
				<CompanyStep
					state={data}
					onBack={() => setStep(1)}
					onDone={async () => {
						await state.refetch();
						setStep(3);
					}}
				/>
			)}
			{current === 3 && (
				<PlanStep
					selected={plan}
					onSelect={setPlan}
					onBack={() => setStep(2)}
					onDone={() => setStep(4)}
				/>
			)}
			{current === 4 && plan && (
				<TermsStep state={data} plan={plan} onBack={() => setStep(3)} />
			)}
			{current === 4 && !plan && (
				<PlanStep
					selected={plan}
					onSelect={setPlan}
					onBack={() => setStep(2)}
					onDone={() => setStep(4)}
				/>
			)}
		</div>
	);
}
