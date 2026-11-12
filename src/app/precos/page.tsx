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
		"Planos e preços do Quartier Flow: mensalidade por morador e síndico ativos, sem taxa de adesão, com cadastro guiado e treinamento.",
	keywords: [
		"preços gestão de condomínios",
		"planos quartier flow",
		"quanto custa software condomínio",
		"preço plataforma condominial",
	],
	openGraph: {
		title: "Preços - Quartier Flow",
		description:
			"Planos e preços do Quartier Flow: mensalidade por morador e síndico ativos, sem taxa de adesão.",
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
							<span>⚡</span>
							<span>SEM TAXA DE ADESÃO</span>
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
										href="/cadastro"
										variant={plan.highlighted ? "primary" : "secondary"}
										className="w-full"
									>
										Começar Agora →
									</Button>
								</Card>
							))}
						</div>
					</Container>
				</Section>

				{/* Onboarding support */}
				<Section>
					<Container size="lg">
						<SectionHeader
							title="Você Não Começa Sozinho"
							subtitle="Implantação e treinamento inclusos, sem custo adicional"
						/>

						<div className="grid gap-6 md:grid-cols-2">
							<Card className="p-6">
								<div className="mb-4 text-4xl">⚡</div>
								<h3 className="mb-2 font-bold text-xl">Cadastro Guiado</h3>
								<p className="text-gray-300 text-sm">
									Administradora, plano e conta de recebimento passo a passo,
									com vídeos na Central de ajuda
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
									Como sei quanto vou pagar?
								</h3>
								<p className="text-gray-300 text-sm">
									Antes de assinar, o cadastro mostra o plano e o valor pelos
									moradores e síndicos ativos. Nada é cobrado antes da sua
									confirmação.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Existe período gratuito?
								</h3>
								<p className="text-gray-300 text-sm">
									Não. A cobrança começa no mês da assinatura, proporcional aos
									dias, e é calculada pelos moradores e síndicos ativos. Você
									pode cancelar quando quiser; o cancelamento vale no fim do
									mês.
								</p>
							</div>

							<div className="border border-gray-800 bg-black/50 p-6 backdrop-blur-sm">
								<h3 className="mb-2 font-bold text-lg">
									Há taxa de setup ou implantação?
								</h3>
								<p className="text-gray-300 text-sm">
									Não. A implantação e o treinamento estão inclusos, sem custo
									adicional.
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
									A fatura mensal do Quartier Flow é paga por boleto ou Pix.
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
								Comece Hoje
							</h2>
							<p className="mb-6 text-gray-400 text-lg">
								Você escolhe o plano durante o cadastro e nada é contratado
								antes da sua confirmação
							</p>
							<Button href="/cadastro" size="lg">
								Criar Conta →
							</Button>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
