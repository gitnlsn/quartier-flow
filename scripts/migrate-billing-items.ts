/**
 * One-off: converts the old single-amount billing into items.
 * - BillingConfig.defaultAmountCents -> shared item "Taxa condominial"
 * - Unit.monthlyAmountCents          -> override of that item for the unit
 * Idempotent: condominiums that already have items are skipped.
 *
 * Usage: npm run script scripts/migrate-billing-items.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type OldConfig = { condominiumId: string; defaultAmountCents: number };
type OldUnit = {
	id: string;
	condominiumId: string;
	monthlyAmountCents: number;
};

try {
	const columns = await db.$queryRaw<{ column_name: string }[]>`
		select column_name from information_schema.columns
		where table_name = 'BillingConfig' and column_name = 'defaultAmountCents'`;
	if (columns.length === 0) {
		console.log("Old columns already removed: nothing to migrate.");
	} else {
		const configs = await db.$queryRaw<OldConfig[]>`
			select "condominiumId", "defaultAmountCents" from "BillingConfig"`;
		const units = await db.$queryRaw<OldUnit[]>`
			select id, "condominiumId", "monthlyAmountCents" from "Unit"
			where "monthlyAmountCents" is not null`;
		const period = new Date().toISOString().slice(0, 7);
		let migrated = 0;

		for (const config of configs) {
			const existing = await db.billingItem.count({
				where: { condominiumId: config.condominiumId },
			});
			const overrides = units.filter(
				(u) => u.condominiumId === config.condominiumId,
			);
			if (existing > 0) continue;
			if (config.defaultAmountCents <= 0 && overrides.length === 0) continue;

			await db.billingItem.create({
				data: {
					condominiumId: config.condominiumId,
					name: "Taxa condominial",
					amountCents: config.defaultAmountCents,
					recurrence: "monthly",
					startPeriod: period,
					overrides: {
						create: overrides.map((u) => ({
							unitId: u.id,
							amountCents: u.monthlyAmountCents,
						})),
					},
				},
			});
			migrated++;
		}
		console.log(`Migrated ${migrated} condominium(s) to billing items.`);
	}
} finally {
	await db.$disconnect();
}
