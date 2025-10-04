import { HydrateClient } from "~/trpc/server";
import { CircularText } from "./_components/circular-text";
import { NewsletterForm } from "./_components/newsletter-form";
import { PillarsSection } from "./_components/pillars-section";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="relative min-h-screen bg-black text-white">
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
							<div className="mb-8 grid gap-2 md:mb-20 md:grid-cols-3 md:gap-6">
								<div className="group animate-delay-200 animate-slide-up border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10 md:p-8">
									<div className="mb-2 text-2xl md:mb-4 md:text-4xl">🔍</div>
									<h3 className="mb-1 font-bold text-base md:mb-3 md:text-xl">
										Transparência Total
									</h3>
									<p className="text-gray-400 text-sm md:text-base">
										Acompanhe todas as finanças e decisões em tempo real
									</p>
								</div>
								<div className="group animate-delay-300 animate-slide-up border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10 md:p-8">
									<div className="mb-2 text-2xl md:mb-4 md:text-4xl">💬</div>
									<h3 className="mb-1 font-bold text-base md:mb-3 md:text-xl">
										Comunicação Fácil
									</h3>
									<p className="text-gray-400 text-sm md:text-base">
										Mantenha todos os moradores informados e conectados
									</p>
								</div>
								<div className="group animate-delay-400 animate-slide-up border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10 md:p-8">
									<div className="mb-2 text-2xl md:mb-4 md:text-4xl">⚡</div>
									<h3 className="mb-1 font-bold text-base md:mb-3 md:text-xl">
										Automatização
									</h3>
									<p className="text-gray-400 text-sm md:text-base">
										Reduza trabalho manual com processos inteligentes
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Pillars Section */}
					<PillarsSection />

					{/* CTA Section */}
					<section className="w-full px-2 py-8 md:px-6 md:py-20">
						<div className="mx-auto w-full max-w-4xl text-center">
							<h2 className="mb-6 font-bold text-2xl md:mb-10 md:text-4xl">
								Transforme a gestão do seu condomínio
							</h2>
							<div className="flex justify-center">
								<NewsletterForm />
							</div>
						</div>
					</section>

					{/* Footer */}
					<footer className="border-gray-800/50 border-t py-6 text-center text-gray-500 text-xs md:py-12 md:text-sm">
						<p>
							© {new Date().getFullYear()} Quartier Flow. Todos os direitos
							reservados.
						</p>
					</footer>
				</div>
			</main>
		</HydrateClient>
	);
}
