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
			<div className="animate-fade-in w-full max-w-md border-2 border-white bg-black/80 p-10 text-center shadow-2xl shadow-white/20 backdrop-blur-sm">
				<div className="mb-4 text-6xl">✓</div>
				<h3 className="text-3xl font-bold text-white">Obrigado!</h3>
				<p className="mt-4 text-lg text-gray-300">
					Entraremos em contato em breve.
				</p>
				<button
					onClick={() => setSubmitted(false)}
					className="mt-6 text-sm text-gray-400 underline transition-all hover:text-white"
				>
					Enviar outra mensagem
				</button>
			</div>
		);
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="w-full max-w-md space-y-5 border border-gray-800 bg-black/50 p-8 shadow-2xl shadow-white/5 backdrop-blur-sm"
		>
			<div>
				<input
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					placeholder="Seu email"
					required
					className="w-full border-2 border-gray-700 bg-black/80 px-6 py-4 text-white placeholder-gray-500 shadow-lg transition-all duration-300 focus:border-white focus:shadow-xl focus:shadow-white/10 focus:outline-none"
				/>
			</div>
			<div>
				<textarea
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Mensagem (opcional)"
					rows={4}
					className="w-full border-2 border-gray-700 bg-black/80 px-6 py-4 text-white placeholder-gray-500 shadow-lg transition-all duration-300 focus:border-white focus:shadow-xl focus:shadow-white/10 focus:outline-none"
				/>
			</div>
			<button
				type="submit"
				disabled={subscribe.isPending}
				className="w-full bg-white px-8 py-5 text-lg font-bold text-black shadow-xl shadow-white/20 transition-all duration-300 hover:bg-gray-100 hover:shadow-2xl hover:shadow-white/30 disabled:opacity-50"
			>
				{subscribe.isPending ? "Enviando..." : "Quero saber mais"}
			</button>
			{subscribe.error && (
				<p className="animate-fade-in text-center text-sm text-red-400">
					{subscribe.error.message}
				</p>
			)}
		</form>
	);
}
