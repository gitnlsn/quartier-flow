import type { ReactNode } from "react";

import { CondoProvider } from "./_components/condo-context";

/** Every module of one condominium shares the loaded condominium. */
export default function CondominiumLayout({
	children,
}: { children: ReactNode }) {
	return <CondoProvider>{children}</CondoProvider>;
}
