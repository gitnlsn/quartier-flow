"use client";

import { ExternalLink, FlaskConical, RefreshCw } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";

import { formatBRL, formatCnpj, formatDate, onlyDigits } from "~/lib/br";
import { masks } from "~/lib/masks";
import { api } from "~/trpc/react";
import { CepField } from "../_components/cep-field";
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
	MaskedInput,
	PageTitle,
	Select,
	StepTitle,
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

function CompanyForm({
	initial,
	locked,
	asaas,
}: {
	initial: Company;
	locked: boolean;
	asaas: { loginUrl: string; sandbox: boolean };
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
			incomeValue: Number(onlyDigits(form.incomeValue)),
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
					<MaskedInput
						mask="phone"
						value={form.mobilePhone}
						onValueChange={(mobilePhone) => setForm({ ...form, mobilePhone })}
						inputMode="tel"
						autoComplete="tel-national"
						placeholder="(11) 99999-9999"
					/>
				</Field>
				<Field
					label="Faturamento mensal (R$)"
					hint="Exigido pelo Asaas para a verificação cadastral."
					error={errors.incomeValue}
				>
					<MaskedInput
						mask="integer"
						value={form.incomeValue}
						onValueChange={(incomeValue) => setForm({ ...form, incomeValue })}
						placeholder="50.000"
					/>
				</Field>
				<CepField
					value={form.postalCode}
					onValueChange={(postalCode) => setForm((f) => ({ ...f, postalCode }))}
					onAddress={(found) => {
						setForm((f) => ({
							...f,
							address: found.street || f.address,
							province: found.neighborhood || f.province,
						}));
						document.getElementById("company-address-number")?.focus();
					}}
					error={errors.postalCode}
				/>
				<Field label="Endereço" error={errors.address}>
					<Input
						value={form.address}
						onChange={set("address")}
						autoComplete="address-line1"
					/>
				</Field>
				<Field label="Número" error={errors.addressNumber}>
					<Input
						id="company-address-number"
						value={form.addressNumber}
						onChange={set("addressNumber")}
					/>
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
				<div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
					<p className="text-muted-foreground">
						A conta de recebimento já foi criada, então estes dados agora são
						alterados no Asaas, onde passam pela análise cadastral. Depois de
						alterar, clique em “Atualizar situação” abaixo para trazer os novos
						dados para cá.
					</p>
					{asaas.sandbox && (
						<p className="text-muted-foreground">
							Ambiente de testes: os emails de acesso do Asaas vão para a conta
							principal do Sandbox, não para o email da administradora.
						</p>
					)}
					<a
						href={asaas.loginUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-11 items-center gap-2 rounded-md border bg-background px-5 font-medium hover:bg-muted"
					>
						Alterar dados no Asaas
						<ExternalLink className="size-4" aria-hidden />
					</a>
				</div>
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

const DOC_STATUS: Record<
	string,
	{ label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
	NOT_SENT: { label: "Não enviado", tone: "warning" },
	PENDING: { label: "Em análise", tone: "info" },
	APPROVED: { label: "Aprovado", tone: "success" },
	REJECTED: { label: "Recusado: envie novamente", tone: "danger" },
	IGNORED: { label: "Dispensado", tone: "neutral" },
};

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
	const approveSandbox = api.administradora.approveSandboxAccount.useMutation({
		// Asaas takes a moment to reflect the approval; refresh right after.
		onSuccess: () => refreshNow(),
	});
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
	const docs = refresh.data?.pendingDocuments ?? [];
	// Documents without an onboarding link can only be sent inside Asaas.
	const needsAsaasLogin =
		status !== "approved" &&
		docs.some((d) => !d.onboardingUrl && d.status !== "PENDING");
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
			{refresh.data?.rejectReasons && (
				<p className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
					Motivo informado pelo Asaas: {refresh.data.rejectReasons}
				</p>
			)}
			{docs.length > 0 && (
				<ul className="divide-y rounded-lg border">
					{docs.map((doc) => (
						<li
							key={`${doc.id}-${doc.title}-${doc.responsible}`}
							className="flex flex-wrap items-center justify-between gap-3 p-3"
						>
							<div className="min-w-0 space-y-1">
								<p className="font-medium text-sm">
									{doc.title}
									{doc.responsible && (
										<span className="font-normal text-muted-foreground">
											{" "}
											· {doc.responsible}
										</span>
									)}
								</p>
								<Badge tone={DOC_STATUS[doc.status]?.tone ?? "neutral"}>
									{DOC_STATUS[doc.status]?.label ?? doc.status}
								</Badge>
							</div>
							{doc.onboardingUrl ? (
								<div className="space-y-1 text-right">
									<a
										href={doc.onboardingUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground text-sm hover:bg-primary/90"
									>
										Enviar documento
										<ExternalLink className="size-4" aria-hidden />
									</a>
									{doc.expiresAt && (
										<p className="text-muted-foreground text-xs">
											Link válido até {formatDate(doc.expiresAt)}
										</p>
									)}
								</div>
							) : null}
						</li>
					))}
				</ul>
			)}
			{needsAsaasLogin && refresh.data && (
				<div className="space-y-3 rounded-lg bg-muted p-4 text-sm">
					<p className="font-medium">Como enviar pelo Asaas</p>
					<ol className="list-inside list-decimal space-y-1 text-muted-foreground">
						<li>
							Entre no Asaas com o email{" "}
							<strong className="text-foreground">
								{refresh.data.accountEmail}
							</strong>
							. É o email da conta de recebimento.
						</li>
						<li>
							No primeiro acesso, use o link do email de ativação do Asaas ou
							clique em “Esqueci minha senha” para criar a senha.
						</li>
						<li>
							Envie os documentos pedidos (identificação dos sócios com foto do
							documento e selfie). Depois, volte aqui e clique em “Atualizar
							situação”.
						</li>
					</ol>
					<a
						href={refresh.data.asaasLoginUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						Entrar no Asaas para enviar documentos
						<ExternalLink className="size-4" aria-hidden />
					</a>
				</div>
			)}
			{refresh.data?.sandbox && status !== "approved" && (
				<div className="space-y-3 rounded-lg border border-warning border-dashed p-4 text-sm">
					<p className="flex items-center gap-2 font-medium">
						<Badge tone="warning">Ambiente de testes</Badge>
						Aprovar sem enviar documentos
					</p>
					<p className="text-muted-foreground">
						No Sandbox do Asaas o envio de documentos é simulado e os emails de
						acesso vão para a conta principal. Este botão aprova a conta de
						recebimento direto no Sandbox para você testar as cobranças. Ele não
						aparece em produção.
					</p>
					<ErrorMessage message={errorMessage(approveSandbox.error)} />
					<Button
						variant="outline"
						pending={approveSandbox.isPending}
						onClick={() => approveSandbox.mutate()}
					>
						<FlaskConical aria-hidden />
						Aprovar conta no Sandbox
					</Button>
				</div>
			)}
			<div className="flex flex-wrap items-center gap-3">
				{link && docs.length === 0 && status !== "approved" && (
					<a
						href={link}
						target="_blank"
						rel="noreferrer"
						className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
					>
						Enviar documentos no Asaas
						<ExternalLink className="size-4" aria-hidden />
					</a>
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
	const company: Company = {
		companyType: data.companyType ?? "",
		mobilePhone: masks.phone(data.mobilePhone ?? ""),
		incomeValue: masks.integer(String(data.incomeValue ?? "")),
		postalCode: masks.cep(data.postalCode ?? ""),
		address: data.address ?? "",
		addressNumber: data.addressNumber ?? "",
		complement: data.complement ?? "",
		province: data.province ?? "",
	};

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
					// Locked data comes from Asaas: remount when a refresh brings new values.
					key={payout ? JSON.stringify(company) : "editing"}
					locked={Boolean(payout)}
					asaas={{ loginUrl: data.asaasLoginUrl, sandbox: data.asaasSandbox }}
					initial={company}
				/>
			</Step>
			<Step
				title={
					<StepTitle n={2} title="Plano assinado" done={Boolean(data.plan)} />
				}
			>
				{data.plan ? (
					<p className="text-muted-foreground">
						<strong className="text-foreground">{data.plan.name}</strong>:{" "}
						{formatBRL(data.plan.residentSeatCents)} por morador e{" "}
						{formatBRL(data.plan.sindicoSeatCents)} por síndico ativos, por mês.{" "}
						<a href="/painel/plano" className="underline underline-offset-4">
							Ver plano e assentos
						</a>
					</p>
				) : (
					<a href="/painel/comecar" className="underline underline-offset-4">
						Assinar um plano
					</a>
				)}
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
