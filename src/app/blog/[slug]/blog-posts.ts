import type { StaticImageData } from "next/image";
import type { ReactNode } from "react";

// Imagens
import billsImage1 from "~/assets/landing-page/bills-1.jpg";
import billsImage2 from "~/assets/landing-page/bills-2.jpg";
import billsImage3 from "~/assets/landing-page/bills-3.jpg";
import hallImage from "~/assets/landing-page/hall-1.jpg";
import meetingImage2 from "~/assets/landing-page/meeting-2.jpg";
import meetingImage3 from "~/assets/landing-page/meeting-3.jpg";
import meetingImage4 from "~/assets/landing-page/meeting-4.jpg";
import notesImage1 from "~/assets/landing-page/notes-1.jpg";
import notesImage2 from "~/assets/landing-page/notes-2.jpg";
import notesImage3 from "~/assets/landing-page/notes-3.jpg";
import planningImage1 from "~/assets/landing-page/planning-1.jpg";
import planningImage2 from "~/assets/landing-page/planning-2.jpg";

export interface BlogPost {
	slug: string;
	title: string;
	subtitle: string;
	category: string;
	publishedDate: string;
	readTime: string;
	heroImage: StaticImageData;
	heroImageAlt: string;
	content: {
		sections: BlogSection[];
	};
}

export interface BlogSection {
	type: "h2" | "h3" | "p" | "ul" | "ol" | "image";
	content: string | string[];
	image?: {
		src: StaticImageData;
		alt: string;
	};
}

