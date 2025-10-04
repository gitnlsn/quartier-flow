"use client";

import { useState } from "react";

interface Challenge {
	challenge: string;
	solution: string;
	benefit: string;
}

interface Pillar {
	id: string;
	title: string;
	icon: string;
	description: string;
	challenges: Challenge[];
}

const pillars: Pillar[] = [
	{
		id: "financial",
		title: "Gestão Financeira e Inadimplência",
		icon: "💰",
		description:
			"Recursos para transparência e cobrança eficiente que reduzem inadimplência.",
		challenges: [
			{
				challenge: "Inadimplência",
				solution:
					"Módulo de Cobrança Automatizada: Envio automático de lembretes, negociações personalizadas (com cálculo de juros e multas), e registro de histórico de pagamentos por unidade. Integração com escritórios de cobrança.",
				benefit:
					"Reduz a taxa de inadimplência e libera tempo do administrador em tarefas repetitivas de cobrança.",
			},
			{
				challenge: "Transparência e Orçamento",
				solution:
					"Prestação de Contas Digital: Lançamento e categorização de despesas e receitas em tempo real. Geração automática de balancetes, relatórios financeiros e gráficos de desempenho, acessíveis aos conselheiros e condôminos.",
				benefit:
					"Garante a transparência, facilita a auditoria e o planejamento orçamentário anual.",
			},
			{
				challenge: "Gestão de Fornecedores",
				solution:
					"Controle de Contas a Pagar/Receber: Agenda de pagamentos, anexos de notas fiscais e integração com o sistema bancário para pagamentos.",
				benefit: "Evita multas por atrasos e organiza o fluxo de caixa.",
			},
		],
	},
	{
		id: "communication",
		title: "Comunicação e Conflitos",
		icon: "👥",
		description:
			"Canais oficiais e centralizados para reduzir ruídos e mal-entendidos.",
		challenges: [
			{
				challenge: "Comunicação Ineficaz",
				solution:
					"Central de Comunicação Oficial: Mural de avisos digitais (com confirmação de leitura), envio de comunicados via e-mail/push notification, e integração com grupos internos (por bloco ou área).",
				benefit:
					"Garante que todos recebam a informação e que o administrador tenha prova de ciência dos avisos importantes.",
			},
			{
				challenge: "Mediação de Conflitos",
				solution:
					"Livro de Ocorrências Digital (e Protocolo): Um canal exclusivo para registro de reclamações e sugestões, com criação de protocolo, acompanhamento do status e direcionamento automático para o síndico/administrador.",
				benefit:
					"Profissionaliza a gestão de conflitos, evitando conversas informais e fornecendo dados para aplicação de regras.",
			},
			{
				challenge: "Organização de Eventos",
				solution:
					"Agendamento de Áreas Comuns: Sistema de reservas online para salão de festas, churrasqueira, etc., com regras de uso e pagamento de taxas integrados.",
				benefit:
					"Reduz a sobrecarga de trabalho da portaria e elimina conflitos de agendamento.",
			},
		],
	},
	{
		id: "maintenance",
		title: "Manutenção e Infraestrutura",
		icon: "🔧",
		description:
			"Hub de gestão predial para manutenção preventiva e corretiva.",
		challenges: [
			{
				challenge: "Manutenção Predial",
				solution:
					"Módulo de Manutenção Programada: Cadastro de equipamentos e áreas (bombas, elevadores, telhado) com agendamento de inspeções obrigatórias e preventivas. Envio de alertas de vencimento (por exemplo, AVCB).",
				benefit:
					"Assegura o cumprimento das normas e preserva a valorização do patrimônio a longo prazo.",
			},
			{
				challenge: "Solicitação de Reparos",
				solution:
					"Chamados Técnicos (Help Desk): Moradores abrem solicitações com fotos e descrições. O administrador atribui o chamado a um funcionário ou fornecedor, monitora o tempo de resposta e finaliza o serviço.",
				benefit:
					"Melhora a satisfação dos moradores pela agilidade e fornece histórico de serviços realizados.",
			},
			{
				challenge: "Gestão de Documentos",
				solution:
					"Biblioteca Digital: Repositório seguro para armazenar digitalmente a Convenção, Regimento Interno, Atas de Assembleia, manuais de equipamentos, e AVCB.",
				benefit:
					"Facilita a consulta de regras e documentos legais para todos os envolvidos.",
			},
		],
	},
	{
		id: "legal",
		title: "Desafios Legais e Burocráticos",
		icon: "⚖️",
		description: "Simplificação de processos decisórios e conformidade legal.",
		challenges: [
			{
				challenge: "Assembleias",
				solution:
					"Ferramentas para Assembleias: Agendamento, envio de editais de convocação, registro de procurações e, se permitido legalmente, a realização de Assembleias Virtuais (com voto eletrônico e ata automatizada).",
				benefit:
					"Aumenta a participação dos condôminos e garante a validade legal e organização das reuniões.",
			},
			{
				challenge: "LGPD e Segurança",
				solution:
					"Controle de Acessos e Encomendas: Registro digital de entrada e saída de visitantes, prestadores de serviço e encomendas.",
				benefit:
					"Aumenta a segurança do condomínio e organiza a logística diária de portaria.",
			},
		],
	},
];

