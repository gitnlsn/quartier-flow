/** Brazilian document and money helpers, shared by client and server. */

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

function allSameDigits(digits: string) {
	return /^(\d)\1+$/.test(digits);
}

export function isValidCpf(value: string): boolean {
	const cpf = onlyDigits(value);
	if (cpf.length !== 11 || allSameDigits(cpf)) return false;
	const check = (length: number) => {
		let sum = 0;
		for (let i = 0; i < length; i++) {
			sum += Number(cpf[i]) * (length + 1 - i);
		}
		const rest = (sum * 10) % 11;
		return rest === 10 ? 0 : rest;
	};
	return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
	const cnpj = onlyDigits(value);
	if (cnpj.length !== 14 || allSameDigits(cnpj)) return false;
	const check = (length: number) => {
		const weights =
			length === 12
				? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
				: [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
		const sum = weights.reduce((acc, w, i) => acc + w * Number(cnpj[i]), 0);
		const rest = sum % 11;
		return rest < 2 ? 0 : 11 - rest;
	};
	return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
}

export function formatCnpj(value: string) {
	const d = onlyDigits(value);
	return d.length === 14
		? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
		: value;
}

export function formatCpf(value: string) {
	const d = onlyDigits(value);
	return d.length === 11
		? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
		: value;
}

/** Shows only the last digits of a CPF (LGPD: don't display it in full). */
export function maskCpf(value: string) {
	const d = onlyDigits(value);
	return d.length === 11 ? `***.***.${d.slice(6, 9)}-${d.slice(9)}` : "—";
}

const brl = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
});
export const formatBRL = (cents: number) => brl.format(cents / 100);

/** "1.234,56" or "1234.56" -> cents. Returns null when not a valid amount. */
export function parseBRLToCents(input: string): number | null {
	const normalized = input
		.trim()
		.replace(/^R\$\s*/, "")
		.replace(/\./g, "")
		.replace(",", ".");
	if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
	return Math.round(Number(normalized) * 100);
}

export const formatDate = (date: Date | string) =>
	new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
