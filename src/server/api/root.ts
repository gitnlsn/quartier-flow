import { administradoraRouter } from "~/server/api/routers/administradora";
import { billingRouter } from "~/server/api/routers/billing";
import { condominiumRouter } from "~/server/api/routers/condominium";
import { expenseRouter } from "~/server/api/routers/expense";
import { helloRouter } from "~/server/api/routers/hello";
import { newsletterRouter } from "~/server/api/routers/newsletter";
import { portalRouter } from "~/server/api/routers/portal";
import { signupRouter } from "~/server/api/routers/signup";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
	hello: helloRouter,
	newsletter: newsletterRouter,
	signup: signupRouter,
	portal: portalRouter,
	administradora: administradoraRouter,
	condominium: condominiumRouter,
	billing: billingRouter,
	expense: expenseRouter,
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
