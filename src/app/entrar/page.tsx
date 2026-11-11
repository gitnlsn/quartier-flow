import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/auth";
import { AuthShell } from "./_components/auth-shell";
import { SignInForm } from "./_components/sign-in-form";

export const metadata: Metadata = {
	title: "Entrar",
	robots: { index: false, follow: false },
};

export default async function EntrarPage({
	searchParams,
}: {
	searchParams: Promise<{ erro?: string }>;
}) {
	const session = await getSession();
	if (session) redirect("/conta");

	const { erro } = await searchParams;

	return (
		<AuthShell title="Entrar">
			{erro === "google" && (
				<p role="alert" className="mb-6 border-2 border-white p-3 text-sm">
					Não foi possível entrar com essa conta Google. O acesso é só para
					moradores e síndicos convidados: use o mesmo email do convite.
				</p>
			)}
			<SignInForm />
		</AuthShell>
	);
}
