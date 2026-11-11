"use client";

import { type FormEvent, useState } from "react";

import type { Recurrence } from "~/lib/billing-items";
import { parseBRLToCents } from "~/lib/br";
import {
	Button,
	ErrorMessage,
	Field,
	Input,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";

export type ItemValues = {
	name: string;
	description: string | null;
	amountCents: number;
	recurrence: Recurrence;
	startPeriod: string;
	installments: number | null;
};

export const currentPeriod = () => {
	const now = new Date();
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const toInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** Form for a billing item (shared or individual): name, amount and schedule. */
export function ItemForm({
	initial,
	submitLabel,
	pending,
	error,
	onSubmit,
	onCancel,
}: {
	/** Saved item or partial defaults (recurrence as stored: string). */
	initial?: Partial<Omit<ItemValues, "recurrence"> & { recurrence: string }>;
	submitLabel: string;
	pending: boolean;
	error: unknown;
	onSubmit: (values: ItemValues) => void;
	onCancel?: () => void;
}) {
	const [form, setForm] = useState({
		name: initial?.name ?? "",
		description: initial?.description ?? "",
		amount: initial?.amountCents ? toInput(initial.amountCents) : "",
		recurrence: (initial?.recurrence ?? "monthly") as Recurrence,
		startPeriod: initial?.startPeriod ?? currentPeriod(),
		installments: String(initial?.installments ?? 6),
	});
	const [amountError, setAmountError] = useState<string>();
	const errors = fieldErrors(error);
	const key = (name: string) => errors[`item.${name}`] ?? errors[name];

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const cents = parseBRLToCents(form.amount);
		setAmountError(cents === null || cents <= 0 ? "Valor inválido" : undefined);
		if (cents === null || cents <= 0) return;
		onSubmit({
			name: form.name,
			description: form.description || null,
			amountCents: cents,
			recurrence: form.recurrence,
			startPeriod: form.startPeriod,
			installments:
				form.recurrence === "installments" ? Number(form.installments) : null,
		});
	}

	const startLabel =
		form.recurrence === "once"
			? "Mês da cobrança"
			: form.recurrence === "installments"
				? "Primeira parcela em"
				: "Cobrar a partir de";

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<div className="grid gap-4 md:grid-cols-2">
				<Field label="Nome do item" error={key("name")}>
					<Input
						value={form.name}
						placeholder="Ex.: Taxa condominial, Consumo de gás"
						onChange={(e) => setForm({ ...form, name: e.target.value })}
					/>
				</Field>
				<Field label="Valor (R$)" error={amountError ?? key("amountCents")}>
					<Input
						value={form.amount}
						inputMode="decimal"
						placeholder="850,00"
						onChange={(e) => setForm({ ...form, amount: e.target.value })}
					/>
				</Field>
				<div className="md:col-span-2">
					<Field
						label="Descrição (opcional)"
						hint="Aparece para o morador no detalhamento da cobrança."
						error={key("description")}
					>
						<Input
							value={form.description}
							placeholder="Ex.: Obra da fachada aprovada em assembleia"
							onChange={(e) =>
								setForm({ ...form, description: e.target.value })
							}
						/>
					</Field>
				</div>
				<Field label="Frequência" error={key("recurrence")}>
					<Select
						value={form.recurrence}
						onChange={(e) =>
							setForm({ ...form, recurrence: e.target.value as Recurrence })
						}
					>
						<option value="monthly">Todo mês</option>
						<option value="installments">Parcelado (N meses)</option>
						<option value="once">Uma vez</option>
					</Select>
				</Field>
				<Field label={startLabel} error={key("startPeriod")}>
					<Input
						type="month"
						value={form.startPeriod}
						onChange={(e) => setForm({ ...form, startPeriod: e.target.value })}
					/>
				</Field>
				{form.recurrence === "installments" && (
					<Field
						label="Número de parcelas"
						hint="2 a 120"
						error={key("installments")}
					>
						<Input
							type="number"
							min={2}
							max={120}
							value={form.installments}
							onChange={(e) =>
								setForm({ ...form, installments: e.target.value })
							}
						/>
					</Field>
				)}
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(error)}
			/>
			<div className="flex gap-2">
				<Button type="submit" pending={pending}>
					{submitLabel}
				</Button>
				{onCancel && (
					<Button variant="ghost" onClick={onCancel}>
						Cancelar
					</Button>
				)}
			</div>
		</form>
	);
}
