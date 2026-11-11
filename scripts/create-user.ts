/**
 * Creates a user who can then sign in by email link.
 * Stand-in for the síndico invitation flow (docs/features/02) until it exists.
 *
 * Usage: npm run script scripts/create-user.ts -- email@example.com "Full Name"
 */
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const [emailArg, nameArg] = process.argv.slice(2);
const email = z.string().email().parse(emailArg?.trim().toLowerCase());
const name = nameArg?.trim() ?? "";

const db = new PrismaClient();

try {
	const user = await db.user.upsert({
		where: { email },
		update: {},
		// emailVerified: true lets "Entrar com Google" link to this invited row.
		// Safe because the row has no password: the only ways in (email link or
		// Google) both prove ownership of this email.
		create: { email, name, emailVerified: true },
		select: { id: true, email: true },
	});
	console.log(`User ready: ${user.email} (${user.id})`);
} finally {
	await db.$disconnect();
}
