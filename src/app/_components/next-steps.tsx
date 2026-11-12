import { Container, Section, SectionHeader } from "./ui";

/**
 * What comes after AvailableNow, from docs/features (MVP first, then
 * post-MVP). No dates: only order. Move an item to AvailableNow when its
 * module ships.
 */
const NEXT = [
	{
		title: "Em desenvolvimento",
		current: true,
		items: [
			"Prestação de contas e painel financeiro para conselho e moradores",
			"Mural de avisos com confirmação de leitura",
			"Chamados de manutenção",
			"Notificações por push e e-mail",
			"Controle de visitantes e acesso por QR code",
		],
	},
	{
		title: "Planejado",
		current: false,
		items: [
			"Assembleias e votações virtuais",
			"Livro de ocorrências",
			"Controle de encomendas",
			"Documentos do condomínio",
			"Fornecedores e inventário",
			"Agenda de tarefas do síndico",
			"Aplicativo para Android",
		],
	},
];

export function NextSteps() {
	return (
		<Section id="proximos-passos">
			<Container size="xl">
				<SectionHeader
					title="Próximos Passos"
					subtitle="O que vem depois do que já está disponível"
				/>
				<div className="grid gap-2 md:grid-cols-2 md:gap-6">
					{NEXT.map((group) => (
						<div
							key={group.title}
							className={`border-l-4 pl-2 md:pl-6 ${group.current ? "border-white" : "border-gray-800"}`}
						>
							<div className="h-full border border-gray-800 bg-black/50 p-2 backdrop-blur-sm md:p-6">
								<h3 className="mb-2 font-bold text-lg md:mb-4 md:text-2xl">
									{group.title}
								</h3>
								<ul className="space-y-1 md:space-y-2">
									{group.items.map((item) => (
										<li
											key={item}
											className="flex items-start gap-2 text-gray-300 text-sm md:text-base"
										>
											<span className="text-white">•</span>
											<span>{item}</span>
										</li>
									))}
								</ul>
							</div>
						</div>
					))}
				</div>
				<p className="mt-4 text-center text-gray-400 text-sm md:mt-8 md:text-base">
					Sente falta de algo?{" "}
					<a
						href="/contato"
						className="text-white underline underline-offset-4 hover:text-gray-300"
					>
						Sugira um módulo
					</a>
				</p>
			</Container>
		</Section>
	);
}
