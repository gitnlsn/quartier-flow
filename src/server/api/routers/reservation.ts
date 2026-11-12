import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	ACTIVE_STATUSES,
	monthRange,
	slotInterval,
	spDate,
	spInstant,
} from "~/lib/reservations";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { audit } from "~/server/audit";
import {
	activeBlocks,
	approve,
	assertCanManageReservations,
	book,
	cancel,
	reservationAccess,
	residentUnits,
	unitLabel,
} from "~/server/reservations";

/** Common area reservations (docs/features/06). */

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido");
const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((v) => v || null);

const areaFields = z
	.object({
		name: z.string().trim().min(2, "Informe o nome da área").max(60),
		description: optionalText(2000),
		capacity: z.number().int().min(1).max(10000).nullable(),
		feeCents: z.number().int().min(0).max(10_000_000),
		slotType: z.enum(["day", "hour"]),
		opensHour: z.number().int().min(0).max(23),
		closesHour: z.number().int().min(1).max(24),
		maxHours: z.number().int().min(1).max(24).nullable(),
		requiresApproval: z.boolean(),
		minAdvanceHours: z
			.number()
			.int()
			.min(0)
			.max(24 * 60),
		maxAdvanceDays: z.number().int().min(1).max(365),
		maxPerUnitPerMonth: z.number().int().min(1).max(31).nullable(),
		cancelUntilHours: z
			.number()
			.int()
			.min(0)
			.max(24 * 60),
		blockDelinquent: z.boolean(),
		closedWeekdays: z
			.array(z.number().int().min(0).max(6))
			.max(6, "A área precisa abrir em algum dia"),
	})
	.refine((v) => v.closesHour > v.opensHour, {
		message: "O fechamento deve ser depois da abertura",
		path: ["closesHour"],
	});

const areaSelect = {
	id: true,
	name: true,
	description: true,
	capacity: true,
	feeCents: true,
	slotType: true,
	opensHour: true,
	closesHour: true,
	maxHours: true,
	requiresApproval: true,
	minAdvanceHours: true,
	maxAdvanceDays: true,
	maxPerUnitPerMonth: true,
	cancelUntilHours: true,
	blockDelinquent: true,
	closedWeekdays: true,
} as const;

