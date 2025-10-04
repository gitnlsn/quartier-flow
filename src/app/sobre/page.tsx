import Image from "next/image";
import Link from "next/link";
import meetingImage from "~/assets/landing-page/meeting-4.jpg";
import nelsonImage from "~/assets/people/nelson-1.jpg";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import {
	Button,
	Card,
	Container,
	Section,
	SectionHeader,
} from "../_components/ui";

export default function SobrePage() {
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
								Transformando a Gestão
								<span className="block bg-gradient-to-r from-gray-400 to-gray-600 bg-clip-text text-transparent">
									Condominial no Brasil
								</span>
							</h1>
							<p className="mx-auto max-w-3xl text-gray-300 text-xl md:text-2xl">
								Acreditamos que a tecnologia pode simplificar a vida de
								síndicos, moradores e administradores, criando condomínios mais
								transparentes, eficientes e harmoniosos.
							</p>
						</div>
					</Container>
				</Section>

				{/* Nossa História */}
				<Section>
					<Container size="lg">
						<h2 className="mb-6 text-center font-bold text-3xl md:text-4xl">
							Nossa História
						</h2>
						<div className="space-y-4 text-center text-gray-300 leading-relaxed">
							<p>
								O Quartier Flow nasceu da observação de um problema real: a
								gestão condominial no Brasil ainda é majoritariamente manual,
								burocrática e pouco transparente.
							</p>
							<p>
								Vimos síndicos dedicando horas preciosas a tarefas repetitivas,
								moradores desconfiados por falta de transparência, e
								administradoras lutando com sistemas fragmentados e
								desatualizados.
							</p>
							<p>
								Percebemos que a tecnologia já havia revolucionado setores como
								bancos, varejo e saúde, mas a gestão condominial permanecia
								presa ao passado. Era hora de mudar isso.
							</p>
							<p>
								Então reunimos uma equipe apaixonada por resolver problemas
								complexos e começamos a desenvolver uma plataforma que realmente
								entendesse as dores de quem vive e gerencia condomínios.
							</p>
						</div>
					</Container>
				</Section>

				{/* Missão e Valores */}
				<Section>
					<Container size="2xl">
						<SectionHeader
							title="Missão e Valores"
							subtitle="Os princípios que guiam cada decisão que tomamos"
						/>

						<div className="grid gap-6 md:grid-cols-3">
							<Card className="p-6 md:p-8">
								<div className="mb-4 text-4xl">🎯</div>
								<h3 className="mb-3 font-bold text-xl">Nossa Missão</h3>
								<p className="text-gray-300 text-sm leading-relaxed">
									Democratizar o acesso a ferramentas profissionais de gestão
									condominial, tornando a administração de condomínios mais
									simples, transparente e eficiente para todos os envolvidos.
								</p>
							</Card>

							<Card className="p-6 md:p-8">
								<div className="mb-4 text-4xl">👁️</div>
								<h3 className="mb-3 font-bold text-xl">Nossa Visão</h3>
								<p className="text-gray-300 text-sm leading-relaxed">
									Ser a plataforma de referência em gestão condominial no
									Brasil, presente em milhares de condomínios e reconhecida pela
									excelência, inovação e impacto positivo na vida das pessoas.
								</p>
							</Card>

							<Card className="p-6 md:p-8">
								<div className="mb-4 text-4xl">💡</div>
								<h3 className="mb-3 font-bold text-xl">Nossa Proposta</h3>
								<p className="text-gray-300 text-sm leading-relaxed">
									Integrar todas as necessidades da gestão condominial em uma
									única plataforma intuitiva, automatizando processos,
									aumentando a transparência e melhorando a comunicação.
								</p>
							</Card>
						</div>
					</Container>
				</Section>

				{/* Nossos Valores */}
				<Section>
					<Container size="2xl">
						<h2 className="mb-8 text-center font-bold text-3xl md:mb-12 md:text-4xl">
							Nossos Valores
						</h2>

						<div className="grid gap-6 md:grid-cols-2">
							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">
									🔍 Transparência Radical
								</h3>
								<p className="text-gray-300 text-sm">
									Acreditamos que informação clara e acessível é a base da
									confiança. Nossa plataforma é construída para tornar tudo
									visível e compreensível.
								</p>
							</div>

							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">
									🚀 Simplicidade com Propósito
								</h3>
								<p className="text-gray-300 text-sm">
									Tecnologia não precisa ser complicada. Cada funcionalidade é
									pensada para ser intuitiva, mesmo para quem não é expert em
									software.
								</p>
							</div>

							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">🤝 Foco nas Pessoas</h3>
								<p className="text-gray-300 text-sm">
									Por trás de cada número, há pessoas. Desenvolvemos soluções
									que consideram as necessidades humanas, não apenas processos.
								</p>
							</div>

							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">⚡ Inovação Contínua</h3>
								<p className="text-gray-300 text-sm">
									O mercado evolui, as necessidades mudam. Estamos sempre
									ouvindo, aprendendo e melhorando nossa plataforma.
								</p>
							</div>

							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">
									🔒 Segurança e Privacidade
								</h3>
								<p className="text-gray-300 text-sm">
									Dados sensíveis exigem proteção máxima. Conformidade com LGPD,
									criptografia e controles de acesso rigorosos são prioridades
									absolutas.
								</p>
							</div>

							<div className="border-white border-l-4 p-4 md:p-6">
								<h3 className="mb-2 font-bold text-xl">
									💪 Compromisso com Resultados
								</h3>
								<p className="text-gray-300 text-sm">
									Não basta ter boas intenções. Medimos nosso sucesso pelo
									impacto real que geramos: menos tempo perdido, mais
									transparência, melhor convivência.
								</p>
							</div>
						</div>
					</Container>
				</Section>

				{/* Por que criamos */}
				<Section>
					<Container size="2xl">
						<div className="grid gap-8 md:grid-cols-2 md:gap-12">
							<div className="relative order-1 md:order-1">
								<Image
									src={meetingImage}
									alt="Reuniões e assembleias eficientes"
									className="border border-gray-800 object-cover"
								/>
							</div>
							<div className="order-2 md:order-2">
								<h2 className="mb-6 font-bold text-3xl md:text-4xl">
									Por que criamos o Quartier Flow?
								</h2>
								<div className="space-y-4 text-gray-300 leading-relaxed">
									<p>
										Porque vimos o estresse desnecessário que a gestão manual
										causa a milhares de síndicos voluntários que dedicam seu
										tempo livre para cuidar do condomínio.
									</p>
									<p>
										Porque presenciamos conflitos entre vizinhos causados
										simplesmente por falta de informação clara e acessível.
									</p>
									<p>
										Porque sabemos que administradoras profissionais precisam de
										ferramentas modernas para escalar seus negócios sem
										comprometer a qualidade do serviço.
									</p>
									<p>
										Porque acreditamos que a tecnologia, quando bem aplicada,
										não apenas resolve problemas — ela melhora vidas.
									</p>
									<p className="font-bold text-white">
										O Quartier Flow é mais que um software. É uma nova forma de
										pensar e gerenciar condomínios, baseada em transparência,
										eficiência e respeito mútuo.
									</p>
								</div>
							</div>
						</div>
					</Container>
				</Section>

				{/* Team Section */}
				<Section>
					<Container size="2xl">
						<SectionHeader
							title="Quem Está Por Trás"
							subtitle="Conheça o desenvolvedor principal do Quartier Flow"
						/>

						<div className="grid gap-8 md:grid-cols-2 md:gap-12">
							<div className="relative">
								<Image
									src={nelsonImage}
									alt="Nelson Kenzo Tamashiro - Desenvolvedor Fullstack Principal"
									className="border border-gray-800 object-cover"
								/>
							</div>
							<div>
								<h3 className="mb-4 font-bold text-2xl md:text-3xl">
									Nelson Kenzo Tamashiro
								</h3>
								<p className="mb-4 text-gray-400 text-lg">
									Desenvolvedor Fullstack Principal
								</p>
								<div className="space-y-4 text-gray-300 leading-relaxed">
									<p>
										Com mais de 5 anos de experiência em desenvolvimento de
										software, Nelson é responsável por toda a arquitetura e
										implementação técnica do Quartier Flow.
									</p>
									<p>
										Especialista em frontend, backend e gerenciamento de banco
										de dados, já desenvolveu soluções completas para diversas
										áreas, incluindo sistemas de gerenciamento de projetos,
										plataformas de e-commerce e aplicações financeiras.
									</p>
									<p>
										Sua experiência multidisciplinar permite criar uma
										plataforma robusta, escalável e intuitiva, combinando as
										melhores práticas de desenvolvimento com foco na experiência
										do usuário.
									</p>
								</div>

								<div className="mt-6 flex gap-4">
									<a
										href="https://www.linkedin.com/in/nelson-kenzo-tamashiro/"
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 border border-white bg-white px-4 py-2 font-bold text-black transition-all hover:bg-black hover:text-white"
									>
										💼 LinkedIn
									</a>
									<a
										href="mailto:nelsonkenzotamashiro@gmail.com"
										className="inline-flex items-center gap-2 border border-gray-800 bg-black/50 px-4 py-2 font-bold text-white transition-all hover:border-white"
									>
										📧 Contato
									</a>
								</div>
							</div>
						</div>
					</Container>
				</Section>

				{/* CTA Final */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="border border-gray-800 bg-black/50 p-8 backdrop-blur-sm md:p-12">
							<h2 className="mb-4 font-bold text-2xl md:text-3xl">
								Junte-se à revolução da gestão condominial
							</h2>
							<p className="mb-6 text-gray-400">
								Cadastre-se na lista de espera e seja um dos primeiros a
								experimentar o Quartier Flow
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
