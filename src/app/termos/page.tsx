import { termsVersionLabel } from "~/lib/terms";
import { Footer } from "../_components/footer";
import { Header } from "../_components/header";
import { TermsContent } from "../_components/terms-content";
import { Container, Section } from "../_components/ui";

export default function TermosPage() {
	return (
		<div className="relative min-h-screen bg-black text-white">
			<div className="fixed inset-0 overflow-hidden bg-radial-gradient" />
			<div className="fixed inset-0 overflow-hidden bg-dot-pattern" />

			<Header />

			<main className="relative z-10 pt-20 md:pt-32">
				<Section>
					<Container size="lg">
						<h1 className="mb-4 font-extrabold text-4xl md:text-6xl">
							Termos de Uso
						</h1>
						<p className="mb-8 text-gray-400">
							Última atualização: {termsVersionLabel()}
						</p>

						<div className="space-y-6 text-gray-300 leading-relaxed">
							<TermsContent variant="site" />
						</div>
					</Container>
				</Section>
			</main>

			<Footer />
		</div>
	);
}
