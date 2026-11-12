import { Card, Container, Section, SectionHeader } from "./ui";

/**
 * What already works in the product, each with a link to its help article
 * (public, with recorded walkthroughs). Keep in sync with docs/features:
 * only list modules that are implemented; mark the latest ones as new.
 */
const AVAILABLE = [
	{
		title: "Inadimplência e acordos",
		isNew: true,
		description:
			"Veja quem está em atraso, negocie acordos em parcelas que entram na cobrança mensal, perdoe cobranças com motivo registrado e configure lembretes automáticos.",
		help: "inadimplencia-e-acordos",
	},
	{
		title: "Reservas de áreas comuns",
		isNew: true,
		description:
			"Salão de festas, churrasqueira, quadra: regras por área, calendário para o morador, aprovação do síndico e taxa na cobrança do mês.",
		help: "reservas-de-areas-comuns",
	},
	{
		title: "Cobrança mensal com boleto e Pix",
		isNew: false,
		description:
			"Itens por unidade, auditoria antes do envio ou envio automático. O pagamento cai direto na conta da administradora.",
		help: "enviar-cobrancas-do-mes",
	},
	{
		title: "Acompanhamento de pagamentos",
		isNew: false,
		description:
			"Recebido, a receber e vencido por mês, atualizado sozinho quando o morador paga.",
		help: "acompanhar-pagamentos",
	},
	{
		title: "Despesas e notas fiscais",
		isNew: false,
		description:
			"Registre as despesas com a foto da nota para a prestação de contas.",
		help: "despesas-e-notas",
	},
	{
		title: "Área do morador",
		isNew: false,
		description:
			"O morador paga pelo app, vê os itens de cada cobrança, acompanha o acordo e reserva as áreas comuns.",
		help: "pagar-cobrancas",
	},
];

export function AvailableNow() {
	return (
		<Section id="disponivel">
			<Container size="xl">
				<SectionHeader
					title="Já Disponível"
					subtitle="O que administradoras, síndicos e moradores já usam no Quartier Flow"
				/>
				<div className="grid gap-2 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
					{AVAILABLE.map((item) => (
						<Card key={item.title} className="flex flex-col p-2 md:p-8">
							<div className="mb-2 flex flex-wrap items-center gap-2 md:mb-3">
								<h3 className="font-bold text-base md:text-xl">{item.title}</h3>
								{item.isNew && (
									<span className="border border-white px-1.5 py-0.5 font-bold text-white text-xs">
										NOVO
									</span>
								)}
							</div>
							<p className="mb-4 flex-1 text-gray-400 text-sm md:text-base">
								{item.description}
							</p>
							<a
								href={`/ajuda/${item.help}`}
								className="text-sm text-white underline underline-offset-4 hover:text-gray-300"
							>
								Ver como funciona →
							</a>
						</Card>
					))}
				</div>
			</Container>
		</Section>
	);
}
