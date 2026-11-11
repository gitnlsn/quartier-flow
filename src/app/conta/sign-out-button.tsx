"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { primaryButtonClass } from "../entrar/_components/auth-shell";

export function SignOutButton() {
	const router = useRouter();
	const [pending, setPending] = useState(false);

	async function signOut() {
		setPending(true);
		await authClient.signOut();
		router.replace("/entrar");
		router.refresh();
	}

	return (
		<button
			type="button"
			onClick={signOut}
			disabled={pending}
			className={primaryButtonClass}
		>
			{pending ? "Saindo..." : "Sair"}
		</button>
	);
}
