import "server-only";

export type CepAddress = {
	cep: string;
	street: string;
	neighborhood: string;
	city: string;
	state: string;
};

const DAY = 60 * 60 * 24;

/** BrasilAPI (several sources behind it), then ViaCEP. null = CEP not found. */
async function fromBrasilApi(cep: string): Promise<CepAddress | null> {
	const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
		signal: AbortSignal.timeout(4000),
		next: { revalidate: DAY },
	});
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(`BrasilAPI ${res.status}`);
	const data = (await res.json()) as Partial<Record<string, string>>;
	return {
		cep,
		street: data.street ?? "",
		neighborhood: data.neighborhood ?? "",
		city: data.city ?? "",
		state: data.state ?? "",
	};
}

async function fromViaCep(cep: string): Promise<CepAddress | null> {
	const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
		signal: AbortSignal.timeout(4000),
		next: { revalidate: DAY },
	});
	if (res.status === 400) return null;
	if (!res.ok) throw new Error(`ViaCEP ${res.status}`);
	const data = (await res.json()) as Partial<Record<string, string>> & {
		erro?: unknown;
	};
	if (data.erro) return null;
	return {
		cep,
		street: data.logradouro ?? "",
		neighborhood: data.bairro ?? "",
		city: data.localidade ?? "",
		state: data.uf ?? "",
	};
}

/** Looks up an 8-digit CEP. Throws only when both services are unavailable. */
export async function lookupCep(cep: string): Promise<CepAddress | null> {
	try {
		const found = await fromBrasilApi(cep);
		if (found) return found;
		// BrasilAPI said "not found": confirm with ViaCEP (it has some extra CEPs).
	} catch (error) {
		console.warn("[cep] BrasilAPI failed, trying ViaCEP", error);
	}
	return fromViaCep(cep);
}
