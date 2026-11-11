"use client";

import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatPeriod } from "~/lib/billing-items";
import { formatBRL } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	downloadCsv,
	guessColumns,
	readSpreadsheet,
} from "../../../_components/spreadsheet";
import {
	Badge,
	Button,
	ConfirmButton,
	ErrorMessage,
	Field,
	Input,
	Select,
	type Tone,
	errorMessage,
} from "../../../_components/ui";
import { currentPeriod } from "./item-form";

type FieldKey = "block" | "unit" | "name" | "description" | "amount" | "period";

const FIELDS: {
	key: FieldKey;
	label: string;
	required?: boolean;
	hint?: string;
	synonyms: string[];
}[] = [
	{
		key: "unit",
		label: "Unidade",
		required: true,
		synonyms: ["unidade", "apto", "apartamento", "ap", "unit"],
	},
	{ key: "block", label: "Bloco", synonyms: ["bloco", "torre", "block"] },
	{
		key: "name",
		label: "Item",
		required: true,
		hint: "Ex.: Consumo de gás",
		synonyms: ["item", "nome", "descricao do item", "tipo"],
	},
	{
		key: "amount",
		label: "Valor (R$)",
		required: true,
		synonyms: ["valor", "valor (r$)", "total", "amount"],
	},
	{
		key: "description",
		label: "Descrição",
		synonyms: ["descricao", "observacao", "detalhe"],
	},
	{
		key: "period",
		label: "Mês",
		hint: "11/2026 (vazio = mês abaixo)",
		synonyms: ["mes", "competencia", "referencia", "periodo"],
	},
];

type Mapping = Record<FieldKey, number | null>;
type Preview = RouterOutputs["billing"]["previewItemImport"];

const STATUS: Record<Preview[number]["status"], { label: string; tone: Tone }> =
	{
		create: { label: "Novo", tone: "success" },
		skip: { label: "Ignorado", tone: "neutral" },
		error: { label: "Erro", tone: "danger" },
	};

function downloadTemplate() {
	downloadCsv("modelo-itens-individuais.csv", [
		"Bloco;Unidade;Item;Descrição;Valor;Mês",
		"A;101;Consumo de gás;Leitura 120 m³;48,90;11/2026",
		"A;102;Consumo de gás;Leitura 95 m³;38,70;11/2026",
		"A;101;Multa;Barulho após 22h;150,00;11/2026",
	]);
}

/**
 * Imports one-off items per unit (e.g. a month's gas readings) from CSV/XLSX:
 * choose file, map columns, preview validated rows, confirm.
 */
