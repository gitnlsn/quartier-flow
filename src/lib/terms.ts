/**
 * Termos de Uso: single source for /termos and the plan-signing step of the
 * administradora onboarding (docs/features/19).
 *
 * Changing the text? Bump TERMS_VERSION. Every acceptance is recorded with the
 * version shown (TermsAcceptance), so an old record keeps pointing to the text
 * that was actually accepted. Sections 8.1–8.4 must be reviewed by a lawyer
 * before launch.
 */
export const TERMS_VERSION = "2026-11-11.2";

/** "11/11/2026", or "11/11/2026 (revisão 2)" for a same-day revision. */
export const termsVersionLabel = (version = TERMS_VERSION) => {
	const [date = version, revision] = version.split(".");
	const label = new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", {
		timeZone: "UTC",
	});
	return revision ? `${label} (revisão ${revision})` : label;
};

/** What changed in the current version, shown when asking to accept it again. */
export const TERMS_CHANGES = [
	"8.2: faturas abaixo de R$ 5,00 não são cobradas.",
	"8.3: a administradora pode ser encerrada pela própria plataforma, na página Plano. Vale na hora, o mês é cobrado pelos dias usados e as faturas continuam disponíveis para pagamento.",
	"8.3: depois do encerramento, os condomínios ficam só para consulta e a administradora pode ser reaberta.",
];

export type Inline = string | { text: string; href: string };
export type Block = { p: Inline[] } | { ul: Inline[][] };
export type TermsSection = {
	title: string;
	blocks?: Block[];
	subsections?: { title: string; blocks: Block[] }[];
};

const p = (...parts: Inline[]): Block => ({ p: parts });
const ul = (...items: (Inline | Inline[])[]): Block => ({
	ul: items.map((item) => (Array.isArray(item) ? item : [item])),
});

