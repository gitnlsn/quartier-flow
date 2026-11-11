import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isValidCnpj, isValidCpf, maskCpf, onlyDigits } from "~/lib/br";
import {
	assertActivePlan,
	assertCanViewCondominium,
	getAccess,
} from "~/server/access";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import { audit } from "~/server/audit";
import type { db as Db } from "~/server/db";
import {
	PeopleError,
	addPerson,
	runImport,
	sendInvite,
	validateImport,
} from "~/server/people";

/** Throws unless the condominium belongs to the administradora. */
async function assertCondominium(
	db: typeof Db,
	administradoraId: string,
	condominiumId: string,
) {
	const condo = await db.condominium.findFirst({
		where: { id: condominiumId, administradoraId },
		select: { id: true, name: true },
	});
	if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
	return condo;
}

const optionalCnpj = z
	.string()
	.optional()
	.transform((v) => (v ? onlyDigits(v) : undefined))
	.refine((v) => v === undefined || isValidCnpj(v), "CNPJ inválido");

const cell = z.string().max(200).default("");
const importInput = z.object({
	condominiumId: z.string(),
	createMissingUnits: z.boolean(),
	rows: z
		.array(
			z.object({
				name: cell,
				email: cell,
				block: cell,
				unit: cell,
				cpf: cell,
				residentType: cell,
				role: cell,
				payer: cell,
			}),
		)
		.min(1, "A planilha está vazia.")
		.max(2000, "Importe no máximo 2.000 linhas por vez."),
});

