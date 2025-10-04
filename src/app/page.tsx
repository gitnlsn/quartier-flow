import { HydrateClient } from "~/trpc/server";
import { CircularText } from "./_components/circular-text";
import { EarlyAccess } from "./_components/early-access";
import { FAQ } from "./_components/faq";
import { FeatureCard } from "./_components/feature-card";
import { Footer } from "./_components/footer";
import { Header } from "./_components/header";
import { HowItWorks } from "./_components/how-it-works";
import { NewsletterForm } from "./_components/newsletter-form";
import { PillarsSection } from "./_components/pillars-section";
import { Container, Section, SectionHeader } from "./_components/ui";
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
					<Section id="contact">
						<Container size="lg" className="text-center">
							<SectionHeader
								title="Cadastre-se na Lista de Espera"
								subtitle="Seja avisado assim que o Quartier Flow estiver disponível e garanta os benefícios exclusivos"
								className="mb-6 md:mb-8"
							/>
							<div className="flex justify-center">
								<NewsletterForm />
							</div>
						</Container>
					</Section>
				</div>
			</main>
			<Footer />
		</HydrateClient>
	);
}
