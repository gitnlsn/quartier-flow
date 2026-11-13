import { CollectionCasePage } from "../../../_components/pages";

export default async function Page({
	params,
}: {
	params: Promise<{ caseId: string }>;
}) {
	const { caseId } = await params;
	return <CollectionCasePage caseId={caseId} />;
}
