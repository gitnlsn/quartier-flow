import { onlyDigits } from "~/lib/br";
import { getSession } from "~/server/auth";
import { lookupCep } from "~/server/cep";

/**
 * Address for a CEP, used to fill address forms. Signed-in users only, so it
 * isn't an open proxy. 404 = CEP doesn't exist; 503 = lookup services down
 * (the person types the address by hand).
 */
export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ cep: string }> },
) {
	const session = await getSession();
	if (!session)
		return Response.json({ error: "unauthorized" }, { status: 401 });

	const cep = onlyDigits((await params).cep);
	if (cep.length !== 8) {
		return Response.json({ error: "invalid" }, { status: 400 });
	}
	try {
		const address = await lookupCep(cep);
		if (!address) return Response.json({ error: "not_found" }, { status: 404 });
		return Response.json(address, {
			headers: { "Cache-Control": "private, max-age=86400" },
		});
	} catch (error) {
		console.error("[cep] lookup failed", error);
		return Response.json({ error: "unavailable" }, { status: 503 });
	}
}
