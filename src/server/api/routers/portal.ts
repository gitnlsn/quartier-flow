import { getAccess } from "~/server/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Features shared by every signed-in user (resident, síndico, administradora). */
export const portalRouter = createTRPCRouter({
	/** Roles that decide which sections the user sees. */
	access: protectedProcedure.query(async ({ ctx }) => {
		const access = await getAccess(ctx.db, ctx.session.user.id);
		return {
			firstName: ctx.session.user.name?.split(" ")[0] ?? "",
			isAdmin: Boolean(access.administradoraId),
			isSindico: access.sindicoCondominiumIds.length > 0,
			isResident: access.isResident,
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
			condominium: charge.condominium.name,
			unit: charge.unit.block
				? `${charge.unit.block} · ${charge.unit.number}`
				: charge.unit.number,
		}));
	}),
});
