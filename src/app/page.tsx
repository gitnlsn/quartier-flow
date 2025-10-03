import { HydrateClient } from "~/trpc/server";
import { NewsletterForm } from "./_components/newsletter-form";

export default async function Home() {
	return (
		<HydrateClient>
			<main className="relative min-h-screen bg-black text-white">
				{/* Background layers */}
				<div className="fixed inset-0 bg-radial-gradient" />
				<div className="fixed inset-0 bg-dot-pattern" />

				{/* Content */}
				<div className="relative z-10">
					{/* Hero Section */}
					<section className="flex min-h-screen flex-col items-center justify-center px-6 py-20">
						<div className="max-w-5xl text-center">
							<h1 className="animate-fade-in mb-8 text-6xl font-extrabold leading-tight tracking-tight md:text-8xl">
								Gestão de Condomínios
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Simplificada
								</span>
							</h1>
							<p className="animate-slide-up animate-delay-100 mb-16 text-xl leading-relaxed text-gray-300 md:text-2xl">
								A solução completa para administrar seu
								condomínio com eficiência, transparência e
								modernidade.
							</p>

							{/* Features */}
							<div className="mb-20 grid gap-6 md:grid-cols-3">
								<div className="group animate-slide-up animate-delay-200 border border-gray-800 bg-black/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10">
									<div className="mb-4 text-4xl">🔍</div>
									<h3 className="mb-3 text-xl font-bold">
										Transparência Total
									</h3>
									<p className="text-gray-400">
										Acompanhe todas as finanças e decisões
										em tempo real
									</p>
								</div>
								<div className="group animate-slide-up animate-delay-300 border border-gray-800 bg-black/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10">
									<div className="mb-4 text-4xl">💬</div>
									<h3 className="mb-3 text-xl font-bold">
										Comunicação Fácil
									</h3>
									<p className="text-gray-400">
										Mantenha todos os moradores informados e
										conectados
									</p>
								</div>
								<div className="group animate-slide-up animate-delay-400 border border-gray-800 bg-black/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white hover:shadow-2xl hover:shadow-white/10">
									<div className="mb-4 text-4xl">⚡</div>
									<h3 className="mb-3 text-xl font-bold">
										Automatização
									</h3>
									<p className="text-gray-400">
										Reduza trabalho manual com processos
										inteligentes
									</p>
								</div>
							</div>

							{/* CTA */}
							<div className="animate-slide-up animate-delay-400 flex flex-col items-center">
								<h2 className="mb-10 text-4xl font-bold">
									Transforme a gestão do seu condomínio
								</h2>
								<NewsletterForm />
							</div>
						</div>
					</section>

					{/* Footer */}
					<footer className="border-t border-gray-800/50 py-12 text-center text-sm text-gray-500">
						<p>
							© {new Date().getFullYear()} Quartier Flow. Todos
							os direitos reservados.
						</p>
					</footer>
				</div>
			</main>
		</HydrateClient>
	);
}
