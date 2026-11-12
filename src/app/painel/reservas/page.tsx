"use client";

import { BookArea } from "../_components/book-area";
import { PageTitle } from "../_components/ui";

export default function ReservasPage() {
	return (
		<div className="space-y-6">
			<PageTitle
				title="Reservar área comum"
				subtitle="Veja os dias livres e reserve o salão, a churrasqueira e as demais áreas."
			/>
			<BookArea />
		</div>
	);
}
