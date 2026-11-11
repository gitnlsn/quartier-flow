"use client";

import { type FormEvent, useState } from "react";

import { authClient } from "~/lib/auth-client";
import { primaryButtonClass, secondaryButtonClass } from "./auth-shell";

type Status = "idle" | "sending" | "sent" | "error";

/**
 * Google or email link. Both create the account on first use (open sign-up);
 * `callbackURL` is where the person lands afterwards.
 */
export function SignInForm({
	callbackURL = "/painel",
	googleLabel = "Entrar com Google",
	submitLabel = "Receber link de acesso",
}: {
	callbackURL?: string;
	googleLabel?: string;
	submitLabel?: string;
}) {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState<Status>("idle");
	const [googlePending, setGooglePending] = useState(false);

	async function signInWithGoogle() {
		setGooglePending(true);
		const { error } = await authClient.signIn.social({
			provider: "google",
			callbackURL,
			errorCallbackURL: "/entrar?erro=google",
		});
		if (error) setGooglePending(false);
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setStatus("sending");
		const { error } = await authClient.signIn.magicLink({
			email: email.trim().toLowerCase(),
			callbackURL,
		});
		setStatus(error ? "error" : "sent");
	}

	if (status === "sent") {
		return (
			<div aria-live="polite" className="space-y-4">
				<p>
					Enviamos um link de acesso para <strong>{email}</strong>. Se for seu
					primeiro acesso, o link também cria sua conta.
				</p>
				<p className="text-muted-foreground text-sm">
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
				{googlePending ? "Abrindo o Google..." : googleLabel}
			</button>

			<div className="flex items-center gap-3 text-muted-foreground text-sm">
				<span className="h-px flex-1 bg-border" />
				ou receba um link por email
				<span className="h-px flex-1 bg-border" />
			</div>

			<EmailLinkForm
				email={email}
				onEmailChange={setEmail}
				status={status}
				onSubmit={handleSubmit}
				submitLabel={submitLabel}
			/>
		</div>
	);
}

function EmailLinkForm({
	email,
	onEmailChange,
	status,
	onSubmit,
	submitLabel,
}: {
	email: string;
	onEmailChange: (email: string) => void;
	status: Status;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
	submitLabel: string;
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
					className="h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
				{status === "sending" ? "Enviando..." : submitLabel}
			</button>
		</form>
	);
}
