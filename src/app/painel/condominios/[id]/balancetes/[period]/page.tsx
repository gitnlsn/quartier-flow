import { notFound } from "next/navigation";

import { PERIOD_REGEX } from "~/lib/finance";
import { BalanceSheetPage } from "../../_components/pages";

export default async function Page({
	params,
}: {
	params: Promise<{ period: string }>;
}) {
	const { period } = await params;
	if (!PERIOD_REGEX.test(period)) notFound();
	return <BalanceSheetPage period={period} />;
}
