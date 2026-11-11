import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getAccess } from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { AppShell } from "./_components/app-shell";

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
	const administradora = access.administradoraId
		? await db.administradora.findUnique({
				where: { id: access.administradoraId },
				select: { name: true },
			})
		: null;

	return (
		<AppShell
			userName={session.user.name}
			userEmail={session.user.email}
			contextName={administradora?.name ?? null}
			isAdmin={Boolean(access.administradoraId)}
			isSindico={access.sindicoCondominiumIds.length > 0}
		>
			{children}
		</AppShell>
	);
}
