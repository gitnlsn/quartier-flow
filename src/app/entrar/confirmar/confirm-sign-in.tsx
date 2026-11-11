"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { primaryButtonClass } from "../_components/auth-shell";

/**
 * The emailed link lands here instead of on the verify endpoint, and the
 * one-time token is only consumed when the person clicks the button. Email
 * security scanners that open links automatically don't use it up.
 */
export function ConfirmSignIn({ token }: { token: string }) {
	const router = useRouter();
	const [status, setStatus] = useState<"idle" | "verifying" | "error">("idle");

	async function confirm() {
		setStatus("verifying");
		const { data, error } = await authClient.magicLink.verify({
			query: { token },
		});
		// An invalid/used token answers with a redirect (followed by fetch), not
		// an error, so require an actual session token in the response.
		if (error || typeof data !== "object" || !data?.token) {
			setStatus("error");
			return;
		}
		router.replace("/conta");
		router.refresh();
	}

	if (status === "error") {
		return (
			<div role="alert" className="space-y-4">
				<p>Este link expirou ou já foi usado.</p>
				<a href="/entrar" className={`block text-center ${primaryButtonClass}`}>
					Pedir um novo link
				</a>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<p className="text-muted-foreground">
				Clique abaixo para concluir o acesso.
			</p>
			<button
				type="button"
				onClick={confirm}
				disabled={status === "verifying"}
				className={primaryButtonClass}
			>
				{status === "verifying" ? "Entrando..." : "Entrar"}
			</button>
		</div>
	);
}
