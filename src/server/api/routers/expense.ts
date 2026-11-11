import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { assertCanViewCondominium, getAccess } from "~/server/access";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import { audit } from "~/server/audit";
import { attachments } from "~/server/storage";

/**
 * Condominium expenses (docs/features/05). Creating one goes through
 * POST /api/condominios/[id]/despesas (multipart, carries the invoice file);
 * invoices are opened through GET /api/despesas/[id]/anexo.
 */
export const expenseRouter = createTRPCRouter({
	/** Expenses of a month (YYYY-MM), newest first, with the month's totals. */
	list: protectedProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				month: z.string().regex(/^\d{4}-\d{2}$/),
			}),
		)
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			const from = new Date(`${input.month}-01T00:00:00Z`);
			const to = new Date(from);
			to.setUTCMonth(to.getUTCMonth() + 1);

			const expenses = await ctx.db.expense.findMany({
				where: {
					condominiumId: input.condominiumId,
					paidAt: { gte: from, lt: to },
				},
				orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
				select: {
					id: true,
					category: true,
					supplier: true,
					description: true,
					amountCents: true,
					paidAt: true,
					attachmentName: true,
					attachmentType: true,
					attachmentSize: true,
				},
			});

			const byCategory = new Map<string, number>();
			for (const e of expenses) {
				byCategory.set(
					e.category,
					(byCategory.get(e.category) ?? 0) + e.amountCents,
				);
			}
			return {
				canManage,
				expenses: expenses.map(({ attachmentName, ...e }) => ({
					...e,
					paidAt: e.paidAt.toISOString().slice(0, 10),
					hasAttachment: attachmentName !== null,
					attachmentName,
				})),
				totalCents: expenses.reduce((sum, e) => sum + e.amountCents, 0),
				byCategory: [...byCategory]
					.map(([category, cents]) => ({ category, cents }))
					.sort((a, b) => b.cents - a.cents),
			};
		}),

	/** Deletes the expense and its file. Administradora admins only. */
	delete: adminProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const expense = await ctx.db.expense.findFirst({
				where: {
					id: input.id,
					condominium: { administradoraId: ctx.administradoraId },
				},
			});
			if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

			await ctx.db.expense.delete({ where: { id: expense.id } });
			// After the row: a leftover file is harmless, a row without its file is not.
			if (expense.attachmentKey) {
				await attachments.delete(expense.attachmentKey).catch(() => {});
			}
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "expense.delete",
				entity: "expense",
				entityId: expense.id,
				data: {
					condominiumId: expense.condominiumId,
					amountCents: expense.amountCents,
					description: expense.description,
					attachment: expense.attachmentKey,
				},
			});
			return { ok: true };
		}),
});
