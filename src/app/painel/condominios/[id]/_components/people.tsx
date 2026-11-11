"use client";

import { FileSpreadsheet, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";

import { Checkbox } from "~/components/ui/checkbox";
import { type RouterOutputs, api } from "~/trpc/react";
import {
	Badge,
	Button,
	ConfirmButton,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	Modal,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";
import { ImportPeople } from "./import-people";

type Condo = RouterOutputs["condominium"]["get"];

export const RESIDENT_TYPE: Record<string, string> = {
	owner: "Proprietário",
	tenant: "Inquilino",
	dependent: "Dependente",
};

const emptyForm = {
	role: "resident" as "resident" | "sindico",
	unitId: "",
	residentType: "owner" as "owner" | "tenant" | "dependent",
	financiallyResponsible: false,
	name: "",
	email: "",
	cpf: "",
};

/**
 * Invite a resident or síndico. With `defaultUnitId` (opened from a unit) the
 * unit is fixed and the person is always a resident of it.
 */
export function InviteForm({
	condo,
	defaultUnitId,
}: {
	condo: Condo;
	defaultUnitId?: string;
}) {
	const utils = api.useUtils();
	const [form, setForm] = useState({
		...emptyForm,
		unitId: defaultUnitId ?? "",
	});
	const invite = api.condominium.invitePerson.useMutation({
		onSuccess: () => {
			setForm({ ...emptyForm, role: form.role, unitId: form.unitId });
			return Promise.all([
				utils.condominium.get.invalidate({ id: condo.id }),
				utils.administradora.overview.invalidate(),
			]);
		},
	});
	const errors = fieldErrors(invite.error);
	const isResident = form.role === "resident";
	const lockedUnit = defaultUnitId
		? condo.units.find((u) => u.id === defaultUnitId)
		: undefined;

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		invite.mutate({
			condominiumId: condo.id,
			role: form.role,
			unitId: isResident ? form.unitId || undefined : undefined,
			residentType: isResident ? form.residentType : undefined,
			financiallyResponsible: isResident && form.financiallyResponsible,
			name: form.name,
			email: form.email,
			cpf: form.cpf || undefined,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			{lockedUnit && (
				<p className="text-sm">
					Novo morador da{" "}
					<strong>
						unidade{" "}
						{lockedUnit.block
							? `${lockedUnit.block} · ${lockedUnit.number}`
							: lockedUnit.number}
					</strong>
				</p>
			)}
			<div
				className={`grid gap-4 ${lockedUnit ? "md:grid-cols-2" : "md:grid-cols-3"}`}
			>
				{!lockedUnit && (
					<Field label="Papel" error={errors.role}>
						<Select
							value={form.role}
							onChange={(e) =>
								setForm({
									...form,
									role: e.target.value as "resident" | "sindico",
								})
							}
						>
							<option value="resident">Morador</option>
							<option value="sindico">Síndico</option>
						</Select>
					</Field>
				)}
				<Field label="Nome" error={errors.name}>
					<Input
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
					/>
				</Field>
				<Field label="Email" error={errors.email}>
					<Input
						type="email"
						value={form.email}
						onChange={(e) => setForm({ ...form, email: e.target.value })}
					/>
				</Field>
				{isResident && (
					<>
						{!lockedUnit && (
							<Field label="Unidade" error={errors.unitId}>
								<Select
									value={form.unitId}
									onChange={(e) => setForm({ ...form, unitId: e.target.value })}
								>
									<option value="">Selecione</option>
									{condo.units.map((unit) => (
										<option key={unit.id} value={unit.id}>
											{unit.block
												? `${unit.block} · ${unit.number}`
												: unit.number}
										</option>
									))}
								</Select>
							</Field>
						)}
						<Field label="Tipo" error={errors.residentType}>
							<Select
								value={form.residentType}
								onChange={(e) =>
									setForm({
										...form,
										residentType: e.target.value as typeof form.residentType,
									})
								}
							>
								<option value="owner">Proprietário</option>
								<option value="tenant">Inquilino</option>
								<option value="dependent">Dependente</option>
							</Select>
						</Field>
						<Field
							label="CPF"
							hint="Obrigatório para quem paga a unidade (exigido para emitir boletos)."
							error={errors.cpf}
						>
							<Input
								value={form.cpf}
								inputMode="numeric"
								onChange={(e) => setForm({ ...form, cpf: e.target.value })}
							/>
						</Field>
					</>
				)}
			</div>
			{isResident && (
				<label
					htmlFor="invite-payer"
					className="flex items-center gap-3 rounded-lg border p-3"
				>
					<Checkbox
						id="invite-payer"
						checked={form.financiallyResponsible}
						onCheckedChange={(checked) =>
							setForm({ ...form, financiallyResponsible: checked === true })
						}
					/>
					<span>
						<span className="block font-medium text-sm">
							Responsável pelo pagamento da unidade
						</span>
						<span className="block text-muted-foreground text-xs">
							Recebe a cobrança mensal.
						</span>
					</span>
				</label>
			)}
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(invite.error)}
			/>
			<div className="flex items-center gap-3">
				<Button type="submit" pending={invite.isPending}>
					Convidar
				</Button>
				{invite.isSuccess && (
					<span aria-live="polite" className="text-sm text-success-foreground">
						Convite enviado por email.
					</span>
				)}
			</div>
		</form>
	);
}

type Member = Condo["memberships"][number];

/** Per-person actions: make payer of the unit, remove from the condominium. */
export function MemberActions({
	condo,
	member,
}: {
	condo: Condo;
	member: Member;
}) {
	const utils = api.useUtils();
	const refresh = () =>
		Promise.all([
			utils.condominium.get.invalidate({ id: condo.id }),
			utils.administradora.overview.invalidate(),
		]);
	const makePayer = api.condominium.setFinanciallyResponsible.useMutation({
		onSuccess: refresh,
	});
	const end = api.condominium.endMembership.useMutation({ onSuccess: refresh });
	if (!condo.canManage) return null;

	return (
		<div className="space-y-1">
			<div className="flex flex-wrap justify-end gap-1">
				{member.role === "resident" &&
					!member.financiallyResponsible &&
					member.user.hasCpf && (
						<Button
							variant="outline"
							size="sm"
							pending={makePayer.isPending}
							onClick={() => makePayer.mutate({ membershipId: member.id })}
						>
							Tornar pagador
						</Button>
					)}
				<ConfirmButton
					title={`Remover ${member.user.name || member.user.email}?`}
					description="A pessoa perde o acesso a este condomínio. O histórico de cobranças é mantido."
					confirmLabel="Remover"
					pending={end.isPending}
					onConfirm={() => end.mutate({ membershipId: member.id })}
				>
					Remover
				</ConfirmButton>
			</div>
			<ErrorMessage message={errorMessage(makePayer.error ?? end.error)} />
		</div>
	);
}
