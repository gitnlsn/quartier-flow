"use client";

import { useState } from "react";

import { HELP_ARTICLES, HELP_CATEGORIES, type HelpArticle } from "../articles";

const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

function matches(article: HelpArticle, query: string) {
	const haystack = normalize(
		[
			article.title,
			article.summary,
			...article.steps.map((s) => `${s.title} ${s.text}`),
			...article.faqs.map((f) => `${f.q} ${f.a}`),
		].join(" "),
	);
	return normalize(query)
		.split(/\s+/)
		.filter(Boolean)
		.every((word) => haystack.includes(word));
}

function ArticleLink({ article }: { article: HelpArticle }) {
	return (
		<a
			href={`/ajuda/${article.slug}`}
			className="group block border border-gray-800 p-4 transition-colors hover:border-white md:p-6"
		>
			<p className="mb-2 text-gray-500 text-xs uppercase tracking-wide">
				{article.audience}
			</p>
			<h3 className="mb-2 font-bold text-lg group-hover:underline md:text-xl">
				{article.title}
			</h3>
			<p className="text-gray-400 text-sm leading-relaxed">{article.summary}</p>
		</a>
	);
}

/** Search box plus the articles by category (filtered while typing). */
export function HelpSearch() {
	const [query, setQuery] = useState("");
	const results = query.trim()
		? HELP_ARTICLES.filter((a) => matches(a, query))
		: null;

	return (
		<div className="space-y-12">
			<div>
				<label htmlFor="help-search" className="sr-only">
					Buscar na ajuda
				</label>
				<input
					id="help-search"
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Buscar: convite, boleto, CEP, fatura..."
					className="w-full border border-gray-800 bg-black/50 px-4 py-3 text-white placeholder-gray-500 focus:border-white focus:outline-none"
				/>
			</div>

			{results ? (
				<section aria-live="polite">
					<h2 className="mb-6 font-bold text-2xl">
						{results.length === 0
							? "Nenhum artigo encontrado"
							: `${results.length} artigo${results.length === 1 ? "" : "s"}`}
					</h2>
					{results.length === 0 ? (
						<p className="text-gray-400">
							Tente outras palavras ou{" "}
							<a href="/contato" className="underline hover:text-white">
								fale conosco
							</a>
							.
						</p>
					) : (
						<div className="grid gap-4 md:grid-cols-2">
							{results.map((article) => (
								<ArticleLink key={article.slug} article={article} />
							))}
						</div>
					)}
				</section>
			) : (
				HELP_CATEGORIES.map((category) => (
					<section key={category.id} id={category.id}>
						<h2 className="mb-2 font-bold text-2xl md:text-3xl">
							{category.title}
						</h2>
						<p className="mb-6 text-gray-400">{category.description}</p>
						<div className="grid gap-4 md:grid-cols-2">
							{HELP_ARTICLES.filter((a) => a.category === category.id).map(
								(article) => (
									<ArticleLink key={article.slug} article={article} />
								),
							)}
						</div>
					</section>
				))
			)}
		</div>
	);
}