export const condominiumRouter = createTRPCRouter({
	/** Condominiums the user can see: all of its administradora's, or where síndico. */
	list: protectedProcedure.query(async ({ ctx }) => {
		const access = await getAccess(ctx.db, ctx.session.user.id);
		const condos = await ctx.db.condominium.findMany({
			where: {
				OR: [
					...(access.administradoraId
						? [{ administradoraId: access.administradoraId }]
						: []),
					{ id: { in: access.sindicoCondominiumIds } },
				],
			},
			orderBy: { name: "asc" },
			include: {
				billingConfig: { select: { enabled: true, mode: true } },
				_count: {
					select: {
						units: true,
						memberships: { where: { endedAt: null } },
					},
				},
			},
		});
		return condos.map((condo) => ({
			...condo,
			canManage: condo.administradoraId === access.administradoraId,
		}));
	}),

	get: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.id,
			);
			const condo = await ctx.db.condominium.findUnique({
				where: { id: input.id },
				include: {
					billingConfig: true,
					units: { orderBy: [{ block: "asc" }, { number: "asc" }] },
					memberships: {
						where: { endedAt: null },
						orderBy: { createdAt: "asc" },
						include: {
							user: {
								select: { id: true, name: true, email: true, cpf: true },
							},
						},
					},
				},
			});
			if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
			return {
				...condo,
				canManage,
				billingConfig: condo.billingConfig
					? {
							...condo.billingConfig,
							finePercent: Number(condo.billingConfig.finePercent),
							interestPercent: Number(condo.billingConfig.interestPercent),
						}
					: null,
				// LGPD: never send full CPFs to the browser.
				memberships: condo.memberships.map(({ user, ...m }) => ({
					...m,
					user: {
						id: user.id,
						name: user.name,
						email: user.email,
						cpfMasked: user.cpf ? maskCpf(user.cpf) : null,
						hasCpf: Boolean(user.cpf),
					},
				})),
			};
		}),

	create: adminProcedure
		.input(
			z.object({
				name: z.string().trim().min(2, "Informe o nome"),
				cnpj: optionalCnpj,
				address: z.string().trim().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertActivePlan(ctx.db, ctx.administradoraId);
			const condo = await ctx.db.condominium.create({
				data: { ...input, administradoraId: ctx.administradoraId },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "condominium.create",
				entity: "condominium",
				entityId: condo.id,
			});
			return condo;
		}),

	addUnits: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				block: z.string().trim().default(""),
				// "101, 102, 201" or "101-110"
				numbers: z.string().trim().min(1, "Informe as unidades"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const numbers = new Set<string>();
			for (const part of input.numbers.split(/[,\s]+/).filter(Boolean)) {
				const range = /^(\d+)-(\d+)$/.exec(part);
				if (range) {
					const [from, to] = [Number(range[1]), Number(range[2])];
					if (to < from || to - from > 500) {
						throw new TRPCError({
							code: "BAD_REQUEST",
							message: `Intervalo inválido: ${part}`,
						});
					}
					for (let n = from; n <= to; n++) numbers.add(String(n));
				} else {
					numbers.add(part);
				}
			}
			const result = await ctx.db.unit.createMany({
				data: [...numbers].map((number) => ({
					condominiumId: input.condominiumId,
					block: input.block,
					number,
				})),
				skipDuplicates: true,
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "unit.create_many",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { block: input.block, count: result.count },
			});
			return { created: result.count };
		}),

	invitePerson: adminProcedure
		.input(
			z
				.object({
					condominiumId: z.string(),
					role: z.enum(["resident", "sindico"]),
					unitId: z.string().optional(),
					residentType: z.enum(["owner", "tenant", "dependent"]).optional(),
					financiallyResponsible: z.boolean().default(false),
					name: z.string().trim().min(2, "Informe o nome"),
					email: z.string().trim().toLowerCase().email("Email inválido"),
					cpf: z
						.string()
						.optional()
						.transform((v) => (v ? onlyDigits(v) : undefined))
						.refine((v) => v === undefined || isValidCpf(v), "CPF inválido"),
				})
				.refine((v) => v.role === "sindico" || v.unitId, {
					message: "Escolha a unidade do morador",
					path: ["unitId"],
				})
				.refine((v) => !v.financiallyResponsible || v.cpf, {
					message: "CPF é obrigatório para o responsável financeiro",
					path: ["cpf"],
				}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertActivePlan(ctx.db, ctx.administradoraId);
			const condo = await assertCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			if (input.unitId) {
				const unit = await ctx.db.unit.findFirst({
					where: { id: input.unitId, condominiumId: input.condominiumId },
					select: { id: true },
				});
				if (!unit) throw new TRPCError({ code: "NOT_FOUND" });
			}

			let membership: { id: string };
			try {
				membership = await ctx.db.$transaction((tx) => addPerson(tx, input));
			} catch (error) {
				if (error instanceof PeopleError) {
					throw new TRPCError({ code: "CONFLICT", message: error.message });
				}
				throw error;
			}

			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "membership.invite",
				entity: "membership",
				entityId: membership.id,
				data: { role: input.role, email: input.email },
			});

			sendInvite({
				name: input.name,
				email: input.email,
				condominiumName: condo.name,
			});

			return { id: membership.id };
		}),

	/** Validates spreadsheet rows without saving (preview before import). */
	previewImport: adminProcedure
		.input(importInput)
		.mutation(async ({ ctx, input }) => {
			await assertCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			return validateImport(input);
		}),

	/** Imports the valid rows of a spreadsheet after the preview was confirmed. */
	importPeople: adminProcedure
		.input(importInput.extend({ sendInvites: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			await assertActivePlan(ctx.db, ctx.administradoraId);
			const condo = await assertCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const result = await runImport({
				...input,
				condominiumName: condo.name,
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "membership.import",
				entity: "condominium",
				entityId: condo.id,
				data: {
					rows: input.rows.length,
					imported: result.imported,
					skipped: result.skipped,
					invalid: result.invalid,
					unitsCreated: result.unitsCreated,
					failures: result.failures.length,
				},
			});
			return result;
		}),

	setFinanciallyResponsible: adminProcedure
		.input(z.object({ membershipId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const membership = await ctx.db.membership.findFirst({
				where: {
					id: input.membershipId,
					endedAt: null,
					role: "resident",
					condominium: { administradoraId: ctx.administradoraId },
				},
				include: { user: { select: { cpf: true } } },
			});
			if (!membership?.unitId) throw new TRPCError({ code: "NOT_FOUND" });
			if (!membership.user.cpf) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Cadastre o CPF desta pessoa antes de torná-la responsável financeira.",
				});
			}
			await ctx.db.$transaction([
				ctx.db.membership.updateMany({
					where: { unitId: membership.unitId, endedAt: null },
					data: { financiallyResponsible: false },
				}),
				ctx.db.membership.update({
					where: { id: membership.id },
					data: { financiallyResponsible: true },
				}),
			]);
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "membership.set_financially_responsible",
				entity: "membership",
				entityId: membership.id,
			});
			return { ok: true };
		}),

	endMembership: adminProcedure
		.input(z.object({ membershipId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const membership = await ctx.db.membership.findFirst({
				where: {
					id: input.membershipId,
					endedAt: null,
					condominium: { administradoraId: ctx.administradoraId },
				},
			});
			if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
			await ctx.db.membership.update({
				where: { id: membership.id },
				data: { endedAt: new Date(), financiallyResponsible: false },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "membership.end",
				entity: "membership",
				entityId: membership.id,
			});
			return { ok: true };
		}),
});
