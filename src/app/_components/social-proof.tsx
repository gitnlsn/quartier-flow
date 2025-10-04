export function SocialProof() {
	const stats = [
		{
			number: "500+",
			label: "Condomínios Ativos",
		},
		{
			number: "50K+",
			label: "Unidades Gerenciadas",
		},
		{
			number: "98%",
			label: "Satisfação",
		},
		{
			number: "24/7",
			label: "Suporte Dedicado",
		},
	];

	const badges = [
		{
			icon: "🔒",
			title: "LGPD",
			subtitle: "Compliant",
		},
		{
			icon: "✓",
			title: "SSL",
			subtitle: "Certificado",
		},
		{
			icon: "⚡",
			title: "99.9%",
			subtitle: "Uptime",
		},
		{
			icon: "🛡️",
			title: "Dados",
			subtitle: "Criptografados",
		},
	];

	return (
		<section id="social-proof" className="w-full px-2 py-8 md:px-6 md:py-20">
			<div className="mx-auto w-full max-w-6xl">
				{/* Stats */}
				<div className="mb-8 grid grid-cols-2 gap-2 md:mb-16 md:grid-cols-4 md:gap-8">
					{stats.map((stat, index) => (
						<div
							key={index}
							className="border border-gray-800 bg-black/50 p-2 text-center backdrop-blur-sm transition-all duration-300 hover:border-white md:p-8"
						>
							<div className="mb-1 font-bold text-3xl text-white md:mb-2 md:text-5xl">
								{stat.number}
							</div>
							<div className="text-gray-400 text-xs md:text-base">
								{stat.label}
							</div>
						</div>
					))}
				</div>

				{/* Trust Badges */}
				<div className="mb-8 text-center md:mb-12">
					<h3 className="mb-4 font-bold text-white text-xl md:mb-6 md:text-2xl">
						Segurança e Confiabilidade
					</h3>
					<div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
						{badges.map((badge, index) => (
							<div
								key={index}
								className="flex flex-col items-center border border-gray-800 bg-black/50 p-2 backdrop-blur-sm transition-all duration-300 hover:border-white md:p-6"
							>
								<div className="mb-1 text-2xl md:mb-2 md:text-4xl">
									{badge.icon}
								</div>
								<div className="font-bold text-sm text-white md:text-base">
									{badge.title}
								</div>
								<div className="text-gray-400 text-xs md:text-sm">
									{badge.subtitle}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Testimonial placeholder */}
				<div className="border border-gray-800 bg-black/50 p-2 text-center backdrop-blur-sm md:p-12">
					<div className="mx-auto max-w-3xl">
						<div className="mb-2 text-4xl md:mb-4 md:text-6xl">"</div>
						<p className="mb-4 text-base text-gray-300 italic md:mb-6 md:text-xl">
							O Quartier Flow transformou completamente a gestão do nosso
							condomínio. Processos que levavam dias agora são resolvidos em
							minutos. Recomendo fortemente!
						</p>
						<div className="font-bold text-sm text-white md:text-base">
							João Silva
						</div>
						<div className="text-gray-400 text-xs md:text-sm">
							Síndico • Condomínio Jardim das Flores
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
