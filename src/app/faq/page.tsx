"use client";

import { useState } from "react";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Button, Container, Section, SectionHeader } from "../_components/ui";

const categories = [
	{ id: "all", name: "Todas", icon: "📋" },
	{ id: "general", name: "Geral", icon: "❓" },
	{ id: "features", name: "Funcionalidades", icon: "⚙️" },
	{ id: "pricing", name: "Preços", icon: "💰" },
	{ id: "technical", name: "Técnico", icon: "🔧" },
	{ id: "security", name: "Segurança", icon: "🔒" },
];

const faqs = [
	{
		category: "general",
		question: "O que é o Quartier Flow?",
		answer:
			"O Quartier Flow é uma plataforma completa de gestão condominial que integra todas as necessidades do seu condomínio em um só lugar: gestão financeira, comunicação, reservas, manutenção e muito mais. Nossa missão é simplificar a vida de síndicos, moradores e administradoras através da tecnologia.",
	},
	{
		category: "general",
		question: "Como funciona o early access (acesso antecipado)?",
		answer:
			"Ao se cadastrar na lista de espera, você garante acesso prioritário quando lançarmos a plataforma. Os primeiros usuários terão benefícios exclusivos, incluindo preços especiais e acesso a funcionalidades premium por tempo determinado.",
	},
	{
		category: "general",
		question: "Quando a plataforma estará disponível?",
		answer:
			"Estamos em fase final de desenvolvimento e testes. A previsão é lançar a versão beta nos próximos meses. Todos da lista de espera serão notificados com antecedência e terão prioridade no acesso.",
	},
	{
		category: "features",
		question: "Quais funcionalidades principais o Quartier Flow oferece?",
		answer:
			"A plataforma inclui: gestão financeira completa (boletos, cobranças, relatórios), comunicação centralizada (avisos, notificações), sistema de reservas de áreas comuns, controle de manutenção preventiva e corretiva, portal do morador, assembleias digitais, e muito mais. Veja a página de Recursos para detalhes completos.",
	},
	{
		category: "features",
		question: "Posso personalizar a plataforma para meu condomínio?",
		answer:
			"Sim! O Quartier Flow é altamente configurável. Você pode ajustar módulos, regras de negócio, permissões de usuários, layouts de relatórios e muito mais de acordo com as necessidades específicas do seu condomínio.",
	},
	{
		category: "features",
		question: "O sistema funciona em dispositivos móveis?",
		answer:
			"Absolutamente! A plataforma é totalmente responsiva e funciona perfeitamente em smartphones e tablets. Além disso, estamos desenvolvendo apps nativos para iOS e Android que estarão disponíveis em breve.",
	},
	{
		category: "features",
		question: "Como funciona o sistema de comunicação?",
		answer:
			"Você pode enviar comunicados, avisos e notificações para todos os moradores ou grupos específicos. O sistema permite confirmação de leitura, programação de envios, e integração com e-mail e notificações push. Todo o histórico fica registrado e pesquisável.",
	},
	{
		category: "pricing",
		question: "Quanto custa o Quartier Flow?",
		answer:
			"Ainda estamos definindo os planos finais de preços. O que podemos garantir é que teremos opções acessíveis para condomínios de todos os tamanhos, desde pequenos prédios até grandes complexos. Os usuários early access terão condições especiais.",
	},
	{
		category: "pricing",
		question: "Existe taxa de setup ou implementação?",
		answer:
			"Para usuários early access, não haverá taxa de setup. Incluímos suporte completo na implementação, migração de dados e treinamento da equipe sem custos adicionais.",
	},
	{
		category: "pricing",
		question: "Posso cancelar a qualquer momento?",
		answer:
			"Sim, não há contratos de fidelidade obrigatórios. Você pode cancelar quando quiser, e seus dados estarão disponíveis para exportação por até 90 dias após o cancelamento.",
	},
	{
		category: "technical",
		question: "Preciso instalar algum software?",
		answer:
			"Não! O Quartier Flow é 100% baseado em nuvem (cloud). Você acessa tudo direto pelo navegador, sem precisar instalar nada. Seus dados ficam seguros em servidores profissionais com backup automático.",
	},
	{
		category: "technical",
		question: "Como faço para migrar dados do sistema atual?",
		answer:
			"Nossa equipe oferece suporte completo na migração. Podemos importar dados de planilhas Excel, outros sistemas de gestão condominial, ou inserir manualmente conforme necessário. O processo é guiado e não causa interrupção nas suas operações.",
	},
	{
		category: "technical",
		question: "O sistema integra com bancos e sistemas de pagamento?",
		answer:
			"Sim! Temos integração com os principais bancos do Brasil para geração de boletos, PIX e conciliação bancária automática. Também suportamos integração com gateways de pagamento para cartão de crédito.",
	},
	{
		category: "technical",
		question: "E se eu tiver problemas técnicos?",
		answer:
			"Oferecemos suporte técnico via chat, e-mail e, para planos premium, telefone. Nossa equipe está disponível para resolver qualquer questão rapidamente. Também temos uma base de conhecimento completa com tutoriais e guias.",
	},
	{
		category: "security",
		question: "Meus dados estão seguros?",
		answer:
			"Absolutamente. Usamos criptografia de ponta a ponta, servidores seguros com certificações internacionais, backup diário automático, e cumprimos rigorosamente a LGPD (Lei Geral de Proteção de Dados). Seus dados são seus e jamais são compartilhados com terceiros.",
	},
	{
		category: "security",
		question: "A plataforma é compatível com a LGPD?",
		answer:
			"Sim, 100%! O Quartier Flow foi desenvolvido desde o início considerando as exigências da LGPD. Temos controles de acesso granulares, registro de auditoria, políticas de retenção de dados, e ferramentas para atender solicitações de titulares (acessar, corrigir ou excluir dados).",
	},
	{
		category: "security",
		question: "Quem tem acesso aos dados do condomínio?",
		answer:
			"Apenas usuários autorizados que você cadastrar. O sistema tem níveis de permissão configuráveis: síndico, conselho fiscal, moradores, administradora, etc. Cada usuário vê apenas o que é relevante para seu papel. Todo acesso é registrado e auditável.",
	},
	{
		category: "security",
		question: "O que acontece se houver uma falha no sistema?",
		answer:
			"Temos infraestrutura redundante, o que significa que se um servidor falhar, outro assume imediatamente. Além disso, fazemos backups automáticos diários (e você pode solicitar backups adicionais a qualquer momento). Nosso SLA garante 99.9% de uptime.",
	},
];

