import type { MetadataRoute } from "next";

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
		...blogPosts.map((slug) => ({
			url: `${baseUrl}/blog/${slug}`,
			lastModified: new Date(),
			changeFrequency: "monthly" as const,
			priority: 0.7,
		})),
	];
}
