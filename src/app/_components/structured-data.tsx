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
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "BRL",
			description: "3 meses grátis para early adopters",
		},
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
				name: "Quando o Quartier Flow será lançado?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Estamos trabalhando para lançar a versão beta em Maio de 2025, com lançamento oficial previsto para Julho de 2025. Quem estiver na lista de espera terá acesso prioritário e será avisado primeiro.",
				},
			},
			{
				"@type": "Question",
				name: "Posso participar do período beta?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim! Cadastrando-se na lista de espera agora, você garante prioridade para participar do beta fechado. Terá acesso antecipado às funcionalidades, poderá dar feedback direto para nossa equipe e receberá benefícios exclusivos.",
				},
			},
			{
				"@type": "Question",
				name: "Quais benefícios ganho ao me cadastrar agora?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Early adopters ganham: 50% de desconto nos primeiros 6 meses, 3 meses grátis de trial, acesso prioritário ao beta, treinamento personalizado e influência direta no desenvolvimento do produto.",
				},
			},
			{
				"@type": "Question",
				name: "Qual será o preço da plataforma?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Os planos serão personalizados de acordo com o tamanho do condomínio (número de unidades) e funcionalidades desejadas. Valores oficiais serão divulgados próximo ao lançamento, mas garantimos que early adopters terão as melhores condições.",
				},
			},
			{
				"@type": "Question",
				name: "O sistema funcionará em dispositivos móveis?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Sim! A plataforma web será totalmente responsiva desde o início. Aplicativos nativos para iOS e Android estão previstos para a Fase 4 (lançamento oficial em Julho/2025).",
				},
			},
			{
				"@type": "Question",
				name: "Como posso acompanhar o desenvolvimento?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Quem se cadastrar na lista de espera receberá updates mensais por email com progresso, novidades e sneak peeks das funcionalidades. Também compartilharemos conteúdo no nosso blog.",
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
