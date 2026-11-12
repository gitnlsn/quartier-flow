import Script from "next/script";

export function StructuredData() {
	const organizationSchema = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Quartier Flow",
		url: "https://quartierflow.com",
		logo: "https://quartierflow.com/logo.png",
		description:
			"Plataforma completa para gestão de condomínios com sistema de pagamentos, controle de inadimplência e automação de processos.",
		sameAs: [],
	};

	const websiteSchema = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name: "Quartier Flow",
		url: "https://quartierflow.com",
		description:
			"Gestão de condomínios simplificada com sistema de pagamentos, controle de inadimplência e comunicação com moradores.",
		publisher: {
			"@type": "Organization",
			name: "Quartier Flow",
		},
	};

	const softwareSchema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Quartier Flow",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web, iOS, Android",
		description:
			"Plataforma SaaS para gestão de condomínios com sistema de pagamentos, autenticação two-factor, controle de inadimplência, comunicação com moradores e automação de processos.",
		featureList: [
			"Sistema de Pagamentos",
			"Two-Factor Authentication (Email + SMS)",
			"Controle de Inadimplência",
			"Dashboard do Administrador",
			"Comunicação com Moradores",
			"Módulo de Assembleias",
			"Reserva de Áreas Comuns",
			"Chamados de Manutenção",
		],
	};

	const faqSchema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: [
			{
				"@type": "Question",
				name: "O Quartier Flow já está funcionando?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim, em beta: cobrança mensal com boleto e Pix, acompanhamento de pagamentos, inadimplência e acordos, reservas de áreas comuns, despesas e a área do morador já estão disponíveis. Novos módulos chegam aos poucos e aparecem para quem já usa, sem custo de implantação.",
				},
			},
			{
				"@type": "Question",
				name: "Como começo a usar?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Clique em “Criar conta” e entre com Google ou com um link por email. Depois do primeiro acesso, o cadastro guia você pela administradora, o plano e a conta de recebimento. Nada é contratado antes da sua confirmação.",
				},
			},
			{
				"@type": "Question",
				name: "Tenho ajuda para começar?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim. O cadastro é guiado passo a passo, a Central de ajuda mostra cada tela em vídeos curtos e nossa equipe faz o treinamento com você. Sugestões de quem usa ajudam a decidir os próximos módulos.",
				},
			},
			{
				"@type": "Question",
				name: "Quanto custa?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Os planos estão na página de Preços, e o valor aparece antes de você assinar, durante o cadastro. Nada é cobrado antes da sua confirmação.",
				},
			},
			{
				"@type": "Question",
				name: "O sistema funcionará em dispositivos móveis?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim! A plataforma funciona no navegador do celular, e o morador paga, acompanha cobranças e reserva áreas comuns pelo telefone. Aplicativos nativos estão nos próximos passos.",
				},
			},
			{
				"@type": "Question",
				name: "Como fico sabendo das novidades?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Os módulos novos aparecem em “Já disponível” e o que está por vir em “Próximos passos”, aqui na página. Quem já usa vê as novidades direto no painel, e publicamos conteúdo no blog.",
				},
			},
			{
				"@type": "Question",
				name: "Os dados estarão seguros?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Absolutamente! Estamos desenvolvendo a plataforma com criptografia de ponta, conformidade total com LGPD, servidores seguros e backup automático. Segurança é prioridade desde o primeiro dia.",
				},
			},
			{
				"@type": "Question",
				name: "Posso sugerir funcionalidades?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim! Valorizamos muito o feedback de quem se cadastra cedo. Participantes do beta terão canal direto com nossa equipe para sugestões. Muitas das melhores ideias vêm dos usuários!",
				},
			},
		],
	};

	return (
		<>
			<Script
				id="organization-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(organizationSchema),
				}}
			/>
			<Script
				id="website-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(websiteSchema),
				}}
			/>
			<Script
				id="software-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(softwareSchema),
				}}
			/>
			<Script
				id="faq-schema"
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(faqSchema),
				}}
			/>
		</>
	);
}