export default function FAQPage() {
	const [selectedCategory, setSelectedCategory] = useState("all");
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedItems, setExpandedItems] = useState<number[]>([]);

	const filteredFaqs = faqs.filter((faq) => {
		const matchesCategory =
			selectedCategory === "all" || faq.category === selectedCategory;
		const matchesSearch =
			searchQuery === "" ||
			faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
			faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	const toggleItem = (index: number) => {
		setExpandedItems((prev) =>
			prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
		);
	};

	return (
		<div className="relative min-h-screen bg-black text-white">
			{/* Background layers */}
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				{/* Hero Section */}
				<Section>
					<Container size="lg">
						<div className="text-center">
							<h1 className="mb-6 font-extrabold text-4xl leading-tight md:text-6xl lg:text-7xl">
								Perguntas Frequentes
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Tire suas dúvidas
								</span>
							</h1>
							<p className="mx-auto max-w-3xl text-gray-300 text-xl md:text-2xl">
								Encontre respostas para as perguntas mais comuns sobre o
								Quartier Flow
							</p>
						</div>
					</Container>
				</Section>

				{/* Search and Categories */}
				<Section>
					<Container size="2xl">
						{/* Search */}
						<div className="relative mb-8">
							<input
								type="text"
								placeholder="Buscar perguntas..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-full border border-gray-800 bg-black/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-white focus:outline-none"
							/>
							<span className="-translate-y-1/2 absolute top-1/2 right-4 text-gray-500">
								🔍
							</span>
						</div>

						{/* Categories */}
						<div className="mb-8 flex flex-wrap gap-2">
							{categories.map((category) => (
								<button
									key={category.id}
									type="button"
									onClick={() => setSelectedCategory(category.id)}
									className={`flex items-center gap-2 border px-4 py-2 text-sm transition-all ${
										selectedCategory === category.id
											? "border-white bg-white text-black"
											: "border-gray-800 bg-black/50 text-gray-400 hover:border-white hover:text-white"
									}`}
								>
									<span>{category.icon}</span>
									<span>{category.name}</span>
								</button>
							))}
						</div>

						{/* Results Count */}
						<div className="mb-6 text-gray-400 text-sm">
							{filteredFaqs.length}{" "}
							{filteredFaqs.length === 1
								? "pergunta encontrada"
								: "perguntas encontradas"}
						</div>

						{/* FAQ Items */}
						{filteredFaqs.length > 0 ? (
							<div className="space-y-4">
								{filteredFaqs.map((faq, index) => (
									<div
										key={index}
										className="border border-gray-800 bg-black/50 backdrop-blur-sm transition-all hover:border-white"
									>
										<button
											type="button"
											onClick={() => toggleItem(index)}
											className="w-full p-4 text-left transition-all md:p-6"
										>
											<div className="flex items-start justify-between gap-4">
												<h3 className="flex-1 font-bold text-lg text-white md:text-xl">
													{faq.question}
												</h3>
												<span
													className={`text-gray-400 text-xl transition-transform ${
														expandedItems.includes(index) ? "rotate-180" : ""
													}`}
												>
													▼
												</span>
											</div>
										</button>
										{expandedItems.includes(index) && (
											<div className="animate-slide-up border-gray-800 border-t p-4 md:p-6">
												<p className="text-gray-300 leading-relaxed">
													{faq.answer}
												</p>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className="py-20 text-center">
								<p className="mb-4 text-gray-400 text-xl">
									Nenhuma pergunta encontrada
								</p>
								<p className="text-gray-500 text-sm">
									Tente ajustar os filtros ou buscar por outros termos
								</p>
							</div>
						)}
					</Container>
				</Section>

				{/* CTA Section */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="border border-gray-800 bg-black/50 p-8 backdrop-blur-sm md:p-12">
							<h2 className="mb-4 font-bold text-2xl md:text-3xl">
								Não encontrou sua resposta?
							</h2>
							<p className="mb-6 text-gray-400">
								Entre em contato conosco e teremos prazer em ajudar
							</p>
							<Button href="/contato" size="lg">
								Fale Conosco →
							</Button>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
