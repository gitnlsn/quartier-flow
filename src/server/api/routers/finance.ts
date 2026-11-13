import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { PERIOD_REGEX, currentPeriod } from "~/lib/finance";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import { assertManagedCondominium } from "~/server/api/routers/billing";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import { audit } from "~/server/audit";
import {
	balanceSheetList,
	financeDashboard,
	monthLedger,
	parseSnapshot,
} from "~/server/finance";

const period = z.string().regex(PERIOD_REGEX);

/**
 * Financial transparency (docs/features/05): dashboard and monthly
 * balancetes for the administradora (manages, publishes) and the síndico
 * (views). Residents read published balancetes through `portal`.
 */
export const financeRouter = createTRPCRouter({
	dashboard: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			return {
				canManage,
				...(await financeDashboard(input.condominiumId)),
			};
		}),

	balanceSheets: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			const condo = await ctx.db.condominium.findUniqueOrThrow({
				where: { id: input.condominiumId },
				select: { openingBalanceCents: true, openingBalanceDate: true },
			});
			return {
				canManage,
				opening: {
					cents: condo.openingBalanceCents,
					period: condo.openingBalanceDate?.toISOString().slice(0, 7) ?? null,
				},
				sheets: await balanceSheetList(input.condominiumId),
			};
		}),

	/** A month's balancete: frozen if published, live while a draft. */
	balanceSheet: protectedProcedure
		.input(z.object({ condominiumId: z.string(), period }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			const sheet = await ctx.db.balanceSheet.findUnique({
				where: {
					condominiumId_period: {
						condominiumId: input.condominiumId,
						period: input.period,
					},
				},
			});
			const published = sheet?.status === "published" && sheet.snapshot;
			return {
				canManage,
				id: sheet?.id ?? null,
				status: published ? ("published" as const) : ("draft" as const),
				publishedAt: published ? sheet.publishedAt : null,
				notes: sheet?.notes ?? null,
				/** Only past months can be published. */
				canPublish: input.period < currentPeriod(),
				data: published
					? parseSnapshot(sheet.snapshot)
					: await monthLedger(input.condominiumId, input.period),
			};
		}),

	/** Freezes the month's numbers and shows them to residents. */
	publish: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				period,
				notes: z.string().trim().max(2000).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			if (input.period >= currentPeriod()) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Só é possível publicar o balancete depois que o mês terminar.",
				});
			}
			const data = await monthLedger(input.condominiumId, input.period);
			const values = {
				status: "published",
				snapshot: data,
				notes: input.notes || null,
				publishedAt: new Date(),
				publishedById: ctx.session.user.id,
			};
			const sheet = await ctx.db.balanceSheet.upsert({
				where: {
					condominiumId_period: {
						condominiumId: input.condominiumId,
						period: input.period,
					},
				},
				create: {
					condominiumId: input.condominiumId,
					period: input.period,
					...values,
				},
				update: values,
				select: { id: true },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "balanceSheet.publish",
				entity: "balanceSheet",
				entityId: sheet.id,
				data: {
					condominiumId: input.condominiumId,
					period: input.period,
					closingCents: data.closingCents,
				},
			});
			return sheet;
		}),

	/** Hides it from residents again and unlocks the month's expenses. */
	unpublish: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const sheet = await ctx.db.balanceSheet.findFirst({
				where: {
					id: input.id,
					condominium: { administradoraId: ctx.administradoraId },
				},
			});
			if (!sheet) throw new TRPCError({ code: "NOT_FOUND" });
			await ctx.db.balanceSheet.update({
				where: { id: sheet.id },
				data: {
					status: "draft",
					snapshot: Prisma.DbNull,
					publishedAt: null,
					publishedById: null,
				},
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "balanceSheet.unpublish",
				entity: "balanceSheet",
				entityId: sheet.id,
				// Keep what residents had seen.
				data: {
					condominiumId: sheet.condominiumId,
					period: sheet.period,
					publishedAt: sheet.publishedAt?.toISOString() ?? null,
					snapshot: sheet.snapshot ?? null,
				},
			});
			return { ok: true };
		}),

	/** Cash on hand at the start of a month, before Quartier Flow. */
	saveOpeningBalance: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				cents: z.number().int().min(-100_000_000_00).max(100_000_000_00),
				period,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const published = await ctx.db.balanceSheet.count({
				where: { condominiumId: input.condominiumId, status: "published" },
			});
			if (published > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"Já há balancetes publicados. Despublique-os para alterar o saldo inicial.",
				});
			}
			await ctx.db.condominium.update({
				where: { id: input.condominiumId },
				data: {
					openingBalanceCents: input.cents,
					openingBalanceDate: new Date(`${input.period}-01T00:00:00Z`),
				},
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "condominium.openingBalance",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { cents: input.cents, period: input.period },
			});
			return { ok: true };
		}),
});
