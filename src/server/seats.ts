import "server-only";

import type { db as Db } from "~/server/db";

/**
 * Distinct residents and síndicos across the administradora's condominiums
 * (docs/features/18). Without `at`: active now. With `at`: active at that
 * moment (joined on or before it, not ended yet), used to bill a past month.
 * A person in two condominiums is one seat; resident and síndico count apart.
 */
export async function countSeats(
	db: typeof Db,
	administradoraId: string,
	at?: Date,
) {
	const active = at
		? {
				createdAt: { lte: at },
				OR: [{ endedAt: null }, { endedAt: { gt: at } }],
				condominium: { administradoraId },
			}
		: { endedAt: null, condominium: { administradoraId } };
	const [residents, sindicos] = await Promise.all([
		db.membership.findMany({
			where: { ...active, role: "resident" },
			distinct: ["userId"],
			select: { userId: true },
		}),
		db.membership.findMany({
			where: { ...active, role: "sindico" },
			distinct: ["userId"],
			select: { userId: true },
		}),
	]);
	return { residents: residents.length, sindicos: sindicos.length };
}
