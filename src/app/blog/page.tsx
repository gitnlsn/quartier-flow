"use client";

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Container, Section, SectionHeader } from "../_components/ui";
import { blogPosts } from "./[slug]/blog-posts";

const categories = [
	"Todas",
	"Gestão Financeira",
	"Comunicação",
	"Tecnologia",
	"Manutenção",
	"Legislação",
	"Gestão",
];

export default function BlogIndexPage() {
	const [selectedCategory, setSelectedCategory] = useState("Todas");
	const [searchQuery, setSearchQuery] = useState("");

	const posts = Object.values(blogPosts);

	const filteredPosts = posts.filter((post) => {
		const matchesCategory =
			selectedCategory === "Todas" || post.category === selectedCategory;
		const matchesSearch =
			searchQuery === "" ||
			post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
			post.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCategory && matchesSearch;
	});

	return (
		<div className="relative min-h-screen bg-black text-white">
			{/* Background layers */}
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="2xl">
						<SectionHeader
							title="Blog Quartier Flow"
							subtitle="Conteúdo educativo sobre gestão condominial, tecnologia e boas práticas"
						/>

						{/* Search and Filters */}
						<div className="mb-8 space-y-4 md:mb-12">
							{/* Search */}
							<div className="relative">
								<input
									type="text"
									placeholder="Buscar artigos..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full border border-gray-800 bg-black/50 px-4 py-3 text-white placeholder-gray-500 backdrop-blur-sm transition-all focus:border-white focus:outline-none"
								/>
								<span className="-translate-y-1/2 absolute top-1/2 right-4 text-gray-500">
									🔍
								</span>
							</div>

							{/* Category Filters */}
							<div className="flex flex-wrap gap-2">
								{categories.map((category) => (
									<button
										key={category}
										type="button"
										onClick={() => setSelectedCategory(category)}
										className={`border px-4 py-2 text-sm transition-all ${
											selectedCategory === category
												? "border-white bg-white text-black"
												: "border-gray-800 bg-black/50 text-gray-400 hover:border-white hover:text-white"
										}`}
									>
										{category}
									</button>
								))}
							</div>
						</div>

						{/* Results Count */}
						<div className="mb-6 text-gray-400 text-sm">
							{filteredPosts.length}{" "}
							{filteredPosts.length === 1
								? "artigo encontrado"
								: "artigos encontrados"}
						</div>

						{/* Blog Posts Grid */}
						{filteredPosts.length > 0 ? (
							<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
								{filteredPosts.map((post) => (
									<Link
										key={post.slug}
										href={`/blog/${post.slug}`}
										className="group border border-gray-800 bg-black/50 backdrop-blur-sm transition-all hover:border-white hover:shadow-2xl hover:shadow-white/10"
									>
										{/* Image */}
										<div className="relative aspect-video overflow-hidden">
											<Image
												src={post.heroImage}
												alt={post.heroImageAlt}
												className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
											/>
											<div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
											<span className="absolute top-4 left-4 border border-gray-600 bg-black/80 px-3 py-1 font-semibold text-xs uppercase tracking-wide">
												{post.category}
											</span>
										</div>

										{/* Content */}
										<div className="p-4 md:p-6">
											<div className="mb-3 flex items-center gap-2 text-gray-500 text-xs">
												<span>{post.publishedDate}</span>
												<span>•</span>
												<span>{post.readTime} min</span>
											</div>
											<h3 className="mb-2 font-bold text-lg leading-tight transition-colors group-hover:text-gray-300 md:text-xl">
												{post.title}
											</h3>
											<p className="line-clamp-2 text-gray-400 text-sm">
												{post.subtitle}
											</p>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="py-20 text-center">
								<p className="mb-4 text-gray-400 text-xl">
									Nenhum artigo encontrado
								</p>
								<p className="text-gray-500 text-sm">
									Tente ajustar os filtros ou buscar por outros termos
								</p>
							</div>
						)}
					</Container>
				</Section>

				{/* CTA Section */}
				<Section>
					<Container size="lg" className="text-center">
						<div className="border border-gray-800 bg-black/50 p-8 backdrop-blur-sm md:p-12">
							<h2 className="mb-4 font-bold text-2xl md:text-3xl">
								Quer receber novos artigos por e-mail?
							</h2>
							<p className="mb-6 text-gray-400">
								Cadastre-se na lista de espera e receba conteúdo exclusivo sobre
								gestão condominial
							</p>
							<Link
								href="/#contact"
								className="inline-block border-2 border-white bg-white px-6 py-3 font-bold text-black transition-all hover:bg-black hover:text-white md:px-8 md:py-4"
							>
								Cadastrar na Lista →
							</Link>
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
