"use client";

import { FileSpreadsheet } from "lucide-react";
import { type FormEvent, useState } from "react";

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
	Badge,
	Button,
	Card,
	ConfirmButton,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	Select,
	errorMessage,
	fieldErrors,
} from "../../../_components/ui";
import { ImportPeople } from "./import-people";

type Condo = RouterOutputs["condominium"]["get"];

const RESIDENT_TYPE: Record<string, string> = {
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

function InviteForm({ condo }: { condo: Condo }) {
	const utils = api.useUtils();
	const [form, setForm] = useState(emptyForm);
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
			<div className="grid gap-4 md:grid-cols-3">
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

export function PeopleTab({ condo }: { condo: Condo }) {
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
	const unitById = new Map(condo.units.map((u) => [u.id, u]));
	const [importing, setImporting] = useState(false);

	return (
		<div className="space-y-6">
			{condo.canManage &&
				(importing ? (
					<Card
						title="Importar moradores de planilha"
						description="CSV ou XLSX: escolha as colunas, confira a prévia e confirme."
					>
						<ImportPeople
							condominiumId={condo.id}
							onDone={() => setImporting(false)}
						/>
					</Card>
				) : (
					<Card title="Convidar morador ou síndico">
						<div className="space-y-6">
							<InviteForm condo={condo} />
							<div className="flex flex-col gap-3 rounded-lg bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
								<p className="text-sm">
									Muitas pessoas? Importe todas de uma vez a partir de uma
									planilha.
								</p>
								<Button variant="outline" onClick={() => setImporting(true)}>
									<FileSpreadsheet aria-hidden /> Importar planilha
								</Button>
							</div>
						</div>
					</Card>
				))}
			<Card title={`Pessoas (${condo.memberships.length})`}>
				<div className="space-y-3">
					<ErrorMessage message={errorMessage(makePayer.error ?? end.error)} />
					{condo.memberships.length === 0 ? (
						<EmptyState title="Ninguém cadastrado ainda" />
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Nome</TableHead>
									<TableHead>Papel</TableHead>
									<TableHead>Unidade</TableHead>
									<TableHead>CPF</TableHead>
									{condo.canManage && (
										<TableHead className="text-right">Ações</TableHead>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{condo.memberships.map((m) => {
									const unit = m.unitId ? unitById.get(m.unitId) : undefined;
									return (
										<TableRow key={m.id}>
											<TableCell>
												<div className="font-medium">{m.user.name || "—"}</div>
												<div className="text-muted-foreground text-xs">
													{m.user.email}
												</div>
											</TableCell>
											<TableCell>
												{m.role === "sindico" ? (
													<Badge tone="info">Síndico</Badge>
												) : (
													<div className="flex flex-wrap gap-1">
														<Badge>
															{RESIDENT_TYPE[m.residentType ?? ""] ?? "Morador"}
														</Badge>
														{m.financiallyResponsible && (
															<Badge tone="success">Paga a unidade</Badge>
														)}
													</div>
												)}
											</TableCell>
											<TableCell>
												{unit
													? unit.block
														? `${unit.block} · ${unit.number}`
														: unit.number
													: "—"}
											</TableCell>
											<TableCell className="text-muted-foreground">
												{m.user.cpfMasked ?? "—"}
											</TableCell>
											{condo.canManage && (
												<TableCell className="text-right">
													<div className="flex justify-end gap-1">
														{m.role === "resident" &&
															!m.financiallyResponsible &&
															m.user.hasCpf && (
																<Button
																	variant="outline"
																	size="sm"
																	pending={
																		makePayer.isPending &&
																		makePayer.variables?.membershipId === m.id
																	}
																	onClick={() =>
																		makePayer.mutate({ membershipId: m.id })
																	}
																>
																	Tornar pagador
																</Button>
															)}
														<ConfirmButton
															title={`Remover ${m.user.name || m.user.email}?`}
															description="A pessoa perde o acesso a este condomínio. O histórico de cobranças é mantido."
															confirmLabel="Remover"
															pending={
																end.isPending &&
																end.variables?.membershipId === m.id
															}
															onConfirm={() =>
																end.mutate({ membershipId: m.id })
															}
														>
															Remover
														</ConfirmButton>
													</div>
												</TableCell>
											)}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</div>
			</Card>
		</div>
	);
}