export const blogPosts: Record<string, BlogPost> = {
	"transparencia-condominios": {
		slug: "transparencia-condominios",
		title: "Síndico Transparente, Condomínio Feliz",
		subtitle: "Um guia completo para prestações de contas claras e eficientes",
		category: "Gestão Financeira",
		publishedDate: "3 de outubro de 2025",
		readTime: "8",
		heroImage: billsImage1,
		heroImageAlt: "Gestão financeira transparente de condomínios",
		content: {
			sections: [
				{
					type: "h2",
					content: "Por que a transparência é fundamental?",
				},
				{
					type: "p",
					content:
						"A transparência na gestão condominial não é apenas uma boa prática — é um requisito essencial para construir confiança entre síndicos, administradores e moradores. Quando as finanças são apresentadas de forma clara e acessível, todo o condomínio se beneficia.",
				},
				{
					type: "h2",
					content: "Os pilares da transparência financeira",
				},
				{
					type: "h3",
					content: "1. Prestação de contas regular",
				},
				{
					type: "p",
					content:
						"Estabeleça um cronograma fixo para apresentação de relatórios financeiros. Mensalmente, disponibilize balancetes detalhados com:",
				},
				{
					type: "ul",
					content: [
						"Receitas discriminadas por unidade e tipo",
						"Despesas categorizadas (manutenção, limpeza, segurança, etc.)",
						"Extratos bancários completos",
						"Previsão de gastos futuros",
					],
				},
				{
					type: "h3",
					content: "2. Acesso digital aos documentos",
				},
				{
					type: "p",
					content:
						"Utilize plataformas digitais para disponibilizar documentos financeiros 24/7. Isso elimina a necessidade de solicitações individuais e demonstra proatividade na comunicação.",
				},
				{
					type: "h3",
					content: "3. Assembleias transparentes",
				},
				{
					type: "p",
					content:
						"Durante as assembleias, apresente dados financeiros de forma visual e compreensível. Gráficos e comparativos históricos ajudam os moradores a entenderem a evolução financeira do condomínio.",
				},
				{
					type: "image",
					content: "",
					image: {
						src: meetingImage3,
						alt: "Assembleia de condomínio transparente",
					},
				},
				{
					type: "h2",
					content: "Como o Quartier Flow facilita a transparência",
				},
				{
					type: "p",
					content:
						"Nossa plataforma foi desenvolvida especificamente para simplificar a prestação de contas condominiais:",
				},
				{
					type: "ul",
					content: [
						"Relatórios automáticos: Balancetes gerados automaticamente a cada mês",
						"Acesso controlado: Cada morador pode acessar relatórios financeiros através de login seguro",
						"Gráficos intuitivos: Visualizações que facilitam o entendimento das finanças",
						"Histórico completo: Todos os documentos armazenados de forma organizada e pesquisável",
					],
				},
				{
					type: "h2",
					content: "Dicas práticas para síndicos",
				},
				{
					type: "image",
					content: "",
					image: {
						src: notesImage2,
						alt: "Comunicação eficaz em condomínios",
					},
				},
				{
					type: "h3",
					content: "Comunique-se proativamente",
				},
				{
					type: "p",
					content:
						"Não espere que os moradores solicitem informações. Envie resumos mensais por e-mail e publique atualizações nos canais oficiais do condomínio.",
				},
				{
					type: "h3",
					content: "Simplifique a linguagem",
				},
				{
					type: "p",
					content:
						"Nem todos os moradores têm familiaridade com termos contábeis. Traduza jargões técnicos para uma linguagem acessível e forneça explicações quando necessário.",
				},
				{
					type: "h3",
					content: "Esteja disponível para dúvidas",
				},
				{
					type: "p",
					content:
						"Estabeleça canais claros para esclarecimento de dúvidas financeiras. Responda com agilidade e paciência, demonstrando compromisso com a transparência.",
				},
				{
					type: "h2",
					content: "Conclusão",
				},
				{
					type: "p",
					content:
						"Um síndico transparente constrói um condomínio mais harmonioso e eficiente. Ao adotar práticas claras de prestação de contas e utilizar ferramentas adequadas, você não apenas cumpre suas obrigações legais, mas também fortalece a confiança e o engajamento dos moradores.",
				},
				{
					type: "p",
					content:
						"Quer simplificar a gestão financeira do seu condomínio? Cadastre-se na lista de espera do Quartier Flow e seja avisado quando a plataforma estiver disponível.",
				},
			],
		},
	},
	"comunicacao-eficaz-condominios": {
		slug: "comunicacao-eficaz-condominios",
		title: "Comunicação em Condomínios: 7 Estratégias Comprovadas",
		subtitle: "Evite conflitos e engaje moradores com comunicação eficaz",
		category: "Comunicação",
		publishedDate: "3 de outubro de 2025",
		readTime: "10",
		heroImage: notesImage1,
		heroImageAlt: "Comunicação eficaz em condomínios",
		content: {
			sections: [
				{
					type: "h2",
					content: "Por que a comunicação é o pilar da harmonia condominial?",
				},
				{
					type: "p",
					content:
						"A falta de comunicação clara é a raiz de 80% dos conflitos em condomínios. Quando moradores não são informados adequadamente ou não têm canais para expressar suas preocupações, surgem mal-entendidos, desconfiança e tensões desnecessárias.",
				},
				{
					type: "h2",
					content: "7 Estratégias para Comunicação Eficaz",
				},
				{
					type: "h3",
					content: "1. Estabeleça canais oficiais de comunicação",
				},
				{
					type: "p",
					content:
						"Defina quais são os canais oficiais do condomínio e comunique isso a todos os moradores. Pode ser um aplicativo, e-mail, mural físico ou digital. O importante é que todos saibam onde buscar e compartilhar informações.",
				},
				{
					type: "ul",
					content: [
						"Evite usar grupos informais de WhatsApp como canal oficial",
						"Centralize comunicados importantes em uma única plataforma",
						"Mantenha registros de todas as comunicações importantes",
					],
				},
				{
					type: "h3",
					content: "2. Seja proativo, não reativo",
				},
				{
					type: "p",
					content:
						"Não espere que surjam problemas para se comunicar. Envie atualizações regulares sobre a gestão, manutenções programadas, eventos e decisões tomadas.",
				},
				{
					type: "image",
					content: "",
					image: {
						src: meetingImage2,
						alt: "Reunião de condomínio proativa",
					},
				},
				{
					type: "h3",
					content: "3. Use linguagem clara e acessível",
				},
				{
					type: "p",
					content:
						"Evite jargões técnicos ou burocráticos. Lembre-se que nem todos os moradores têm familiaridade com termos de gestão condominial. Traduza informações complexas em linguagem simples.",
				},
				{
					type: "h3",
					content: "4. Implemente um sistema de confirmação de leitura",
				},
				{
					type: "p",
					content:
						"Para comunicados importantes (como assembleias, manutenções que afetam o acesso, mudanças nas regras), use sistemas que permitam confirmar que a mensagem foi recebida e lida.",
				},
				{
					type: "h3",
					content: "5. Crie um canal para feedback e sugestões",
				},
				{
					type: "p",
					content:
						"Os moradores precisam sentir que têm voz. Disponibilize um canal estruturado para receber feedbacks, sugestões e reclamações. Isso evita que as frustrações se acumulem e explodam em assembleias ou em conflitos diretos.",
				},
				{
					type: "image",
					content: "",
					image: {
						src: hallImage,
						alt: "Áreas comuns e comunicação visual",
					},
				},
				{
					type: "h3",
					content: "6. Responda com agilidade",
				},
				{
					type: "p",
					content:
						"Mesmo que não tenha uma solução imediata, acuse o recebimento da mensagem e informe um prazo para resposta definitiva. Silêncio gera desconfiança.",
				},
				{
					type: "ul",
					content: [
						"Estabeleça um tempo máximo de resposta (ex: 48h úteis)",
						"Se a solução demora, envie atualizações sobre o andamento",
						"Seja transparente sobre limitações e prazos",
					],
				},
				{
					type: "h3",
					content: "7. Promova momentos de integração",
				},
				{
					type: "p",
					content:
						"Comunicação não é só sobre resolver problemas. Eventos sociais, campanhas de conscientização e celebrações fortalecem o senso de comunidade e facilitam diálogos difíceis quando necessário.",
				},
				{
					type: "h2",
					content: "Como o Quartier Flow facilita a comunicação",
				},
				{
					type: "p",
					content:
						"Nossa plataforma foi desenvolvida para centralizar e profissionalizar a comunicação condominial:",
				},
				{
					type: "ul",
					content: [
						"Central de Comunicados: Envio de avisos com confirmação de leitura automática",
						"Canal de Ocorrências: Sistema estruturado para reclamações e sugestões com acompanhamento de status",
						"Notificações Inteligentes: Alertas via e-mail e push notification para informações importantes",
						"Histórico Completo: Todos os comunicados arquivados e pesquisáveis",
					],
				},
				{
					type: "h2",
					content: "Conclusão",
				},
				{
					type: "p",
					content:
						"Comunicação eficaz não é um luxo, é uma necessidade para qualquer condomínio que deseja harmonia e eficiência. Ao implementar canais estruturados, ser proativo e usar ferramentas adequadas, você transforma a dinâmica do condomínio e reduz drasticamente conflitos desnecessários.",
				},
				{
					type: "p",
					content:
						"Quer centralizar a comunicação do seu condomínio? Cadastre-se na lista de espera do Quartier Flow e descubra como nossa plataforma pode transformar a gestão comunicacional.",
				},
			],
		},
	},
	"automatizar-gestao-condominial": {
		slug: "automatizar-gestao-condominial",
		title: "Automatize a Gestão do seu Condomínio",
		subtitle: "5 tarefas repetitivas que a tecnologia pode fazer por você",
		category: "Tecnologia",
		publishedDate: "3 de outubro de 2025",
		readTime: "7",
		heroImage: planningImage1,
		heroImageAlt: "Planejamento e automação condominial",
		content: {
			sections: [
				{
					type: "h2",
					content: "O tempo do síndico é precioso",
				},
				{
					type: "p",
					content:
						"Síndicos e administradores de condomínios dedicam, em média, 15 a 20 horas semanais em tarefas administrativas repetitivas. Grande parte desse tempo poderia ser redirecionado para atividades estratégicas se processos manuais fossem automatizados.",
				},
				{
					type: "h2",
					content: "5 tarefas que você pode automatizar hoje",
				},
				{
					type: "h3",
					content: "1. Geração e envio de boletos",
				},
				{
					type: "p",
					content:
						"Uma das tarefas mais repetitivas é a emissão mensal de boletos. Sistemas modernos geram automaticamente boletos personalizados para cada unidade, considerando:",
				},
				{
					type: "ul",
					content: [
						"Taxa condominial fixa",
						"Rateios extraordinários",
						"Multas e juros por atraso (calculados automaticamente)",
						"Consumo individual (água, gás, etc.)",
					],
				},
				{
					type: "p",
					content:
						"Economia de tempo: De 4 horas mensais para menos de 10 minutos de revisão.",
				},
				{
					type: "image",
					content: "",
					image: {
						src: billsImage2,
						alt: "Automação de boletos e cobranças",
					},
				},
				{
					type: "h3",
					content: "2. Lembretes automáticos de pagamento",
				},
				{
					type: "p",
					content:
						"Em vez de ligar ou enviar mensagens manualmente para moradores inadimplentes, configure lembretes automáticos:",
				},
				{
					type: "ul",
					content: [
						"5 dias antes do vencimento: lembrete amigável",
						"No dia do vencimento: segundo aviso",
						"3 dias após vencimento: notificação de atraso",
						"10 dias após: comunicado formal com juros calculados",
					],
				},
				{
					type: "p",
					content:
						"Resultado: Redução de até 30% na inadimplência sem esforço manual.",
				},
				{
					type: "h3",
					content: "3. Reservas de áreas comuns",
				},
				{
					type: "p",
					content:
						"Acabar com ligações, anotações em cadernos e conflitos de agendamento. Um sistema automatizado permite:",
				},
				{
					type: "ul",
					content: [
						"Calendário online visível para todos os moradores",
						"Reserva self-service com regras configuráveis",
						"Cobrança automática de taxas de uso",
						"Lembretes antes do evento",
						"Bloqueio de horários para manutenção",
					],
				},
				{
					type: "image",
					content: "",
					image: {
						src: notesImage3,
						alt: "Sistema de reservas automatizado",
					},
				},
				{
					type: "h3",
					content: "4. Prestação de contas e relatórios financeiros",
				},
				{
					type: "p",
					content:
						"Ao invés de compilar manualmente planilhas e extratos bancários, sistemas integrados geram automaticamente:",
				},
				{
					type: "ul",
					content: [
						"Balancetes mensais categorizados",
						"Gráficos de receitas vs. despesas",
						"Comparativos históricos",
						"Previsão de fluxo de caixa",
						"Relatórios personalizados para assembleias",
					],
				},
				{
					type: "p",
					content:
						"Benefício adicional: Transparência total com acesso em tempo real para conselheiros fiscais.",
				},
				{
					type: "h3",
					content: "5. Comunicados e avisos importantes",
				},
				{
					type: "p",
					content:
						"Automatize a distribuição de informações para garantir que todos os moradores sejam alcançados:",
				},
				{
					type: "ul",
					content: [
						"Avisos de manutenção programada enviados automaticamente por e-mail e app",
						"Comunicados de assembleia com confirmação de leitura",
						"Notificações de alterações no regimento ou convenção",
						"Alertas de emergência com prioridade alta",
					],
				},
				{
					type: "h2",
					content: "Conclusão",
				},
				{
					type: "p",
					content:
						"Automação não é substituir pessoas, é libertá-las de tarefas repetitivas para que possam focar no que realmente importa: criar um ambiente harmonioso, seguro e bem administrado. Com as ferramentas certas, até mesmo condomínios pequenos podem ter uma gestão profissional e eficiente.",
				},
				{
					type: "p",
					content:
						"Pronto para automatizar a gestão do seu condomínio? Cadastre-se na lista de espera do Quartier Flow e seja um dos primeiros a experimentar nossa plataforma completa de automação.",
				},
			],
		},
	},
	"reduzir-inadimplencia": {
		slug: "reduzir-inadimplencia",
		title: "Gestão de Inadimplência: Estratégias Humanizadas e Eficientes",
		subtitle: "Como reduzir as taxas de inadimplência sem criar conflitos",
		category: "Gestão Financeira",
		publishedDate: "3 de outubro de 2025",
		readTime: "9",
		heroImage: billsImage3,
		heroImageAlt: "Gestão de inadimplência em condomínios",
		content: {
			sections: [
				{
					type: "h2",
					content: "O desafio da inadimplência condominial",
				},
				{
					type: "p",
					content:
						"A taxa média de inadimplência em condomínios brasileiros é de 15%. Isso significa que, a cada 100 unidades, 15 estão com pagamentos em atraso. Esse cenário compromete a manutenção, serviços essenciais e a saúde financeira de todo o condomínio.",
				},
				{
					type: "p",
					content:
						"O desafio é encontrar o equilíbrio: ser firme na cobrança sem criar um ambiente hostil entre vizinhos.",
				},
				{
					type: "h2",
					content: "Estratégias humanizadas para redução da inadimplência",
				},
				{
					type: "h3",
					content: "1. Comunicação preventiva",
				},
				{
					type: "p",
					content:
						"A melhor cobrança é aquela que não precisa ser feita. Implemente lembretes amigáveis em diferentes momentos do ciclo de pagamento.",
				},
				{
					type: "h3",
					content: "2. Facilite o pagamento",
				},
				{
					type: "p",
					content: "Quanto mais fácil for pagar, menor a inadimplência:",
				},
				{
					type: "ul",
					content: [
						"Ofereça múltiplas formas de pagamento (boleto, Pix, cartão)",
						"Envie boletos digitais por e-mail e disponibilize no app",
						"Permita emissão de segunda via a qualquer momento",
						"Configure débito automático opcional",
					],
				},
				{
					type: "image",
					content: "",
					image: {
						src: meetingImage4,
						alt: "Diálogo e negociação com inadimplentes",
					},
				},
				{
					type: "h3",
					content: "3. Abra canal para negociação",
				},
				{
					type: "p",
					content:
						"Crie um ambiente seguro para que moradores em dificuldade possam procurar ajuda antes que a dívida cresça:",
				},
				{
					type: "ul",
					content: [
						"Ofereça parcelamentos personalizados",
						"Considere descontos em juros para pagamento à vista",
						"Mantenha sigilo sobre as negociações",
						"Formalize acordos por escrito para proteger ambas as partes",
					],
				},
				{
					type: "image",
					content: "",
					image: {
						src: planningImage2,
						alt: "Planejamento financeiro condominial",
					},
				},
				{
					type: "h3",
					content: "4. Seja transparente sobre o impacto",
				},
				{
					type: "p",
					content:
						"Muitos inadimplentes não entendem as consequências. Comunique de forma clara como a inadimplência afeta o fundo de reserva, quais serviços podem ser comprometidos e o impacto na valorização dos imóveis.",
				},
				{
					type: "h2",
					content: "Conclusão",
				},
				{
					type: "p",
					content:
						"Reduzir a inadimplência não é sobre ser mais duro, mas sim mais estratégico, humano e eficiente. Com comunicação clara, processos bem definidos e tecnologia adequada, é possível manter a saúde financeira do condomínio sem criar um ambiente hostil.",
				},
				{
					type: "p",
					content:
						"Quer automatizar e profissionalizar a gestão de cobranças? Cadastre-se na lista de espera do Quartier Flow e descubra como reduzir sua inadimplência com ferramentas inteligentes e humanizadas.",
				},
			],
		},
	},
};

export function getBlogPost(slug: string): BlogPost | undefined {
	return blogPosts[slug];
}

export function getAllBlogSlugs(): string[] {
	return Object.keys(blogPosts);
}
