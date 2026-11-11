/**
 * As-you-type masks for Brazilian form fields. Each takes whatever the person
 * typed or pasted and returns the formatted text; servers still strip it back
 * to digits (onlyDigits / parseBRLToCents in ~/lib/br).
 */
import { onlyDigits } from "./br";

/** Applies a pattern where `9` is a digit; stops at the last typed digit. */
function pattern(value: string, mask: string) {
	const digits = onlyDigits(value);
	let out = "";
	let i = 0;
	for (const char of mask) {
		if (i >= digits.length) break;
		out += char === "9" ? digits[i++] : char;
	}
	return out;
}

export const masks = {
	cpf: (v: string) => pattern(v, "999.999.999-99"),
	cnpj: (v: string) => pattern(v, "99.999.999/9999-99"),
	cep: (v: string) => pattern(v, "99999-999"),
	/** Landline (10 digits) or mobile (11 digits), with area code. */
	phone: (v: string) =>
		onlyDigits(v).length > 10
			? pattern(v, "(99) 99999-9999")
			: pattern(v, "(99) 9999-9999"),
	/** Cash register style: digits fill from the cents ("123" -> "1,23"). */
	money: (v: string) => {
		const digits = onlyDigits(v).replace(/^0+/, "").slice(0, 11);
		if (!digits) return "";
		return centsToMoneyInput(Number(digits));
	},
	/** Whole number with thousands separators ("15000" -> "15.000"). */
	integer: (v: string) => {
		const digits = onlyDigits(v).replace(/^0+/, "").slice(0, 12);
		return digits ? Number(digits).toLocaleString("pt-BR") : "";
	},
} satisfies Record<string, (value: string) => string>;

export type MaskName = keyof typeof masks;

/** Cents -> "1.234,56", the text the money mask produces. */
export function centsToMoneyInput(cents: number) {
	return (cents / 100).toLocaleString("pt-BR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
}
