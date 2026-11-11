"use client";

import { cn } from "cn";
import { ExternalLink, RefreshCw } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { formatCnpj } from "~/lib/br";
import { api } from "~/trpc/react";
import { PlanPicker } from "../_components/plan-picker";
import {
	Badge,
	Button,
	Card,
	ErrorMessage,
	Field,
	Input,
	KYC_LABEL,
	KYC_TONE,
	Loading,
	PageTitle,
	Select,
	errorMessage,
	fieldErrors,
} from "../_components/ui";

type Company = {
	companyType: string;
	mobilePhone: string;
	incomeValue: string;
	postalCode: string;
	address: string;
	addressNumber: string;
	complement: string;
	province: string;
};

function StepTitle({
	n,
	title,
	done,
}: {
	n: number;
	title: string;
	done: boolean;
}) {
	return (
		<span className="flex items-center gap-3">
			<span
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold text-sm",
					done
						? "border-transparent bg-success text-white"
						: "border-border bg-muted",
				)}
			>
				{done ? "✓" : n}
			</span>
			{title}
		</span>
	);
}

function CompanyForm({
	initial,
	locked,
}: {
	initial: Company;
	locked: boolean;
}) {
	const utils = api.useUtils();
	const [form, setForm] = useState(initial);
	const save = api.administradora.updateCompany.useMutation({
		onSuccess: () => utils.administradora.overview.invalidate(),
	});
	const errors = fieldErrors(save.error);
	const set = (key: keyof Company) => (e: { target: { value: string } }) =>
		setForm((f) => ({ ...f, [key]: e.target.value }));

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		save.mutate({
			...form,
			companyType: form.companyType as "LIMITED",
			incomeValue: Number(form.incomeValue),
			complement: form.complement || undefined,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-5" noValidate>
			<fieldset
				disabled={locked}
				className="grid gap-4 disabled:opacity-70 md:grid-cols-2"
			>
				<Field label="Tipo de empresa" error={errors.companyType}>
					<Select value={form.companyType} onChange={set("companyType")}>
						<option value="">Selecione</option>
						<option value="LIMITED">Limitada (LTDA)</option>
						<option value="INDIVIDUAL">Individual</option>
						<option value="MEI">MEI</option>
						<option value="ASSOCIATION">Associação</option>
					</Select>
				</Field>
				<Field label="Celular" error={errors.mobilePhone}>
					<Input
						value={form.mobilePhone}
						onChange={set("mobilePhone")}
						inputMode="tel"
						placeholder="(11) 99999-9999"
					/>
				</Field>
				<Field
					label="Faturamento mensal (R$)"
					hint="Exigido pelo Asaas para a verificação cadastral."
					error={errors.incomeValue}
				>
					<Input
						value={form.incomeValue}
						onChange={set("incomeValue")}
						inputMode="numeric"
					/>
				</Field>
				<Field label="CEP" error={errors.postalCode}>
					<Input
						value={form.postalCode}
						onChange={set("postalCode")}
						inputMode="numeric"
					/>
				</Field>
				<Field label="Endereço" error={errors.address}>
					<Input value={form.address} onChange={set("address")} />
				</Field>
				<Field label="Número" error={errors.addressNumber}>
					<Input value={form.addressNumber} onChange={set("addressNumber")} />
				</Field>
				<Field label="Complemento" error={errors.complement}>
					<Input value={form.complement} onChange={set("complement")} />
				</Field>
				<Field label="Bairro" error={errors.province}>
					<Input value={form.province} onChange={set("province")} />
				</Field>
			</fieldset>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(save.error)}
			/>
			{locked ? (
				<p className="text-muted-foreground text-sm">
					A conta de recebimento já foi criada. Para alterar estes dados, use o
					Asaas.
				</p>
			) : (
				<div className="flex items-center gap-3">
					<Button type="submit" pending={save.isPending}>
						Salvar dados da empresa
					</Button>
					{save.isSuccess && (
						<span
							aria-live="polite"
							className="text-sm text-success-foreground"
						>
							Dados salvos.
						</span>
					)}
				</div>
			)}
		</form>
	);
}

