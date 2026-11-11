import type { ReactNode } from "react";

import { ChargesFrame } from "../../_components/pages";

/** Mês atual · Acompanhamento · Histórico (a billing run's page is outside). */
export default function ChargesLayout({ children }: { children: ReactNode }) {
	return <ChargesFrame>{children}</ChargesFrame>;
}
