"use client";

import { type FormEvent, useState } from "react";

import { authClient } from "~/lib/auth-client";
import { primaryButtonClass, secondaryButtonClass } from "./auth-shell";

type Status = "idle" | "sending" | "sent" | "error";

export function SignInForm() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [googlePending, setGooglePending] = useState(false);

	async function signInWithGoogle() {
		setGooglePending(true);
		const { error } = await authClient.signIn.social({
			provider: "google",
			callbackURL: "/conta",
			// Includes "not invited" (sign-up disabled); /entrar shows a message.
			errorCallbackURL: "/entrar?erro=google",
		});
		if (error) setGooglePending(false);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus("sending");
		const { error } = await authClient.signIn.magicLink({
			email: email.trim().toLowerCase(),
		});
		setStatus(error ? "error" : "sent");
	}

	if (status === "sent") {
		return (
			<div aria-live="polite" className="space-y-4">
				<p>
					Se <strong>{email}</strong> estiver cadastrado, você vai receber um
					link de acesso em instantes.
				</p>
				<p className="text-sm text-white/70">
					O link expira em 15 minutos. Confira também a caixa de spam.
				</p>
				<button
					type="button"
					onClick={() => setStatus("idle")}
					className="text-sm underline underline-offset-4"
				>
					Usar outro email
				</button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<button
				type="button"
				onClick={signInWithGoogle}
				disabled={googlePending}
				className={secondaryButtonClass}
			>
				{googlePending ? "Abrindo o Google..." : "Entrar com Google"}
			</button>

			<div className="flex items-center gap-3 text-sm text-white/70">
				<span className="h-px flex-1 bg-white/40" />
				ou receba um link por email
				<span className="h-px flex-1 bg-white/40" />
			</div>

			<EmailLinkForm
				email={email}
				onEmailChange={setEmail}
				status={status}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}

function EmailLinkForm({
	email,
	onEmailChange,
	status,
	onSubmit,
}: {
	email: string;
	onEmailChange: (email: string) => void;
	status: Status;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<label className="block">
				<span className="mb-2 block font-bold text-sm">Email</span>
				<input
					type="email"
					required
					autoComplete="email"
					inputMode="email"
					value={email}
					onChange={(event) => onEmailChange(event.target.value)}
					className="w-full border-2 border-white bg-black px-3 py-3 text-white outline-none focus:bg-white focus:text-black"
					placeholder="voce@email.com"
				/>
			</label>
			{status === "error" && (
				<p role="alert" className="text-sm">
					Não foi possível enviar o link agora. Aguarde um minuto e tente de
					novo.
				</p>
			)}
			<button
				type="submit"
				disabled={status === "sending"}
				className={primaryButtonClass}
			>
				{status === "sending" ? "Enviando..." : "Receber link de acesso"}
			</button>
		</form>
	);
}
