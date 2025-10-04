"use client";

import { useState } from "react";
import { api } from "~/trpc/react";

export function NewsletterForm() {
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const subscribe = api.newsletter.subscribe.useMutation({
		onSuccess: () => {
			setSubmitted(true);
			setEmail("");
			setMessage("");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		subscribe.mutate({ email, message: message || undefined });
	};

	if (submitted) {
		return (
			<div className="w-full max-w-md animate-fade-in border-2 border-white bg-black/80 p-2 text-center shadow-2xl shadow-white/20 backdrop-blur-sm md:p-10">
				<div className="mb-2 text-4xl md:mb-4 md:text-6xl">✓</div>
				<h3 className="font-bold text-2xl text-white md:text-3xl">Obrigado!</h3>
				<p className="mt-2 text-base text-gray-300 md:mt-4 md:text-lg">
					Entraremos em contato em breve.
				</p>
				<button
					type="button"
					onClick={() => setSubmitted(false)}
					className="mt-4 text-gray-400 text-xs underline transition-all hover:text-white md:mt-6 md:text-sm"
				>
					Enviar outra mensagem
				</button>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-md space-y-2 border border-gray-800 bg-black/50 p-2 shadow-2xl shadow-white/5 backdrop-blur-sm md:space-y-5 md:p-8"
		>
			<div>
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="Seu email"
					required
					className="w-full border-2 border-gray-700 bg-black/80 px-2 py-2 text-white placeholder-gray-500 shadow-lg transition-all duration-300 focus:border-white focus:shadow-white/10 focus:shadow-xl focus:outline-none md:px-6 md:py-4"
				/>
			</div>
			<div>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Mensagem (opcional)"
					rows={4}
					className="w-full border-2 border-gray-700 bg-black/80 px-2 py-2 text-white placeholder-gray-500 shadow-lg transition-all duration-300 focus:border-white focus:shadow-white/10 focus:shadow-xl focus:outline-none md:px-6 md:py-4"
				/>
			</div>
			<button
				type="submit"
				disabled={subscribe.isPending}
				className="w-full bg-white px-2 py-2 font-bold text-base text-black shadow-white/20 shadow-xl transition-all duration-300 hover:bg-gray-100 hover:shadow-2xl hover:shadow-white/30 disabled:opacity-50 md:px-8 md:py-5 md:text-lg"
			>
				{subscribe.isPending ? "Enviando..." : "Quero saber mais"}
			</button>
			{subscribe.error && (
				<p className="animate-fade-in text-center text-red-400 text-sm">
					{subscribe.error.message}
				</p>
			)}
		</form>
	);
}
