"use client";

import {
	ArrowLeft,
	Download,
	FileText,
	Gavel,
	Paperclip,
	Pencil,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useRef, useState } from "react";

import { buttonVariants } from "~/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBRL, formatDate } from "~/lib/br";
import {
	STAGE_LABEL,
	STAGE_TONE,
	TIMELINE_LABEL,
	type TimelineKind,
} from "~/lib/collection";
import {
	AGREEMENT_STATE_LABEL,
	AGREEMENT_STATE_TONE,
	unitLabel,
} from "~/lib/delinquency";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES } from "~/lib/expenses";
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
	Modal,
	type Tone,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";
import { prepareFile } from "./expenses-tab";

/**
 * Legal collection cases (docs/features/04, item 3): the list in
 * Inadimplência, the dialog that opens one, and the case page with its
 * timeline, files and the dossiê.
 */

type Overview = RouterOutputs["delinquency"]["overview"];
type DelinquentUnit = Overview["units"][number];
type CaseData = RouterOutputs["collection"]["get"];

const casePath = (condominiumId: string, caseId: string) =>
	`${condoPath(condominiumId, "inadimplencia")}/cobrancas/${caseId}`;

const TEXTAREA =
	"w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function CasesCard({ condominiumId }: { condominiumId: string }) {
	const cases = api.collection.list.useQuery({ condominiumId });
	const [showClosed, setShowClosed] = useState(false);
	if (cases.isLoading) return <Loading />;
	if (cases.error || !cases.data) {
		return <ErrorMessage message={errorMessage(cases.error)} />;
	}
	const open = cases.data.filter((c) => !c.closedAt);
	const closed = cases.data.filter((c) => c.closedAt);
	const shown = showClosed ? cases.data : open;

	return (
		<Card
			title="Cobranças jurídicas"
			description="Unidades em cobrança extrajudicial ou judicial, com o histórico, os documentos e o dossiê para o advogado."
			action={
				closed.length > 0 ? (
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setShowClosed((v) => !v)}
					>
						{showClosed ? "Só as abertas" : `Ver encerradas (${closed.length})`}
					</Button>
				) : undefined
			}
		>
			{shown.length === 0 ? (
				<EmptyState title="Nenhuma cobrança jurídica aberta">
					Abra uma a partir de uma unidade em atraso, na lista acima.
				</EmptyState>
			) : (
				<ul className="divide-y">
					{shown.map((c) => (
						<li key={c.id}>
							<Link
								href={casePath(condominiumId, c.id)}
								className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-3 hover:bg-muted/40"
							>
								<span className="flex flex-wrap items-center gap-2 font-medium">
									<Gavel className="size-4 text-muted-foreground" aria-hidden />
									Unidade {unitLabel(c.unit)}
									<Badge tone={STAGE_TONE[c.stage]}>
										{STAGE_LABEL[c.stage]}
									</Badge>
								</span>
								<span className="text-muted-foreground text-sm">
									{c.handler ? `${c.handler} · ` : ""}aberta em{" "}
									{formatDate(c.openedAt)}
									{c.closedAt
										? ` · encerrada em ${formatDate(c.closedAt)}`
										: ""}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
		</Card>
	);
}

export function OpenCaseModal({
	condominiumId,
	row,
	onClose,
}: {
	condominiumId: string;
	row: DelinquentUnit;
	onClose: () => void;
}) {
	const router = useRouter();
	const utils = api.useUtils();
	const [handler, setHandler] = useState("");
	const [note, setNote] = useState("");
	const open = api.collection.open.useMutation({
		onSuccess: async (created) => {
			await Promise.all([
				utils.collection.list.invalidate({ condominiumId }),
				utils.delinquency.overview.invalidate(),
			]);
			router.push(casePath(condominiumId, created.id));
		},
	});
	const errors = fieldErrors(open.error);

	return (
		<Modal
			open
			onOpenChange={(value) => !value && onClose()}
			title={`Cobrança jurídica · Unidade ${unitLabel(row.unit)}`}
			description="Começa como cobrança extrajudicial (notificações, negociação). Você muda a etapa quando for para a Justiça."
		>
			<form
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					open.mutate({
						condominiumId,
						unitId: row.unit.id,
						handler: handler.trim() || null,
						note: note.trim() || null,
					});
				}}
			>
				<p className="text-sm">
					{formatBRL(row.totalCents)} em {row.charges.length} cobrança(s)
					vencida(s), a mais antiga há {row.daysLate} dia(s).
				</p>
				<Field
					label="Responsável pela cobrança (opcional)"
					hint="Escritório ou advogado. Dá para preencher depois."
					error={errors.handler}
				>
					<Input
						value={handler}
						maxLength={160}
						onChange={(e) => setHandler(e.target.value)}
						placeholder="Ex.: Silva & Souza Advogados"
					/>
				</Field>
				<Field label="Anotação (opcional)" error={errors.note}>
					<textarea
						value={note}
						maxLength={2000}
						rows={3}
						onChange={(e) => setNote(e.target.value)}
						className={TEXTAREA}
						placeholder="Ex.: notificação extrajudicial enviada por carta registrada"
					/>
				</Field>
				<ErrorMessage
					message={
						Object.keys(errors).length > 0 ? null : errorMessage(open.error)
					}
				/>
				<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<Button variant="ghost" onClick={onClose}>
						Voltar
					</Button>
					<Button type="submit" pending={open.isPending}>
						<Gavel aria-hidden />
						Abrir cobrança
					</Button>
				</div>
			</form>
		</Modal>
	);
}

const KIND_TONE: Partial<Record<TimelineKind, Tone>> = {
	overdue: "danger",
	payment: "success",
	agreement: "info",
	agreement_broken: "warning",
	forgiveness: "neutral",
	stage: "warning",
	opened: "warning",
};

export function CollectionCaseView({
	condominiumId,
	caseId,
}: {
	condominiumId: string;
	caseId: string;
}) {
	const query = api.collection.get.useQuery({ condominiumId, caseId });
	if (query.isLoading) return <Loading />;
	if (query.error || !query.data) {
		return <ErrorMessage message={errorMessage(query.error)} />;
	}
	const c = query.data;
	const editable = c.canManage && !c.closedAt;

	return (
		<div className="space-y-6">
			<Link
				href={condoPath(condominiumId, "inadimplencia")}
				className={buttonVariants({ variant: "ghost", size: "sm" })}
			>
				<ArrowLeft aria-hidden />
				Inadimplência
			</Link>

			<CaseSummary data={c} editable={editable} />

			<Card
				title="Débitos em aberto"
				description={`Multa de ${c.finePercent.toLocaleString("pt-BR")}% e juros de ${c.interestPercent.toLocaleString("pt-BR")}% ao mês estimados até hoje: o valor exato é calculado no pagamento.`}
			>
				{c.debts.length === 0 ? (
					<EmptyState title="Nenhuma cobrança vencida em aberto">
						Se a dívida foi quitada ou entrou em acordo, você pode encerrar a
						cobrança.
					</EmptyState>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Cobrança</TableHead>
								<TableHead className="hidden sm:table-cell">
									Vencimento
								</TableHead>
								<TableHead className="text-right">Valor</TableHead>
								<TableHead className="text-right">Com multa e juros</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{c.debts.map((d) => (
								<TableRow key={d.id}>
									<TableCell>
										{d.label}
										<span className="block text-muted-foreground text-xs">
											{formatDate(d.dueDate)} · {d.daysLate} dia(s)
										</span>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{formatDate(d.dueDate)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatBRL(d.amountCents)}
									</TableCell>
									<TableCell className="text-right tabular-nums">
										{formatBRL(d.amountCents + d.estimateCents)}
									</TableCell>
								</TableRow>
							))}
							<TableRow className="font-medium">
								<TableCell>Total</TableCell>
								<TableCell className="hidden sm:table-cell" />
								<TableCell className="text-right tabular-nums">
									{formatBRL(c.debtTotals.amountCents)}
								</TableCell>
								<TableCell className="text-right tabular-nums">
									{formatBRL(
										c.debtTotals.amountCents + c.debtTotals.estimateCents,
									)}
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				)}
			</Card>

			{c.agreements.length > 0 && (
				<Card title="Acordos da unidade">
					<ul className="divide-y">
						{c.agreements.map((a) => (
							<li key={a.id} className="space-y-1 py-3 text-sm">
								<p className="flex flex-wrap items-center gap-2 font-medium">
									Acordo de {formatDate(a.createdAt)}
									{a.replaced ? (
										<Badge>Substituído</Badge>
									) : (
										<Badge tone={AGREEMENT_STATE_TONE[a.state]}>
											{AGREEMENT_STATE_LABEL[a.state]}
										</Badge>
									)}
								</p>
								<p className="text-muted-foreground">
									{formatBRL(a.totalCents)} ·{" "}
									{a.downPaymentCents > 0 &&
										`entrada ${formatBRL(a.downPaymentCents)} + `}
									{a.installments}× {formatBRL(a.installmentCents)} ·{" "}
									{a.paidInstallments}/{a.installments} paga(s) · falta{" "}
									{formatBRL(a.remainingCents)}
								</p>
							</li>
						))}
					</ul>
				</Card>
			)}

			<Card
				title="Histórico"
				description="Anotações e documentos, mais o que aconteceu com as cobranças da unidade: vencimentos, pagamentos, acordos, perdões e lembretes."
			>
				{editable && <AddEventForm caseId={c.id} />}
				<ol className="mt-4 space-y-4 border-l pl-4">
					{c.timeline.map((e) => (
						<li key={e.id} className="relative">
							<span className="-left-[21px] absolute top-1.5 size-2.5 rounded-full border-2 border-background bg-muted-foreground" />
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<Badge tone={KIND_TONE[e.kind] ?? "neutral"}>
									{TIMELINE_LABEL[e.kind] ?? e.kind}
								</Badge>
								<span className="text-muted-foreground">
									{formatDate(e.at)}
									{e.actor ? ` · ${e.actor}` : ""}
								</span>
							</div>
							{e.text && (
								<p className="mt-1 whitespace-pre-line text-sm">{e.text}</p>
							)}
							{e.file && (
								<a
									href={`/api/cobrancas-juridicas/eventos/${e.file.eventId}/anexo`}
									target="_blank"
									rel="noreferrer"
									className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm underline-offset-2 hover:underline"
								>
									<FileText className="size-4" aria-hidden />
									{e.file.name}
								</a>
							)}
						</li>
					))}
				</ol>
			</Card>
		</div>
	);
}

function CaseSummary({
	data: c,
	editable,
}: { data: CaseData; editable: boolean }) {
	const utils = api.useUtils();
	const refresh = () =>
		Promise.all([
			utils.collection.get.invalidate(),
			utils.collection.list.invalidate(),
			utils.delinquency.overview.invalidate(),
		]);
	const stage = api.collection.setStage.useMutation({ onSuccess: refresh });
	const handler = api.collection.setHandler.useMutation({
		onSuccess: async () => {
			setEditingHandler(false);
			await refresh();
		},
	});
	const [editingHandler, setEditingHandler] = useState(false);
	const [handlerValue, setHandlerValue] = useState(c.handler ?? "");

	return (
		<Card
			title={
				<span className="flex flex-wrap items-center gap-2">
					Unidade {c.unitLabel}
					<Badge tone={STAGE_TONE[c.stage]}>{STAGE_LABEL[c.stage]}</Badge>
				</span>
			}
			description={`Aberta em ${formatDate(c.openedAt)}${c.closedAt ? ` · encerrada em ${formatDate(c.closedAt)}` : ""}`}
			action={
				c.canManage ? (
					<a
						href={`/api/cobrancas-juridicas/${c.id}/dossie`}
						download
						className={buttonVariants({ variant: "outline", size: "default" })}
					>
						<Download aria-hidden />
						Dossiê (PDF)
					</a>
				) : undefined
			}
		>
			<dl className="grid gap-3 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">Responsável financeiro</dt>
					<dd>
						{c.payer ? (
							<>
								{c.payer.name}
								<span className="block text-muted-foreground">
									{c.payer.email}
								</span>
							</>
						) : (
							"Sem responsável cadastrado"
						)}
					</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Responsável pela cobrança</dt>
					<dd>
						{editingHandler ? (
							<form
								className="flex flex-wrap gap-2"
								onSubmit={(event: FormEvent) => {
									event.preventDefault();
									handler.mutate({
										caseId: c.id,
										handler: handlerValue.trim() || null,
									});
								}}
							>
								<Input
									value={handlerValue}
									maxLength={160}
									aria-label="Responsável pela cobrança"
									className="min-w-0 flex-1"
									onChange={(e) => setHandlerValue(e.target.value)}
								/>
								<Button
									type="submit"
									size="default"
									pending={handler.isPending}
								>
									Salvar
								</Button>
							</form>
						) : (
							<span className="flex items-center gap-1">
								{c.handler ?? (
									<span className="text-muted-foreground">Não informado</span>
								)}
								{editable && (
									<Button
										variant="ghost"
										size="icon-sm"
										aria-label="Alterar responsável"
										onClick={() => setEditingHandler(true)}
									>
										<Pencil aria-hidden />
									</Button>
								)}
							</span>
						)}
					</dd>
				</div>
			</dl>
			{editable && (
				<div className="mt-4 flex flex-wrap gap-2">
					{c.stage === "extrajudicial" ? (
						<ConfirmButton
							variant="outline"
							size="default"
							title="Passar para cobrança judicial?"
							description="Registra no histórico que a cobrança foi para a Justiça. A unidade passa a aparecer como 'Cobrança judicial' na lista."
							confirmLabel="Passar para judicial"
							pending={stage.isPending}
							onConfirm={() =>
								stage.mutate({ caseId: c.id, stage: "judicial", note: null })
							}
						>
							<Gavel aria-hidden />
							Passar para judicial
						</ConfirmButton>
					) : (
						<ConfirmButton
							variant="outline"
							size="default"
							title="Voltar para cobrança extrajudicial?"
							confirmLabel="Voltar"
							pending={stage.isPending}
							onConfirm={() =>
								stage.mutate({
									caseId: c.id,
									stage: "extrajudicial",
									note: null,
								})
							}
						>
							Voltar para extrajudicial
						</ConfirmButton>
					)}
					<ConfirmButton
						variant="ghost"
						size="default"
						title="Encerrar esta cobrança?"
						description="Use quando a dívida foi paga, entrou em acordo ou a cobrança foi abandonada. O histórico fica guardado; se a unidade voltar a atrasar, abra uma nova."
						confirmLabel="Encerrar"
						pending={stage.isPending}
						onConfirm={() =>
							stage.mutate({ caseId: c.id, stage: "closed", note: null })
						}
					>
						Encerrar cobrança
					</ConfirmButton>
				</div>
			)}
			<ErrorMessage message={errorMessage(stage.error ?? handler.error)} />
		</Card>
	);
}

function AddEventForm({ caseId }: { caseId: string }) {
	const utils = api.useUtils();
	const [text, setText] = useState("");
	const [file, setFile] = useState<File | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, setPending] = useState(false);
	const fileInput = useRef<HTMLInputElement>(null);

	async function submit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		if (!text.trim() && !file) {
			setError("Escreva uma anotação ou anexe um arquivo.");
			return;
		}
		setPending(true);
		try {
			const body = new FormData();
			body.set("text", text);
			if (file) {
				const prepared = await prepareFile(file);
				if (prepared.size > MAX_ATTACHMENT_BYTES) {
					setError("Arquivo maior que 4 MB.");
					return;
				}
				body.set("file", prepared);
			}
			const response = await fetch(
				`/api/cobrancas-juridicas/${caseId}/eventos`,
				{ method: "POST", body },
			);
			if (!response.ok) {
				const result = (await response.json().catch(() => ({}))) as {
					error?: string;
					fieldErrors?: Record<string, string[] | undefined>;
				};
				setError(
					result.error ??
						Object.values(result.fieldErrors ?? {})[0]?.[0] ??
						"Não foi possível salvar. Tente novamente.",
				);
				return;
			}
			setText("");
			setFile(null);
			if (fileInput.current) fileInput.current.value = "";
			await utils.collection.get.invalidate();
		} catch (err) {
			setError(
				err instanceof Error && err.message
					? err.message
					: "Não foi possível salvar. Tente novamente.",
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={submit} className="space-y-3 rounded-lg border p-3">
			<Field label="Nova anotação">
				<textarea
					value={text}
					maxLength={2000}
					rows={3}
					onChange={(e) => setText(e.target.value)}
					className={TEXTAREA}
					placeholder="Ex.: petição inicial protocolada, processo nº..."
				/>
			</Field>
			<Field
				label="Documento (opcional)"
				hint="Foto ou PDF, até 4 MB: notificação, petição, comprovante."
			>
				<Input
					ref={fileInput}
					type="file"
					accept={ATTACHMENT_ACCEPT}
					className="py-2"
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>
			</Field>
			<ErrorMessage message={error} />
			<div className="flex justify-end">
				<Button type="submit" pending={pending}>
					<Paperclip aria-hidden />
					Registrar
				</Button>
			</div>
		</form>
	);
}
