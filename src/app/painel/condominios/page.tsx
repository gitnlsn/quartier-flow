"use client";

import { Building2, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { api } from "~/trpc/react";
import {
	Badge,
	Button,
	Card,
	EmptyState,
	ErrorMessage,
	Field,
	Input,
	Loading,
	MaskedInput,
	PageTitle,
	errorMessage,
	fieldErrors,
} from "../_components/ui";

function NewCondominiumForm({ onDone }: { onDone: () => void }) {
	const router = useRouter();
	const [form, setForm] = useState({ name: "", cnpj: "", address: "" });
	const create = api.condominium.create.useMutation({
		onSuccess: (condo) => {
			router.push(`/painel/condominios/${condo.id}`);
			router.refresh(); // sidebar: switcher and modules of the new condominium
		},
	});
	const errors = fieldErrors(create.error);

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		create.mutate({
			name: form.name,
			cnpj: form.cnpj || undefined,
			address: form.address || undefined,
		});
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<div className="grid gap-4 md:grid-cols-3">
				<Field label="Nome do condomínio" error={errors.name}>
					<Input
						value={form.name}
						onChange={(e) => setForm({ ...form, name: e.target.value })}
					/>
				</Field>
				<Field label="CNPJ (opcional)" error={errors.cnpj}>
					<MaskedInput
						mask="cnpj"
						value={form.cnpj}
						placeholder="00.000.000/0000-00"
						onValueChange={(cnpj) => setForm({ ...form, cnpj })}
					/>
				</Field>
				<Field label="Endereço (opcional)" error={errors.address}>
					<Input
						value={form.address}
						onChange={(e) => setForm({ ...form, address: e.target.value })}
					/>
				</Field>
			</div>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(create.error)}
			/>
			<div className="flex gap-2">
				<Button type="submit" pending={create.isPending}>
					Criar condomínio
				</Button>
				<Button variant="ghost" onClick={onDone}>
					Cancelar
				</Button>
			</div>
		</form>
	);
}

export default function CondominiosPage() {
	const [creating, setCreating] = useState(false);
	const condos = api.condominium.list.useQuery();
	const access = api.portal.access.useQuery();
	const isAdmin = access.data?.isAdmin ?? false;

	return (
		<div className="space-y-6">
			<PageTitle
				title={isAdmin ? "Condomínios" : "Meus condomínios"}
				actions={
					isAdmin &&
					!creating && (
						<Button onClick={() => setCreating(true)}>
							<Plus aria-hidden /> Novo condomínio
						</Button>
					)
				}
			/>
			{creating && (
				<Card title="Novo condomínio">
					<NewCondominiumForm onDone={() => setCreating(false)} />
				</Card>
			)}
			{condos.isLoading ? (
				<Loading />
			) : condos.data?.length === 0 ? (
				<EmptyState title="Nenhum condomínio ainda">
					{isAdmin
						? "Crie o primeiro para cadastrar unidades e moradores."
						: "Você ainda não é síndico de nenhum condomínio."}
				</EmptyState>
			) : (
				<ul className="grid gap-3 md:grid-cols-2">
					{condos.data?.map((condo) => (
						<li key={condo.id}>
							<a
								href={`/painel/condominios/${condo.id}`}
								className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted"
							>
								<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
									<Building2 className="size-5" aria-hidden />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block truncate font-semibold">
										{condo.name}
									</span>
									<span className="block text-muted-foreground text-sm">
										{condo._count.units} unidades · {condo._count.memberships}{" "}
										pessoas
									</span>
									<span className="mt-1 block">
										<Badge
											tone={
												condo.billingConfig?.enabled ? "success" : "neutral"
											}
										>
											{condo.billingConfig?.enabled
												? `Cobrança ${condo.billingConfig.mode === "automatic" ? "automática" : "manual"}`
												: "Cobrança desativada"}
										</Badge>
									</span>
								</span>
								<ChevronRight
									className="size-5 text-muted-foreground"
									aria-hidden
								/>
							</a>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
