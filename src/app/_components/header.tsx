"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export function Header() {
	const [isOpen, setIsOpen] = useState(false);
	const pathname = usePathname();
	const isHomePage = pathname === "/";

	const scrollToSection = (id: string) => {
		if (isHomePage) {
			const element = document.getElementById(id);
			element?.scrollIntoView({ behavior: "smooth" });
			setIsOpen(false);
		} else {
			// Navigate to home page with hash
			window.location.href = `/#${id}`;
		}
	};

	return (
		<header className="fixed top-0 z-50 w-full border-gray-800 border-b bg-black/80 backdrop-blur-md">
			<nav className="mx-auto flex max-w-7xl items-center justify-between px-2 py-2 md:px-6 md:py-4">
				{/* Logo */}
				<a href="/" className="flex items-center gap-2 md:gap-3">
					<div className="font-bold text-lg text-white md:text-xl">
						Quartier Flow
					</div>
					<span className="border border-gray-700 px-1.5 py-0.5 text-gray-400 text-xs md:px-2 md:py-1 md:text-xs">
						BETA
					</span>
				</a>

				{/* Desktop Navigation */}
				<div className="hidden items-center gap-6 md:flex">
					<button
						onClick={() => scrollToSection("features")}
						className="text-gray-300 text-sm transition-colors hover:text-white"
						type="button"
					>
						Recursos
					</button>
					<button
						onClick={() => scrollToSection("how-it-works")}
						className="text-gray-300 text-sm transition-colors hover:text-white"
						type="button"
					>
						Como Funciona
					</button>
					<button
						onClick={() => scrollToSection("pillars")}
						className="text-gray-300 text-sm transition-colors hover:text-white"
						type="button"
					>
						Soluções
					</button>
					<button
						onClick={() => scrollToSection("faq")}
						className="text-gray-300 text-sm transition-colors hover:text-white"
						type="button"
					>
						FAQ
					</button>
					<a
						href="/blog"
						className="text-gray-300 text-sm transition-colors hover:text-white"
					>
						Blog
					</a>
					<button
						onClick={() => scrollToSection("contact")}
						className="border border-white bg-white px-4 py-2 font-bold text-black text-sm transition-all hover:bg-gray-100"
						type="button"
					>
						Fale Conosco
					</button>
				</div>

				{/* Mobile Menu Button */}
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="text-white md:hidden"
					type="button"
					aria-label={isOpen ? "Fechar menu" : "Abrir menu"}
				>
					<svg
						className="h-6 w-6"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						role="img"
						aria-hidden="true"
					>
						<title>{isOpen ? "Fechar menu" : "Menu"}</title>
						{isOpen ? (
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						) : (
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M4 6h16M4 12h16M4 18h16"
							/>
						)}
					</svg>
				</button>
			</nav>

			{/* Mobile Menu */}
			{isOpen && (
				<div className="border-gray-800 border-t bg-black md:hidden">
					<div className="flex flex-col gap-2 px-2 py-2">
						<button
							onClick={() => scrollToSection("features")}
							className="px-4 py-2 text-left text-gray-300 text-sm transition-colors hover:text-white"
							type="button"
						>
							Recursos
						</button>
						<button
							onClick={() => scrollToSection("how-it-works")}
							className="px-4 py-2 text-left text-gray-300 text-sm transition-colors hover:text-white"
							type="button"
						>
							Como Funciona
						</button>
						<button
							onClick={() => scrollToSection("pillars")}
							className="px-4 py-2 text-left text-gray-300 text-sm transition-colors hover:text-white"
							type="button"
						>
							Soluções
						</button>
						<button
							onClick={() => scrollToSection("faq")}
							className="px-4 py-2 text-left text-gray-300 text-sm transition-colors hover:text-white"
							type="button"
						>
							FAQ
						</button>
						<a
							href="/blog"
							className="px-4 py-2 text-left text-gray-300 text-sm transition-colors hover:text-white"
						>
							Blog
						</a>
						<button
							onClick={() => scrollToSection("contact")}
							className="mx-4 border border-white bg-white px-4 py-2 font-bold text-black text-sm transition-all hover:bg-gray-100"
							type="button"
						>
							Fale Conosco
						</button>
					</div>
				</div>
			)}
		</header>
	);
}
