/**
 * Portuguese default messages for zod. Schemas with their own message keep
 * it; everything else ("Invalid enum value...", "Required") reads like this.
 * Imported for its side effect by the tRPC setup and the API routes.
 */
import { type ZodErrorMap, ZodIssueCode, z } from "zod";

const plural = (n: number | bigint, one: string, many: string) =>
	`${n} ${Number(n) === 1 ? one : many}`;

const ptErrorMap: ZodErrorMap = (issue, ctx) => {
	switch (issue.code) {
		case ZodIssueCode.invalid_type:
			if (issue.received === "undefined" || issue.received === "null") {
				return { message: "Campo obrigatório" };
			}
			if (issue.expected === "number" || issue.expected === "integer") {
				return { message: "Informe um número" };
			}
			if (issue.expected === "date") return { message: "Data inválida" };
			return { message: "Valor inválido" };

		case ZodIssueCode.invalid_literal:
			return {
				message:
					issue.expected === true
						? "Marque esta opção para continuar"
						: "Valor inválido",
			};

		case ZodIssueCode.invalid_enum_value:
			return { message: "Selecione uma opção" };

		case ZodIssueCode.invalid_string:
			if (issue.validation === "email") return { message: "Email inválido" };
			if (issue.validation === "url") return { message: "Link inválido" };
			if (issue.validation === "cuid" || issue.validation === "uuid") {
				return { message: "Identificador inválido" };
			}
			return { message: "Formato inválido" };

		case ZodIssueCode.too_small:
			if (issue.type === "string") {
				return {
					message:
						Number(issue.minimum) <= 1
							? "Campo obrigatório"
							: `Informe pelo menos ${plural(issue.minimum, "caractere", "caracteres")}`,
				};
			}
			if (issue.type === "number" || issue.type === "bigint") {
				return {
					message:
						issue.minimum === 0 && !issue.inclusive
							? "Informe um valor maior que zero"
							: `O valor mínimo é ${issue.minimum}`,
				};
			}
			if (issue.type === "array" || issue.type === "set") {
				return {
					message: `Selecione pelo menos ${plural(issue.minimum, "item", "itens")}`,
				};
			}
			if (issue.type === "date") return { message: "Data muito antiga" };
			return { message: "Valor muito pequeno" };

		case ZodIssueCode.too_big:
			if (issue.type === "string") {
				return {
					message: `Use no máximo ${plural(issue.maximum, "caractere", "caracteres")}`,
				};
			}
			if (issue.type === "number" || issue.type === "bigint") {
				return { message: `O valor máximo é ${issue.maximum}` };
			}
			if (issue.type === "array" || issue.type === "set") {
				return {
					message: `Selecione no máximo ${plural(issue.maximum, "item", "itens")}`,
				};
			}
			if (issue.type === "date") return { message: "Data muito distante" };
			return { message: "Valor muito grande" };

		case ZodIssueCode.invalid_date:
			return { message: "Data inválida" };

		case ZodIssueCode.not_multiple_of:
			return { message: "Valor inválido" };

		case ZodIssueCode.invalid_union:
		case ZodIssueCode.invalid_union_discriminator:
		case ZodIssueCode.invalid_arguments:
		case ZodIssueCode.invalid_return_type:
		case ZodIssueCode.invalid_intersection_types:
		case ZodIssueCode.unrecognized_keys:
		case ZodIssueCode.not_finite:
		case ZodIssueCode.custom:
			return { message: "Valor inválido" };
	}
	return { message: ctx.defaultError };
};

z.setErrorMap(ptErrorMap);
