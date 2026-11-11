"use client";

import { ArrowLeft, Check, Info } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { formatBRL, formatDate } from "~/lib/br";
import { api } from "~/trpc/react";
import {
	Button,
	Card,
	ErrorMessage,
	Field,
	Input,
	Loading,
	PageTitle,
	errorMessage,
} from "../../_components/ui";

function Point({ title, children }: { title: string; children: ReactNode }) {
	return (
		<li className="flex gap-3">
			<Info
				className="mt-0.5 size-5 shrink-0 text-muted-foreground"
				aria-hidden
			/>
			<div className="space-y-0.5">
				<p className="font-medium">{title}</p>
				<p className="text-muted-foreground text-sm">{children}</p>
			</div>
		</li>
	);
}

/**
 * Closing the administradora (docs/features/19): says exactly what happens,
 * then asks for the company name to confirm.
 */
export default function EncerrarPage() {
	const preview = api.administradora.closePreview.useQuery();
	const close = api.administradora.close.useMutation({
		// Full reload: the menu and roles change completely.
		onSuccess: () => window.location.assign("/painel"),
	});
	const [name, setName] = useState("");

	if (preview.isLoading || !preview.data) return <Loading />;
	const data = preview.data;
	const matches =
		name.trim().toLocaleLowerCase("pt-BR") ===
		data.name.trim().toLocaleLowerCase("pt-BR");
	const invoice = data.finalInvoice;

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (matches) close.mutate({ confirmName: name });
	}

	return (
		<div className="space-y-6">
			<a
				href="/painel/plano"
				className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden /> Voltar para Plano
			</a>
			<PageTitle
				title="Encerrar administradora"
				subtitle={`Leia com atenção o que acontece ao encerrar ${data.name}.`}
			/>

			<Card title="O que acontece ao encerrar">
				<ul className="space-y-4">
					<Point title="A gestão termina agora">
						Você deixa de administrar {data.name}: não é mais possível criar
						condomínios, enviar cobranças, convidar pessoas ou alterar
						cadastros. Seu acesso volta a ser o de morador ou síndico, se você
						tiver esses papéis.
					</Point>
					<Point title="Última fatura do Quartier Flow">
						{invoice ? (
							invoice.waived ? (
								<>
									Os dias usados neste mês ({invoice.billedDays} de{" "}
									{invoice.daysInMonth}) somam menos que o mínimo de cobrança
									(R$ 5,00): não haverá fatura final.
								</>
							) : (
								<>
									Pelos dias usados neste mês ({invoice.billedDays} de{" "}
									{invoice.daysInMonth}), com {invoice.residentSeats} moradores
									e {invoice.sindicoSeats} síndicos ativos hoje: cerca de{" "}
									<strong className="text-foreground">
										{formatBRL(invoice.totalCents)}
									</strong>
									, emitida no dia 1º e com vencimento em{" "}
									{formatDate(invoice.dueDate)}. Depois dela, não há novas
									faturas.
								</>
							)
						) : (
							"Não há valor a cobrar por este mês."
						)}{" "}
						Faturas em aberto continuam disponíveis para pagamento em “Faturas
						do Quartier Flow”, que segue no seu menu.
					</Point>
					<Point title="Cobranças dos moradores">
						{data.openCharges.count > 0 ? (
							<>
								{data.openCharges.count} cobranças em aberto (
								{formatBRL(data.openCharges.totalCents)}) continuam valendo: os
								moradores podem pagá-las e o valor segue para a conta Asaas da
								administradora.
							</>
						) : (
							"Não há cobranças em aberto."
						)}{" "}
						A cobrança automática mensal é desligada, e preparações ainda não
						enviadas são descartadas.
					</Point>
					<Point title="Condomínios ficam só para consulta">
						{data.condominiums} condomínio
						{data.condominiums === 1 ? "" : "s"}: moradores, síndicos e você
						continuam vendo o histórico de cobranças e despesas, sem alterações.
					</Point>
					{data.hasPayoutAccount && (
						<Point title="Conta de recebimento no Asaas">
							A conta continua sendo da administradora. Saldos e saques são
							feitos direto no Asaas.
						</Point>
					)}
					<Point title="Dá para voltar">
						Você pode reabrir a administradora depois, em Início, escolhendo um
						plano e aceitando os Termos de Uso novamente.
					</Point>
				</ul>
			</Card>

			<Card title="Confirmar encerramento">
				<form onSubmit={submit} className="space-y-4" noValidate>
					<Field
						label={`Digite o nome da administradora (${data.name}) para confirmar`}
					>
						<Input
							value={name}
							autoComplete="off"
							onChange={(e) => setName(e.target.value)}
						/>
					</Field>
					<ErrorMessage message={errorMessage(close.error)} />
					<div className="flex flex-wrap items-center gap-3">
						<Button
							type="submit"
							variant="destructive"
							disabled={!matches}
							pending={close.isPending}
						>
							Encerrar administradora
						</Button>
						<a
							href="/painel/plano"
							className="inline-flex h-11 items-center px-3 font-medium text-sm hover:underline"
						>
							Cancelar
						</a>
						{matches && (
							<span className="inline-flex items-center gap-1 text-muted-foreground text-sm">
								<Check className="size-4" aria-hidden /> Nome confere
							</span>
						)}
					</div>
				</form>
			</Card>
		</div>
	);
}
