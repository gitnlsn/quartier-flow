"use client";

import { ArrowLeft, ExternalLink, Send } from "lucide-react";
import { useParams } from "next/navigation";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBRL, formatDate } from "~/lib/br";
import { api } from "~/trpc/react";
import {
	Badge,
	Button,
	CHARGE_STATUS_LABEL,
	CHARGE_STATUS_TONE,
	Card,
	ConfirmButton,
	ErrorMessage,
	Loading,
	PageTitle,
	RUN_STATUS_LABEL,
	RUN_STATUS_TONE,
	errorMessage,
} from "../../../../_components/ui";

const ACTION_LABEL: Record<string, string> = {
	"billing_run.prepare": "Cobranças preparadas",
	"billing_run.rebuild": "Cobranças recalculadas",
	"billing_run.send": "Cobranças enviadas",
	"billing_run.send_automatic": "Cobranças enviadas automaticamente",
};

function Summary({
	label,
	value,
}: {
	label: string;
	value: string | number;
}) {
	return (
		<div className="rounded-lg bg-muted/60 p-4">
			<dt className="text-muted-foreground text-sm">{label}</dt>
			<dd className="font-semibold text-2xl tracking-tight">{value}</dd>
		</div>
	);
}

export default function RunPage() {
	const { id, runId } = useParams<{ id: string; runId: string }>();
	const utils = api.useUtils();
	const run = api.billing.getRun.useQuery({ runId });
	const refresh = () =>
		Promise.all([
			utils.billing.getRun.invalidate({ runId }),
			utils.billing.listRuns.invalidate({ condominiumId: id }),
		]);
	const prepare = api.billing.prepareRun.useMutation({ onSuccess: refresh });
	const send = api.billing.sendRun.useMutation({ onSuccess: refresh });
	const retry = api.billing.retryFailed.useMutation({ onSuccess: refresh });

	if (run.isLoading) return <Loading />;
	if (!run.data) {
		return <ErrorMessage message={run.error?.message ?? "Não encontrado."} />;
	}
	const data = run.data;

	const ready = data.charges.filter((c) => c.status === "draft" && !c.issue);
	const blocked = data.charges.filter((c) => c.status === "draft" && c.issue);
	const total = ready.reduce((sum, c) => sum + c.amountCents, 0);
	const isDraft = data.status === "draft";
	const [year, month] = data.period.split("-");

	return (
		<div className="space-y-6">
			<a
				href={`/painel/condominios/${id}?aba=cobranca`}
				className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden /> {data.condominium.name}
			</a>
			<PageTitle
				title={`Cobranças de ${month}/${year}`}
				subtitle={
					<span className="flex flex-wrap items-center gap-2">
						Vencimento {formatDate(data.dueDate)}
						<Badge tone={RUN_STATUS_TONE[data.status]}>
							{RUN_STATUS_LABEL[data.status] ?? data.status}
						</Badge>
					</span>
				}
			/>

			{isDraft && data.canManage && (
				<Card
					title="Auditoria antes do envio"
					description="Confira valores e responsáveis. Corrigiu algo em Unidades ou Moradores? Clique em Recalcular."
				>
					<div className="space-y-4">
						<dl className="grid gap-3 sm:grid-cols-3">
							<Summary label="Prontas para envio" value={ready.length} />
							<Summary
								label="Com pendência (não serão enviadas)"
								value={blocked.length}
							/>
							<Summary label="Total a cobrar" value={formatBRL(total)} />
						</dl>
						<p className="text-muted-foreground text-sm">
							As tarifas do Asaas são descontadas do valor repassado à
							administradora.
						</p>
						<ErrorMessage message={errorMessage(send.error ?? prepare.error)} />
						<div className="flex flex-wrap gap-2">
							<ConfirmButton
								variant="default"
								size="lg"
								disabled={ready.length === 0}
								title={`Enviar ${ready.length} cobrança(s)?`}
								description={`Os moradores receberão boletos com Pix no total de ${formatBRL(total)}. Esta ação não pode ser desfeita.`}
								confirmLabel="Enviar cobranças"
								pending={send.isPending}
								onConfirm={() => send.mutate({ runId })}
							>
								<Send aria-hidden /> Enviar cobranças
							</ConfirmButton>
							<Button
								variant="outline"
								pending={prepare.isPending}
								onClick={() =>
									prepare.mutate({ condominiumId: id, period: data.period })
								}
							>
								Recalcular
							</Button>
						</div>
					</div>
				</Card>
			)}

			{send.data && (
				<p
					aria-live="polite"
					className={
						send.data.failed > 0
							? "rounded-lg border border-warning/60 bg-warning/15 p-4 text-warning-foreground"
							: "rounded-lg border border-success/40 bg-success/10 p-4 text-success-foreground"
					}
				>
					{send.data.sent} enviada(s), {send.data.skipped} não enviada(s) por
					pendência, {send.data.failed} com falha.
				</p>
			)}

			{data.status === "partially_failed" && data.canManage && (
				<Card
					title="Algumas cobranças falharam"
					description="Veja o motivo na tabela abaixo, corrija e tente novamente."
				>
					<div className="space-y-3">
						<ErrorMessage message={errorMessage(retry.error)} />
						<Button
							pending={retry.isPending}
							onClick={() => retry.mutate({ runId })}
						>
							Reenviar cobranças com falha
						</Button>
					</div>
				</Card>
			)}

			<Card title={`Unidades (${data.charges.length})`}>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Unidade</TableHead>
							<TableHead>Responsável</TableHead>
							<TableHead>Valor</TableHead>
							<TableHead>Situação</TableHead>
							<TableHead className="text-right">Cobrança</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.charges.map((charge) => (
							<TableRow key={charge.id}>
								<TableCell className="font-medium">
									{charge.unit.block
										? `${charge.unit.block} · ${charge.unit.number}`
										: charge.unit.number}
								</TableCell>
								<TableCell>
									{charge.payer ? (
										<>
											<div>{charge.payer.name || charge.payer.email}</div>
											<div className="text-muted-foreground text-xs">
												CPF {charge.payer.cpfMasked ?? "—"}
											</div>
										</>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
								<TableCell>{formatBRL(charge.amountCents)}</TableCell>
								<TableCell>
									<Badge
										tone={
											charge.issue && charge.status === "draft"
												? "warning"
												: CHARGE_STATUS_TONE[charge.status]
										}
									>
										{CHARGE_STATUS_LABEL[charge.status] ?? charge.status}
									</Badge>
									{charge.issue && (
										<div className="mt-1 max-w-56 whitespace-normal text-muted-foreground text-xs">
											{charge.issue}
										</div>
									)}
								</TableCell>
								<TableCell className="text-right">
									{charge.invoiceUrl ? (
										<a
											href={charge.invoiceUrl}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-1 font-medium text-sm hover:underline"
										>
											Abrir <ExternalLink className="size-3.5" aria-hidden />
										</a>
									) : (
										<span className="text-muted-foreground">—</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</Card>

			<Card title="Histórico (auditoria)">
				<ol className="space-y-3 border-l pl-4">
					{data.history.map((entry) => (
						<li key={entry.id} className="text-sm">
							<p className="font-medium">
								{ACTION_LABEL[entry.action] ?? entry.action}
								{entry.data &&
									typeof entry.data === "object" &&
									"sent" in entry.data && (
										<span className="font-normal text-muted-foreground">
											{" "}
											· {String((entry.data as { sent: number }).sent)} enviadas
										</span>
									)}
							</p>
							<p className="text-muted-foreground">
								{new Date(entry.createdAt).toLocaleString("pt-BR")} ·{" "}
								{entry.actor
									? entry.actor.name || entry.actor.email
									: "Sistema (automático)"}
							</p>
						</li>
					))}
				</ol>
			</Card>
		</div>
	);
}
