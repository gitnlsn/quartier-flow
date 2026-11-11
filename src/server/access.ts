import "server-only";

import { TRPCError } from "@trpc/server";

import type { db as Db } from "~/server/db";

/**
 * What a user can see and do (docs/features/19). One area for everyone:
 * - resident: their own charges
 * - síndico: read-only view of their condominiums
 * - administradora admin: everything residents and síndicos see in its
 *   condominiums, plus management.
 */
export type Access = {
	/** The administradora this user manages (never a closed one). */
	administradoraId: string | null;
	/** Closed administradoras the user managed: read-only archive. */
	closedAdministradoraIds: string[];
	sindicoCondominiumIds: string[];
	isResident: boolean;
};

export async function getAccess(
	db: typeof Db,
	userId: string,
): Promise<Access> {
	const [admins, memberships] = await Promise.all([
		db.administradoraMember.findMany({
			where: { userId, role: "admin" },
			select: {
				administradoraId: true,
				administradora: { select: { closedAt: true } },
			},
			orderBy: { createdAt: "asc" },
		}),
		db.membership.findMany({
			where: { userId, endedAt: null },
			select: { role: true, condominiumId: true },
		}),
	]);
	const open = admins.find((a) => !a.administradora.closedAt);
	return {
		administradoraId: open?.administradoraId ?? null,
		closedAdministradoraIds: admins
			.filter((a) => a.administradora.closedAt)
			.map((a) => a.administradoraId),
		sindicoCondominiumIds: memberships
			.filter((m) => m.role === "sindico")
			.map((m) => m.condominiumId),
		isResident: memberships.some((m) => m.role === "resident"),
	};
}

/**
 * Throws unless the user can view the condominium. Returns whether they can
 * also manage it (administradora admins only).
 */
export async function assertCanViewCondominium(
	db: typeof Db,
	access: Access,
	condominiumId: string,
) {
	const condo = await db.condominium.findUnique({
		where: { id: condominiumId },
		select: { administradoraId: true },
	});
	if (!condo) throw new TRPCError({ code: "NOT_FOUND" });
	const canManage = condo.administradoraId === access.administradoraId;
	if (
		!canManage &&
		!access.sindicoCondominiumIds.includes(condominiumId) &&
		!access.closedAdministradoraIds.includes(condo.administradoraId)
	) {
		throw new TRPCError({ code: "NOT_FOUND" });
	}
	return { canManage };
}

/**
 * Prisma filter for the condominiums a user can open: the administradora's
 * (managed), its archive after closing (read-only), and síndico ones.
 */
export function viewableCondominiums(access: Access) {
	return {
		OR: [
			...(access.administradoraId
				? [{ administradoraId: access.administradoraId }]
				: []),
			...(access.closedAdministradoraIds.length
				? [{ administradoraId: { in: access.closedAdministradoraIds } }]
				: []),
			{ id: { in: access.sindicoCondominiumIds } },
		],
	};
}

/**
 * Administradoras whose Quartier Flow invoices this user sees: every one
 * they admin(ned) that ever signed a plan, closed ones included, so the last
 * invoices stay payable after closing (docs/features/18).
 */
export function billingAdministradoras(db: typeof Db, userId: string) {
	return db.administradora.findMany({
		where: {
			members: { some: { userId, role: "admin" } },
			plans: { some: {} },
		},
		select: { id: true, name: true, closedAt: true },
		orderBy: { createdAt: "asc" },
	});
}

/** The administradora's current plan (null until it signs one in onboarding). */
export function getActivePlan(db: typeof Db, administradoraId: string) {
	return db.administradoraPlan.findFirst({
		where: { administradoraId, endedAt: null },
		include: { plan: true },
		orderBy: { startedAt: "desc" },
	});
}

/** Management actions need a signed plan (docs/features/19 onboarding). */
export async function assertActivePlan(
	db: typeof Db,
	administradoraId: string,
) {
	if (!(await getActivePlan(db, administradoraId))) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message:
				"Assine um plano para começar a usar a gestão. Conclua o cadastro em Início.",
		});
	}
}
