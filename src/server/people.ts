import "server-only";

import type { Prisma } from "@prisma/client";

import { env } from "~/env";
import { isValidCpf, onlyDigits } from "~/lib/br";
import { deliver, sendEmail } from "~/server/auth/messaging";
import { db } from "~/server/db";

/** A rule violation that should be shown to the administradora as-is. */
export class PeopleError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "PeopleError";
	}
}

export type PersonInput = {
	condominiumId: string;
	role: "resident" | "sindico";
	unitId?: string;
	residentType?: "owner" | "tenant" | "dependent";
	financiallyResponsible: boolean;
	name: string;
	email: string;
	cpf?: string;
};

/**
 * Adds a person to a condominium (creating the user if needed). Shared by the
 * single invite and the spreadsheet import so both follow the same rules.
 */
export async function addPerson(
	tx: Prisma.TransactionClient,
	input: PersonInput,
) {
	const existingUser = await tx.user.findUnique({
		where: { email: input.email },
	});
	if (existingUser?.cpf && input.cpf && existingUser.cpf !== input.cpf) {
		throw new PeopleError("Este email já está cadastrado com outro CPF.");
	}
	const user =
		existingUser ??
		(await tx.user.create({
			data: {
				email: input.email,
				name: input.name,
				// Invited user: no password; email link / Google prove ownership.
				emailVerified: true,
			},
		}));
	if (input.cpf && !user.cpf) {
		await tx.user.update({ where: { id: user.id }, data: { cpf: input.cpf } });
	}
	const payer =
		input.role === "resident" && input.financiallyResponsible && input.unitId;
	if (payer && !input.cpf && !user.cpf) {
		throw new PeopleError("CPF é obrigatório para o responsável financeiro.");
	}

	const unitId = input.role === "resident" ? (input.unitId ?? null) : null;
	const duplicate = await tx.membership.findFirst({
		where: {
			userId: user.id,
			condominiumId: input.condominiumId,
			unitId,
			role: input.role,
			endedAt: null,
		},
		select: { id: true },
	});
	if (duplicate) {
		throw new PeopleError("Esta pessoa já está cadastrada aqui.");
	}

	if (payer) {
		await tx.membership.updateMany({
			where: { unitId: input.unitId, endedAt: null },
			data: { financiallyResponsible: false },
		});
	}

	return tx.membership.create({
		data: {
			userId: user.id,
			condominiumId: input.condominiumId,
			unitId,
			role: input.role,
			residentType:
				input.role === "resident" ? (input.residentType ?? "owner") : null,
			financiallyResponsible: Boolean(payer),
		},
	});
}

export function sendInvite(input: {
	name: string;
	email: string;
	condominiumName: string;
}) {
	const signInUrl = new URL("/entrar", env.BETTER_AUTH_URL).toString();
	deliver(
		sendEmail({
			to: input.email,
			subject: `Você foi convidado para o ${input.condominiumName} no Quartier Flow`,
			text: [
				`Olá, ${input.name}!`,
				"",
				`Você foi cadastrado no condomínio ${input.condominiumName} no Quartier Flow.`,
				`Para entrar, acesse ${signInUrl} e use este email (${input.email}) ou sua conta Google com o mesmo email.`,
			].join("\n"),
		}),
	);
}

// ---------------------------------------------------------------------------
// Spreadsheet import (validate first, then import what is valid)
// ---------------------------------------------------------------------------

/** One spreadsheet row after column mapping (raw text from the file). */
export type ImportRow = {
	name: string;
	email: string;
	block: string;
	unit: string;
	cpf: string;
	residentType: string;
	role: string;
	payer: string;
};

export type ImportRowResult = {
	line: number;
	status: "create" | "existing_user" | "skip" | "error";
	messages: string[];
	data: {
		name: string;
		email: string;
		block: string;
		unit: string;
		cpfMasked: string | null;
		role: "resident" | "sindico";
		residentType: "owner" | "tenant" | "dependent";
		payer: boolean;
		createsUnit: boolean;
	};
};