export const TERMS: TermsSection[] = [
	{
		title: "1. Aceitação dos Termos",
		blocks: [
			p(
				'Ao acessar e usar o Quartier Flow ("Plataforma"), você concorda com estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não deve usar nossa plataforma.',
			),
		],
	},
	{
		title: "2. Descrição do Serviço",
		blocks: [
			p(
				"O Quartier Flow é uma plataforma de gestão condominial que oferece ferramentas para síndicos, moradores e administradoras gerenciarem condomínios de forma eficiente, transparente e digital.",
			),
			p("Nossos serviços incluem, mas não se limitam a:"),
			ul(
				"Gestão financeira e emissão de boletos",
				"Comunicação centralizada",
				"Sistema de reservas de áreas comuns",
				"Controle de manutenção",
				"Portal do morador",
				"Assembleias digitais",
			),
		],
	},
	{
		title: "3. Elegibilidade",
		blocks: [
			p(
				"Para usar a Plataforma, você deve ter pelo menos 18 anos de idade e capacidade legal para celebrar contratos. Ao se registrar, você garante que todas as informações fornecidas são verdadeiras e precisas.",
			),
		],
	},
	{
		title: "4. Cadastro e Conta de Usuário",
		subsections: [
			{
				title: "4.1. Criação de Conta",
				blocks: [
					p(
						"Para acessar determinadas funcionalidades, você precisará criar uma conta fornecendo informações válidas como nome, e-mail e outras informações necessárias.",
					),
				],
			},
			{
				title: "4.2. Segurança da Conta",
				blocks: [
					p(
						"Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades que ocorram sob sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.",
					),
				],
			},
		],
	},
	{
		title: "5. Uso Aceitável",
		blocks: [
			p("Você concorda em NÃO:"),
			ul(
				"Usar a Plataforma para atividades ilegais ou não autorizadas",
				"Tentar acessar áreas restritas do sistema ou contas de outros usuários",
				"Interferir ou interromper a segurança ou funcionamento da Plataforma",
				"Fazer engenharia reversa, descompilar ou desmontar qualquer parte da Plataforma",
				"Transmitir vírus, malware ou qualquer código malicioso",
				"Violar direitos de propriedade intelectual",
			),
		],
	},
	{
		title: "6. Propriedade Intelectual",
		blocks: [
			p(
				"Todo o conteúdo da Plataforma, incluindo textos, gráficos, logos, ícones, imagens, áudio, vídeo, software e compilações de dados, é propriedade do Quartier Flow ou de seus licenciadores e está protegido por leis de direitos autorais.",
			),
		],
	},
	{
		title: "7. Dados e Privacidade",
		blocks: [
			p(
				"O uso de seus dados pessoais é regido por nossa ",
				{ text: "Política de Privacidade", href: "/privacidade" },
				". Ao usar a Plataforma, você concorda com a coleta, uso e compartilhamento de informações conforme descrito na política.",
			),
		],
	},
	{
		title: "8. Pagamentos e Cobrança",
		subsections: [
			{
				title: "8.1. Planos e Preços",
				blocks: [
					p(
						"A administradora contrata um plano do Quartier Flow. A mensalidade é calculada por assento: cada morador e cada síndico ativos nos condomínios da administradora, aos preços do plano contratado, exibidos no momento da assinatura e na página Plano.",
					),
					p(
						"Não há período gratuito: a cobrança começa no mês da assinatura. Recursos adicionais (como reservas de áreas comuns) podem ter mensalidade própria, informada antes de serem ativados.",
					),
				],
			},
			{
				title: "8.2. Faturamento",
				blocks: [
					p(
						"A fatura é emitida no dia 1º de cada mês, referente ao mês anterior, considerando os moradores e síndicos ativos no último dia desse mês. A primeira fatura é proporcional aos dias entre a assinatura e o fim do mês.",
					),
					p(
						"A fatura é enviada por e-mail para a administradora, com boleto e Pix, e vence no dia 10. Mudanças de plano valem a partir da fatura seguinte.",
					),
					p(
						"Faturas abaixo do valor mínimo de cobrança (R$ 5,00) não são cobradas: ficam registradas como dispensadas, sem valor a pagar.",
					),
				],
			},
			{
				title: "8.3. Atraso e Cancelamento",
				blocks: [
					p(
						"Em caso de atraso no pagamento da fatura, o acesso da administradora às funções de gestão pode ser restrito até a regularização. Os moradores continuam podendo consultar e pagar as próprias cobranças.",
					),
					p(
						"A administradora pode encerrar a conta a qualquer momento, pela própria plataforma, na página Plano. O encerramento vale na hora: as funções de gestão são encerradas, a cobrança automática dos condomínios é desligada e não são emitidas faturas para os meses seguintes.",
					),
					p(
						"O mês do encerramento é cobrado proporcionalmente aos dias usados, considerando os moradores e síndicos ativos na data do encerramento, na fatura emitida no dia 1º do mês seguinte. Faturas emitidas antes ou depois do encerramento continuam devidas e disponíveis para pagamento na plataforma.",
					),
					p(
						"Após o encerramento, os condomínios ficam disponíveis apenas para consulta, para preservar o histórico financeiro de moradores e síndicos. As cobranças já enviadas aos moradores continuam válidas e seus pagamentos seguem para a conta de recebimento da administradora. A administradora pode ser reaberta com a assinatura de um novo plano e o aceite da versão vigente destes Termos.",
					),
				],
			},
			{
				title: "8.4. Cobranças aos Moradores e Tarifas do Meio de Pagamento",
				blocks: [
					p(
						"As cobranças aos moradores (taxas condominiais, taxas extras, reservas de áreas comuns, multas e acordos) são emitidas pelo Quartier Flow por meio do Asaas, instituição de pagamento parceira. Por isso, o Quartier Flow aparece como beneficiário nos boletos e nas cobranças via Pix.",
					),
					p(
						"Os valores recebidos pertencem aos condomínios e são repassados automaticamente, por divisão de pagamento (split), para a conta Asaas da administradora responsável. O Quartier Flow atua apenas como intermediário e não utiliza esses valores.",
					),
					p(
						"As tarifas cobradas pelo meio de pagamento (como emissão e liquidação de boletos, Pix e envio de notificações de cobrança) são de responsabilidade da administradora e são descontadas do valor repassado. A administradora recebe o valor líquido de cada pagamento e tem acesso ao detalhamento das tarifas por cobrança e por condomínio.",
					),
					p(
						"Os moradores não pagam nenhuma tarifa adicional pelo uso do meio de pagamento: o valor pago é o valor da cobrança, acrescido apenas de multa e juros por atraso, ou reduzido por descontos, conforme definidos pelo condomínio.",
					),
					p(
						"Para receber os repasses, a administradora deve ter sua conta Asaas aprovada no processo de verificação cadastral (KYC) e concorda também com os termos de uso do Asaas.",
					),
				],
			},
		],
	},
	{
		title: "9. Limitação de Responsabilidade",
		blocks: [
			p(
				'A Plataforma é fornecida "como está" e "conforme disponível". Não garantimos que o serviço será ininterrupto, seguro ou livre de erros.',
			),
			p(
				"Em nenhuma circunstância o Quartier Flow será responsável por danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo perda de lucros, dados, uso, boa vontade ou outras perdas intangíveis.",
			),
		],
	},
	{
		title: "10. Indenização",
		blocks: [
			p(
				"Você concorda em indenizar e isentar o Quartier Flow, seus diretores, funcionários e parceiros de quaisquer reivindicações, danos, obrigações, perdas, responsabilidades, custos ou dívidas decorrentes de:",
			),
			ul(
				"Seu uso da Plataforma",
				"Violação destes Termos",
				"Violação de direitos de terceiros",
			),
		],
	},
	{
		title: "11. Modificações dos Termos",
		blocks: [
			p(
				"Reservamo-nos o direito de modificar estes Termos a qualquer momento. Notificaremos sobre mudanças significativas através da Plataforma ou por e-mail. O uso continuado da Plataforma após tais modificações constitui sua aceitação dos novos termos.",
			),
		],
	},
	{
		title: "12. Rescisão",
		blocks: [
			p(
				"Podemos suspender ou encerrar sua conta e acesso à Plataforma a nosso critério, sem aviso prévio, por conduta que acreditamos violar estes Termos ou ser prejudicial a outros usuários, nós ou terceiros.",
			),
		],
	},
	{
		title: "13. Lei Aplicável",
		blocks: [
			p(
				"Estes Termos são regidos pelas leis da República Federativa do Brasil. Quaisquer disputas serão resolvidas nos tribunais da comarca de São Paulo, SP.",
			),
		],
	},
	{
		title: "14. Contato",
		blocks: [
			p("Para questões sobre estes Termos de Uso, entre em contato conosco:"),
			ul("E-mail: legal@quartierflow.com", "Endereço: [Endereço da empresa]"),
		],
	},
];
