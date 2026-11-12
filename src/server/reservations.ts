import "server-only";

import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { addMonths } from "~/lib/billing-items";
import { formatDate } from "~/lib/br";
import {
	ACTIVE_STATUSES,
	monthRange,
	slotLabel,
	slotProblem,
	spDate,
	spMonth,
} from "~/lib/reservations";
import {
	assertActivePlan,
	assertCanViewCondominium,
	getAccess,
} from "~/server/access";
import { audit } from "~/server/audit";
import { prepareRun } from "~/server/billing/runs";
import { db } from "~/server/db";

/**
 * Common area reservations (docs/features/06): who may manage them, the
 * booking rules, and the fee added to the unit's next monthly charge.
 */

const fail = (message: string): never => {
	throw new TRPCError({ code: "BAD_REQUEST", message });
};

/**
 * Throws unless the user can see the condominium. Reservations are managed
 * by the administradora admins and, unlike other modules, by its síndicos
 * too (approving bookings is day-to-day work of the síndico).
 */
export async function reservationAccess(userId: string, condominiumId: string) {
	const access = await getAccess(db, userId);
	const { canManage: isAdmin } = await assertCanViewCondominium(
		db,
		access,
		condominiumId,
	);
	const condo = await db.condominium.findUniqueOrThrow({
		where: { id: condominiumId },
		select: {
			administradoraId: true,
			reservationsEnabled: true,
			administradora: { select: { closedAt: true } },
		},
	});
	const canManage =
		!condo.administradora.closedAt &&
		(isAdmin || access.sindicoCondominiumIds.includes(condominiumId));
	return {
		canManage,
		enabled: condo.reservationsEnabled,
		administradoraId: condo.administradoraId,
	};
}

/** Like `reservationAccess`, but throws unless the user can manage. */
export async function assertCanManageReservations(
	userId: string,
	condominiumId: string,
) {
	const result = await reservationAccess(userId, condominiumId);
	if (!result.canManage) throw new TRPCError({ code: "FORBIDDEN" });
	await assertActivePlan(db, result.administradoraId);
	return result;
}

/** Units the user lives in (active resident membership), with their condominium. */
export function residentUnits(userId: string) {
	return db.membership.findMany({
		where: { userId, role: "resident", endedAt: null, unitId: { not: null } },
		select: {
			unit: {
				select: {
					id: true,
					block: true,
					number: true,
					condominium: {
						select: {
							id: true,
							name: true,
							reservationsEnabled: true,
							administradora: { select: { closedAt: true } },
						},
					},
				},
			},
		},
	});
}

/**
 * One-off closures of an area (its own and the condominium-wide ones) that
 * end on or after `fromDate`.
 */
export function activeBlocks(
	condominiumId: string,
	areaId: string,
	fromDate: string,
) {
	return db.areaBlock.findMany({
		where: {
			condominiumId,
			OR: [{ areaId }, { areaId: null }],
			endsOn: { gte: fromDate },
		},
		select: { startsOn: true, endsOn: true, reason: true },
	});
}

export const unitLabel = (unit: { block: string; number: string }) =>
	unit.block ? `${unit.block} · ${unit.number}` : unit.number;

/**
 * Month whose charge carries a reservation fee: the one after the latest
 * monthly charge already sent (or the current month, if later). A month
 * before the latest sent one would never be billed.
 */
async function feePeriod(tx: Prisma.TransactionClient, condominiumId: string) {
	const current = spMonth(new Date());
	const latestSent = await tx.billingRun.findFirst({
		where: { condominiumId, status: { not: "draft" } },
		orderBy: { period: "desc" },
		select: { period: true },
	});
	const next = latestSent ? addMonths(latestSent.period, 1) : current;
	return next > current ? next : current;
}

/** Keeps a draft monthly run in sync after a fee item was added or removed. */
async function refreshDraftRun(
	condominiumId: string,
	period: string,
	actorUserId: string,
) {
	const run = await db.billingRun.findUnique({
		where: { condominiumId_period: { condominiumId, period } },
		select: { status: true },
	});
	if (run?.status !== "draft") return;
	await prepareRun({ condominiumId, period, actorUserId }).catch((error) => {
		console.error("[reservations] draft run refresh failed", error);
	});
}

/**
 * Confirms a reservation: adds the fee (if any) as a one-off item of the unit
 * in the next monthly charge not yet sent.
 */