export function ImportItems({
	condominiumId,
	onDone,
}: {
	condominiumId: string;
	onDone: () => void;
}) {
	const utils = api.useUtils();
	const [step, setStep] = useState<"file" | "map" | "preview" | "done">("file");
	const [fileName, setFileName] = useState("");
	const [readError, setReadError] = useState<string | null>(null);
	const [headers, setHeaders] = useState<string[]>([]);
	const [rows, setRows] = useState<string[][]>([]);
	const [mapping, setMapping] = useState<Mapping>(() =>
		guessColumns([], FIELDS),
	);
	const [defaultPeriod, setDefaultPeriod] = useState(currentPeriod());

	const preview = api.billing.previewItemImport.useMutation({
		onSuccess: () => setStep("preview"),
	});
	const importItems = api.billing.importItems.useMutation({
		onSuccess: () => {
			setStep("done");
			return utils.billing.items.invalidate({ condominiumId });
		},
	});

	async function onFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setReadError(null);
		try {
			const [head, ...body] = await readSpreadsheet(file);
			if (!head || body.length === 0) {
				throw new Error(
					"A planilha precisa de um cabeçalho e ao menos uma linha.",
				);
			}
			setFileName(file.name);
			setHeaders(head);
			setRows(body);
			setMapping(guessColumns(head, FIELDS));
			setStep("map");
		} catch (error) {
			setReadError(
				error instanceof Error
					? error.message
					: "Não foi possível ler o arquivo.",
			);
		}
	}

	const missingRequired = FIELDS.filter(
		(f) => f.required && mapping[f.key] === null,
	);
	const payload = () => ({
		condominiumId,
		defaultPeriod,
		rows: rows.map((row) => {
			const pick = (key: FieldKey) => {
				const index = mapping[key];
				return index === null ? "" : (row[index] ?? "");
			};
			return {
				block: pick("block"),
				unit: pick("unit"),
				name: pick("name"),
				description: pick("description"),
				amount: pick("amount"),
				period: pick("period"),
			};
		}),
	});

	if (step === "file") {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Uma linha por unidade e item (ex.: consumo de gás do mês). Cada linha
					vira um item cobrado uma vez, no mês indicado.
				</p>
				<label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:bg-muted">
					<FileSpreadsheet
						className="size-8 text-muted-foreground"
						aria-hidden
					/>
					<span className="font-medium">Escolher arquivo</span>
					<span className="text-muted-foreground text-xs">CSV ou XLSX</span>
					<input
						type="file"
						accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						className="sr-only"
						onChange={onFile}
					/>
				</label>
				<ErrorMessage message={readError} />
				<div className="flex flex-wrap gap-2">
					<Button variant="outline" onClick={downloadTemplate}>
						<Download aria-hidden /> Baixar modelo
					</Button>
					<Button variant="ghost" onClick={onDone}>
						Cancelar
					</Button>
				</div>
			</div>
		);
	}

	if (step === "map") {
		return (
			<div className="space-y-5">
				<p className="text-sm">
					<strong>{fileName}</strong> · {rows.length} linha(s). Indique qual
					coluna corresponde a cada informação.
				</p>
				<div className="grid gap-4 md:grid-cols-2">
					{FIELDS.map((field) => (
						<Field
							key={field.key}
							label={`${field.label}${field.required ? " *" : ""}`}
							hint={field.hint}
						>
							<Select
								value={mapping[field.key] ?? ""}
								onChange={(e) =>
									setMapping({
										...mapping,
										[field.key]:
											e.target.value === "" ? null : Number(e.target.value),
									})
								}
							>
								<option value="">— Não usar —</option>
								{headers.map((header, index) => (
									<option key={`${header}-${index}`} value={index}>
										{header || `Coluna ${index + 1}`}
									</option>
								))}
							</Select>
						</Field>
					))}
					<Field
						label="Mês das linhas sem mês"
						hint="Usado quando a coluna Mês não existe ou está vazia."
					>
						<Input
							type="month"
							value={defaultPeriod}
							onChange={(e) => setDefaultPeriod(e.target.value)}
						/>
					</Field>
				</div>
				{missingRequired.length > 0 && (
					<p className="text-sm text-warning-foreground">
						Escolha as colunas obrigatórias:{" "}
						{missingRequired.map((f) => f.label).join(", ")}.
					</p>
				)}
				<ErrorMessage message={errorMessage(preview.error)} />
				<div className="flex flex-wrap gap-2">
					<Button
						disabled={missingRequired.length > 0}
						pending={preview.isPending}
						onClick={() => preview.mutate(payload())}
					>
						Pré-visualizar
					</Button>
					<Button variant="ghost" onClick={() => setStep("file")}>
						<ArrowLeft aria-hidden /> Outro arquivo
					</Button>
				</div>
			</div>
		);
	}

	if (step === "preview" && preview.data) {
		const results = preview.data;
		const valid = results.filter((r) => r.status === "create");
		const total = valid.reduce((sum, r) => sum + (r.data.amountCents ?? 0), 0);
		const errors = results.filter((r) => r.status === "error").length;
		const sorted = [...results].sort(
			(a, b) =>
				Number(b.status === "error") - Number(a.status === "error") ||
				a.line - b.line,
		);
		return (
			<div className="space-y-4">
				<div className="flex flex-wrap gap-2">
					<Badge tone="success">
						{valid.length} novos · {formatBRL(total)}
					</Badge>
					<Badge>
						{results.filter((r) => r.status === "skip").length} ignorados
					</Badge>
					<Badge tone="danger">{errors} com erro</Badge>
				</div>
				<div className="max-h-[28rem] overflow-auto rounded-lg border">
					<Table>
						<TableHeader className="sticky top-0 bg-card">
							<TableRow>
								<TableHead>Linha</TableHead>
								<TableHead>Unidade</TableHead>
								<TableHead>Item</TableHead>
								<TableHead>Mês</TableHead>
								<TableHead className="text-right">Valor</TableHead>
								<TableHead>Situação</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sorted.map((row) => (
								<TableRow key={row.line}>
									<TableCell className="text-muted-foreground">
										{row.line}
									</TableCell>
									<TableCell>{row.data.unit || "—"}</TableCell>
									<TableCell>
										<div className="font-medium">{row.data.name || "—"}</div>
										{row.data.description && (
											<div className="text-muted-foreground text-xs">
												{row.data.description}
											</div>
										)}
									</TableCell>
									<TableCell>
										{row.data.period ? formatPeriod(row.data.period) : "—"}
									</TableCell>
									<TableCell className="text-right">
										{row.data.amountCents !== null
											? formatBRL(row.data.amountCents)
											: "—"}
									</TableCell>
									<TableCell className="whitespace-normal">
										<Badge tone={STATUS[row.status].tone}>
											{STATUS[row.status].label}
										</Badge>
										{row.messages.map((message) => (
											<div
												key={message}
												className="mt-1 text-muted-foreground text-xs"
											>
												{message}
											</div>
										))}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				<ErrorMessage message={errorMessage(importItems.error)} />
				<div className="flex flex-wrap gap-2">
					<ConfirmButton
						variant="default"
						size="lg"
						disabled={valid.length === 0}
						title={`Importar ${valid.length} item(ns)?`}
						description={`Total de ${formatBRL(total)}. Os itens entram nas cobranças dos meses indicados, se ainda não tiverem sido enviadas.`}
						confirmLabel="Importar"
						pending={importItems.isPending}
						onConfirm={() => importItems.mutate(payload())}
					>
						<Upload aria-hidden /> Importar {valid.length} item(ns)
					</ConfirmButton>
					<Button variant="ghost" onClick={() => setStep("map")}>
						<ArrowLeft aria-hidden /> Ajustar colunas
					</Button>
				</div>
			</div>
		);
	}

	const result = importItems.data;
	return (
		<div className="space-y-4">
			<div
				aria-live="polite"
				className="rounded-lg border border-success/40 bg-success/10 p-4 text-success-foreground"
			>
				<p className="font-medium">Importação concluída.</p>
				<p className="text-sm">
					{result?.created ?? 0} item(ns) criados (
					{formatBRL(result?.totalCents ?? 0)}) · {result?.skipped ?? 0}{" "}
					ignorado(s) · {result?.invalid ?? 0} com erro
				</p>
			</div>
			<p className="text-muted-foreground text-sm">
				Se a cobrança do mês já estava preparada (e não enviada), clique em
				&quot;Recalcular&quot; nela para incluir os novos itens.
			</p>
			<Button onClick={onDone}>Concluir</Button>
		</div>
	);
}
