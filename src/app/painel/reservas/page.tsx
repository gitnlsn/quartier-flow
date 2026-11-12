"use client";

import { BookArea } from "../_components/book-area";
import { HelpLink, PageTitle } from "../_components/ui";
import { useSelectedUnit } from "../_components/unit-context";

export default function ReservasPage() {
	const { selected } = useSelectedUnit();
	return (
		<div className="space-y-6">
			<PageTitle
				title="Reservar área comum"
				subtitle={
					selected
						? `Unidade ${selected.label} · ${selected.condominiumName}`
						: "Veja os dias livres e reserve as áreas comuns."
				}
				actions={<HelpLink slug="reservas-de-areas-comuns" />}
			/>
			<BookArea />
		</div>
	);
}
