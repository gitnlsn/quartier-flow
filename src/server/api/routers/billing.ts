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
	itemFields,
	runItemImport,
	validateItemImport,
} from "~/server/billing/items";
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

/**
 * Items created by other modules (acordo installments, reservation fees) are
 * managed there: editing or removing them here would break that record.
 */
async function assertEditableItem(db: typeof Db, itemId: string) {
	const item = await db.unitBillingItem.findUnique({
		where: { id: itemId },
		select: { source: true },
	});
	if (item?.source === "agreement") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Parcelas de acordo são gerenciadas em Inadimplência.",
		});
	}
	if (item?.source === "reservation") {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Taxas de reserva são gerenciadas em Reservas.",
		});
	}
}

/** Turns domain errors into messages the management area can show. */
export async function asUserError<T>(work: () => Promise<T>) {
	try {
		return await work();
	} catch (error) {
		if (error instanceof BillingError) {
			throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
		}
		throw error;
	}
}

export async function assertManagedCondominium(
	db: typeof Db,
	administradoraId: string,
	condominiumId: string,
) {
	const condo = await db.condominium.findFirst({
		where: { id: condominiumId, administradoraId },
		select: { id: true },
	});
	if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
}

const cell = z.string().max(200).default("");
const itemImportInput = z.object({
	condominiumId: z.string(),
	defaultPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
	rows: z
		.array(
			z.object({
				block: cell,
				unit: cell,
				name: cell,
				description: cell,
				amount: cell,
				period: cell,
			}),
		)
		.min(1, "A planilha está vazia.")
		.max(2000, "Importe no máximo 2.000 linhas por vez."),
});

