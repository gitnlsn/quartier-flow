"use client";

import { FileText } from "lucide-react";
import { useState } from "react";

import { TermsContent } from "~/app/_components/terms-content";
import { Checkbox } from "~/components/ui/checkbox";
import { TERMS_CHANGES, TERMS_VERSION, termsVersionLabel } from "~/lib/terms";
import { api } from "~/trpc/react";
import { Button, Card, ErrorMessage, errorMessage } from "./ui";

/**
 * The Termos de Uso changed after the administradora signed: show what
 * changed and record the acceptance of the current version.
 */
export function TermsUpdateCard() {
	const utils = api.useUtils();
	const [agreed, setAgreed] = useState(false);
	const [showFull, setShowFull] = useState(false);
	const accept = api.onboarding.acceptTerms.useMutation({
		onSuccess: () => utils.portal.access.invalidate(),
	});

	return (
		<Card
			title={
				<span className="flex items-center gap-2">
					<FileText className="size-5" aria-hidden /> Os Termos de Uso foram
					atualizados
				</span>
			}
			description={`Versão de ${termsVersionLabel()}. Leia o que mudou e confirme para continuar com o mesmo plano.`}
		>
			<div className="space-y-4">
				<ul className="list-inside list-disc space-y-1 text-sm">
					{TERMS_CHANGES.map((change) => (
						<li key={change}>{change}</li>
					))}
				</ul>
				<button
					type="button"
					className="font-medium text-sm underline underline-offset-2"
					onClick={() => setShowFull((v) => !v)}
					aria-expanded={showFull}
				>
					{showFull ? "Ocultar o texto completo" : "Ler o texto completo"}
				</button>
				{showFull && (
					<div className="max-h-80 overflow-y-auto rounded-lg border p-4">
						<TermsContent variant="app" />
					</div>
				)}
				<label
					htmlFor="accept-updated-terms"
					className="flex items-start gap-3 rounded-lg border p-3 text-sm"
				>
					<Checkbox
						id="accept-updated-terms"
						checked={agreed}
						onCheckedChange={(v) => setAgreed(v === true)}
						className="mt-0.5"
					/>
					<span>
						Li e aceito os Termos de Uso do Quartier Flow (versão de{" "}
						{termsVersionLabel()}).
					</span>
				</label>
				<ErrorMessage message={errorMessage(accept.error)} />
				<Button
					disabled={!agreed}
					pending={accept.isPending}
					onClick={() =>
						accept.mutate({ termsVersion: TERMS_VERSION, acceptTerms: true })
					}
				>
					Aceitar os Termos atualizados
				</Button>
			</div>
		</Card>
	);
}
