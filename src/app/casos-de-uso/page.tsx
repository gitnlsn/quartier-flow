"use client";

import Image from "next/image";
import { useState } from "react";
import billsImage from "~/assets/landing-page/bills-4.jpg";
import hallImage from "~/assets/landing-page/hall-2.jpg";
import meetingImage from "~/assets/landing-page/meeting-4.jpg";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import {
	Button,
	Card,
	Container,
	Section,
	SectionHeader,
} from "../_components/ui";

const useCases = [
	{
		id: "sindico",
		title: "Para Síndicos",
		icon: "👨‍💼",
		image: meetingImage,
		description:
			"Simplifique sua rotina e ganhe horas do seu dia com automação inteligente",
		beforeTitle: "Antes do Quartier Flow",
		before: [
			"10+ horas semanais em tarefas administrativas manuais",
			"Planilhas desorganizadas e difíceis de compartilhar",
			"Dificuldade em controlar inadimplência",
			"Reuniões improdutivas por falta de dados claros",
			"Moradores constantemente questionando decisões",
			"Estresse com cobranças e comunicados",
		],
		afterTitle: "Depois do Quartier Flow",
		after: [
			"Redução de 70% no tempo gasto em tarefas administrativas",
			"Relatórios financeiros gerados automaticamente",
			"Sistema de cobrança automática reduz inadimplência em 30%",
			"Assembleias mais objetivas com dados em tempo real",
			"Transparência total aumenta confiança dos moradores",
			"Mais tempo para focar em melhorias estratégicas",
		],
		features: [
			"Dashboard com visão geral do condomínio",
			"Geração automática de boletos e cobranças",
			"Relatórios financeiros em um clique",
			"Comunicados programados",
			"Controle de manutenções preventivas",
		],
	},
	{
		id: "morador",
		title: "Para Moradores",
		icon: "🏠",
		image: hallImage,
		description:
			"Tenha acesso total às informações do seu condomínio na palma da mão",
		beforeTitle: "Antes do Quartier Flow",
		before: [
			"Desconfiança sobre o uso do dinheiro do condomínio",
			"Dificuldade para reservar áreas comuns",
			"Falta de resposta a solicitações e reclamações",
			"Boletos perdidos ou atrasados",
			"Informações importantes chegam tarde ou não chegam",
			"Sensação de não ter voz nas decisões",
		],
		afterTitle: "Depois do Quartier Flow",
		after: [
			"Transparência total: veja para onde vai cada centavo",
			"Reservas de áreas comuns em segundos, pelo celular",
			"Acompanhe suas solicitações em tempo real",
			"Acesso a boletos e comprovantes 24/7",
			"Notificações instantâneas de comunicados importantes",
			"Participe ativamente através de enquetes e sugestões",
		],
		features: [
			"Portal do morador com acesso mobile",
			"Visualização de balancetes e despesas",
			"Sistema de reservas online",
			"Abertura de chamados e solicitações",
			"Histórico completo de pagamentos",
		],
	},
	{
		id: "administradora",
		title: "Para Administradoras",
		icon: "🏢",
		image: billsImage,
		description:
			"Gerencie múltiplos condomínios com eficiência e profissionalismo",
		beforeTitle: "Antes do Quartier Flow",
		before: [
			"Sistemas diferentes para cada condomínio",
			"Dificuldade em escalar operações",
			"Retrabalho manual em tarefas repetitivas",
			"Falta de padronização nos processos",
			"Dificuldade em oferecer transparência aos clientes",
			"Custos operacionais elevados",
		],
		afterTitle: "Depois do Quartier Flow",
		after: [
			"Plataforma unificada para todos os condomínios",
			"Fácil integração de novos condomínios",
			"Automação reduz equipe necessária em 40%",
			"Processos padronizados e auditáveis",
			"Transparência como diferencial competitivo",
			"Redução de 35% nos custos operacionais",
		],
		features: [
			"Multi-condomínio em uma única plataforma",
			"Gestão centralizada de equipes e permissões",
			"Relatórios consolidados para diretoria",
			"API para integração com sistemas legados",
			"White-label opcional para sua marca",
		],
	},
];

