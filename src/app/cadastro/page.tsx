import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/auth";
import { AuthShell } from "../entrar/_components/auth-shell";
import { SignInForm } from "../entrar/_components/sign-in-form";

export const metadata: Metadata = {
	title: "Crie sua conta",
	description:
		"Crie sua conta no Quartier Flow com Google ou com um link por email.",
};

/**
 * Sign-up: same two methods as sign-in (open sign-up). After the first
 * access, the onboarding (/painel/comecar) explains each step of becoming an
 * administradora, the plan and the Termos de Uso before anything is signed.
 */
export default async function CadastroPage() {
	const session = await getSession();
	if (session) redirect("/painel/comecar");

	return (
		<AuthShell title="Crie sua conta">
			<p className="mb-6 text-muted-foreground">
				Use sua conta Google ou receba um link por email. Depois, vamos guiar
				você no cadastro da administradora e na escolha do plano: nada é
				contratado antes da sua confirmação.
			</p>
			<SignInForm
				callbackURL="/painel/comecar"
				googleLabel="Continuar com Google"
				submitLabel="Receber link para criar conta"
			/>
			<p className="mt-6 text-muted-foreground text-sm">
				Já tem conta?{" "}
				<a href="/entrar" className="underline underline-offset-4">
					Entrar
				</a>
				. Ao continuar, você declara ter lido os{" "}
				<a href="/termos" className="underline underline-offset-4">
					Termos de Uso
				</a>{" "}
				e a{" "}
				<a href="/privacidade" className="underline underline-offset-4">
					Política de Privacidade
				</a>
				.
			</p>
		</AuthShell>
	);
}
