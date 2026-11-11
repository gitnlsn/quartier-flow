import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";

/** Server guard for administradora-only pages (plan, payout account). */
export async function AdminOnly({ children }: { children: ReactNode }) {
	const session = await getSession();
	if (!session) redirect("/entrar");
	const access = await getAccess(db, session.user.id);
	if (!access.administradoraId) redirect("/painel");
	return children;
}
