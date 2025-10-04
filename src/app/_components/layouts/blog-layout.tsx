import type { StaticImageData } from "next/image";
import Image from "next/image";
import type { ReactNode } from "react";
import { Footer } from "../footer";
import { Header } from "../header";
import { Container } from "../ui";

interface BlogLayoutProps {
	children: ReactNode;
	title: string;
	subtitle?: string;
	publishedDate?: string;
	readTime?: string;
	category?: string;
	heroImage?: StaticImageData | string;
	heroImageAlt?: string;
}

export function BlogLayout({
	children,
	title,
	subtitle,
	publishedDate,
	readTime,
	category,
	heroImage,
	heroImageAlt = "",
}: BlogLayoutProps) {
	return (
		<div className="relative min-h-screen bg-black text-white">
			{/* Background layers */}
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			{/* Main content */}
			<main className="relative z-10 pt-0">
				{/* Article Header */}
				<Container size="lg" className="px-4 py-8 pt-0 md:px-6 md:py-12">
					<div className="mb-8 md:mb-12">
						{/* Back to blog */}
						<div className="mt-16 border-gray-800 border-t pt-2 md:mt-16 md:pt-12">
							<a
								href="/blog"
								className="inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
							>
								← Voltar para o blog
							</a>
						</div>

						{/* Category & Meta */}
						<div className="mb-4 flex flex-wrap items-center gap-3 text-gray-400 text-sm md:gap-4">
							{category && (
								<span className="border border-gray-600 bg-gray-800/50 px-3 py-1 font-semibold uppercase tracking-wide">
									{category}
								</span>
							)}
							{publishedDate && <span>{publishedDate}</span>}
							{readTime && (
								<>
									<span>•</span>
									<span>{readTime} min de leitura</span>
								</>
							)}
						</div>

						{/* Title */}
						<h1 className="mb-4 font-extrabold text-4xl leading-tight tracking-tight md:mb-6 md:text-6xl lg:text-7xl">
							{title}
						</h1>

						{/* Subtitle */}
						{subtitle && (
							<p className="text-gray-300 text-xl md:text-2xl">{subtitle}</p>
						)}
					</div>

					{/* Hero Image */}
					{heroImage && (
						<div className="relative aspect-video w-full overflow-hidden border border-gray-800">
							<Image
								src={heroImage}
								alt={heroImageAlt}
								className="h-full w-full object-cover"
								priority
							/>
						</div>
					)}
				</Container>

				{/* Article Content */}
				<Container size="lg" className="px-4 pb-20 md:px-6">
					<article className="prose prose-invert prose-lg prose-img:my-8 prose-h2:mt-16 prose-h3:mt-10 prose-h2:mb-6 prose-h3:mb-5 prose-li:mb-2 prose-ol:mb-8 prose-p:mb-6 prose-ul:mb-8 prose-ol:ml-6 prose-ul:ml-6 max-w-none prose-ol:list-decimal prose-ul:list-disc prose-img:border prose-h2:border-gray-800 prose-img:border-gray-800 prose-h2:border-b-2 prose-h2:pb-4 prose-headings:font-bold prose-strong:font-bold prose-a:text-white prose-h2:text-3xl prose-h3:text-2xl prose-headings:text-white prose-li:text-base prose-ol:text-gray-300 prose-p:text-base prose-p:text-gray-300 prose-strong:text-white prose-ul:text-gray-300 prose-p:leading-relaxed prose-headings:tracking-tight prose-a:underline prose-a:decoration-gray-600 hover:prose-a:decoration-white prose-h2:md:text-5xl prose-h3:md:text-3xl prose-li:md:text-lg prose-p:md:text-lg">
						{children}
					</article>

					{/* Back to blog */}
					<div className="mt-12 border-gray-800 border-t pt-8 md:mt-16 md:pt-12">
						<a
							href="/blog"
							className="inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
						>
							← Voltar para o blog
						</a>
					</div>
				</Container>
			</main>

			<Footer />
		</div>
	);
}
