"use client";

import { FileText, Paperclip, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";

import { formatPeriod } from "~/lib/billing-items";
import { formatBRL, formatDate, parseBRLToCents } from "~/lib/br";
import {
	ATTACHMENT_ACCEPT,
	EXPENSE_CATEGORIES,
	MAX_ATTACHMENT_BYTES,
} from "~/lib/expenses";
import { type RouterOutputs, api } from "~/trpc/react";
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
	Select,
	errorMessage,
} from "../../../_components/ui";
import { currentPeriod } from "./item-form";

type Condo = RouterOutputs["condominium"]["get"];

const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time

const formatSize = (bytes: number) =>
	bytes < 1024 * 1024
		? `${Math.max(1, Math.round(bytes / 1024))} KB`
		: `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/**
 * Re-encodes a photo as JPEG (max 2000px). Shrinks phone photos well below
 * the upload limit and drops EXIF metadata such as GPS location. PDFs pass
 * through unchanged.
 */
async function prepareFile(file: File): Promise<File> {
	if (file.type === "application/pdf") return file;
	let bitmap: ImageBitmap;
	try {
		bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
	} catch {
		throw new Error(
			"Não foi possível ler esta foto. Envie em JPG, PNG ou PDF.",
		);
	}
	const MAX = 2000;
	const scale = Math.min(1, MAX / Math.max(bitmap.width, bitmap.height));
	const canvas = document.createElement("canvas");
	canvas.width = Math.round(bitmap.width * scale);
	canvas.height = Math.round(bitmap.height * scale);
	const context = canvas.getContext("2d");
	if (!context)
		throw new Error("Seu navegador não conseguiu processar a foto.");
	context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
	bitmap.close();
	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", 0.82),
	);
	if (!blob) throw new Error("Seu navegador não conseguiu processar a foto.");
	const name = `${file.name.replace(/\.[^.]+$/, "") || "nota"}.jpg`;
	return new File([blob], name, { type: "image/jpeg" });
}

type Errors = Partial<
	Record<
		"category" | "supplier" | "description" | "amountCents" | "paidAt" | "file",
		string
	>
>;

function ExpenseForm({
	condominiumId,
	onSaved,
	onCancel,
}: {
	condominiumId: string;
	onSaved: (paidAt: string) => void;
	onCancel: () => void;
}) {
	const [form, setForm] = useState({
		category: "",
		supplier: "",
		description: "",
		amount: "",
		paidAt: today(),
	});
	const [file, setFile] = useState<File | null>(null);
	const [errors, setErrors] = useState<Errors>({});
	const [message, setMessage] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setMessage(null);
		const cents = parseBRLToCents(form.amount);
		const local: Errors = {};
		if (!form.category) local.category = "Escolha uma categoria";
		if (!form.description.trim()) local.description = "Descreva a despesa";
		if (cents === null || cents <= 0) local.amountCents = "Valor inválido";
		if (!form.paidAt) local.paidAt = "Informe a data";
		setErrors(local);
		if (Object.keys(local).length > 0 || cents === null) return;

		setPending(true);
		try {
			const body = new FormData();
			body.set("category", form.category);
			body.set("supplier", form.supplier);
			body.set("description", form.description);
			body.set("amountCents", String(cents));
			body.set("paidAt", form.paidAt);
			if (file) {
				const prepared = await prepareFile(file);
				if (prepared.size > MAX_ATTACHMENT_BYTES) {
					setErrors({ file: "Arquivo maior que 4 MB." });
					return;
				}
				body.set("file", prepared);
			}
			const response = await fetch(
				`/api/condominios/${condominiumId}/despesas`,
				{ method: "POST", body },
			);
			if (response.ok) {
				onSaved(form.paidAt);
				return;
			}
			const result = (await response.json().catch(() => ({}))) as {
				error?: string;
				fieldErrors?: Record<string, string[] | undefined>;
			};
			if (result.fieldErrors) {
				setErrors(
					Object.fromEntries(
						Object.entries(result.fieldErrors).map(([k, v]) => [k, v?.[0]]),
					) as Errors,
				);
				setMessage("Revise os campos destacados.");
			} else {
				setMessage(result.error ?? "Não foi possível salvar. Tente novamente.");
			}
		} catch (error) {
			setMessage(
				error instanceof Error && error.message
					? error.message
					: "Não foi possível salvar. Tente novamente.",
			);
		} finally {
			setPending(false);
		}
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<div className="grid gap-4 md:grid-cols-2">
				<div className="md:col-span-2">
					<Field label="Descrição" error={errors.description}>
						<Input
							value={form.description}
							maxLength={300}
							placeholder="Ex.: Troca das lâmpadas da garagem"
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
						/>
					</Field>
				</div>
				<Field label="Categoria" error={errors.category}>
					<Select
						value={form.category}
						onChange={(e) => setForm({ ...form, category: e.target.value })}
					>
						<option value="" disabled>
							Escolha…
						</option>
						{EXPENSE_CATEGORIES.map((c) => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</Select>
				</Field>
				<Field label="Fornecedor (opcional)" error={errors.supplier}>
					<Input
						value={form.supplier}
						maxLength={120}
						placeholder="Ex.: Elétrica Silva"
						onChange={(e) => setForm({ ...form, supplier: e.target.value })}
					/>
				</Field>
				<Field label="Valor (R$)" error={errors.amountCents}>
					<Input
						value={form.amount}
						inputMode="decimal"
						placeholder="350,00"
						onChange={(e) => setForm({ ...form, amount: e.target.value })}
					/>
				</Field>
				<Field label="Data do pagamento" error={errors.paidAt}>
					<Input
						type="date"
						value={form.paidAt}
						onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
					/>
				</Field>
				<div className="md:col-span-2">
					<Field
						label="Nota fiscal ou recibo (opcional)"
						hint="Foto ou PDF, até 4 MB. No celular, você pode tirar a foto na hora."
						error={errors.file}
					>
						<Input
							type="file"
							accept={ATTACHMENT_ACCEPT}
							className="py-2"
							onChange={(e) => setFile(e.target.files?.[0] ?? null)}
						/>
					</Field>
				</div>
			</div>
			<ErrorMessage message={message} />
			<div className="flex flex-wrap justify-end gap-2">
				<Button variant="ghost" onClick={onCancel} disabled={pending}>
					Cancelar
				</Button>
				<Button type="submit" pending={pending}>
					Salvar despesa
				</Button>
			</div>
		</form>
	);
}

/** Expenses of the condominium, by month, with their invoices (docs/features/05). */
export function ExpensesTab({ condo }: { condo: Condo }) {
	const [month, setMonth] = useState(currentPeriod);
	const [adding, setAdding] = useState(false);
	const utils = api.useUtils();
	const list = api.expense.list.useQuery({ condominiumId: condo.id, month });
	const remove = api.expense.delete.useMutation({
		onSuccess: () => utils.expense.list.invalidate(),
	});

	const canManage = list.data?.canManage ?? condo.canManage;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<Field label="Mês">
					<Input
						type="month"
						value={month}
						onChange={(e) => e.target.value && setMonth(e.target.value)}
						className="w-48"
					/>
				</Field>
				{canManage && (
					<Button onClick={() => setAdding(true)}>
						<Plus aria-hidden /> Lançar despesa
					</Button>
				)}
			</div>

			<Modal
				open={adding}
				onOpenChange={setAdding}
				title="Lançar despesa"
				description="Anexe a nota fiscal ou o recibo para a prestação de contas."
				size="lg"
			>
				<ExpenseForm
					condominiumId={condo.id}
					onCancel={() => setAdding(false)}
					onSaved={(paidAt) => {
						setAdding(false);
						setMonth(paidAt.slice(0, 7));
						void utils.expense.list.invalidate();
					}}
				/>
			</Modal>

			{list.isLoading ? (
				<Loading />
			) : !list.data ? (
				<ErrorMessage message={list.error?.message ?? "Algo deu errado."} />
			) : list.data.expenses.length === 0 ? (
				<EmptyState title={`Nenhuma despesa em ${formatPeriod(month)}`}>
					{canManage
						? "Lance as despesas do mês com a nota fiscal anexada."
						: "As despesas lançadas pela administradora aparecem aqui."}
				</EmptyState>
			) : (
				<>
					<Card
						title={`Total de ${formatPeriod(month)}: ${formatBRL(list.data.totalCents)}`}
						description={`${list.data.expenses.length} ${list.data.expenses.length === 1 ? "despesa" : "despesas"}`}
					>
						<div className="flex flex-wrap gap-2">
							{list.data.byCategory.map((c) => (
								<Badge key={c.category}>
									{c.category} · {formatBRL(c.cents)}
								</Badge>
							))}
						</div>
					</Card>
					<ErrorMessage message={errorMessage(remove.error)} />
					<ul className="divide-y rounded-lg border">
						{list.data.expenses.map((e) => (
							<li
								key={e.id}
								className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0 space-y-1">
									<p className="font-medium">{e.description}</p>
									<p className="text-muted-foreground text-sm">
										{[formatDate(e.paidAt), e.category, e.supplier]
											.filter(Boolean)
											.join(" · ")}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2 sm:justify-end">
									<span className="font-semibold tabular-nums">
										{formatBRL(e.amountCents)}
									</span>
									{e.hasAttachment ? (
										<a
											href={`/api/despesas/${e.id}/anexo`}
											target="_blank"
											rel="noreferrer"
											className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 font-medium text-sm hover:bg-accent"
											title={e.attachmentName ?? undefined}
										>
											{e.attachmentType === "application/pdf" ? (
												<FileText className="size-4" aria-hidden />
											) : (
												<Paperclip className="size-4" aria-hidden />
											)}
											Ver nota
											{e.attachmentSize !== null && (
												<span className="text-muted-foreground text-xs">
													{formatSize(e.attachmentSize)}
												</span>
											)}
										</a>
									) : (
										<Badge tone="warning">Sem nota</Badge>
									)}
									{canManage && (
										<ConfirmButton
											title="Excluir esta despesa?"
											description={`${e.description} · ${formatBRL(e.amountCents)}. A nota anexada também será excluída.`}
											confirmLabel="Excluir"
											pending={
												remove.isPending && remove.variables?.id === e.id
											}
											onConfirm={() => remove.mutate({ id: e.id })}
										>
											<Trash2 aria-hidden />
											<span className="sr-only">Excluir</span>
										</ConfirmButton>
									)}
								</div>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
