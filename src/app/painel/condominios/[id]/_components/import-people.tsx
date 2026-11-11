"use client";

import { ArrowLeft, Download, FileSpreadsheet, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";

import { Checkbox } from "~/components/ui/checkbox";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
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
	Select,
	type Tone,
	errorMessage,
} from "../../../_components/ui";

type FieldKey =
	| "name"
	| "email"
	| "block"
	| "unit"
	| "cpf"
	| "residentType"
	| "role"
	| "payer";

const FIELDS: {
	key: FieldKey;
	label: string;
	required?: boolean;
	hint?: string;
	synonyms: string[];
}[] = [
	{
		key: "name",
		label: "Nome",
		required: true,
		synonyms: ["nome", "name", "morador", "nome completo"],
	},
	{
		key: "email",
		label: "Email",
		required: true,
		synonyms: ["email", "e-mail", "e mail"],
	},
	{
		key: "unit",
		label: "Unidade",
		required: true,
		synonyms: ["unidade", "apto", "apartamento", "ap", "unit", "numero"],
	},
	{ key: "block", label: "Bloco", synonyms: ["bloco", "torre", "block"] },
	{
		key: "cpf",
		label: "CPF",
		hint: "Obrigatório para quem paga",
		synonyms: ["cpf", "documento"],
	},
	{
		key: "payer",
		label: "Responsável pelo pagamento",
		hint: "sim / não",
		synonyms: [
			"responsavel",
			"responsavel financeiro",
			"pagador",
			"paga",
			"responsavel pelo pagamento",
		],
	},
	{
		key: "residentType",
		label: "Tipo",
		hint: "proprietário / inquilino / dependente",
		synonyms: ["tipo", "vinculo", "relacao"],
	},
	{
		key: "role",
		label: "Papel",
		hint: "morador / síndico",
		synonyms: ["papel", "funcao", "cargo"],
	},
];

type Mapping = Record<FieldKey, number | null>;
type Preview = RouterOutputs["condominium"]["previewImport"];

const STATUS: Record<Preview[number]["status"], { label: string; tone: Tone }> =
	{
		create: { label: "Novo", tone: "success" },
		existing_user: { label: "Já tem conta", tone: "info" },
		skip: { label: "Ignorado", tone: "neutral" },
		error: { label: "Erro", tone: "danger" },
	};

function downloadTemplate() {
	downloadCsv("modelo-moradores.csv", [
		"Nome;Email;Bloco;Unidade;CPF;Responsável pelo pagamento;Tipo;Papel",
		"Maria Silva;maria@exemplo.com;A;101;123.456.789-09;sim;proprietário;morador",
		"João Souza;joao@exemplo.com;A;101;;não;dependente;morador",
	]);
}

