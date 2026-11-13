import "server-only";

import { db } from "~/server/db";

/**
 * Who should hear about something in a condominium (docs/features/16).
 * Each returns user ids; `notify()` dedupes them.
 */

/** Admins of the condominium's administradora (unless closed) and its active síndicos. */
export async function condominiumManagers(condominiumId: string) {
	const condo = await db.condominium.findUnique({
		where: { id: condominiumId },
		select: {
			administradora: {
				select: {
					closedAt: true,
					members: { where: { role: "admin" }, select: { userId: true } },
				},
			},
			memberships: {
				where: { role: "sindico", endedAt: null },
				select: { userId: true },
			},
		},
	});
	if (!condo) return [];
	const admins = condo.administradora.closedAt
		? []
		: condo.administradora.members.map((m) => m.userId);
	return [...admins, ...condo.memberships.map((m) => m.userId)];
}

/** People living in the unit (active resident memberships). */
export async function unitResidents(unitId: string) {
	const rows = await db.membership.findMany({
		where: { unitId, role: "resident", endedAt: null },
		select: { userId: true },
	});
	return rows.map((r) => r.userId);
}
