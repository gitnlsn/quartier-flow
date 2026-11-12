"use client";

import { useState } from "react";

interface FAQItem {
	question: string;
	answer: string;
}

const faqs: FAQItem[] = [
	{
		question: "O Quartier Flow já está funcionando?",
		answer:
			"Sim, em beta: cobrança mensal com boleto e Pix, acompanhamento de pagamentos, inadimplência e acordos, reservas de áreas comuns, despesas e a área do morador já estão disponíveis. Novos módulos chegam aos poucos e aparecem para quem já usa, sem custo de implantação.",
	},
	{
		question: "Como começo a usar?",
		answer:
			"Clique em “Criar conta” e entre com Google ou com um link por email. Depois do primeiro acesso, o cadastro guia você pela administradora, o plano e a conta de recebimento. Nada é contratado antes da sua confirmação.",
	},
	{
		question: "Tenho ajuda para começar?",
		answer:
			"Sim. O cadastro é guiado passo a passo, a Central de ajuda mostra cada tela em vídeos curtos e nossa equipe faz o treinamento com você. Sugestões de quem usa ajudam a decidir os próximos módulos.",
	},
	{
		question: "Quanto custa?",
		answer:
			"Os planos estão na página de Preços, e o valor aparece antes de você assinar, durante o cadastro. Nada é cobrado antes da sua confirmação.",
	},
	{
		question: "O sistema funcionará em dispositivos móveis?",
		answer:
			"Sim! A plataforma funciona no navegador do celular, e o morador paga, acompanha cobranças e reserva áreas comuns pelo telefone. Aplicativos nativos estão nos próximos passos.",
	},
	{
		question: "Como fico sabendo das novidades?",
		answer:
			"Os módulos novos aparecem em “Já disponível” e o que está por vir em “Próximos passos”, aqui na página. Quem já usa vê as novidades direto no painel, e publicamos conteúdo no blog.",
	},
	{
		question: "Os dados estarão seguros?",
		answer:
			"Absolutamente! Estamos desenvolvendo a plataforma com criptografia de ponta, conformidade total com LGPD, servidores seguros e backup automático. Segurança é prioridade desde o primeiro dia.",
	},
	{
		question: "Posso sugerir funcionalidades?",
		answer:
			"Sim! Valorizamos muito o feedback de quem se cadastra cedo. Participantes do beta terão canal direto com nossa equipe para sugestões. Muitas das melhores ideias vêm dos usuários!",
	},
];

function FAQItem({ faq }: { faq: FAQItem }) {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="border border-gray-800 bg-black/50 backdrop-blur-sm transition-all duration-300 hover:border-white">
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full p-2 text-left transition-all duration-300 md:p-6"
			>
				<div className="flex items-start justify-between gap-2 md:gap-4">
					<h3 className="flex-1 font-bold text-base text-white md:text-xl">
						{faq.question}
					</h3>
					<div
						className={`text-gray-400 text-lg transition-transform duration-300 md:text-2xl ${
							isOpen ? "rotate-180" : ""
						}`}
					>
						▼
					</div>
				</div>
			</button>

			{isOpen && (
				<div className="animate-slide-up border-gray-800 border-t p-2 md:p-6">
					<p className="text-gray-300 text-sm md:text-base">{faq.answer}</p>
				</div>
			)}
		</div>
	);
}

export function FAQ() {
	return (
		<section id="faq" className="w-full px-2 py-8 md:px-6 md:py-20">
			<div className="mx-auto w-full max-w-4xl">
				<div className="mb-8 text-center md:mb-16">
					<h2 className="mb-2 font-bold text-3xl md:mb-4 md:text-5xl">
						Perguntas Frequentes
					</h2>
					<p className="text-base text-gray-400 md:text-xl">
						Tire suas dúvidas sobre o Quartier Flow
					</p>
				</div>

				<div className="space-y-2 md:space-y-4">
					{faqs.map((faq, index) => (
						<FAQItem key={index} faq={faq} />
					))}
				</div>

				<div className="mt-8 text-center md:mt-12">
					<p className="text-gray-400 text-sm md:text-base">
						Não encontrou sua resposta?{" "}
						<a
							href="/contato"
							className="text-white underline transition-colors hover:text-gray-300"
						>
							Fale conosco
						</a>
					</p>
				</div>
			</div>
		</section>
	);
}
