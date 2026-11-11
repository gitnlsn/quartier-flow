import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/auth";
import { AuthShell } from "../entrar/_components/auth-shell";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
	title: "Cadastro de administradora",
	description: "Cadastre sua administradora no Quartier Flow.",
};

export default async function CadastroPage() {
	const session = await getSession();
	if (session) redirect("/painel");

	return (
		<AuthShell title="Cadastre sua administradora">
			<SignupForm />
			<p className="mt-6 text-muted-foreground text-sm">
				Já tem conta?{" "}
				<a href="/entrar" className="underline underline-offset-4">
					Entrar
				</a>
				. Moradores e síndicos são convidados pela administradora.
			</p>
		</AuthShell>
	);
}
