import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BlogLayout } from "~/app/_components/layouts/blog-layout";
import { getAllBlogSlugs, getBlogPost } from "./blog-posts";

export async function generateStaticParams() {
	const slugs = getAllBlogSlugs();
	return slugs.map((slug) => ({
		slug: slug,
	}));
}

export default async function BlogPostPage({
	params,
}: {
	params: Promise<{ slug: string }>;
}) {
	const { slug } = await params;
	const post = getBlogPost(slug);

	if (!post) {
		notFound();
	}

	return (
		<BlogLayout
			title={post.title}
			subtitle={post.subtitle}
			category={post.category}
			publishedDate={post.publishedDate}
			readTime={post.readTime}
			heroImage={post.heroImage}
			heroImageAlt={post.heroImageAlt}
		>
			{post.content.sections.map((section, index) => {
				switch (section.type) {
					case "h2":
						return (
							<h2
								key={index}
								className="mt-16 mb-6 border-gray-800 border-b-2 pb-4 font-bold text-3xl text-white tracking-tight md:text-5xl"
							>
								{section.content}
							</h2>
						);
					case "h3":
						return (
							<h3
								key={index}
								className="mt-10 mb-5 font-bold text-2xl text-white tracking-tight md:text-3xl"
							>
								{section.content}
							</h3>
						);
					case "p":
						return (
							<p
								key={index}
								className="mb-6 text-base text-gray-300 leading-relaxed md:text-lg"
							>
								{section.content}
							</p>
						);
					case "ul":
						return (
							<ul key={index} className="mb-8 ml-6 list-disc text-gray-300">
								{Array.isArray(section.content) &&
									section.content.map((item, i) => (
										<li key={i} className="mb-2 text-base md:text-lg">
											{item}
										</li>
									))}
							</ul>
						);
					case "ol":
						return (
							<ol key={index} className="mb-8 ml-6 list-decimal text-gray-300">
								{Array.isArray(section.content) &&
									section.content.map((item, i) => (
										<li key={i} className="mb-2 text-base md:text-lg">
											{item}
										</li>
									))}
							</ol>
						);
					case "image":
						return section.image ? (
							<Image
								key={index}
								src={section.image.src}
								alt={section.image.alt}
								className="my-8 w-full border border-gray-800"
							/>
						) : null;
					default:
						return null;
				}
			})}
		</BlogLayout>
	);
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ slug: string }>;
}): Promise<Metadata> {
	const { slug } = await params;
	const post = getBlogPost(slug);

	if (!post) {
		return {
			title: "Post não encontrado - Quartier Flow",
		};
	}

	const metaKeywords: Record<string, string[]> = {
		"transparencia-condominios": [
			"transparência condomínio",
			"prestação de contas",
			"síndico transparente",
			"gestão financeira condomínio",
		],
		"comunicacao-eficaz-condominios": [
			"comunicação condomínio",
			"evitar conflitos",
			"gestão condominial",
			"síndico comunicação",
		],
		"automatizar-gestao-condominial": [
			"automação condomínio",
			"tecnologia condomínio",
			"software gestão condominial",
			"digitalização condomínio",
		],
		"reduzir-inadimplencia": [
			"inadimplência condomínio",
			"reduzir inadimplência",
			"cobrança condomínio",
			"gestão financeira condomínio",
		],
	};

	return {
		title: `${post.title} | Blog Quartier Flow`,
		description: post.subtitle,
		keywords: metaKeywords[slug] ?? [],
		openGraph: {
			title: post.title,
			description: post.subtitle,
			type: "article",
			publishedTime: post.publishedDate,
			authors: ["Quartier Flow"],
			url: `https://quartierflow.com/blog/${slug}`,
		},
		twitter: {
			card: "summary_large_image",
			title: post.title,
			description: post.subtitle,
		},
	};
}
