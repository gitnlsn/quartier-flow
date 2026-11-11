"use client";

import { Pencil } from "lucide-react";
import { type FormEvent, useState } from "react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "~/components/ui/table";
import { formatBRL, parseBRLToCents } from "~/lib/br";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Button,
	Card,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";

type Condo = RouterOutputs["condominium"]["get"];
type Unit = Condo["units"][number];

const unitLabel = (unit: Pick<Unit, "block" | "number">) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;

function AddUnitsForm({ condominiumId }: { condominiumId: string }) {
	const utils = api.useUtils();
	const [block, setBlock] = useState("");
	const [numbers, setNumbers] = useState("");
	const add = api.condominium.addUnits.useMutation({
		onSuccess: () => {
			setNumbers("");
			return utils.condominium.get.invalidate({ id: condominiumId });
		},
	});
	const errors = fieldErrors(add.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		add.mutate({ condominiumId, block, numbers });
	}

	return (
		<form onSubmit={submit} className="space-y-3" noValidate>
			<div className="grid gap-3 md:grid-cols-[1fr_3fr_auto] md:items-start">
				<Field label="Bloco (opcional)" error={errors.block}>
					<Input value={block} onChange={(e) => setBlock(e.target.value)} />
				</Field>
				<Field
					label="Unidades"
					hint='Separe por vírgula ou use intervalos: "101, 102, 201-204"'
					error={errors.numbers}
				>
					<Input value={numbers} onChange={(e) => setNumbers(e.target.value)} />
				</Field>
				<Button type="submit" pending={add.isPending} className="md:mt-6">
					Adicionar
				</Button>
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(add.error)}
			/>
			{add.data && (
				<p aria-live="polite" className="text-sm text-success-foreground">
					{add.data.created} unidade(s) adicionada(s). Unidades repetidas são
					ignoradas.
				</p>
			)}
		</form>
	);
}

function UnitAmount({
	canManage,
	unit,
	defaultCents,
	condominiumId,
}: {
	canManage: boolean;
	unit: Unit;
	defaultCents: number | null;
	condominiumId: string;
}) {
	const utils = api.useUtils();
	const [editing, setEditing] = useState(false);
	const [value, setValue] = useState(
		unit.monthlyAmountCents !== null
			? (unit.monthlyAmountCents / 100).toFixed(2).replace(".", ",")
			: "",
	);
	const [invalid, setInvalid] = useState(false);
	const save = api.condominium.setUnitAmount.useMutation({
		onSuccess: () => {
			setEditing(false);
			return utils.condominium.get.invalidate({ id: condominiumId });
		},
	});

	const display =
		unit.monthlyAmountCents !== null ? (
			formatBRL(unit.monthlyAmountCents)
		) : defaultCents !== null ? (
			<span className="text-muted-foreground">
				{formatBRL(defaultCents)} (padrão)
			</span>
		) : (
			<span className="text-muted-foreground">Padrão do condomínio</span>
		);

	if (!editing) {
		return (
			<div className="flex items-center gap-1">
				<span>{display}</span>
				{canManage && (
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label={`Alterar valor da unidade ${unitLabel(unit)}`}
						onClick={() => setEditing(true)}
					>
						<Pencil aria-hidden />
					</Button>
				)}
			</div>
		);
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (value.trim() === "") {
			save.mutate({ unitId: unit.id, amountCents: null });
			return;
		}
		const cents = parseBRLToCents(value);
		setInvalid(cents === null);
		if (cents !== null) save.mutate({ unitId: unit.id, amountCents: cents });
	}

	return (
		<form onSubmit={submit} className="flex flex-wrap items-center gap-2">
			<Input
				aria-label={`Valor da unidade ${unitLabel(unit)}`}
				className="h-9 w-32"
				value={value}
				placeholder="Padrão"
				onChange={(e) => setValue(e.target.value)}
				autoFocus
			/>
			<Button type="submit" size="sm" pending={save.isPending}>
				Salvar
			</Button>
			<Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
				Cancelar
			</Button>
			{invalid && (
				<span role="alert" className="text-destructive text-sm">
					Valor inválido
				</span>
			)}
		</form>
	);
}

export function UnitsTab({ condo }: { condo: Condo }) {
	const defaultCents = condo.billingConfig?.defaultAmountCents ?? null;
	const payerByUnit = new Map(
		condo.memberships
			.filter((m) => m.financiallyResponsible && m.unitId)
			.map((m) => [m.unitId, m.user]),
	);

	return (
		<div className="space-y-6">
			{condo.canManage && (
				<Card title="Adicionar unidades">
					<AddUnitsForm condominiumId={condo.id} />
				</Card>
			)}
			<Card
				title={`Unidades (${condo.units.length})`}
				description={
					condo.canManage
						? "Sem valor próprio, a unidade usa o valor padrão da aba Cobrança."
						: undefined
				}
			>
				{condo.units.length === 0 ? (
					<EmptyState title="Nenhuma unidade cadastrada" />
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Unidade</TableHead>
								<TableHead>Responsável pelo pagamento</TableHead>
								<TableHead>Valor mensal</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{condo.units.map((unit) => {
								const payer = payerByUnit.get(unit.id);
								return (
									<TableRow key={unit.id}>
										<TableCell className="font-medium">
											{unitLabel(unit)}
										</TableCell>
										<TableCell>
											{payer ? (
												payer.name || payer.email
											) : (
												<span className="text-muted-foreground">
													Não definido
												</span>
											)}
										</TableCell>
										<TableCell>
											<UnitAmount
												canManage={condo.canManage}
												unit={unit}
												defaultCents={defaultCents}
												condominiumId={condo.id}
											/>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</Card>
		</div>
	);
}
