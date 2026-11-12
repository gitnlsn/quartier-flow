import type { ReactNode } from "react";

import { ReservationsFrame } from "../_components/reservations-tab";

/** Reservas · Áreas e regras (docs/features/06). */
export default function ReservationsLayout({
	children,
}: { children: ReactNode }) {
	return <ReservationsFrame>{children}</ReservationsFrame>;
}
