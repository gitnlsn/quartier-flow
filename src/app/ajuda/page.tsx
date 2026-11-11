import type { Metadata } from "next";

import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { Container, Section } from "../_components/ui";
import { HelpSearch } from "./_components/help-search";
import { HELP_ARTICLES } from "./articles";

export const metadata: Metadata = {
	title: "Central de ajuda",
	description:
		"Passo a passo do Quartier Flow: cadastro da administradora, condomínios, convites, cobranças por boleto e Pix, despesas e a área de moradores e síndicos.",
	alternates: { canonical: "/ajuda" },
};

/** First FAQ of each article: quick answers on the index. */
const QUICK = HELP_ARTICLES.flatMap((a) =>
	a.faqs.slice(0, 1).map((faq) => ({ ...faq, slug: a.slug })),
).slice(0, 8);

export default function AjudaPage() {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />
			<Header />
			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="xl">
						<h1 className="mb-6 animate-slide-up font-extrabold text-4xl leading-tight md:text-6xl">
							Central de ajuda
						</h1>
						<p className="max-w-3xl animate-fade-in text-gray-300 text-lg md:text-2xl">
							Passo a passo com animações das telas, para administradoras,
							síndicos e moradores.
						</p>
					</Container>
				</Section>
				<Section>
					<Container size="xl">
						<HelpSearch />
					</Container>
				</Section>
				<Section>
					<Container size="xl">
						<h2 className="mb-6 font-bold text-2xl md:text-3xl">
							Perguntas rápidas
						</h2>
						<div className="divide-y divide-gray-800 border-gray-800 border-y">
							{QUICK.map((faq) => (
								<details key={faq.q} className="group py-4">
									<summary className="cursor-pointer list-none font-medium text-lg marker:hidden">
										<span className="mr-2 text-gray-500 group-open:hidden">
											+
										</span>
										<span className="mr-2 hidden text-gray-500 group-open:inline">
											−
										</span>
										{faq.q}
									</summary>
									<p className="mt-3 text-gray-400 leading-relaxed">
										{faq.a}{" "}
										<a
											href={`/ajuda/${faq.slug}`}
											className="underline hover:text-white"
										>
											Ver o passo a passo
										</a>
									</p>
								</details>
							))}
						</div>
						<p className="mt-10 text-gray-400">
							Não encontrou o que procurava?{" "}
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
