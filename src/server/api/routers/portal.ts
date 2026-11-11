import { TERMS_VERSION } from "~/lib/terms";
import {
	billingAdministradoras,
	getAccess,
	getActivePlan,
} from "~/server/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import type { db as Db } from "~/server/db";

async function termsOutdated(db: typeof Db, administradoraId: string) {
	if (!(await getActivePlan(db, administradoraId))) return false;
	const latest = await db.termsAcceptance.findFirst({
		where: { administradoraId },
		orderBy: { acceptedAt: "desc" },
		select: { termsVersion: true },
	});
	return latest?.termsVersion !== TERMS_VERSION;
}

/** Features shared by every signed-in user (resident, síndico, administradora). */
export const portalRouter = createTRPCRouter({
	/** Roles that decide which sections the user sees. */
	access: protectedProcedure.query(async ({ ctx }) => {
		const access = await getAccess(ctx.db, ctx.session.user.id);
		const isAdmin = Boolean(access.administradoraId);
		const isSindico = access.sindicoCondominiumIds.length > 0;
		const billing = await billingAdministradoras(ctx.db, ctx.session.user.id);
		const openInvoices = billing.length
			? await ctx.db.platformInvoice.findMany({
					where: {
						administradoraId: { in: billing.map((a) => a.id) },
						status: { in: ["pending", "overdue"] },
					},
					select: { totalCents: true, status: true },
				})
			: [];
		const closed = isAdmin ? null : billing.find((a) => a.closedAt);
		return {
			firstName: ctx.session.user.name?.split(" ")[0] ?? "",
			email: ctx.session.user.email,
			isAdmin,
			isSindico,
			isResident: access.isResident,
			/** No role yet: a new account (open sign-up) gets the welcome page. */
			hasRole: isAdmin || isSindico || access.isResident,
			/** Registered an administradora but hasn't signed a plan yet. */
			adminNeedsPlan: access.administradoraId
				? !(await getActivePlan(ctx.db, access.administradoraId))
				: false,
			/** Quartier Flow invoices still to pay (docs/features/18). */
			openInvoices: {
				count: openInvoices.length,
				totalCents: openInvoices.reduce((sum, i) => sum + i.totalCents, 0),
				overdue: openInvoices.some((i) => i.status === "overdue"),
			},
			/**
			 * The Termos de Uso changed after this admin's administradora signed:
			 * ask to accept the current version (docs/features/19).
			 */
			termsOutdated:
				isAdmin && access.administradoraId
					? await termsOutdated(ctx.db, access.administradoraId)
					: false,
			/** Administradora this user closed (offer to reopen it). */
			closedAdministradora: closed ? { name: closed.name } : null,
		};
	}),

	/** Charges where the user is the payer (financially responsible). */
	myCharges: protectedProcedure.query(async ({ ctx }) => {
		const charges = await ctx.db.charge.findMany({
			where: {
				payerUserId: ctx.session.user.id,
				status: { notIn: ["draft", "skipped", "failed"] },
			},
			orderBy: { dueDate: "desc" },
			include: {
				condominium: { select: { name: true } },
				unit: { select: { block: true, number: true } },
				lines: { orderBy: { createdAt: "asc" } },
			},
		});
		return charges.map((charge) => ({
			id: charge.id,
			description: charge.description,
			amountCents: charge.amountCents,
			paidAmountCents: charge.paidAmountCents,
			dueDate: charge.dueDate,
			status: charge.status,
			invoiceUrl: charge.invoiceUrl,
			lines: charge.lines.map((line) => ({
				id: line.id,
				name: line.name,
				description: line.description,
				installment: line.installment,
				amountCents: line.amountCents,
			})),
			condominium: charge.condominium.name,
			unit: charge.unit.block
				? `${charge.unit.block} · ${charge.unit.number}`
				: charge.unit.number,
		}));
	}),
});
