"use client";

import { useState } from "react";

interface FAQItem {
	question: string;
	answer: string;
}

const faqs: FAQItem[] = [
	{
		question: "Quando o Quartier Flow será lançado?",
		answer:
			"Estamos trabalhando para lançar a versão beta em Maio de 2025, com lançamento oficial previsto para Julho de 2025. Quem estiver na lista de espera terá acesso prioritário e será avisado primeiro.",
	},
	{
		question: "Posso participar do período beta?",
		answer:
			"Sim! Cadastrando-se na lista de espera agora, você garante prioridade para participar do beta fechado. Terá acesso antecipado às funcionalidades, poderá dar feedback direto para nossa equipe e receberá benefícios exclusivos.",
	},
	{
		question: "Quais benefícios ganho ao me cadastrar agora?",
		answer:
			"Early adopters ganham: 50% de desconto nos primeiros 6 meses, 3 meses grátis de trial, acesso prioritário ao beta, treinamento personalizado e influência direta no desenvolvimento do produto.",
	},
	{
		question: "Qual será o preço da plataforma?",
		answer:
			"Os planos serão personalizados de acordo com o tamanho do condomínio (número de unidades) e funcionalidades desejadas. Valores oficiais serão divulgados próximo ao lançamento, mas garantimos que early adopters terão as melhores condições.",
	},
	{
		question: "O sistema funcionará em dispositivos móveis?",
		answer:
			"Sim! A plataforma web será totalmente responsiva desde o início. Aplicativos nativos para iOS e Android estão previstos para a Fase 4 (lançamento oficial em Julho/2025).",
	},
	{
		question: "Como posso acompanhar o desenvolvimento?",
		answer:
			"Quem se cadastrar na lista de espera receberá updates mensais por email com progresso, novidades e sneak peeks das funcionalidades. Também compartilharemos conteúdo no nosso blog.",
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
							href="#contact"
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
