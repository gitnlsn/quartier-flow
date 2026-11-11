import { existsSync } from "node:fs";
import { join } from "node:path";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Footer } from "~/app/_components/footer";
import { Header } from "~/app/_components/header";
import { Container, Section } from "~/app/_components/ui";
import { WalkthroughGif } from "../_components/walkthrough-gif";
import {
	HELP_ARTICLES,
	HELP_CATEGORIES,
	type HelpArticle,
	getHelpArticle,
} from "../articles";

export function generateStaticParams() {
	return HELP_ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const article = getHelpArticle((await params).slug);
	if (!article) return {};
	return {
		title: `${article.title} | Central de ajuda`,
		description: article.summary,
		alternates: { canonical: `/ajuda/${article.slug}` },
	};
}

/** Only GIFs already recorded (public/ajuda) are shown. */
const gifPath = (file?: string) =>
	file && existsSync(join(process.cwd(), "public", "ajuda", file))
		? `/ajuda/${file}`
		: null;

function StructuredData({ article }: { article: HelpArticle }) {
	const data = [
		{
			"@context": "https://schema.org",
			"@type": "HowTo",
			name: article.title,
			description: article.summary,
			step: article.steps.map((step, i) => ({
				"@type": "HowToStep",
				position: i + 1,
				name: step.title,
				text: step.text,
			})),
		},
		{
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: article.faqs.map((faq) => ({
				"@type": "Question",
				name: faq.q,
				acceptedAnswer: { "@type": "Answer", text: faq.a },
			})),
		},
	];
	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: static JSON-LD from our own data
			dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
		/>
	);
}

export default async function HelpArticlePage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const article = getHelpArticle((await params).slug);
	if (!article) notFound();
	const category = HELP_CATEGORIES.find((c) => c.id === article.category);
	const related = article.related
		.map(getHelpArticle)
		.filter((a): a is HelpArticle => Boolean(a));

	return (
		<div className="relative min-h-screen bg-black text-white">
			<StructuredData article={article} />
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />
			<Header />
			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="lg">
						<nav aria-label="Navegação" className="mb-8 text-gray-500 text-sm">
							<a href="/ajuda" className="hover:text-white">
								Central de ajuda
							</a>
							{category && (
								<>
									{" / "}
									<a
										href={`/ajuda#${category.id}`}
										className="hover:text-white"
									>
										{category.title}
									</a>
								</>
							)}
						</nav>
						<p className="mb-3 text-gray-500 text-xs uppercase tracking-wide">
							{article.audience}
						</p>
						<h1 className="mb-6 font-extrabold text-3xl leading-tight md:text-5xl">
							{article.title}
						</h1>
						<p className="mb-12 text-gray-300 text-lg md:text-xl">
							{article.summary}
						</p>

						<ol className="space-y-12">
							{article.steps.map((step, i) => {
								const gif = gifPath(step.gif);
								return (
									<li key={step.title} className="space-y-4">
										<h2 className="flex items-baseline gap-3 font-bold text-2xl md:text-3xl">
											<span className="text-gray-600">{i + 1}.</span>
											{step.title}
										</h2>
										<p className="text-base text-gray-300 leading-relaxed md:text-lg">
											{step.text}
										</p>
										{gif && (
											<WalkthroughGif
												src={gif}
												alt={step.gifAlt ?? step.title}
											/>
										)}
									</li>
								);
							})}
						</ol>

						{article.faqs.length > 0 && (
							<section className="mt-16">
								<h2 className="mb-6 border-gray-800 border-b-2 pb-4 font-bold text-2xl md:text-3xl">
									Perguntas frequentes
								</h2>
								<dl className="space-y-6">
									{article.faqs.map((faq) => (
										<div key={faq.q}>
											<dt className="mb-2 font-bold text-lg">{faq.q}</dt>
											<dd className="text-gray-300 leading-relaxed">{faq.a}</dd>
										</div>
									))}
								</dl>
							</section>
						)}

						{related.length > 0 && (
							<section className="mt-16">
								<h2 className="mb-6 font-bold text-xl">Veja também</h2>
								<ul className="grid gap-3 md:grid-cols-2">
									{related.map((r) => (
										<li key={r.slug}>
											<a
												href={`/ajuda/${r.slug}`}
												className="block border border-gray-800 p-4 hover:border-white"
											>
												{r.title}
											</a>
										</li>
									))}
								</ul>
							</section>
						)}

						<p className="mt-16 text-gray-400">
							Ainda com dúvida?{" "}
							<a href="/contato" className="underline hover:text-white">
								Fale conosco
							</a>
							.
						</p>
					</Container>
				</Section>
			</main>
			<Footer />
		</div>
	);
}
