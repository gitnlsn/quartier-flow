/**
 * Administradora onboarding: billing rules and "what happens next", shared by
 * the plan-signing screens and the confirmation email so they always say the
 * same thing. The rules mirror Termos de Uso section 8 (src/lib/terms.ts) and
 * docs/features/18.
 */

/** Invoices are issued on the 1st and due on this day of the month. */
export const INVOICE_DUE_DAY = 10;

const monthYear = (date: Date) =>
	date.toLocaleDateString("pt-BR", {
		month: "long",
		year: "numeric",
		timeZone: "America/Sao_Paulo",
	});

/** Calendar parts of `date` in Brazil (billing days are local days). */
function localParts(date: Date) {
	const [y, m, d] = date
		.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })
		.split("-")
		.map(Number);
	return { year: y ?? 0, month: m ?? 1, day: d ?? 1 };
}

/** Dates and proration of the first invoice for a plan signed on `signedAt`. */
export function firstInvoice(signedAt: Date) {
	const { year, month, day } = localParts(signedAt);
	const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
	const billedDays = daysInMonth - day + 1;
	const issue = new Date(Date.UTC(year, month, 1, 12)); // 1st of next month
	const due = new Date(Date.UTC(year, month, INVOICE_DUE_DAY, 12));
	const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
	return {
		periodLabel: monthYear(signedAt),
		billedDays,
		daysInMonth,
		issueDate: fmt(issue),
		dueDate: fmt(due),
	};
}

/** Short billing rules, shown next to the "I agree" checkbox. */
export const BILLING_RULES = [
	"Sem período gratuito: a cobrança começa no mês da assinatura.",
	"A mensalidade é a soma dos assentos ativos: cada morador e cada síndico dos seus condomínios, aos preços do plano.",
	"A fatura sai no dia 1º de cada mês, referente ao mês anterior, com os assentos ativos no último dia desse mês. A primeira é proporcional aos dias desde a assinatura.",
	`Você recebe a fatura por email, com boleto e Pix, com vencimento no dia ${INVOICE_DUE_DAY}.`,
	"Em caso de atraso, as funções de gestão podem ser restritas até a regularização; os moradores nunca perdem acesso às próprias cobranças.",
	"Faturas abaixo de R$ 5,00 não são cobradas.",
	"Você pode encerrar a administradora quando quiser, na página Plano: vale na hora, o mês é cobrado pelos dias usados e as faturas emitidas continuam disponíveis para pagamento.",
];

export type NextStep = { title: string; text: string };

/** What happens after signing, in order (page and email). */
export function nextSteps(input: {
	planName: string;
	signedAt: Date;
}): NextStep[] {
	const invoice = firstInvoice(input.signedAt);
	return [
		{
			title: "Agora: plano ativo",
			text: `O plano ${input.planName} está ativo e você é a pessoa administradora da conta. Enviamos por email a confirmação da assinatura, com a versão dos Termos de Uso aceita.`,
		},
		{
			title: "Em seguida: dados da empresa e conta de recebimento",
			text: "Complete os dados da empresa e crie a conta de recebimento no Asaas, nosso parceiro de pagamentos. Depois envie os documentos para a verificação cadastral (KYC); a análise leva até 48 horas. Enquanto a conta não for aprovada, não é possível enviar cobranças aos moradores.",
		},
		{
			title: "Configure seus condomínios",
			text: "Cadastre os condomínios, importe unidades e moradores por planilha e convide os síndicos. Cada morador e síndico ativo passa a contar como assento a partir do convite.",
		},
		{
			title: `Primeira fatura: ${invoice.issueDate}`,
			text: `No dia ${invoice.issueDate} você recebe a fatura de ${invoice.periodLabel}, proporcional aos ${invoice.billedDays} de ${invoice.daysInMonth} dias desde a assinatura, calculada pelos assentos ativos no fim do mês. Boleto e Pix, vencimento em ${invoice.dueDate}. Depois, uma fatura todo dia 1º.`,
		},
		{
			title: "Cobranças aos moradores",
			text: "Os moradores pagam as cobranças do condomínio por boleto ou Pix, sem tarifa extra. Os valores são repassados para a sua conta Asaas, já descontadas as tarifas do meio de pagamento (Termos de Uso, seção 8.4).",
		},
		{
			title: "Mudanças e cancelamento",
			text: "Trocar de plano, na página Plano, vale a partir da fatura seguinte. Você também pode encerrar a administradora por lá a qualquer momento: a gestão termina na hora, o mês é cobrado pelos dias usados e as faturas continuam disponíveis em Faturas do Quartier Flow (Termos de Uso, seção 8.3).",
		},
	];
}
