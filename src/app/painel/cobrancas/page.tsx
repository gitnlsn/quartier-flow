"use client";

import { MyCharges } from "../_components/my-charges";
import { PageTitle } from "../_components/ui";
import { useSelectedUnit } from "../_components/unit-context";

export default function MinhasCobrancasPage() {
	const { selected } = useSelectedUnit();
	return (
		<div className="space-y-6">
			<PageTitle
				title="Minhas cobranças"
				subtitle={
					selected
						? `Unidade ${selected.label} · ${selected.condominiumName}. Aparecem as cobranças em que você é o responsável pelo pagamento.`
						: "Cobranças das unidades em que você é o responsável pelo pagamento."
				}
			/>
			<MyCharges />
		</div>
	);
}
