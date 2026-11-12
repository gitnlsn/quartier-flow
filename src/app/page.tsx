import { HydrateClient } from "~/trpc/server";
import { AvailableNow } from "./_components/available-now";
import { CircularText } from "./_components/circular-text";
import { EarlyAccess } from "./_components/early-access";
import { FAQ } from "./_components/faq";
import { FeatureCard } from "./_components/feature-card";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { HowItWorks } from "./_components/how-it-works";
import { NextSteps } from "./_components/next-steps";
import { PillarsSection } from "./_components/pillars-section";
import { Button, Container, Section, SectionHeader } from "./_components/ui";
import { VisualSection } from "./_components/visual-section";

export default async function Home() {
	return (
		<HydrateClient>
			<Header />
			<main className="relative min-h-screen bg-black pt-12 text-white md:pt-16">
				{/* Background layers */}
				<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
				<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

				{/* Content */}
				<div className="relative z-10">
					{/* Hero Section */}
					<section className="flex min-h-screen w-full flex-col items-center justify-center px-2 py-8 md:px-6 md:py-20">
						<div className="w-full max-w-5xl text-center">
							<h1 className="mb-4 animate-fade-in font-extrabold text-4xl leading-tight tracking-tight md:mb-8 md:text-6xl lg:text-8xl">
								Gestão de Condomínios
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Simplificada
								</span>
							</h1>
							<div className="mt-10 mb-8 flex animate-delay-100 animate-slide-up justify-center md:mb-16">
								<CircularText
									text="Quartier Flow * Quartier Flow * "
									onHover="speedUp"
									spinDuration={10}
									className="md:scale-150"
								/>
							</div>

							{/* Features */}
							<div
								id="features"
								className="mb-8 grid gap-2 md:mb-20 md:grid-cols-3 md:gap-6"
							>
								<FeatureCard
									icon="🔍"
									title="Transparência Total"
									description="Acompanhe todas as finanças e decisões em tempo real"
									delay="animate-delay-200 animate-slide-up"
								/>
								<FeatureCard
									icon="💬"
									title="Comunicação Fácil"
									description="Mantenha todos os moradores informados e conectados"
									delay="animate-delay-300 animate-slide-up"
								/>
								<FeatureCard
									icon="⚡"
									title="Automatização"
									description="Reduza trabalho manual com processos inteligentes"
									delay="animate-delay-400 animate-slide-up"
								/>
							</div>
						</div>
					</section>

					{/* What already works (links to the help center) */}
					<AvailableNow />

					{/* What comes next */}
					<NextSteps />

					{/* Visual Section */}
					<VisualSection />

					{/* How It Works */}
					<HowItWorks />

					{/* Pillars Section */}
					<div id="pillars">
						<PillarsSection />
					</div>

					{/* Early Access + Roadmap */}
					<EarlyAccess />

					{/* FAQ */}
					<FAQ />

					{/* CTA Section */}
					<Section id="comecar">
						<Container size="lg" className="text-center">
							<SectionHeader
								title="Comece Agora"
								subtitle="Crie sua conta, cadastre sua administradora e envie as primeiras cobranças. Nada é contratado antes da sua confirmação."
								className="mb-6 md:mb-8"
							/>
							<div className="flex flex-col justify-center gap-2 sm:flex-row md:gap-4">
								<Button href="/cadastro" size="lg">
									Criar Conta →
								</Button>
								<Button href="/contato" variant="outline" size="lg">
									Falar com a Gente
								</Button>
							</div>
						</Container>
					</Section>
				</div>
			</main>
			<Footer />
		</HydrateClient>
	);
}
