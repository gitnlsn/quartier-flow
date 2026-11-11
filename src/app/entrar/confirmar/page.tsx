import type { Metadata } from "next";

import { safeNextPath } from "~/lib/next-path";
import { AuthShell, primaryButtonClass } from "../_components/auth-shell";
import { ConfirmSignIn } from "./confirm-sign-in";

export const metadata: Metadata = {
	title: "Confirmar acesso",
	robots: { index: false, follow: false },
	// Keep the token out of Referer headers sent to other sites.
	referrer: "no-referrer",
};

export default async function ConfirmarPage({
	searchParams,
}: {
	searchParams: Promise<{ token?: string; next?: string }>;
}) {
	const { token, next } = await searchParams;

	return (
		<AuthShell title="Confirmar acesso">
			{token ? (
				<ConfirmSignIn token={token} next={safeNextPath(next) ?? "/painel"} />
			) : (
				<div className="space-y-4">
					<p>Link de acesso inválido.</p>
					<a
						href="/entrar"
						className={`block text-center ${primaryButtonClass}`}
					>
						Pedir um novo link
					</a>
				</div>
			)}
		</AuthShell>
	);
}