const norm = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "");

function parseRole(value: string): "resident" | "sindico" | null {
	const v = norm(value);
	if (!v || ["morador", "residente", "resident"].includes(v)) return "resident";
	if (["sindico", "sindica"].includes(v)) return "sindico";
	return null;
}

function parseResidentType(
	value: string,
): "owner" | "tenant" | "dependent" | null {
	const v = norm(value);
	if (!v || ["proprietario", "proprietaria", "dono", "owner"].includes(v))
		return "owner";
	if (
		["inquilino", "inquilina", "locatario", "locataria", "tenant"].includes(v)
	)
		return "tenant";
	if (["dependente", "dependent"].includes(v)) return "dependent";
	return null;
}

function parseYesNo(value: string): boolean | null {
	const v = norm(value);
	if (!v || ["nao", "n", "no", "false", "0"].includes(v)) return false;
	if (["sim", "s", "x", "yes", "y", "true", "1"].includes(v)) return true;
	return null;
}

/** Excel may store CPFs as numbers, dropping leading zeros: pad back to 11. */
function normalizeCpf(value: string) {
	const digits = onlyDigits(value);
	return digits && digits.length < 11 ? digits.padStart(11, "0") : digits;
}

const unitKey = (block: string, number: string) =>
	`${block.trim().toUpperCase()}|${number.trim().toUpperCase()}`;

/**
 * Validates every row without writing anything. Returns what would happen to
 * each row so the administradora can review before confirming.
 */
export async function validateImport(input: {
	condominiumId: string;
	rows: ImportRow[];
	createMissingUnits: boolean;
}): Promise<ImportRowResult[]> {
	const [units, members] = await Promise.all([
		db.unit.findMany({
			where: { condominiumId: input.condominiumId },
			select: { id: true, block: true, number: true },
		}),
		db.membership.findMany({
			where: { condominiumId: input.condominiumId, endedAt: null },
			select: {
				unitId: true,
				role: true,
				financiallyResponsible: true,
				user: { select: { email: true } },
			},
		}),
	]);
	const unitByKey = new Map(units.map((u) => [unitKey(u.block, u.number), u]));
	const emails = [
		...new Set(input.rows.map((r) => r.email.trim().toLowerCase())),
	];
	const users = await db.user.findMany({
		where: { email: { in: emails } },
		select: { email: true, cpf: true },
	});
	const userByEmail = new Map(users.map((u) => [u.email, u]));

	const seenPerson = new Set<string>();
	const payerUnitsInFile = new Set<string>();

	return input.rows.map((row, index) => {
		const messages: string[] = [];
		let error = false;
		const fail = (message: string) => {
			error = true;
			messages.push(message);
		};

		const name = row.name.trim();
		const email = row.email.trim().toLowerCase();
		const block = row.block.trim();
		const number = row.unit.trim();
		const cpf = normalizeCpf(row.cpf);
		const role = parseRole(row.role);
		const residentType = parseResidentType(row.residentType);
		const payer = parseYesNo(row.payer);

		if (name.length < 2) fail("Nome ausente.");
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("Email inválido.");
		if (!role) fail(`Papel desconhecido: "${row.role}".`);
		if (!residentType) fail(`Tipo desconhecido: "${row.residentType}".`);
		if (payer === null)
			fail(`Valor inválido para responsável: "${row.payer}".`);
		if (cpf && !isValidCpf(cpf)) fail("CPF inválido.");

		const isResident = role !== "sindico";
		const key = unitKey(block, number);
		const unit = isResident ? unitByKey.get(key) : undefined;
		let createsUnit = false;
		if (isResident) {
			if (!number) fail("Unidade ausente.");
			else if (!unit) {
				if (input.createMissingUnits) {
					createsUnit = true;
					messages.push("Unidade será criada.");
				} else fail("Unidade não existe neste condomínio.");
			}
		}

		const existing = userByEmail.get(email);
		if (existing?.cpf && cpf && existing.cpf !== cpf) {
			fail("Este email já está cadastrado com outro CPF.");
		}
		const isPayer = Boolean(isResident && payer);
		if (isPayer && !cpf && !existing?.cpf) {
			fail("CPF é obrigatório para o responsável financeiro.");
		}

		const personKey = `${email}|${role}|${isResident ? key : ""}`;
		if (seenPerson.has(personKey)) fail("Linha repetida na planilha.");
		seenPerson.add(personKey);

		if (isPayer && number) {
			if (payerUnitsInFile.has(key)) {
				fail(
					"Mais de um responsável financeiro para esta unidade na planilha.",
				);
			}
			payerUnitsInFile.add(key);
			const currentPayer = members.find(
				(m) => m.financiallyResponsible && unit && m.unitId === unit.id,
			);
			if (currentPayer && currentPayer.user.email !== email) {
				messages.push(
					`Substitui ${currentPayer.user.email} como responsável financeiro.`,
				);
			}
		}

		const alreadyMember = members.some(
			(m) =>
				m.user.email === email &&
				m.role === (role ?? "resident") &&
				(isResident ? unit !== undefined && m.unitId === unit.id : true),
		);

		const status: ImportRowResult["status"] = error
			? "error"
			: alreadyMember
				? "skip"
				: existing
					? "existing_user"
					: "create";
		if (status === "skip") messages.push("Já cadastrado: será ignorado.");

		return {
			line: index + 2, // header is line 1
			status,
			messages,
			data: {
				name,
				email,
				block,
				unit: number,
				cpfMasked: cpf ? `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}` : null,
				role: role ?? "resident",
				residentType: residentType ?? "owner",
				payer: isPayer,
				createsUnit,
			},
		};
	});
}

