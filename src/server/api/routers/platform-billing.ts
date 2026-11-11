import { billingAdministradoras } from "~/server/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

/**
 * Quartier Flow invoices of the administradoras the user admin(ned)
 * (docs/features/18). Closed administradoras are included on purpose: their
 * last invoices must stay payable.
 */
export const platformBillingRouter = createTRPCRouter({
	invoices: protectedProcedure.query(async ({ ctx }) => {
		const administradoras = await billingAdministradoras(
			ctx.db,
			ctx.session.user.id,
		);
		const invoices = await ctx.db.platformInvoice.findMany({
			where: { administradoraId: { in: administradoras.map((a) => a.id) } },
			orderBy: { period: "desc" },
		});
		return {
			administradoras,
			invoices: invoices.map((invoice) => ({
				...invoice,
				administradoraName:
					administradoras.find((a) => a.id === invoice.administradoraId)
						?.name ?? "",
			})),
		};
	}),
});
