import Image from "next/image";
import bills1 from "~/assets/landing-page/bills-1.jpg";
import meeting1 from "~/assets/landing-page/meeting-1.jpg";
import notes1 from "~/assets/landing-page/notes-1.jpg";
import planning1 from "~/assets/landing-page/planning-1.jpg";
import { Container, Section, SectionHeader } from "./ui";

export function VisualSection() {
	return (
		<Section id="visual">
			<Container size="4xl">
				<SectionHeader
					title="Gestão na Prática"
					subtitle="Veja como a plataforma funciona no dia a dia"
				/>

				{/* Bento Grid */}
				<div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
					{/* Large item - Bills */}
					<div className="group relative col-span-2 row-span-2 overflow-hidden border border-gray-800 bg-black/50 transition-all duration-300 hover:border-white">
						<Image
							src={bills1}
							alt="Gestão Financeira"
							className="h-full w-full object-cover opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
						/>
						<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent p-2 md:p-6">
							<h3 className="font-bold text-lg text-white md:text-2xl">
								Gestão Financeira
							</h3>
							<p className="text-gray-300 text-xs md:text-sm">
								Controle total de contas e despesas
							</p>
						</div>
					</div>

					{/* Meeting */}
					<div className="group relative col-span-1 row-span-1 overflow-hidden border border-gray-800 bg-black/50 transition-all duration-300 hover:border-white">
						<Image
							src={meeting1}
							alt="Assembleias"
							className="h-full w-full object-cover opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
						/>
						<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent p-2">
							<h3 className="font-bold text-sm text-white md:text-base">
								Assembleias
							</h3>
						</div>
					</div>

					{/* Notes */}
					<div className="group relative col-span-1 row-span-1 overflow-hidden border border-gray-800 bg-black/50 transition-all duration-300 hover:border-white">
						<Image
							src={notes1}
							alt="Comunicação"
							className="h-full w-full object-cover opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
						/>
						<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent p-2">
							<h3 className="font-bold text-sm text-white md:text-base">
								Comunicação
							</h3>
						</div>
					</div>

					{/* Planning - Wide */}
					<div className="group relative col-span-2 row-span-1 overflow-hidden border border-gray-800 bg-black/50 transition-all duration-300 hover:border-white">
						<Image
							src={planning1}
							alt="Planejamento"
							className="h-full w-full object-cover opacity-60 transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
						/>
						<div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black via-black/50 to-transparent p-2 md:p-4">
							<h3 className="font-bold text-base text-white md:text-xl">
								Planejamento Estratégico
							</h3>
							<p className="text-gray-300 text-xs md:text-sm">
								Organize metas e orçamentos
							</p>
						</div>
					</div>
				</div>
			</Container>
		</Section>
	);
}
