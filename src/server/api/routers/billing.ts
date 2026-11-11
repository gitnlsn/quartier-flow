import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { maskCpf } from "~/lib/br";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import { audit } from "~/server/audit";
import {
	BillingError,
	periodOf,
	prepareRun,
	retryFailed,
	sendRun,
} from "~/server/billing/runs";
import type { db as Db } from "~/server/db";

async function assertRun(
	db: typeof Db,
	administradoraId: string,
	runId: string,
) {
	const run = await db.billingRun.findFirst({
		where: { id: runId, condominium: { administradoraId } },
		select: { id: true, condominiumId: true },
	});
	if (!run) throw new TRPCError({ code: "NOT_FOUND" });
	return run;
}

/** Turns domain errors into messages the management area can show. */
async function asUserError<T>(work: () => Promise<T>) {
	try {
		return await work();
	} catch (error) {
		if (error instanceof BillingError) {
			throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
		}
		throw error;
	}
}

export const billingRouter = createTRPCRouter({
	saveConfig: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				enabled: z.boolean(),
				mode: z.enum(["manual", "automatic"]),
				defaultAmountCents: z.number().int().min(0),
				dueDay: z.number().int().min(1).max(28),
				generationDay: z.number().int().min(1).max(28),
				finePercent: z.number().min(0).max(2), // legal cap for condominium fees
				interestPercent: z.number().min(0).max(10),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const condo = await ctx.db.condominium.findFirst({
				where: {
					id: input.condominiumId,
					administradoraId: ctx.administradoraId,
				},
				select: { id: true },
			});
			if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
			const { condominiumId, ...data } = input;
			const config = await ctx.db.billingConfig.upsert({
				where: { condominiumId },
				update: data,
				create: { condominiumId, ...data },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "billing_config.save",
				entity: "condominium",
				entityId: condominiumId,
				data: input,
			});
			return { id: config.id };
		}),

	listRuns: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			await assertCanViewCondominium(ctx.db, access, input.condominiumId);
			const runs = await ctx.db.billingRun.findMany({
				where: { condominiumId: input.condominiumId },
				orderBy: { period: "desc" },
				include: { charges: { select: { status: true, amountCents: true } } },
			});
			return runs.map(({ charges, ...run }) => ({
				...run,
				totalCents: charges
					.filter((c) => c.status !== "skipped")
					.reduce((sum, c) => sum + c.amountCents, 0),
				counts: charges.reduce<Record<string, number>>((acc, c) => {
					acc[c.status] = (acc[c.status] ?? 0) + 1;
					return acc;
				}, {}),
			}));
		}),

	getRun: protectedProcedure
		.input(z.object({ runId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const target = await ctx.db.billingRun.findUnique({
				where: { id: input.runId },
				select: { condominiumId: true },
			});
			if (!target) throw new TRPCError({ code: "NOT_FOUND" });
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				target.condominiumId,
			);
			const run = await ctx.db.billingRun.findUnique({
				where: { id: input.runId },
				include: {
					condominium: { select: { id: true, name: true } },
					charges: {
						orderBy: [{ unit: { block: "asc" } }, { unit: { number: "asc" } }],
						include: { unit: { select: { block: true, number: true } } },
					},
				},
			});
			if (!run) throw new TRPCError({ code: "NOT_FOUND" });

			const payerIds = run.charges
				.map((c) => c.payerUserId)
				.filter((id): id is string => Boolean(id));
			const payers = await ctx.db.user.findMany({
				where: { id: { in: payerIds } },
				select: { id: true, name: true, email: true, cpf: true },
			});
			const payerById = new Map(payers.map((p) => [p.id, p]));
			const history = await ctx.db.auditLog.findMany({
				where: { entity: "billing_run", entityId: run.id },
				orderBy: { createdAt: "asc" },
			});
			const actorIds = history
				.map((h) => h.actorUserId)
				.filter((id): id is string => Boolean(id));
			const actors = await ctx.db.user.findMany({
				where: { id: { in: actorIds } },
				select: { id: true, name: true, email: true },
			});
			const actorById = new Map(actors.map((a) => [a.id, a]));

			return {
				...run,
				canManage,
				charges: run.charges.map((charge) => {
					const payer = charge.payerUserId
						? payerById.get(charge.payerUserId)
						: undefined;
					return {
						...charge,
						payer: payer
							? {
									name: payer.name,
									email: payer.email,
									cpfMasked: payer.cpf ? maskCpf(payer.cpf) : null,
								}
							: null,
					};
				}),
				history: history.map((h) => ({
					id: h.id,
					action: h.action,
					createdAt: h.createdAt,
					data: h.data,
					actor: h.actorUserId
						? (actorById.get(h.actorUserId) ?? { name: "?", email: "" })
						: null,
				})),
			};
		}),

	prepareRun: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				period: z
					.string()
					.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
					.default(() => periodOf(new Date())),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const condo = await ctx.db.condominium.findFirst({
				where: {
					id: input.condominiumId,
					administradoraId: ctx.administradoraId,
				},
				select: { id: true },
			});
			if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
			const run = await asUserError(() =>
				prepareRun({
					condominiumId: condo.id,
					period: input.period,
					actorUserId: ctx.session.user.id,
				}),
			);
			return { runId: run.id };
		}),

	sendRun: adminProcedure
		.input(z.object({ runId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertRun(ctx.db, ctx.administradoraId, input.runId);
			return asUserError(() =>
				sendRun({ runId: input.runId, actorUserId: ctx.session.user.id }),
			);
		}),

	retryFailed: adminProcedure
		.input(z.object({ runId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertRun(ctx.db, ctx.administradoraId, input.runId);
			return asUserError(() =>
				retryFailed({ runId: input.runId, actorUserId: ctx.session.user.id }),
			);
		}),
});
