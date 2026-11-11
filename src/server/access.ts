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
	administradoraId: string | null;
	sindicoCondominiumIds: string[];
	isResident: boolean;
};

export async function getAccess(
	db: typeof Db,
	userId: string,
): Promise<Access> {
	const [admin, memberships] = await Promise.all([
		db.administradoraMember.findFirst({
			where: { userId, role: "admin" },
			select: { administradoraId: true },
			orderBy: { createdAt: "asc" },
		}),
		db.membership.findMany({
			where: { userId, endedAt: null },
			select: { role: true, condominiumId: true },
		}),
	]);
	return {
		administradoraId: admin?.administradoraId ?? null,
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
	if (!canManage && !access.sindicoCondominiumIds.includes(condominiumId)) {
		throw new TRPCError({ code: "NOT_FOUND" });
	}
	return { canManage };
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