function PayoutAccount({
	ready,
	kycStatus,
	onboardingUrl,
}: {
	ready: boolean;
	kycStatus: string | null;
	onboardingUrl: string | null;
}) {
	const utils = api.useUtils();
	const create = api.administradora.createPayoutAccount.useMutation({
		onSuccess: () => utils.administradora.overview.invalidate(),
	});
	const refresh = api.administradora.refreshKyc.useMutation({
		onSuccess: () => utils.administradora.overview.invalidate(),
	});
	const { mutate: refreshNow } = refresh;
	const hasAccount = kycStatus !== null;

	// Pull the latest status when the page opens.
	useEffect(() => {
		if (hasAccount) refreshNow();
	}, [hasAccount, refreshNow]);

	if (!hasAccount) {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground">
					Os pagamentos dos moradores são repassados para uma conta Asaas da sua
					administradora. Vamos criá-la com os dados acima; depois você envia os
					documentos para a verificação cadastral (KYC).
				</p>
				<ErrorMessage message={errorMessage(create.error)} />
				<Button
					disabled={!ready}
					pending={create.isPending}
					onClick={() => create.mutate()}
				>
					Criar conta de recebimento
				</Button>
				{!ready && (
					<p className="text-muted-foreground text-sm">
						Salve os dados da empresa e escolha um plano antes.
					</p>
				)}
			</div>
		);
	}

	const status = refresh.data?.kycStatus ?? kycStatus;
	const link = refresh.data?.onboardingUrl ?? onboardingUrl;
	return (
		<div className="space-y-4">
			<p className="flex items-center gap-2">
				Situação da verificação:
				<Badge tone={KYC_TONE[status ?? "pending"]}>
					{KYC_LABEL[status ?? "pending"] ?? status}
				</Badge>
			</p>
			{status !== "approved" && (
				<p className="text-muted-foreground">
					Enquanto a conta não for aprovada, não é possível enviar cobranças aos
					moradores. A análise do Asaas leva até 48 horas após o envio dos
					documentos.
				</p>
			)}
			{refresh.data && refresh.data.pendingDocuments.length > 0 && (
				<ul className="list-inside list-disc text-sm">
					{refresh.data.pendingDocuments.map((doc) => (
						<li key={doc.id}>
							{doc.title} — {doc.status}
						</li>
					))}
				</ul>
			)}
			<div className="flex flex-wrap items-center gap-3">
				{link ? (
					<a
						href={link}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						Enviar documentos no Asaas
						<ExternalLink className="size-4" aria-hidden />
					</a>
				) : (
					status !== "approved" && (
						<p className="text-muted-foreground text-sm">
							Verifique o email de ativação enviado pelo Asaas para concluir o
							envio de documentos.
						</p>
					)
				)}
				<Button
					variant="outline"
					pending={refresh.isPending}
					onClick={() => refresh.mutate()}
				>
					<RefreshCw aria-hidden />
					Atualizar situação
				</Button>
			</div>
			<ErrorMessage message={errorMessage(refresh.error)} />
			<p className="text-muted-foreground text-xs">
				As tarifas do meio de pagamento são descontadas dos valores repassados
				(Termos de Uso, seção 8.4).
			</p>
		</div>
	);
}

function Step({ title, children }: { title: ReactNode; children: ReactNode }) {
	return <Card title={title}>{children}</Card>;
}

export default function OnboardingPage() {
	const overview = api.administradora.overview.useQuery();
	if (overview.isLoading || !overview.data) return <Loading />;
	const data = overview.data;
	const payout = data.payoutAccount;

	return (
		<div className="space-y-6">
			<PageTitle
				title="Configuração da administradora"
				subtitle={`${data.name} · CNPJ ${formatCnpj(data.cnpj)}`}
			/>
			<Step
				title={
					<StepTitle
						n={1}
						title="Dados da empresa"
						done={data.companyComplete}
					/>
				}
			>
				<CompanyForm
					locked={Boolean(payout)}
					initial={{
						companyType: data.companyType ?? "",
						mobilePhone: data.mobilePhone ?? "",
						incomeValue: data.incomeValue ? String(data.incomeValue) : "",
						postalCode: data.postalCode ?? "",
						address: data.address ?? "",
						addressNumber: data.addressNumber ?? "",
						complement: data.complement ?? "",
						province: data.province ?? "",
					}}
				/>
			</Step>
			<Step title={<StepTitle n={2} title="Plano" done={Boolean(data.plan)} />}>
				<PlanPicker currentPlanId={data.plan?.id} />
			</Step>
			<Step
				title={
					<StepTitle
						n={3}
						title="Conta de recebimento (Asaas)"
						done={payout?.kycStatus === "approved"}
					/>
				}
			>
				<PayoutAccount
					ready={data.companyComplete && Boolean(data.plan)}
					kycStatus={payout?.kycStatus ?? null}
					onboardingUrl={payout?.onboardingUrl ?? null}
				/>
			</Step>
		</div>
	);
}