function PillarCard({ pillar }: { pillar: Pillar }) {
	const [isExpanded, setIsExpanded] = useState(false);

	return (
		<div className="border border-gray-800 bg-black/50 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="w-full p-2 text-left transition-all duration-300 md:p-8"
			>
				<div className="flex items-start justify-between gap-2 md:gap-4">
					<div className="flex-1 break-words">
						<div className="mb-1 text-2xl md:mb-3 md:text-4xl">
							{pillar.icon}
						</div>
						<h3 className="mb-1 break-words font-bold text-lg md:mb-2 md:text-2xl">
							{pillar.title}
						</h3>
						<p className="break-words text-gray-400 text-sm md:text-base">
							{pillar.description}
						</p>
					</div>
					<div
						className={`text-gray-400 text-lg transition-transform duration-300 md:text-2xl ${
							isExpanded ? "rotate-180" : ""
						}`}
					>
						▼
					</div>
				</div>
			</button>

			{isExpanded && (
				<div className="animate-slide-up border-gray-800 border-t p-2 md:p-8">
					<div className="space-y-2 md:space-y-6">
						{pillar.challenges.map((item, index) => (
							<div
								key={index}
								className="break-words border-white border-l-2 pl-2 md:pl-6"
							>
								<h4 className="mb-1 break-words font-bold text-base text-white md:mb-2 md:text-lg">
									{item.challenge}
								</h4>
								<div className="mb-2 md:mb-3">
									<p className="mb-1 font-semibold text-gray-400 text-xs md:text-sm">
										Solução:
									</p>
									<p className="break-words text-gray-300 text-sm md:text-base">
										{item.solution}
									</p>
								</div>
								<div>
									<p className="mb-1 font-semibold text-gray-400 text-xs md:text-sm">
										Benefício:
									</p>
									<p className="break-words text-gray-300 text-sm md:text-base">
										{item.benefit}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

export function PillarsSection() {
	return (
		<section className="w-full px-2 py-8 md:px-6 md:py-20">
			<div className="mx-auto w-full max-w-6xl">
				<div className="mb-8 text-center md:mb-16">
					<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">
						Pilares da Plataforma
					</h2>
					<p className="text-base text-gray-400 md:text-xl">
						Um ecossistema completo que resolve desafios reais da gestão
						condominial
					</p>
				</div>

				<div className="space-y-2 md:space-y-6">
					{pillars.map((pillar) => (
						<PillarCard key={pillar.id} pillar={pillar} />
					))}
				</div>
			</div>
		</section>
	);
}