async function confirm(
	tx: Prisma.TransactionClient,
	reservation: {
		id: string;
		condominiumId: string;
		unitId: string;
		feeCents: number;
		startsAt: Date;
		endsAt: Date;
	},
	area: { name: string; slotType: string },
	actorUserId: string,
) {
	let period: string | null = null;
	let billingItemId: string | null = null;
	if (reservation.feeCents > 0) {
		period = await feePeriod(tx, reservation.condominiumId);
		const item = await tx.unitBillingItem.create({
			data: {
				condominiumId: reservation.condominiumId,
				unitId: reservation.unitId,
				name: `Reserva: ${area.name}`.slice(0, 80),
				description: slotLabel(
					area.slotType,
					reservation.startsAt,
					reservation.endsAt,
				).slice(0, 200),
				amountCents: reservation.feeCents,
				recurrence: "once",
				startPeriod: period,
				source: "reservation",
			},
		});
		billingItemId = item.id;
	}
	await tx.reservation.update({
		where: { id: reservation.id },
		data: {
			status: "confirmed",
			billingItemId,
			decidedById: actorUserId,
			decidedAt: new Date(),
		},
	});
	return period;
}

/**
 * Books a slot for a unit. Runs under a row lock on the area, so two people
 * booking the same slot at once can't both get it.
 */
export async function book(input: {
	userId: string;
	areaId: string;
	unitId: string;
	startsAt: Date;
	endsAt: Date;
	guestNames: string[];
	notes: string | null;
}) {
	const area = await db.commonArea.findUnique({
		where: { id: input.areaId },
		include: {
			condominium: {
				select: {
					id: true,
					administradoraId: true,
					reservationsEnabled: true,
					administradora: { select: { closedAt: true } },
				},
			},
		},
	});
	if (!area || area.archivedAt) throw new TRPCError({ code: "NOT_FOUND" });
	const condo = area.condominium;
	if (!condo.reservationsEnabled || condo.administradora.closedAt) {
		fail("Reservas não estão disponíveis neste condomínio.");
	}
	const lives = await db.membership.findFirst({
		where: {
			userId: input.userId,
			role: "resident",
			endedAt: null,
			unitId: input.unitId,
			condominiumId: condo.id,
		},
		select: { id: true },
	});
	if (!lives) throw new TRPCError({ code: "FORBIDDEN" });

	const blocks = await activeBlocks(condo.id, area.id, spDate(input.startsAt));
	const problem = slotProblem({ ...area, blocks }, input);
	if (problem) fail(problem);

	if (area.blockDelinquent) {
		const overdue = await db.charge.count({
			where: { unitId: input.unitId, status: "overdue" },
		});
		if (overdue > 0) {
			fail(
				"Sua unidade tem cobranças em atraso. Regularize para reservar esta área.",
			);
		}
	}

	const result = await db.$transaction(async (tx) => {
		// Serializes bookings of this area until the transaction ends.
		await tx.$queryRaw`SELECT id FROM "CommonArea" WHERE id = ${area.id} FOR UPDATE`;

		const conflict = await tx.reservation.findFirst({
			where: {
				areaId: area.id,
				status: { in: ACTIVE_STATUSES },
				startsAt: { lt: input.endsAt },
				endsAt: { gt: input.startsAt },
			},
			select: { id: true },
		});
		if (conflict) fail("Este horário acabou de ser reservado. Escolha outro.");

		if (area.maxPerUnitPerMonth) {
			const { from, to } = monthRange(spMonth(input.startsAt));
			const count = await tx.reservation.count({
				where: {
					areaId: area.id,
					unitId: input.unitId,
					status: { in: ACTIVE_STATUSES },
					startsAt: { gte: from, lt: to },
				},
			});
			if (count >= area.maxPerUnitPerMonth) {
				fail(
					`Limite de ${area.maxPerUnitPerMonth} reserva(s) por mês desta área para sua unidade.`,
				);
			}
		}

		const reservation = await tx.reservation.create({
			data: {
				condominiumId: condo.id,
				areaId: area.id,
				unitId: input.unitId,
				requestedById: input.userId,
				startsAt: input.startsAt,
				endsAt: input.endsAt,
				guestNames: input.guestNames,
				notes: input.notes,
				feeCents: area.feeCents,
			},
		});
		const period = area.requiresApproval
			? null
			: await confirm(tx, reservation, area, input.userId);
		return { reservation, period };
	});

	if (result.period) {
		await refreshDraftRun(condo.id, result.period, input.userId);
	}
	await audit({
		administradoraId: condo.administradoraId,
		actorUserId: input.userId,
		action: "reservation.create",
		entity: "reservation",
		entityId: result.reservation.id,
		data: {
			areaId: area.id,
			unitId: input.unitId,
			startsAt: input.startsAt.toISOString(),
			feeCents: area.feeCents,
			status: area.requiresApproval ? "pending" : "confirmed",
		},
	});
	return {
		id: result.reservation.id,
		status: area.requiresApproval ? "pending" : "confirmed",
		feePeriod: result.period,
	};
}