export const reservationRouter = createTRPCRouter({
	// -------------------------------------------------------------------------
	// Management (administradora admins and síndicos)
	// -------------------------------------------------------------------------

	/** Module state for a condominium: on/off, permissions and its areas. */
	module: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const { canManage, enabled } = await reservationAccess(
				ctx.session.user.id,
				input.condominiumId,
			);
			const areas = await ctx.db.commonArea.findMany({
				where: { condominiumId: input.condominiumId, archivedAt: null },
				orderBy: { name: "asc" },
				select: areaSelect,
			});
			const pending = await ctx.db.reservation.count({
				where: {
					condominiumId: input.condominiumId,
					status: "pending",
					endsAt: { gt: new Date() },
				},
			});
			const blocks = await ctx.db.areaBlock.findMany({
				where: {
					condominiumId: input.condominiumId,
					endsOn: { gte: spDate(new Date()) },
				},
				orderBy: { startsOn: "asc" },
				select: {
					id: true,
					startsOn: true,
					endsOn: true,
					reason: true,
					area: { select: { name: true } },
				},
			});
			return {
				canManage,
				enabled,
				areas,
				pending,
				blocks: blocks.map(({ area, ...b }) => ({
					...b,
					area: area?.name ?? null,
				})),
			};
		}),

	setEnabled: protectedProcedure
		.input(z.object({ condominiumId: z.string(), enabled: z.boolean() }))
		.mutation(async ({ ctx, input }) => {
			const { administradoraId } = await assertCanManageReservations(
				ctx.session.user.id,
				input.condominiumId,
			);
			await ctx.db.condominium.update({
				where: { id: input.condominiumId },
				data: { reservationsEnabled: input.enabled },
			});
			await audit({
				administradoraId,
				actorUserId: ctx.session.user.id,
				action: input.enabled ? "reservations.enable" : "reservations.disable",
				entity: "condominium",
				entityId: input.condominiumId,
			});
			return { ok: true };
		}),

	/** Creates (no id) or updates an area. */
	saveArea: protectedProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				id: z.string().optional(),
				area: areaFields,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { administradoraId } = await assertCanManageReservations(
				ctx.session.user.id,
				input.condominiumId,
			);
			const data = {
				...input.area,
				closedWeekdays: [...new Set(input.area.closedWeekdays)].sort(),
				maxHours: input.area.slotType === "hour" ? input.area.maxHours : null,
			};
			let id = input.id;
			if (id) {
				const found = await ctx.db.commonArea.findFirst({
					where: { id, condominiumId: input.condominiumId, archivedAt: null },
					select: { id: true },
				});
				if (!found) throw new TRPCError({ code: "NOT_FOUND" });
				await ctx.db.commonArea.update({ where: { id }, data });
			} else {
				id = (
					await ctx.db.commonArea.create({
						data: { ...data, condominiumId: input.condominiumId },
					})
				).id;
			}
			await audit({
				administradoraId,
				actorUserId: ctx.session.user.id,
				action: input.id ? "common_area.update" : "common_area.create",
				entity: "common_area",
				entityId: id,
				data,
			});
			return { id };
		}),

	/** Removes an area from booking. Upcoming bookings must be canceled first. */
	archiveArea: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const area = await ctx.db.commonArea.findUnique({
				where: { id: input.id },
				select: { condominiumId: true, archivedAt: true },
			});
			if (!area || area.archivedAt) throw new TRPCError({ code: "NOT_FOUND" });
			const { administradoraId } = await assertCanManageReservations(
				ctx.session.user.id,
				area.condominiumId,
			);
			const upcoming = await ctx.db.reservation.count({
				where: {
					areaId: input.id,
					status: { in: ACTIVE_STATUSES },
					endsAt: { gt: new Date() },
				},
			});
			if (upcoming > 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Esta área tem ${upcoming} reserva(s) futura(s). Cancele-as antes de removê-la.`,
				});
			}
			await ctx.db.commonArea.update({
				where: { id: input.id },
				data: { archivedAt: new Date() },
			});
			await audit({
				administradoraId,
				actorUserId: ctx.session.user.id,
				action: "common_area.archive",
				entity: "common_area",
				entityId: input.id,
			});
			return { ok: true };
		}),

	/**
	 * Closes one area (or all, without `areaId`) for a date range. Refused
	 * while active bookings fall in it: they must be canceled first, so no
	 * resident loses a booking without being told.
	 */
	addBlock: protectedProcedure
		.input(
			z
				.object({
					condominiumId: z.string(),
					areaId: z.string().nullable(),
					startsOn: date,
					endsOn: date,
					reason: optionalText(120),
				})
				.refine((v) => v.endsOn >= v.startsOn, {
					message: "A data final deve ser igual ou depois da inicial",
					path: ["endsOn"],
				})
				.refine((v) => v.endsOn >= spDate(new Date()), {
					message: "Escolha datas a partir de hoje",
					path: ["endsOn"],
				}),
		)
		.mutation(async ({ ctx, input }) => {
			const { administradoraId } = await assertCanManageReservations(
				ctx.session.user.id,
				input.condominiumId,
			);
			if (input.areaId) {
				const area = await ctx.db.commonArea.findFirst({
					where: {
						id: input.areaId,
						condominiumId: input.condominiumId,
						archivedAt: null,
					},
					select: { id: true },
				});
				if (!area) throw new TRPCError({ code: "NOT_FOUND" });
			}
			const conflicts = await ctx.db.reservation.findMany({
				where: {
					condominiumId: input.condominiumId,
					...(input.areaId && { areaId: input.areaId }),
					status: { in: ACTIVE_STATUSES },
					startsAt: { lt: spInstant(input.endsOn, 24) },
					endsAt: { gt: spInstant(input.startsOn, 0) },
				},
				select: { area: { select: { name: true } }, startsAt: true },
				orderBy: { startsAt: "asc" },
			});
			if (conflicts.length > 0) {
				const list = conflicts
					.slice(0, 3)
					.map(
						(c) =>
							`${c.area.name} em ${spDate(c.startsAt).split("-").reverse().join("/")}`,
					)
					.join(", ");
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Há ${conflicts.length} reserva(s) nessas datas (${list}${conflicts.length > 3 ? "..." : ""}). Cancele-as antes de bloquear, para o morador ser avisado.`,
				});
			}
			const block = await ctx.db.areaBlock.create({
				data: { ...input, createdById: ctx.session.user.id },
			});
			await audit({
				administradoraId,
				actorUserId: ctx.session.user.id,
				action: "area_block.create",
				entity: "area_block",
				entityId: block.id,
				data: input,
			});
			return { id: block.id };
		}),

	removeBlock: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const block = await ctx.db.areaBlock.findUnique({
				where: { id: input.id },
			});
			if (!block) throw new TRPCError({ code: "NOT_FOUND" });
			const { administradoraId } = await assertCanManageReservations(
				ctx.session.user.id,
				block.condominiumId,
			);
			await ctx.db.areaBlock.delete({ where: { id: block.id } });
			await audit({
				administradoraId,
				actorUserId: ctx.session.user.id,
				action: "area_block.delete",
				entity: "area_block",
				entityId: block.id,
				data: {
					areaId: block.areaId,
					startsOn: block.startsOn,
					endsOn: block.endsOn,
				},
			});
			return { ok: true };
		}),

	/** Bookings of a condominium: awaiting approval, upcoming or past. */
	list: protectedProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				view: z.enum(["pending", "upcoming", "past"]),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { canManage } = await reservationAccess(
				ctx.session.user.id,
				input.condominiumId,
			);
			const now = new Date();
			const where =
				input.view === "pending"
					? { status: "pending", endsAt: { gt: now } }
					: input.view === "upcoming"
						? { status: "confirmed", endsAt: { gt: now } }
						: {
								OR: [
									{ endsAt: { lte: now } },
									{ status: { in: ["rejected", "canceled"] } },
								],
							};
			const rows = await ctx.db.reservation.findMany({
				where: { condominiumId: input.condominiumId, ...where },
				orderBy: { startsAt: input.view === "past" ? "desc" : "asc" },
				take: input.view === "past" ? 100 : 500,
				include: {
					area: { select: { name: true, slotType: true } },
					unit: { select: { block: true, number: true } },
					billingItem: { select: { startPeriod: true, archivedAt: true } },
				},
			});
			const userIds = [
				...new Set(rows.map((r) => r.requestedById).filter(Boolean)),
			] as string[];
			const users = await ctx.db.user.findMany({
				where: { id: { in: userIds } },
				select: { id: true, name: true },
			});
			const nameOf = new Map(users.map((u) => [u.id, u.name]));
			return {
				canManage,
				reservations: rows.map((r) => ({
					id: r.id,
					area: r.area.name,
					slotType: r.area.slotType,
					unit: unitLabel(r.unit),
					requestedBy: r.requestedById
						? (nameOf.get(r.requestedById) ?? null)
						: null,
					startsAt: r.startsAt,
					endsAt: r.endsAt,
					status: r.status,
					guestNames: r.guestNames,
					notes: r.notes,
					feeCents: r.feeCents,
					feePeriod:
						r.billingItem && !r.billingItem.archivedAt
							? r.billingItem.startPeriod
							: null,
					decisionNote: r.decisionNote,
				})),
			};
		}),

	approve: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(({ ctx, input }) => approve(input.id, ctx.session.user.id)),

	reject: protectedProcedure
		.input(z.object({ id: z.string(), reason: optionalText(300) }))
		.mutation(({ ctx, input }) =>
			cancel({
				id: input.id,
				actorUserId: ctx.session.user.id,
				reason: input.reason,
				reject: true,
			}),
		),

	/** Cancels a booking: managers anytime, residents within the deadline. */
	cancel: protectedProcedure
		.input(z.object({ id: z.string(), reason: optionalText(300) }))
		.mutation(({ ctx, input }) =>
			cancel({
				id: input.id,
				actorUserId: ctx.session.user.id,
				reason: input.reason,
			}),
		),

	// -------------------------------------------------------------------------
	// Residents
	// -------------------------------------------------------------------------

	/** Condominiums where the user can book: their units and the areas. */
	myOptions: protectedProcedure.query(async ({ ctx }) => {
		const memberships = await residentUnits(ctx.session.user.id);
		const condos = new Map<
			string,
			{ id: string; name: string; units: { id: string; label: string }[] }
		>();
		for (const { unit } of memberships) {
			if (!unit) continue;
			const condo = unit.condominium;
			if (!condo.reservationsEnabled || condo.administradora.closedAt) continue;
			const entry = condos.get(condo.id) ?? {
				id: condo.id,
				name: condo.name,
				units: [],
			};
			if (!entry.units.some((u) => u.id === unit.id)) {
				entry.units.push({ id: unit.id, label: unitLabel(unit) });
			}
			condos.set(condo.id, entry);
		}
		const areas = await ctx.db.commonArea.findMany({
			where: { condominiumId: { in: [...condos.keys()] }, archivedAt: null },
			orderBy: { name: "asc" },
			select: { ...areaSelect, condominiumId: true },
		});
		return [...condos.values()].map((condo) => ({
			...condo,
			areas: areas.filter((a) => a.condominiumId === condo.id),
		}));
	}),

	/**
	 * Taken slots of an area in a month. Residents only see that a slot is
	 * taken (and whether it's their unit's), not by whom.
	 */
	calendar: protectedProcedure
		.input(z.object({ areaId: z.string(), month }))
		.query(async ({ ctx, input }) => {
			const area = await ctx.db.commonArea.findUnique({
				where: { id: input.areaId },
				select: { id: true, condominiumId: true },
			});
			if (!area) throw new TRPCError({ code: "NOT_FOUND" });
			const myUnits = (await residentUnits(ctx.session.user.id))
				.map((m) => m.unit)
				.filter((u) => u?.condominium.id === area.condominiumId)
				.map((u) => u?.id);
			if (myUnits.length === 0) {
				await reservationAccess(ctx.session.user.id, area.condominiumId);
			}
			const { from, to } = monthRange(input.month);
			const busy = await ctx.db.reservation.findMany({
				where: {
					areaId: input.areaId,
					status: { in: ACTIVE_STATUSES },
					startsAt: { lt: to },
					endsAt: { gt: from },
				},
				select: { startsAt: true, endsAt: true, unitId: true },
			});
			const blocks = await activeBlocks(
				area.condominiumId,
				area.id,
				`${input.month}-01`,
			);
			return {
				busy: busy.map((b) => ({
					startsAt: b.startsAt,
					endsAt: b.endsAt,
					mine: myUnits.includes(b.unitId),
				})),
				blocks: blocks.filter((b) => b.startsOn <= `${input.month}-31`),
			};
		}),

	book: protectedProcedure
		.input(
			z.object({
				areaId: z.string(),
				unitId: z.string(),
				date,
				startHour: z.number().int().min(0).max(23).nullable(),
				hours: z.number().int().min(1).max(24).nullable(),
				guestNames: z
					.array(z.string().trim().min(1).max(80))
					.max(500, "Lista de convidados muito longa"),
				notes: optionalText(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const area = await ctx.db.commonArea.findUnique({
				where: { id: input.areaId },
				select: { slotType: true },
			});
			if (!area) throw new TRPCError({ code: "NOT_FOUND" });
			if (
				area.slotType === "hour" &&
				(input.startHour === null || !input.hours)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Escolha o horário da reserva.",
				});
			}
			const slot = slotInterval(area, input.date, input.startHour, input.hours);
			return book({
				userId: ctx.session.user.id,
				areaId: input.areaId,
				unitId: input.unitId,
				...slot,
				guestNames: input.guestNames,
				notes: input.notes,
			});
		}),

	/** Bookings of the user's units, upcoming first, then the last past ones. */
	mine: protectedProcedure
		.input(z.object({ unitId: z.string().nullable() }).optional())
		.query(async ({ ctx, input }) => {
			// Only units the user lives in; the selected one when given.
			const unitIds = (await residentUnits(ctx.session.user.id))
				.map((m) => m.unit?.id)
				.filter((id): id is string => Boolean(id))
				.filter((id) => !input?.unitId || id === input.unitId);
			const rows = await ctx.db.reservation.findMany({
				where: {
					unitId: { in: unitIds },
					// Six months of history is enough for residents.
					startsAt: { gte: new Date(Date.now() - 180 * 24 * 3_600_000) },
				},
				orderBy: { startsAt: "desc" },
				take: 100,
				include: {
					area: {
						select: { name: true, slotType: true, cancelUntilHours: true },
					},
					unit: { select: { block: true, number: true } },
					condominium: { select: { name: true } },
					billingItem: { select: { startPeriod: true, archivedAt: true } },
				},
			});
			return rows.map((r) => ({
				id: r.id,
				area: r.area.name,
				slotType: r.area.slotType,
				condominium: r.condominium.name,
				unit: unitLabel(r.unit),
				startsAt: r.startsAt,
				endsAt: r.endsAt,
				status: r.status,
				guestNames: r.guestNames,
				feeCents: r.feeCents,
				feePeriod:
					r.billingItem && !r.billingItem.archivedAt
						? r.billingItem.startPeriod
						: null,
				decisionNote: r.decisionNote,
				cancelDeadline: new Date(
					r.startsAt.getTime() - r.area.cancelUntilHours * 3_600_000,
				),
			}));
		}),
});
