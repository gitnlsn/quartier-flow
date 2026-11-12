import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
	billingAdministradoras,
	getAccess,
	getActivePlan,
	viewableCondominiums,
} from "~/server/access";
import { getSession } from "~/server/auth";
import { db } from "~/server/db";
import { AppShell } from "./_components/app-shell";
import {
	LAST_CONDO_COOKIE,
	type ResidentUnit,
	SELECTED_UNIT_COOKIE,
} from "./_components/condo-nav";

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
	const [administradora, activePlan, condos, billing, cookieStore, homes] =
		await Promise.all([
			access.administradoraId
				? db.administradora.findUnique({
						where: { id: access.administradoraId },
						select: { name: true },
					})
				: null,
			access.administradoraId
				? getActivePlan(db, access.administradoraId)
				: null,
			// Condominiums for the sidebar switcher: the administradora's, its
			// archive after closing, and those where the user is síndico.
			db.condominium.findMany({
				where: viewableCondominiums(access),
				select: { id: true, name: true },
				orderBy: { name: "asc" },
			}),
			billingAdministradoras(db, session.user.id),
			cookies(),
			// Units the user lives in: "Minha área" belongs to one of them.
			db.membership.findMany({
				where: {
					userId: session.user.id,
					role: "resident",
					endedAt: null,
					unitId: { not: null },
				},
				select: {
					unit: {
						select: {
							id: true,
							block: true,
							number: true,
							condominium: {
								select: {
									id: true,
									name: true,
									reservationsEnabled: true,
									administradora: { select: { closedAt: true } },
								},
							},
						},
					},
				},
			}),
		]);

	const units = new Map<string, ResidentUnit>();
	for (const { unit } of homes) {
		if (!unit) continue;
		units.set(unit.id, {
			id: unit.id,
			label: unit.block ? `${unit.block} · ${unit.number}` : unit.number,
			condominiumId: unit.condominium.id,
			condominiumName: unit.condominium.name,
			reservationsEnabled:
				unit.condominium.reservationsEnabled &&
				!unit.condominium.administradora.closedAt,
		});
	}
	const residentUnits = [...units.values()].sort(
		(a, b) =>
			a.condominiumName.localeCompare(b.condominiumName, "pt-BR") ||
			a.label.localeCompare(b.label, "pt-BR", { numeric: true }),
	);

	return (
		<AppShell
			userName={session.user.name}
			userEmail={session.user.email}
			contextName={administradora?.name ?? null}
			isAdmin={Boolean(access.administradoraId)}
			adminNeedsPlan={Boolean(access.administradoraId) && !activePlan}
			hasPlatformBilling={billing.length > 0}
			isSindico={access.sindicoCondominiumIds.length > 0}
			units={residentUnits}
			selectedUnitId={cookieStore.get(SELECTED_UNIT_COOKIE)?.value ?? null}
			condos={condos}
			lastCondoId={cookieStore.get(LAST_CONDO_COOKIE)?.value ?? null}
		>
			{children}
		</AppShell>
	);
}