const withArea = {
	area: { select: { name: true, slotType: true } },
	condominium: { select: { administradoraId: true } },
	billingItem: { select: { id: true, startPeriod: true, archivedAt: true } },
} as const;

/** Approves a pending reservation (síndico or administradora). */
export async function approve(id: string, actorUserId: string) {
	const reservation = await db.reservation.findUnique({
		where: { id },
		include: withArea,
	});
	if (!reservation) throw new TRPCError({ code: "NOT_FOUND" });
	await assertCanManageReservations(actorUserId, reservation.condominiumId);
	if (reservation.status !== "pending") {
		fail("Esta reserva não está aguardando aprovação.");
	}
	if (reservation.endsAt <= new Date())
		fail("O horário desta reserva já passou.");

	const period = await db.$transaction((tx) =>
		confirm(tx, reservation, reservation.area, actorUserId),
	);
	if (period) {
		await refreshDraftRun(reservation.condominiumId, period, actorUserId);
	}
	await audit({
		administradoraId: reservation.condominium.administradoraId,
		actorUserId,
		action: "reservation.approve",
		entity: "reservation",
		entityId: id,
		data: { feeCents: reservation.feeCents, feePeriod: period },
	});
	return { feePeriod: period };
}

/**
 * Rejects (pending) or cancels (pending or confirmed) a reservation.
 * Managers can always do it; residents of the unit cancel only up to the
 * area's deadline. An unbilled fee is removed; one already sent stays on the
 * charge (`feeKept`), for the administradora to handle.
 */
export async function cancel(input: {
	id: string;
	actorUserId: string;
	reason: string | null;
	reject?: boolean;
}) {
	const reservation = await db.reservation.findUnique({
		where: { id: input.id },
		include: {
			...withArea,
			area: {
				select: { name: true, slotType: true, cancelUntilHours: true },
			},
		},
	});
	if (!reservation) throw new TRPCError({ code: "NOT_FOUND" });

	const { canManage } = await reservationAccess(
		input.actorUserId,
		reservation.condominiumId,
	).catch(() => ({ canManage: false }));
	if (canManage) {
		await assertCanManageReservations(
			input.actorUserId,
			reservation.condominiumId,
		);
	} else {
		const lives = await db.membership.findFirst({
			where: {
				userId: input.actorUserId,
				role: "resident",
				endedAt: null,
				unitId: reservation.unitId,
			},
			select: { id: true },
		});
		if (!lives || input.reject) throw new TRPCError({ code: "NOT_FOUND" });
		const deadline = new Date(
			reservation.startsAt.getTime() -
				reservation.area.cancelUntilHours * 3_600_000,
		);
		if (new Date() > deadline) {
			fail(
				`O prazo para cancelar terminou em ${formatDate(deadline)}. Fale com a administração do condomínio.`,
			);
		}
	}

	if (input.reject && reservation.status !== "pending") {
		fail("Só é possível recusar reservas aguardando aprovação.");
	}
	if (!ACTIVE_STATUSES.includes(reservation.status)) {
		fail("Esta reserva já foi cancelada ou recusada.");
	}
	if (reservation.endsAt <= new Date()) {
		fail("Esta reserva já aconteceu e não pode ser cancelada.");
	}

	// The fee can be removed while its monthly charge hasn't been sent.
	const item = reservation.billingItem;
	let feeKept = false;
	if (item && !item.archivedAt) {
		const run = await db.billingRun.findUnique({
			where: {
				condominiumId_period: {
					condominiumId: reservation.condominiumId,
					period: item.startPeriod,
				},
			},
			select: { status: true },
		});
		feeKept = Boolean(run && run.status !== "draft");
	}

	await db.$transaction(async (tx) => {
		await tx.reservation.update({
			where: { id: reservation.id },
			data: {
				status: input.reject ? "rejected" : "canceled",
				decidedById: input.actorUserId,
				decidedAt: new Date(),
				decisionNote: input.reason,
			},
		});
		if (item && !item.archivedAt && !feeKept) {
			await tx.unitBillingItem.update({
				where: { id: item.id },
				data: { archivedAt: new Date() },
			});
		}
	});
	if (item && !item.archivedAt && !feeKept) {
		await refreshDraftRun(
			reservation.condominiumId,
			item.startPeriod,
			input.actorUserId,
		);
	}
	await audit({
		administradoraId: reservation.condominium.administradoraId,
		actorUserId: input.actorUserId,
		action: input.reject ? "reservation.reject" : "reservation.cancel",
		entity: "reservation",
		entityId: reservation.id,
		data: {
			by: canManage ? "manager" : "resident",
			reason: input.reason,
			feeKept,
		},
	});
	return { feeKept };
}
