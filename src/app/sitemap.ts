import type { MetadataRoute } from "next";

import { HELP_ARTICLES } from "./ajuda/articles";

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = "https://quartierflow.com";

	// Blog posts slugs
	const blogPosts = [
		"reduzir-inadimplencia",
		"guia-assembleia",
		"lgpd-condominios",
		"automatizacao-gestao",
	];

	return [
		{
			url: baseUrl,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 1.0,
		},
		{
			url: `${baseUrl}/blog`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		{
			url: `${baseUrl}/ajuda`,
			lastModified: new Date(),
			changeFrequency: "weekly",
			priority: 0.8,
		},
		...HELP_ARTICLES.map((article) => ({
			url: `${baseUrl}/ajuda/${article.slug}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: 0.7,
		})),
		...blogPosts.map((slug) => ({
			url: `${baseUrl}/blog/${slug}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: 0.7,
		})),
	];
}
