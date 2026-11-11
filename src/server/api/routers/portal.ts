import { getAccess, getActivePlan } from "~/server/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/** Features shared by every signed-in user (resident, síndico, administradora). */
export const portalRouter = createTRPCRouter({
	/** Roles that decide which sections the user sees. */
	access: protectedProcedure.query(async ({ ctx }) => {
		const access = await getAccess(ctx.db, ctx.session.user.id);
		const isAdmin = Boolean(access.administradoraId);
		const isSindico = access.sindicoCondominiumIds.length > 0;
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
