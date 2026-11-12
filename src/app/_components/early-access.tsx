export function EarlyAccess() {
	const benefits = [
		{
			icon: "⚡",
			title: "Cadastro Guiado",
			description:
				"Administradora, plano e conta de recebimento passo a passo, com vídeos na Central de ajuda",
		},
		{
			icon: "🎓",
			title: "Treinamento Personalizado",
			description: "Onboarding exclusivo com nossa equipe especializada",
		},
	];

	return (
		<section id="early-access" className="w-full px-2 py-8 md:px-6 md:py-20">
			<div className="mx-auto w-full max-w-6xl">
				{/* Early Access Benefits */}
				<div className="mb-12 text-center md:mb-20">
					<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">
						Comece com Apoio
					</h2>
					<p className="mb-8 text-base text-gray-400 md:mb-12 md:text-xl">
						Você não precisa descobrir tudo sozinho
					</p>

					{/* Benefits Grid */}
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-6">
						{benefits.map((benefit, index) => (
							<div
								key={index}
								className="border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white md:p-6"
							>
								<div className="mb-2 text-3xl md:mb-4 md:text-4xl">
									{benefit.icon}
								</div>
								<h3 className="mb-1 font-bold text-base md:mb-2 md:text-lg">
									{benefit.title}
								</h3>
								<p className="text-gray-400 text-xs md:text-sm">
									{benefit.description}
								</p>
							</div>
						))}
					</div>
				</div>

				{/* CTA */}
				<div className="border-2 border-white bg-black/50 p-4 text-center backdrop-blur-sm md:p-12">
					<h3 className="mb-2 font-bold text-2xl md:mb-4 md:text-3xl">
						Pronto para Começar?
					</h3>
					<p className="mb-4 text-gray-400 text-sm md:mb-6 md:text-base">
						Crie sua conta com Google ou com um link por email. Nada é
						contratado antes da sua confirmação.
					</p>
					<a
						href="/cadastro"
						className="inline-block border-2 border-white bg-white px-6 py-3 font-bold text-black transition-all hover:bg-black hover:text-white md:px-8 md:py-4 md:text-lg"
					>
						Criar Conta →
					</a>
				</div>
			</div>
		</section>
	);
}
