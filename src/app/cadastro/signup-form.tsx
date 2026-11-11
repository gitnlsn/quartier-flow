"use client";

import { type FormEvent, useState } from "react";

import { api } from "~/trpc/react";
import { primaryButtonClass } from "../entrar/_components/auth-shell";
import {
	ErrorMessage,
	Field,
	Input,
	errorMessage,
	fieldErrors,
} from "../painel/_components/ui";

export function SignupForm() {
	const [form, setForm] = useState({
		name: "",
		email: "",
		companyName: "",
		cnpj: "",
	});
	const signup = api.signup.administradora.useMutation();
	const errors = fieldErrors(signup.error);

	function update(key: keyof typeof form) {
		return (event: { target: { value: string } }) =>
			setForm((current) => ({ ...current, [key]: event.target.value }));
	}

	function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		signup.mutate(form);
	}

	if (signup.isSuccess) {
		return (
			<div aria-live="polite" className="space-y-4">
				<p>
					Cadastro recebido! Enviamos um link de acesso para{" "}
					<strong>{form.email.trim().toLowerCase()}</strong>.
				</p>
				<p className="text-muted-foreground text-sm">
					Abra o link para continuar a configuração da sua administradora. Ele
					expira em 15 minutos.
				</p>
			</div>
		);
	}

	return (
		<form onSubmit={submit} className="space-y-4" noValidate>
			<Field label="Seu nome" error={errors.name}>
				<Input
					value={form.name}
					onChange={update("name")}
					autoComplete="name"
				/>
			</Field>
			<Field label="Seu email" error={errors.email}>
				<Input
					type="email"
					value={form.email}
					onChange={update("email")}
					autoComplete="email"
				/>
			</Field>
			<Field label="Razão social da administradora" error={errors.companyName}>
				<Input
					value={form.companyName}
					onChange={update("companyName")}
					autoComplete="organization"
				/>
			</Field>
			<Field label="CNPJ" error={errors.cnpj}>
				<Input
					value={form.cnpj}
					onChange={update("cnpj")}
					inputMode="numeric"
					placeholder="00.000.000/0000-00"
				/>
			</Field>
			<ErrorMessage
				message={Object.keys(errors).length ? null : errorMessage(signup.error)}
			/>
			<button
				type="submit"
				disabled={signup.isPending}
				className={primaryButtonClass}
			>
				{signup.isPending ? "Enviando..." : "Criar conta"}
			</button>
			<p className="text-muted-foreground text-xs">
				Ao criar a conta, você concorda com os{" "}
				<a href="/termos" className="underline">
					Termos de Uso
				</a>
				, incluindo as regras de cobrança e tarifas (seção 8.4).
			</p>
		</form>
	);
}
