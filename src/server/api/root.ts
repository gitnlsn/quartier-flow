import { administradoraRouter } from "~/server/api/routers/administradora";
import { billingRouter } from "~/server/api/routers/billing";
import { condominiumRouter } from "~/server/api/routers/condominium";
import { delinquencyRouter } from "~/server/api/routers/delinquency";
import { expenseRouter } from "~/server/api/routers/expense";
import { financeRouter } from "~/server/api/routers/finance";
import { helloRouter } from "~/server/api/routers/hello";
import { newsletterRouter } from "~/server/api/routers/newsletter";
import { onboardingRouter } from "~/server/api/routers/onboarding";
import { platformBillingRouter } from "~/server/api/routers/platform-billing";
import { portalRouter } from "~/server/api/routers/portal";
import { reservationRouter } from "~/server/api/routers/reservation";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	hello: helloRouter,
	newsletter: newsletterRouter,
	onboarding: onboardingRouter,
	portal: portalRouter,
	administradora: administradoraRouter,
	condominium: condominiumRouter,
	billing: billingRouter,
	expense: expenseRouter,
	finance: financeRouter,
	platformBilling: platformBillingRouter,
	reservation: reservationRouter,
	delinquency: delinquencyRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
