import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "~/server/db";

/** Append-only record of who did what (null actor = system: cron, webhook). */
export async function audit(entry: {
	administradoraId: string | null;
	actorUserId: string | null;
	action: string;
	entity: string;
	entityId: string;
	data?: Prisma.InputJsonValue;
}) {
	await db.auditLog.create({ data: entry });
}
