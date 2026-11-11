"use client";

import { MyCharges } from "../_components/my-charges";
import { PageTitle } from "../_components/ui";

export default function MinhasCobrancasPage() {
	return (
		<div className="space-y-6">
			<PageTitle
				title="Minhas cobranças"
				subtitle="Cobranças das unidades em que você é o responsável pelo pagamento."
			/>
			<MyCharges />
		</div>
	);
}