export default function CasosDeUsoPage() {
	const [selectedCase, setSelectedCase] = useState(useCases[0]!);

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
								Casos de Uso
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Reais do Quartier Flow
								</span>
							</h1>
							<p className="mx-auto max-w-3xl text-gray-300 text-xl md:text-2xl">
								Veja como diferentes perfis se beneficiam da nossa plataforma e
								transformam a gestão condominial
							</p>
						</div>
					</Container>
				</Section>

				{/* Selector */}
				<Section>
					<Container size="2xl">
						<div className="flex flex-col justify-center gap-4 md:flex-row">
							{useCases.map((useCase) => (
								<button
									key={useCase.id}
									type="button"
									onClick={() => setSelectedCase(useCase)}
									className={`flex-1 border p-6 text-left transition-all ${
										selectedCase.id === useCase.id
											? "border-white bg-white/10"
											: "border-gray-800 bg-black/50 hover:border-white"
									}`}
								>
									<div className="mb-3 text-4xl">{useCase.icon}</div>
									<h3 className="mb-2 font-bold text-xl">{useCase.title}</h3>
									<p className="text-gray-400 text-sm">{useCase.description}</p>
								</button>
							))}
						</div>
					</Container>
				</Section>

				{/* Selected Case Details */}
				<Section>
					<Container size="2xl">
						{/* Image */}
						<div className="relative mb-12 aspect-video overflow-hidden border border-gray-800">
							<Image
								src={selectedCase.image}
								alt={selectedCase.title}
								className="h-full w-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
							<div className="absolute bottom-8 left-8">
								<h2 className="font-bold text-3xl text-white md:text-4xl">
									{selectedCase.title}
								</h2>
							</div>
						</div>

						{/* Before & After */}
						<div className="mb-12 grid gap-8 md:grid-cols-2">
							{/* Before */}
							<Card className="p-6 md:p-8">
								<h3 className="mb-6 font-bold text-2xl text-red-400">
									❌ {selectedCase.beforeTitle}
								</h3>
								<ul className="space-y-3">
									{selectedCase.before.map((item, index) => (
										<li
											key={index}
											className="flex items-start gap-3 text-gray-300 text-sm"
										>
											<span className="mt-1 text-red-400">•</span>
											<span>{item}</span>
										</li>
									))}
								</ul>
							</Card>

							{/* After */}
							<Card className="p-6 md:p-8">
								<h3 className="mb-6 font-bold text-2xl text-green-400">
									✅ {selectedCase.afterTitle}
								</h3>
								<ul className="space-y-3">
									{selectedCase.after.map((item, index) => (
										<li
											key={index}
											className="flex items-start gap-3 text-gray-300 text-sm"
										>
											<span className="mt-1 text-green-400">✓</span>
											<span>{item}</span>
										</li>
									))}
								</ul>
							</Card>
						</div>

						{/* Features */}
						<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm md:p-8">
							<h3 className="mb-6 font-bold text-2xl">
								Recursos Principais para {selectedCase.title}
							</h3>
							<div className="grid gap-4 md:grid-cols-2">
								{selectedCase.features.map((feature, index) => (
									<div
										key={index}
										className="flex items-center gap-3 text-gray-300"
									>
										<span className="text-white">→</span>
										<span>{feature}</span>
									</div>
								))}
							</div>
						</div>
					</Container>
				</Section>

				{/* Success Stories */}
				{/* <Section>
					<Container size="2xl">
						<SectionHeader
							title="Histórias de Sucesso"
							subtitle="Veja o impacto real do Quartier Flow"
						/>

						<div className="grid gap-6 md:grid-cols-3">
							<Card className="p-6">
								<div className="mb-4 text-4xl">📊</div>
								<h3 className="mb-2 font-bold text-xl">
									Condomínio Residencial Jardins
								</h3>
								<p className="mb-4 text-gray-400 text-sm">
									120 unidades • São Paulo/SP
								</p>
								<p className="mb-4 text-gray-300 text-sm leading-relaxed">
									"Reduzimos a inadimplência de 18% para 5% em apenas 6
									meses. O sistema de lembretes automáticos fez toda a
									diferença."
								</p>
								<p className="text-gray-500 text-xs">
									— Maria Silva, Síndica
								</p>
							</Card>

							<Card className="p-6">
								<div className="mb-4 text-4xl">⏱️</div>
								<h3 className="mb-2 font-bold text-xl">
									Edifício Comercial Central
								</h3>
								<p className="mb-4 text-gray-400 text-sm">
									45 salas • Rio de Janeiro/RJ
								</p>
								<p className="mb-4 text-gray-300 text-sm leading-relaxed">
									"Economia de 15 horas semanais em tarefas
									administrativas. Agora consigo focar em melhorias
									estratégicas."
								</p>
								<p className="text-gray-500 text-xs">
									— João Santos, Síndico Profissional
								</p>
							</Card>

							<Card className="p-6">
								<div className="mb-4 text-4xl">🏢</div>
								<h3 className="mb-2 font-bold text-xl">
									AdminPro Gestão Condominial
								</h3>
								<p className="mb-4 text-gray-400 text-sm">
									50+ condomínios gerenciados
								</p>
								<p className="mb-4 text-gray-300 text-sm leading-relaxed">
									"Conseguimos dobrar nossa carteira de clientes sem
									aumentar a equipe. A plataforma é nosso diferencial
									competitivo."
								</p>
								<p className="text-gray-500 text-xs">
									— Ana Costa, Diretora AdminPro
								</p>
							</Card>
						</div>
					</Container>
				</Section> */}

				{/* CTA Final */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="border border-gray-800 bg-black/50 p-8 backdrop-blur-sm md:p-12">
							<h2 className="mb-4 font-bold text-2xl md:text-3xl">
								Pronto para transformar seu condomínio?
							</h2>
							<p className="mb-6 text-gray-400">
								Cadastre-se na lista de espera e seja um dos primeiros a
								experimentar a revolução na gestão condominial
							</p>
							<Button href="/#contact" size="lg">
								Quero Fazer Parte →
							</Button>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