export function ImportPeople({
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
	const [createMissingUnits, setCreateMissingUnits] = useState(true);
	const [sendInvites, setSendInvites] = useState(true);

	const preview = api.condominium.previewImport.useMutation({
		onSuccess: () => setStep("preview"),
	});
	const importPeople = api.condominium.importPeople.useMutation({
		onSuccess: () => {
			setStep("done");
			return Promise.all([
				utils.condominium.get.invalidate({ id: condominiumId }),
				utils.administradora.overview.invalidate(),
			]);
		},
	});

	async function onFile(event: ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;
		setReadError(null);
		try {
			const data = await readSpreadsheet(file);
			const [head, ...body] = data;
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

	function mappedRows() {
		return rows.map((row) => {
			const pick = (key: FieldKey) => {
				const index = mapping[key];
				return index === null ? "" : (row[index] ?? "");
			};
			return {
				name: pick("name"),
				email: pick("email"),
				block: pick("block"),
				unit: pick("unit"),
				cpf: pick("cpf"),
				residentType: pick("residentType"),
				role: pick("role"),
				payer: pick("payer"),
			};
		});
	}

	if (step === "file") {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">
					Envie uma planilha .csv ou .xlsx com uma linha por pessoa. Você vai
					escolher as colunas e conferir tudo antes de importar.
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
					coluna da planilha corresponde a cada informação.
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
				</div>
				<div className="space-y-2 rounded-lg border p-3">
					<label
						htmlFor="import-create-units"
						className="flex items-center gap-3 text-sm"
					>
						<Checkbox
							id="import-create-units"
							checked={createMissingUnits}
							onCheckedChange={(c) => setCreateMissingUnits(c === true)}
						/>
						Criar unidades que ainda não existem
					</label>
					<label
						htmlFor="import-send-invites"
						className="flex items-center gap-3 text-sm"
					>
						<Checkbox
							id="import-send-invites"
							checked={sendInvites}
							onCheckedChange={(c) => setSendInvites(c === true)}
						/>
						Enviar convite por email para as pessoas importadas
					</label>
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
						onClick={() =>
							preview.mutate({
								condominiumId,
								createMissingUnits,
								rows: mappedRows(),
							})
						}
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
		const count = (status: Preview[number]["status"]) =>
			results.filter((r) => r.status === status).length;
		const importable = count("create") + count("existing_user");
		const sorted = [...results].sort(
			(a, b) =>
				Number(b.status === "error") - Number(a.status === "error") ||
				a.line - b.line,
		);

		return (
			<div className="space-y-4">
				<div className="flex flex-wrap gap-2">
					<Badge tone="success">{count("create")} novos</Badge>
					<Badge tone="info">{count("existing_user")} já têm conta</Badge>
					<Badge>{count("skip")} ignorados</Badge>
					<Badge tone="danger">{count("error")} com erro</Badge>
				</div>
				{count("error") > 0 && (
					<p className="text-muted-foreground text-sm">
						Linhas com erro não serão importadas. Corrija a planilha e envie de
						novo, ou importe só as linhas válidas.
					</p>
				)}
				<div className="max-h-[28rem] overflow-auto rounded-lg border">
					<Table>
						<TableHeader className="sticky top-0 bg-card">
							<TableRow>
								<TableHead>Linha</TableHead>
								<TableHead>Pessoa</TableHead>
								<TableHead>Unidade</TableHead>
								<TableHead>CPF</TableHead>
								<TableHead>Situação</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sorted.map((row) => (
								<TableRow key={row.line}>
									<TableCell className="text-muted-foreground">
										{row.line}
									</TableCell>
									<TableCell>
										<div className="font-medium">{row.data.name || "—"}</div>
										<div className="text-muted-foreground text-xs">
											{row.data.email || "—"}
										</div>
										<div className="mt-1 flex flex-wrap gap-1">
											{row.data.role === "sindico" && (
												<Badge tone="info">Síndico</Badge>
											)}
											{row.data.payer && (
												<Badge tone="success">Paga a unidade</Badge>
											)}
										</div>
									</TableCell>
									<TableCell>
										{row.data.role === "sindico"
											? "—"
											: [row.data.block, row.data.unit]
													.filter(Boolean)
													.join(" · ") || "—"}
									</TableCell>
									<TableCell className="text-muted-foreground">
										{row.data.cpfMasked ?? "—"}
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
				<ErrorMessage message={errorMessage(importPeople.error)} />
				<div className="flex flex-wrap gap-2">
					<ConfirmButton
						variant="default"
						size="lg"
						disabled={importable === 0}
						title={`Importar ${importable} pessoa(s)?`}
						description={
							sendInvites
								? "Cada pessoa recebe um convite por email para acessar o Quartier Flow."
								: "Os convites por email não serão enviados."
						}
						confirmLabel="Importar"
						pending={importPeople.isPending}
						onConfirm={() =>
							importPeople.mutate({
								condominiumId,
								createMissingUnits,
								sendInvites,
								rows: mappedRows(),
							})
						}
					>
						<Upload aria-hidden /> Importar {importable} pessoa(s)
					</ConfirmButton>
					<Button variant="ghost" onClick={() => setStep("map")}>
						<ArrowLeft aria-hidden /> Ajustar colunas
					</Button>
				</div>
			</div>
		);
	}

	const result = importPeople.data;
	return (
		<div className="space-y-4">
			<div
				aria-live="polite"
				className="rounded-lg border border-success/40 bg-success/10 p-4 text-success-foreground"
			>
				<p className="font-medium">Importação concluída.</p>
				<p className="text-sm">
					{result?.imported ?? 0} importada(s) · {result?.skipped ?? 0} já
					cadastrada(s) · {result?.invalid ?? 0} com erro ·{" "}
					{result?.unitsCreated ?? 0} unidade(s) criada(s)
				</p>
			</div>
			{result && result.failures.length > 0 && (
				<ul className="list-inside list-disc text-destructive text-sm">
					{result.failures.map((f) => (
						<li key={f.line}>
							Linha {f.line}: {f.message}
						</li>
					))}
				</ul>
			)}
			<Button onClick={onDone}>Concluir</Button>
		</div>
	);
}