/** Imports the valid rows (each in its own transaction) and reports results. */
export async function runImport(input: {
	condominiumId: string;
	condominiumName: string;
	rows: ImportRow[];
	createMissingUnits: boolean;
	sendInvites: boolean;
}) {
	const validation = await validateImport(input);
	const toImport = validation.filter(
		(r) => r.status === "create" || r.status === "existing_user",
	);

	const missing = toImport.filter((r) => r.data.createsUnit);
	if (missing.length > 0) {
		await db.unit.createMany({
			data: missing.map((r) => ({
				condominiumId: input.condominiumId,
				block: r.data.block,
				number: r.data.unit,
			})),
			skipDuplicates: true,
		});
	}
	const units = await db.unit.findMany({
		where: { condominiumId: input.condominiumId },
		select: { id: true, block: true, number: true },
	});
	const unitByKey = new Map(
		units.map((u) => [unitKey(u.block, u.number), u.id]),
	);

	let imported = 0;
	const failures: { line: number; message: string }[] = [];
	for (const result of toImport) {
		const raw = input.rows[result.line - 2];
		const cpf = raw ? normalizeCpf(raw.cpf) : "";
		try {
			await db.$transaction((tx) =>
				addPerson(tx, {
					condominiumId: input.condominiumId,
					role: result.data.role,
					unitId:
						result.data.role === "resident"
							? unitByKey.get(unitKey(result.data.block, result.data.unit))
							: undefined,
					residentType: result.data.residentType,
					financiallyResponsible: result.data.payer,
					name: result.data.name,
					email: result.data.email,
					cpf: cpf || undefined,
				}),
			);
			imported++;
			if (input.sendInvites) {
				sendInvite({
					name: result.data.name,
					email: result.data.email,
					condominiumName: input.condominiumName,
				});
			}
		} catch (error) {
			failures.push({
				line: result.line,
				message:
					error instanceof PeopleError ? error.message : "Erro inesperado.",
			});
		}
	}

	return {
		imported,
		skipped: validation.filter((r) => r.status === "skip").length,
		invalid: validation.filter((r) => r.status === "error").length,
		unitsCreated: new Set(
			missing.map((r) => unitKey(r.data.block, r.data.unit)),
		).size,
		failures,
	};
}
