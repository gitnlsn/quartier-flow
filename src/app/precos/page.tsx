import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import {
	Button,
	Card,
	Container,
	Section,
	SectionHeader,
} from "../_components/ui";

export const metadata: Metadata = {
	title: "Preços - Quartier Flow | Gestão de Condomínios",
	description:
		"Planos e preços do Quartier Flow. Early adopters ganham 50% de desconto nos primeiros 6 meses + 3 meses grátis. Cadastre-se na lista de espera.",
	keywords: [
		"preços gestão de condomínios",
		"planos quartier flow",
		"quanto custa software condomínio",
		"preço plataforma condominial",
	],
	openGraph: {
		title: "Preços - Quartier Flow",
		description:
			"Planos e preços do Quartier Flow com benefícios exclusivos para early adopters.",
		type: "website",
		url: "https://quartierflow.com/precos",
	},
};

export default function PrecosPage() {
	const plans = [
		{
			name: "Starter",
			description: "Ideal para condomínios pequenos",
			units: "Até 20 unidades",
			price: "Em breve",
			features: [
				"Sistema de pagamentos",
				"Controle de inadimplência",
				"Comunicação com moradores",
				"Dashboard básico",
				"Suporte por e-mail",
			],
			highlighted: false,
		},
		{
			name: "Professional",
			description: "Para condomínios médios",
			units: "21 a 100 unidades",
			price: "Em breve",
			features: [
				"Tudo do Starter, mais:",
				"Módulo de assembleias",
				"Reserva de áreas comuns",
				"Chamados de manutenção",
				"Relatórios avançados",
				"Suporte prioritário",
			],
			highlighted: true,
		},
		{
			name: "Enterprise",
			description: "Para administradoras e grandes condomínios",
			units: "101+ unidades ou múltiplos condomínios",
			price: "Personalizado",
			features: [
				"Tudo do Professional, mais:",
				"Multi-condomínios",
				"API de integração",
				"Customização avançada",
				"Treinamento personalizado",
				"Suporte 24/7",
				"Account manager dedicado",
			],
			highlighted: false,
		},
	];

	return (
		<div className="relative min-h-screen bg-black text-white">
			{/* Background layers */}
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				{/* Hero Section */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="mb-4 inline-flex items-center gap-2 border border-white bg-white px-4 py-2 font-bold text-black text-sm">
							<span>🎁</span>
							<span>EARLY ADOPTERS: 50% OFF + 3 MESES GRÁTIS</span>
						</div>
						<h1 className="mb-6 font-extrabold text-4xl leading-tight md:text-6xl lg:text-7xl">
							Preços Transparentes
							<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
								Sem Surpresas
							</span>
						</h1>
						<p className="mx-auto max-w-3xl text-gray-300 text-xl md:text-2xl">
							Escolha o plano ideal para o tamanho do seu condomínio. Valores
							finais serão divulgados próximo ao lançamento.
						</p>
					</Container>
				</Section>

				{/* Pricing Cards */}
				<Section>
					<Container size="2xl">
						<div className="grid gap-6 md:grid-cols-3">
							{plans.map((plan, index) => (
								<Card
									key={index}
									className={`relative flex flex-col p-6 md:p-8 ${
										plan.highlighted
											? "border-2 border-white"
											: "border border-gray-800"
									}`}
								>
									{plan.highlighted && (
										<div className="-translate-x-1/2 -translate-y-1/2 absolute top-0 left-1/2 border border-white bg-white px-4 py-1 font-bold text-black text-xs">
											MAIS POPULAR
										</div>
									)}

									<div className="mb-6">
										<h3 className="mb-2 font-bold text-2xl">{plan.name}</h3>
										<p className="mb-2 text-gray-400 text-sm">
											{plan.description}
										</p>
										<p className="text-gray-500 text-xs">{plan.units}</p>
									</div>

									<div className="mb-6">
										<div className="font-bold text-4xl">{plan.price}</div>
										{plan.price !== "Personalizado" && (
											<p className="text-gray-400 text-sm">por mês</p>
										)}
									</div>

									<ul className="mb-8 flex-1 space-y-3">
										{plan.features.map((feature, i) => (
											<li
												key={i}
												className="flex items-start gap-2 text-gray-300 text-sm"
											>
												<span className="mt-1 text-white">✓</span>
												<span>{feature}</span>
											</li>
										))}
									</ul>

									<Button
										href="/#contact"
										variant={plan.highlighted ? "primary" : "secondary"}
										className="w-full"
									>
										Entrar na Lista →
									</Button>
								</Card>
							))}
						</div>
					</Container>
				</Section>

				{/* Early Adopter Benefits */}
				<Section>
					<Container size="lg">
						<SectionHeader
							title="Benefícios Exclusivos para Early Adopters"
							subtitle="Quem se cadastrar agora garante as melhores condições"
						/>

						<div className="grid gap-6 md:grid-cols-2">
							<Card className="p-6">
								<div className="mb-4 text-4xl">💰</div>
								<h3 className="mb-2 font-bold text-xl">50% de Desconto</h3>
								<p className="text-gray-300 text-sm">
									Nos primeiros 6 meses de assinatura após o lançamento
								</p>
							</Card>

							<Card className="p-6">
								<div className="mb-4 text-4xl">🎁</div>
								<h3 className="mb-2 font-bold text-xl">3 Meses Grátis</h3>
								<p className="text-gray-300 text-sm">
									Período trial estendido para testar todas as funcionalidades
								</p>
							</Card>

							<Card className="p-6">
								<div className="mb-4 text-4xl">⚡</div>
								<h3 className="mb-2 font-bold text-xl">Acesso Prioritário</h3>
								<p className="text-gray-300 text-sm">
									Seja um dos primeiros a usar a plataforma quando lançarmos
								</p>
							</Card>

							<Card className="p-6">
								<div className="mb-4 text-4xl">🎓</div>
								<h3 className="mb-2 font-bold text-xl">
									Treinamento Personalizado
								</h3>
								<p className="text-gray-300 text-sm">
									Onboarding exclusivo com nossa equipe especializada
								</p>
							</Card>
						</div>
					</Container>
				</Section>

				{/* FAQ Pricing */}
				<Section>
					<Container size="lg">
						<SectionHeader
							title="Perguntas Frequentes sobre Preços"
							subtitle="Tire suas dúvidas"
						/>

						<div className="space-y-6">
							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Quando os preços serão divulgados?
								</h3>
								<p className="text-gray-300 text-sm">
									Os valores oficiais serão divulgados próximo ao lançamento do
									beta (Maio 2025). Garantimos que early adopters terão as
									melhores condições.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Como funciona o período grátis?
								</h3>
								<p className="text-gray-300 text-sm">
									Early adopters ganham 3 meses grátis para testar a plataforma
									completa sem compromisso. Após esse período, você decide se
									quer continuar.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Há taxa de setup ou implantação?
								</h3>
								<p className="text-gray-300 text-sm">
									Não! Para early adopters, a implantação e treinamento estão
									inclusos sem custo adicional.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Posso cancelar a qualquer momento?
								</h3>
								<p className="text-gray-300 text-sm">
									Sim! Você pode cancelar sua assinatura a qualquer momento. Não
									há fidelidade ou multas de cancelamento.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Quais formas de pagamento são aceitas?
								</h3>
								<p className="text-gray-300 text-sm">
									Aceitaremos boleto bancário, PIX, cartão de crédito e débito
									automático. Mais detalhes serão divulgados em breve.
								</p>
							</div>
						</div>
					</Container>
				</Section>

				{/* CTA Final */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="border-2 border-white bg-black/50 p-8 backdrop-blur-sm md:p-12">
							<h2 className="mb-4 font-bold text-3xl md:text-4xl">
								Garanta os Benefícios de Early Adopter
							</h2>
							<p className="mb-6 text-gray-400 text-lg">
								Cadastre-se na lista de espera e seja avisado assim que os
								planos oficiais forem lançados
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
