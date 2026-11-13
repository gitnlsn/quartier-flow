"use client";

import { useState } from "react";

import { authClient } from "~/lib/auth-client";
import { primaryButtonClass } from "../entrar/_components/auth-shell";

export function SignOutButton() {
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	async function signOut() {
		setPending(true);
		setFailed(false);
		const { error } = await authClient.signOut();
		if (error) {
			// Still signed in: say so instead of bouncing back to the account.
			setPending(false);
			setFailed(true);
			return;
		}
		// Full load: nothing cached from the session stays on screen.
		window.location.assign("/entrar");
	}

	return (
		<>
			<button
				type="button"
				onClick={signOut}
				disabled={pending}
				className={primaryButtonClass}
			>
				{pending ? "Saindo..." : "Sair"}
			</button>
			{failed && (
				<p role="alert" className="mt-2 text-red-600 text-sm">
					Não foi possível sair. Tente novamente.
				</p>
			)}
		</>
	);
}
