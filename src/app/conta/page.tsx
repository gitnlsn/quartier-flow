import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "~/server/auth";
import { AuthShell } from "../entrar/_components/auth-shell";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = {
	title: "Minha conta",
	robots: { index: false, follow: false },
};

export default async function ContaPage() {
	const session = await getSession();
	if (!session) redirect("/entrar");

	return (
		<AuthShell title="Minha conta">
			<dl className="mb-8 space-y-2">
				<dt className="font-bold text-sm">Nome</dt>
				<dd>{session.user.name || "—"}</dd>
				<dt className="font-bold text-sm">Email</dt>
				<dd>{session.user.email}</dd>
			</dl>
			<SignOutButton />
		</AuthShell>
	);
}
