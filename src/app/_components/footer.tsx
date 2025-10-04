import Link from "next/link";

export function Footer() {
	const footerLinks = {
		produto: [
			{ label: "Recursos", href: "/#features" },
			{ label: "Casos de Uso", href: "/casos-de-uso" },
			{ label: "Preços", href: "/precos" },
		],
		conteudo: [
			{ label: "Blog", href: "/blog" },
			{ label: "FAQ", href: "/faq" },
		],
		empresa: [
			{ label: "Sobre", href: "/sobre" },
			{ label: "Contato", href: "/contato" },
		],
		legal: [
			{ label: "Termos", href: "/termos" },
			{ label: "Privacidade", href: "/privacidade" },
			{ label: "LGPD", href: "/lgpd" },
		],
	};

	return (
		<footer className="relative z-10 border-gray-800/50 border-t bg-black text-white">
			<div className="mx-auto max-w-7xl px-2 py-8 md:px-6 md:py-16">
				{/* Main Footer Content */}
				<div className="grid gap-8 md:grid-cols-12 md:gap-12">
					{/* Logo and Description */}
					<div className="md:col-span-4">
						<div className="mb-4 flex items-center gap-2">
							<div className="font-bold text-xl">Quartier Flow</div>
							<span className="border border-gray-700 px-2 py-1 text-gray-400 text-xs">
								BETA
							</span>
						</div>
						<p className="text-gray-400 text-sm leading-relaxed">
							Plataforma completa para gestão de condomínios. Transparência,
							comunicação e automação em uma única solução.
						</p>
					</div>

					{/* Links Grid */}
					<div className="grid grid-cols-2 gap-8 md:col-span-8 md:grid-cols-4">
						{/* Produto */}
						<div>
							<h3 className="mb-4 font-bold text-sm uppercase tracking-wide">
								Produto
							</h3>
							<ul className="space-y-2">
								{footerLinks.produto.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Conteúdo */}
						<div>
							<h3 className="mb-4 font-bold text-sm uppercase tracking-wide">
								Conteúdo
							</h3>
							<ul className="space-y-2">
								{footerLinks.conteudo.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Empresa */}
						<div>
							<h3 className="mb-4 font-bold text-sm uppercase tracking-wide">
								Empresa
							</h3>
							<ul className="space-y-2">
								{footerLinks.empresa.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>

						{/* Legal */}
						<div>
							<h3 className="mb-4 font-bold text-sm uppercase tracking-wide">
								Legal
							</h3>
							<ul className="space-y-2">
								{footerLinks.legal.map((link) => (
									<li key={link.href}>
										<Link
											href={link.href}
											className="text-gray-400 text-sm transition-colors hover:text-white"
										>
											{link.label}
										</Link>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>

				{/* Bottom Bar */}
				<div className="mt-8 border-gray-800 border-t pt-8 md:mt-12 md:pt-8">
					<div className="flex flex-col items-center justify-between gap-4 md:flex-row">
						<p className="text-center text-gray-500 text-xs md:text-sm">
							© {new Date().getFullYear()} Quartier Flow. Todos os direitos
							reservados.
						</p>

						{/* Social Links (optional - uncomment when ready) */}
						{/* <div className="flex gap-4">
							<a
								href="#"
								className="text-gray-400 transition-colors hover:text-white"
								aria-label="LinkedIn"
							>
								LinkedIn
							</a>
							<a
								href="#"
								className="text-gray-400 transition-colors hover:text-white"
								aria-label="Instagram"
							>
								Instagram
							</a>
						</div> */}
					</div>
				</div>
			</div>
		</footer>
	);
}
