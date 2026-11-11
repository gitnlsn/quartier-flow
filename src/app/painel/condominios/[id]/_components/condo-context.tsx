"use client";

import { useParams } from "next/navigation";
import { type ReactNode, createContext, useContext, useEffect } from "react";

import { type RouterOutputs, api } from "~/trpc/react";
import { LAST_CONDO_COOKIE } from "../../../_components/condo-nav";
import { ErrorMessage, Loading } from "../../../_components/ui";

export type Condo = RouterOutputs["condominium"]["get"];

const CondoContext = createContext<Condo | null>(null);

/**
 * Loads the condominium once for every module page under
 * /painel/condominios/[id] and remembers it as the last one opened.
 */
export function CondoProvider({ children }: { children: ReactNode }) {
	const { id } = useParams<{ id: string }>();
	const condo = api.condominium.get.useQuery({ id });

	useEffect(() => {
		if (!condo.data) return;
		// Preference only (which condominium the sidebar reopens); read on the server.
		document.cookie = `${LAST_CONDO_COOKIE}=${condo.data.id}; path=/painel; max-age=31536000; samesite=lax`;
	}, [condo.data]);

	if (condo.isLoading) return <Loading />;
	if (!condo.data) {
		return (
			<ErrorMessage
				message={condo.error?.message ?? "Condomínio não encontrado."}
			/>
		);
	}
	return (
		<CondoContext.Provider value={condo.data}>{children}</CondoContext.Provider>
	);
}

export function useCondo(): Condo {
	const condo = useContext(CondoContext);
	if (!condo) throw new Error("useCondo must be used inside CondoProvider");
	return condo;
}
