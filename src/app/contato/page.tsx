"use client";

import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { NewsletterForm } from "../_components/newsletter-form";
import { Card, Container, Section, SectionHeader } from "../_components/ui";

export default function ContatoPage() {
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
								Entre em Contato
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Estamos Aqui para Ajudar
								</span>
							</h1>
							<p className="mx-auto max-w-3xl text-gray-300 text-xl md:text-2xl">
								Tire suas dúvidas, envie sugestões ou saiba mais sobre o
								Quartier Flow
							</p>
						</div>
					</Container>
				</Section>

				{/* Contact Form & Info */}
				<Section>
					<Container size="2xl">
						<div className="grid gap-8 md:grid-cols-3">
							{/* Contact Info */}
							<div className="md:col-span-1">
								<h2 className="mb-6 font-bold text-2xl">
									Informações de Contato
								</h2>

								<div className="space-y-6">
									<Card className="p-4">
										<div className="mb-2 text-2xl">📧</div>
										<h3 className="mb-1 font-bold text-sm">E-mail</h3>
										<a
											href="mailto:nelsonkenzotamashiro@gmail.com"
											className="text-gray-300 text-sm hover:text-white"
										>
											nelsonkenzotamashiro@gmail.com
										</a>
									</Card>

									<Card className="p-4">
										<div className="mb-2 text-2xl">💬</div>
										<h3 className="mb-1 font-bold text-sm">WhatsApp</h3>
										<a
											href="https://wa.me/5511975153417"
											target="_blank"
											rel="noopener noreferrer"
											className="text-gray-300 text-sm hover:text-white"
										>
											(11) 97515-3417
										</a>
									</Card>

									<Card className="p-4">
										<div className="mb-2 text-2xl">💼</div>
										<h3 className="mb-1 font-bold text-sm">LinkedIn</h3>
										<a
											href="https://www.linkedin.com/in/nelson-kenzo-tamashiro/"
											target="_blank"
											rel="noopener noreferrer"
											className="text-gray-300 text-sm hover:text-white"
										>
											Nelson Kenzo Tamashiro
										</a>
									</Card>
								</div>
							</div>

							{/* Contact Form */}
							<div className="md:col-span-2">
								<h2 className="mb-6 font-bold text-2xl">Envie sua Mensagem</h2>

								<div className="flex justify-center md:justify-start">
									<NewsletterForm />
								</div>
							</div>
						</div>
					</Container>
				</Section>

				{/* Quick Links */}
				<Section>
					<Container size="2xl">
						<SectionHeader
							title="Outras Formas de Ajuda"
							subtitle="Encontre respostas rápidas ou explore nossos recursos"
						/>

						<div className="grid gap-6 md:grid-cols-3">
							<a
								href="/faq"
								className="group border border-gray-800 bg-black/50 p-6 backdrop-blur-sm transition-all hover:border-white"
							>
								<div className="mb-4 text-4xl">❓</div>
								<h3 className="mb-2 font-bold text-xl transition-colors group-hover:text-gray-300">
									Perguntas Frequentes
								</h3>
								<p className="text-gray-400 text-sm">
									Encontre respostas para as dúvidas mais comuns
								</p>
							</a>

							<a
								href="/blog"
								className="group border border-gray-800 bg-black/50 p-6 backdrop-blur-sm transition-all hover:border-white"
							>
								<div className="mb-4 text-4xl">📚</div>
								<h3 className="mb-2 font-bold text-xl transition-colors group-hover:text-gray-300">
									Blog e Recursos
								</h3>
								<p className="text-gray-400 text-sm">
									Artigos educativos sobre gestão condominial
								</p>
							</a>

							<a
								href="/#contact"
								className="group border border-gray-800 bg-black/50 p-6 backdrop-blur-sm transition-all hover:border-white"
							>
								<div className="mb-4 text-4xl">🚀</div>
								<h3 className="mb-2 font-bold text-xl transition-colors group-hover:text-gray-300">
									Lista de Espera
								</h3>
								<p className="text-gray-400 text-sm">
									Cadastre-se para acesso antecipado
								</p>
							</a>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
