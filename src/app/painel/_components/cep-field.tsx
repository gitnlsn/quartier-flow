"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { onlyDigits } from "~/lib/br";
import { Field, MaskedInput } from "./ui";

export type CepAddress = {
	cep: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
};

type Status =
	| { kind: "idle" }
	| { kind: "loading" }
	| { kind: "found"; city: string; state: string }
	| { kind: "not_found" }
	| { kind: "unavailable" };

/**
 * CEP input that looks the address up (via /api/cep) once 8 digits are typed
 * and hands it to `onAddress`, so the form can fill street and neighborhood.
 */
export function CepField({
	value,
	onValueChange,
	onAddress,
	error,
	disabled,
}: {
	value: string;
	onValueChange: (value: string) => void;
	onAddress: (address: CepAddress) => void;
	error?: string;
	disabled?: boolean;
}) {
	const [status, setStatus] = useState<Status>({ kind: "idle" });
	const onAddressRef = useRef(onAddress);
	onAddressRef.current = onAddress;
	// Don't look up the CEP the form opened with (already saved).
	const lastLooked = useRef(onlyDigits(value));
	const cep = onlyDigits(value);

	useEffect(() => {
		if (cep.length !== 8) {
			setStatus({ kind: "idle" });
			lastLooked.current = "";
			return;
		}
		if (cep === lastLooked.current) return;
		lastLooked.current = cep;

		const controller = new AbortController();
		setStatus({ kind: "loading" });
		fetch(`/api/cep/${cep}`, { signal: controller.signal })
			.then(async (res) => {
				if (res.status === 404 || res.status === 400) {
					setStatus({ kind: "not_found" });
					return;
				}
				if (!res.ok) {
					setStatus({ kind: "unavailable" });
					return;
				}
				const address = (await res.json()) as CepAddress;
				setStatus({ kind: "found", city: address.city, state: address.state });
				onAddressRef.current(address);
			})
			.catch((e: unknown) => {
				if ((e as Error).name !== "AbortError") {
					setStatus({ kind: "unavailable" });
				}
			});
		return () => controller.abort();
	}, [cep]);

	const hint =
		status.kind === "loading" ? (
			<span className="inline-flex items-center gap-1.5">
				<Loader2 className="size-3.5 animate-spin" aria-hidden /> Buscando
				endereço…
			</span>
		) : status.kind === "found" ? (
			`${status.city}/${status.state}. Confira o endereço abaixo.`
		) : status.kind === "unavailable" ? (
			"Não foi possível buscar o endereço agora. Preencha manualmente."
		) : (
			"Digite o CEP para preencher o endereço automaticamente."
		);

	return (
		<Field
			label="CEP"
			hint={<span aria-live="polite">{hint}</span>}
			error={status.kind === "not_found" ? "CEP não encontrado" : error}
		>
			<MaskedInput
				mask="cep"
				value={value}
				onValueChange={onValueChange}
				autoComplete="postal-code"
				placeholder="00000-000"
				disabled={disabled}
			/>
		</Field>
	);
}