export const billingRouter = createTRPCRouter({
	saveConfig: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				enabled: z.boolean(),
				mode: z.enum(["manual", "automatic"]),
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

	/** Shared items (with per-unit exceptions) and every unit's own items. */
	items: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			await assertCanViewCondominium(ctx.db, access, input.condominiumId);
			const [shared, individual] = await Promise.all([
				ctx.db.billingItem.findMany({
					where: { condominiumId: input.condominiumId, archivedAt: null },
					orderBy: { createdAt: "asc" },
					include: { overrides: true },
				}),
				ctx.db.unitBillingItem.findMany({
					where: { condominiumId: input.condominiumId, archivedAt: null },
					orderBy: [{ startPeriod: "desc" }, { createdAt: "asc" }],
				}),
			]);
			return { shared, individual };
		}),

	saveItem: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				itemId: z.string().optional(),
				item: itemFields,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const saved = input.itemId
				? await ctx.db.billingItem.update({
						where: { id: input.itemId, condominiumId: input.condominiumId },
						data: input.item,
					})
				: await ctx.db.billingItem.create({
						data: { ...input.item, condominiumId: input.condominiumId },
					});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: input.itemId ? "billing_item.update" : "billing_item.create",
				entity: "billing_item",
				entityId: saved.id,
				data: input.item,
			});
			return { id: saved.id };
		}),

	archiveItem: adminProcedure
		.input(z.object({ condominiumId: z.string(), itemId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			await ctx.db.billingItem.update({
				where: { id: input.itemId, condominiumId: input.condominiumId },
				data: { archivedAt: new Date() },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "billing_item.archive",
				entity: "billing_item",
				entityId: input.itemId,
			});
			return { ok: true };
		}),

	/** Different amount of a shared item for one unit (null removes it). */
	setOverride: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				itemId: z.string(),
				unitId: z.string(),
				amountCents: z.number().int().min(0).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const [item, unit] = await Promise.all([
				ctx.db.billingItem.findFirst({
					where: { id: input.itemId, condominiumId: input.condominiumId },
				}),
				ctx.db.unit.findFirst({
					where: { id: input.unitId, condominiumId: input.condominiumId },
				}),
			]);
			if (!item || !unit) throw new TRPCError({ code: "NOT_FOUND" });
			if (input.amountCents === null) {
				await ctx.db.billingItemOverride.deleteMany({
					where: { itemId: item.id, unitId: unit.id },
				});
			} else {
				await ctx.db.billingItemOverride.upsert({
					where: { itemId_unitId: { itemId: item.id, unitId: unit.id } },
					update: { amountCents: input.amountCents },
					create: {
						itemId: item.id,
						unitId: unit.id,
						amountCents: input.amountCents,
					},
				});
			}
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "billing_item.override",
				entity: "unit",
				entityId: unit.id,
				data: { itemId: item.id, amountCents: input.amountCents },
			});
			return { ok: true };
		}),

	saveUnitItem: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				unitId: z.string(),
				itemId: z.string().optional(),
				item: itemFields,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const unit = await ctx.db.unit.findFirst({
				where: { id: input.unitId, condominiumId: input.condominiumId },
				select: { id: true },
			});
			if (!unit) throw new TRPCError({ code: "NOT_FOUND" });
			if (input.itemId) await assertEditableItem(ctx.db, input.itemId);
			const saved = input.itemId
				? await ctx.db.unitBillingItem.update({
						where: { id: input.itemId, unitId: unit.id },
						data: input.item,
					})
				: await ctx.db.unitBillingItem.create({
						data: {
							...input.item,
							condominiumId: input.condominiumId,
							unitId: unit.id,
						},
					});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: input.itemId ? "unit_item.update" : "unit_item.create",
				entity: "unit",
				entityId: unit.id,
				data: { itemId: saved.id, ...input.item },
			});
			return { id: saved.id };
		}),

	archiveUnitItem: adminProcedure
		.input(z.object({ condominiumId: z.string(), itemId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			await assertEditableItem(ctx.db, input.itemId);
			const item = await ctx.db.unitBillingItem.update({
				where: { id: input.itemId, condominiumId: input.condominiumId },
				data: { archivedAt: new Date() },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "unit_item.archive",
				entity: "unit",
				entityId: item.unitId,
				data: { itemId: item.id },
			});
			return { ok: true };
		}),

	/** Validates a spreadsheet of individual items (no writes). */
	previewItemImport: adminProcedure
		.input(itemImportInput)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			return validateItemImport(input);
		}),

	importItems: adminProcedure
		.input(itemImportInput)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const result = await runItemImport(input);
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "unit_item.import",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { rows: input.rows.length, ...result },
			});
			return result;
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

	/**
	 * Charges of a condominium across months, for follow-up and history.
	 * Filters: period (YYYY-MM), unit, status. Drafts are excluded.
	 */
	charges: protectedProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				period: z
					.string()
					.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
					.optional(),
				/** Charges whose due date falls in this month (YYYY-MM). */
				dueMonth: z
					.string()
					.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
					.optional(),
				unitId: z.string().optional(),
				status: z
					.enum([
						"pending",
						"confirmed",
						"received",
						"overdue",
						"skipped",
						"failed",
						"canceled",
						"refunded",
						"renegotiated",
						"forgiven",
					])
					.optional(),
				limit: z.number().int().min(1).max(1000).default(500),
			}),
		)
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			await assertCanViewCondominium(ctx.db, access, input.condominiumId);
			const charges = await ctx.db.charge.findMany({
				where: {
					condominiumId: input.condominiumId,
					status: input.status ?? { not: "draft" },
					...(input.unitId ? { unitId: input.unitId } : {}),
					...(input.period ? { run: { period: input.period } } : {}),
					...(input.dueMonth
						? {
								dueDate: {
									gte: new Date(`${input.dueMonth}-01T00:00:00Z`),
									lt: (() => {
										const [y, m] = input.dueMonth.split("-").map(Number);
										return new Date(Date.UTC(y ?? 0, m ?? 1, 1));
									})(),
								},
							}
						: {}),
				},
				orderBy: [
					{ run: { period: "desc" } },
					{ unit: { block: "asc" } },
					{ unit: { number: "asc" } },
				],
				take: input.limit,
				include: {
					unit: { select: { id: true, block: true, number: true } },
					run: { select: { id: true, period: true } },
					lines: { orderBy: { createdAt: "asc" } },
				},
			});
			const payerIds = [
				...new Set(
					charges
						.map((c) => c.payerUserId)
						.filter((id): id is string => Boolean(id)),
				),
			];
			const payers = await ctx.db.user.findMany({
				where: { id: { in: payerIds } },
				select: { id: true, name: true, email: true, cpf: true },
			});
			const payerById = new Map(payers.map((p) => [p.id, p]));
			return charges.map(({ run, ...charge }) => {
				const payer = charge.payerUserId
					? payerById.get(charge.payerUserId)
					: undefined;
				return {
					...charge,
					runId: run?.id ?? null,
					period: run?.period ?? charge.dueDate.toISOString().slice(0, 7),
					payer: payer
						? {
								name: payer.name,
								email: payer.email,
								cpfMasked: payer.cpf ? maskCpf(payer.cpf) : null,
							}
						: null,
				};
			});
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
						include: {
							unit: { select: { block: true, number: true } },
							lines: { orderBy: { createdAt: "asc" } },
						},
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
