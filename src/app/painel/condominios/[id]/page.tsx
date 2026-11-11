import { redirect } from "next/navigation";

import { LEGACY_TABS, condoPath } from "../../_components/condo-nav";
import { OverviewPage } from "./_components/pages";

/** Visão geral. Old tab links (`?aba=…`) redirect to their module route. */
export default async function CondominiumOverview({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ aba?: string }>;
}) {
	const [{ id }, { aba }] = await Promise.all([params, searchParams]);
	const legacy = aba ? LEGACY_TABS[aba] : undefined;
	if (legacy && legacy !== "visao") redirect(condoPath(id, legacy));
	return <OverviewPage />;
}
