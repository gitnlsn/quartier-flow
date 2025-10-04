export function EarlyAccess() {
	const benefits = [
		{
			icon: "💰",
			title: "Desconto Exclusivo",
			description: "50% OFF nos primeiros 6 meses de assinatura",
		},
		{
			icon: "🎁",
			title: "3 Meses Grátis",
			description:
				"Período trial estendido para testar todas as funcionalidades",
		},
		{
			icon: "⚡",
			title: "Acesso Prioritário",
			description: "Seja um dos primeiros a usar a plataforma quando lançarmos",
		},
		{
			icon: "🎓",
			title: "Treinamento Personalizado",
			description: "Onboarding exclusivo com nossa equipe especializada",
		},
	];

	const roadmap = [
		{
			phase: "Fase 1",
			title: "MVP - Fundação",
			date: "Janeiro 2025",
			status: "in-progress",
			items: [
				"Sistema de Pagamentos (Core)",
				"Cadastro e Autenticação de Condôminos",
				"Two-Factor Authentication (Email + SMS)",
				"Sistema de Tokens de Acesso",
			],
		},
		{
			phase: "Fase 2",
			title: "Gestão Financeira",
			date: "Março 2025",
			status: "planned",
			items: [
				"Controle de Inadimplência",
				"Dashboard do Administrador",
				"Comunicação com Moradores",
				"Relatórios Financeiros",
			],
		},
		{
			phase: "Fase 3",
			title: "Beta Fechado",
			date: "Maio 2025",
			status: "planned",
			items: [
				"Testes com Primeiros Clientes",
				"Módulo de Assembleias",
				"Reserva de Áreas Comuns",
				"Chamados de Manutenção",
			],
		},
		{
			phase: "Fase 4",
			title: "Lançamento Oficial",
			date: "Julho 2025",
			status: "planned",
			items: [
				"Integração com Bancos",
				"Suporte 24/7",
				"App Mobile (iOS/Android)",
				"Plataforma Completa",
			],
		},
	];

	return (
		<section id="early-access" className="w-full px-2 py-8 md:px-6 md:py-20">
			<div className="mx-auto w-full max-w-6xl">
				{/* Early Access Benefits */}
				<div className="mb-12 text-center md:mb-20">
					<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">
						Seja um dos Primeiros
					</h2>
					<p className="mb-8 text-base text-gray-400 md:mb-12 md:text-xl">
						Cadastre-se agora e garanta benefícios exclusivos no lançamento
					</p>

					{/* Benefits Grid */}
					<div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
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

				{/* Roadmap */}
				<div className="mb-12 md:mb-16">
					<div className="mb-8 text-center md:mb-12">
						<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">
							Roadmap de Desenvolvimento
						</h2>
						<p className="text-base text-gray-400 md:text-xl">
							Acompanhe o progresso e saiba o que está por vir
						</p>
					</div>

					{/* Timeline */}
					<div className="space-y-4 md:space-y-8">
						{roadmap.map((phase, index) => (
							<div
								key={index}
								className={`relative border-l-4 pl-4 md:pl-8 ${
									phase.status === "in-progress"
										? "border-white"
										: "border-gray-800"
								}`}
							>
								<div className="border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white md:p-6">
									<div className="mb-2 flex flex-wrap items-center gap-2 md:mb-4">
										<span className="border border-gray-700 px-2 py-1 font-bold text-white text-xs md:text-sm">
											{phase.phase}
										</span>
										<span className="text-gray-500 text-xs md:text-sm">•</span>
										<span className="text-gray-400 text-xs md:text-sm">
											{phase.date}
										</span>
										{phase.status === "in-progress" && (
											<>
												<span className="text-gray-500 text-xs md:text-sm">
													•
												</span>
												<span className="text-white text-xs md:text-sm">
													⚡ Em Progresso
												</span>
											</>
										)}
									</div>

									<h3 className="mb-2 font-bold text-lg text-white md:mb-4 md:text-2xl">
										{phase.title}
									</h3>

									<ul className="space-y-1 md:space-y-2">
										{phase.items.map((item, i) => (
											<li
												key={i}
												className="flex items-start gap-2 text-gray-300 text-xs md:text-base"
											>
												<span className="mt-1 text-white">•</span>
												<span>{item}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* CTA */}
				<div className="border-2 border-white bg-black/50 p-4 text-center backdrop-blur-sm md:p-12">
					<h3 className="mb-2 font-bold text-2xl md:mb-4 md:text-3xl">
						Garanta Seu Lugar na Lista de Espera
					</h3>
					<p className="mb-4 text-gray-400 text-sm md:mb-6 md:text-base">
						Vagas limitadas para o período beta. Cadastre-se agora e não perca
						essa oportunidade.
					</p>
					<a
						href="#contact"
						className="inline-block border-2 border-white bg-white px-6 py-3 font-bold text-black transition-all hover:bg-black hover:text-white md:px-8 md:py-4 md:text-lg"
					>
						Quero Fazer Parte →
					</a>
				</div>
			</div>
		</section>
	);
}
