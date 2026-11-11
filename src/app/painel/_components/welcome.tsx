import { ArrowRight, Building2, FileText, Home, Mail } from "lucide-react";

import { formatBRL } from "~/lib/br";
import { Card, PageTitle } from "./ui";

/**
 * First visit of an account with no role (open sign-up, docs/features/01):
 * explain the two ways in and start the administradora onboarding.
 */
export function Welcome({
	firstName,
	email,
	closedAdministradora,
}: {
	firstName: string;
	email: string;
	closedAdministradora?: string | null;
}) {
	return (
		<div className="space-y-6">
			<PageTitle
				title={firstName ? `Boas-vindas, ${firstName}!` : "Boas-vindas!"}
				subtitle="O Quartier Flow reúne a gestão do condomínio, as cobranças e a comunicação com os moradores. Como você vai usar?"
			/>
			<div className="grid gap-4 md:grid-cols-2">
				<Card
					title={
						<span className="flex items-center gap-2">
							<Building2 className="size-5" aria-hidden /> Administro
							condomínios
						</span>
					}
					description="Para administradoras e síndicos profissionais."
				>
					<div className="space-y-4">
						<ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
							<li>Cadastre sua administradora e escolha um plano.</li>
							<li>
								Leia os Termos de Uso e as regras de cobrança antes de assinar.
							</li>
							<li>Depois, configure condomínios, moradores e cobranças.</li>
						</ul>
						<a
							href="/painel/comecar"
							className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
						>
							{closedAdministradora
								? `Reabrir ${closedAdministradora}`
								: "Cadastrar minha administradora"}
							<ArrowRight className="size-4" aria-hidden />
						</a>
					</div>
				</Card>
				<Card
					title={
						<span className="flex items-center gap-2">
							<Home className="size-5" aria-hidden /> Moro ou sou síndico
						</span>
					}
					description="Moradores e síndicos entram por convite."
				>
					<div className="space-y-3 text-sm">
						<p className="text-muted-foreground">
							Peça à administradora ou ao síndico do seu condomínio um convite
							para este email:
						</p>
						<p className="flex items-center gap-2 rounded-md bg-muted p-3 font-medium">
							<Mail className="size-4 shrink-0" aria-hidden />
							<span className="truncate">{email}</span>
						</p>
						<p className="text-muted-foreground">
							Assim que o convite for feito, suas cobranças e o seu condomínio
							aparecem aqui automaticamente.
						</p>
					</div>
				</Card>
			</div>
		</div>
	);
}

/** Admin registered an administradora but hasn't signed a plan yet. */
export function FinishSignupCard() {
	return (
		<Card
			title="Conclua o cadastro da administradora"
			description="Falta escolher o plano e aceitar os Termos de Uso. Nada é cobrado antes disso."
		>
			<a
				href="/painel/comecar"
				className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
			>
				Continuar cadastro <ArrowRight className="size-4" aria-hidden />
			</a>
		</Card>
	);
}

/** Residents and síndicos who don't manage condominiums (yet, or anymore). */
export function BecomeAdminCard({
	closedAdministradora,
}: {
	closedAdministradora?: string | null;
}) {
	return (
		<Card
			title={
				closedAdministradora
					? `${closedAdministradora} está encerrada`
					: "Administra condomínios?"
			}
			description={
				closedAdministradora
					? "Os condomínios ficam disponíveis só para consulta. Para voltar a gerenciar, reabra a administradora assinando um plano e os Termos de Uso novamente."
					: "Cadastre sua administradora para gerenciar condomínios, moradores e cobranças."
			}
		>
			<a
				href="/painel/comecar"
				className="inline-flex h-11 items-center gap-2 rounded-md border px-5 font-medium hover:bg-muted"
			>
				{closedAdministradora
					? "Reabrir administradora"
					: "Cadastrar administradora"}
				<ArrowRight className="size-4" aria-hidden />
			</a>
		</Card>
	);
}

/** Quartier Flow invoices still to pay; stays after closing (docs/features/18). */
export function OpenInvoicesCard({
	count,
	totalCents,
	overdue,
}: {
	count: number;
	totalCents: number;
	overdue: boolean;
}) {
	return (
		<div
			className={
				overdue
					? "flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4"
					: "flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/50 p-4"
			}
		>
			<div className="space-y-0.5">
				<p className="flex items-center gap-2 font-medium">
					<FileText className="size-4" aria-hidden />
					{overdue
						? "Fatura do Quartier Flow vencida"
						: count === 1
							? "Fatura do Quartier Flow em aberto"
							: `${count} faturas do Quartier Flow em aberto`}
				</p>
				<p className="text-muted-foreground text-sm">
					Total de {formatBRL(totalCents)}. Pague com boleto ou Pix.
				</p>
			</div>
			<a
				href="/painel/faturas"
				className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/90"
			>
				Ver faturas <ArrowRight className="size-4" aria-hidden />
			</a>
		</div>
	);
}
