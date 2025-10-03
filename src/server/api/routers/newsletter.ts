import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const newsletterRouter = createTRPCRouter({
	subscribe: publicProcedure
		.input(
			z.object({
				email: z.string().email("Email inválido"),
				message: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const newsletter = await ctx.db.newsletter.create({
				data: {
					email: input.email,
					message: input.message,
				},
			});

			return {
				success: true,
				id: newsletter.id,
			};
		}),
});
