/**
 * Seeds the platform plan catalog (docs/features/18).
 * PLACEHOLDER PRICES: replace once pricing is defined. Safe to run repeatedly.
 *
 * Usage: npm run script scripts/seed-plans.ts
 */
import { PrismaClient } from "@prisma/client";

const plans = [
	{
		key: "essencial",
		name: "Essencial",
		description: "Gestão de condomínios, moradores e cobrança mensal.",
		residentSeatCents: 300,
		sindicoSeatCents: 1500,
	},
	{
		key: "profissional",
		name: "Profissional",
		description: "Tudo do Essencial, com suporte prioritário.",
		residentSeatCents: 450,
		sindicoSeatCents: 2000,
	},
];

const db = new PrismaClient();

try {
	for (const plan of plans) {
		await db.plan.upsert({
			where: { key: plan.key },
			update: plan,
			create: plan,
		});
	}
	console.log(`Plans ready: ${plans.map((p) => p.key).join(", ")}`);
} finally {
	await db.$disconnect();
}
