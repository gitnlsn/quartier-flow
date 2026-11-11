import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { AppShell } from "./_components/app-shell";
import { LAST_CONDO_COOKIE } from "./_components/condo-nav";

export const metadata: Metadata = {
	title: "Painel",
	robots: { index: false, follow: false },
};

/**
 * One area for every user (docs/features/19). The menu depends on roles:
 * residents, síndicos and administradora admins (who see everything the
 * others see in their condominiums, plus management).
 */
export default async function PainelLayout({
	children,
}: { children: ReactNode }) {
	const session = await getSession();
	if (!session) redirect("/entrar");

	const access = await getAccess(db, session.user.id);
	const [administradora, condos, cookieStore] = await Promise.all([
		access.administradoraId
			? db.administradora.findUnique({
					where: { id: access.administradoraId },
					select: { name: true },
				})
			: null,
		// Condominiums for the sidebar switcher: all of the administradora's,
		// plus those where the user is síndico.
		db.condominium.findMany({
			where: {
				OR: [
					...(access.administradoraId
						? [{ administradoraId: access.administradoraId }]
						: []),
					{ id: { in: access.sindicoCondominiumIds } },
				],
			},
			select: { id: true, name: true },
			orderBy: { name: "asc" },
		}),
		cookies(),
	]);

	return (
		<AppShell
			userName={session.user.name}
			userEmail={session.user.email}
			contextName={administradora?.name ?? null}
			isAdmin={Boolean(access.administradoraId)}
			isSindico={access.sindicoCondominiumIds.length > 0}
			condos={condos}
			lastCondoId={cookieStore.get(LAST_CONDO_COOKIE)?.value ?? null}
		>
			{children}
		</AppShell>
	);
}
