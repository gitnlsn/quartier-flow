import { Button, Container, Section, SectionHeader } from "./ui";

export function HowItWorks() {
	const steps = [
		{
			number: "01",
			title: "Cadastro Simples",
			description:
				"Crie sua conta em minutos. Adicione informações do condomínio e unidades.",
		},
		{
			number: "02",
			title: "Configure o Sistema",
			description:
				"Personalize módulos, regras e permissões de acordo com suas necessidades.",
		},
		{
			number: "03",
			title: "Gerencie com Eficiência",
			description:
				"Automatize processos, comunique-se facilmente e tome decisões baseadas em dados.",
		},
	];

	return (
		<Section id="how-it-works">
			<Container size="2xl">
				<SectionHeader
					title="Como Funciona"
					subtitle="Em 3 passos simples, seu condomínio estará pronto"
				/>

				<div className="relative">
					{/* Timeline line - hidden on mobile */}
					<div className="-translate-x-1/2 absolute top-0 left-1/2 hidden h-full w-px bg-gradient-to-b from-white via-gray-600 to-white md:block" />

					<div className="space-y-8 md:space-y-16">
						{steps.map((step, index) => (
							<div
								key={index}
								className={`flex flex-col items-start gap-4 md:flex-row md:items-center ${
									index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
								}`}
							>
								{/* Content */}
								<div
									className={`w-full md:w-5/12 ${
										index % 2 === 0 ? "md:text-right" : "md:text-left"
									}`}
								>
									<div className="border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white md:p-6">
										<div className="mb-2 font-bold text-4xl text-gray-600 md:text-6xl">
											{step.number}
										</div>
										<h3 className="mb-2 font-bold text-xl md:text-2xl">
											{step.title}
										</h3>
										<p className="text-gray-400 text-sm md:text-base">
											{step.description}
										</p>
									</div>
								</div>

								{/* Center dot */}
								<div className="hidden w-2/12 md:flex md:justify-center">
									<div className="h-4 w-4 border-2 border-white bg-white" />
								</div>

								{/* Spacer */}
								<div className="hidden w-5/12 md:block" />
							</div>
						))}
					</div>
				</div>

				{/* CTA */}
				<div className="mt-8 text-center md:mt-16">
					<p className="mb-4 text-gray-400 text-sm md:text-base">
						Quer fazer parte desde o início?
					</p>
					<Button href="#contact">Entrar na Lista de Espera →</Button>
				</div>
			</Container>
		</Section>
	);
}
