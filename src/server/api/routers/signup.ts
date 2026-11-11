import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { isValidCnpj, onlyDigits } from "~/lib/br";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { audit } from "~/server/audit";
import { auth } from "~/server/auth";

const MAX_SIGNUPS_PER_IP_PER_HOUR = 5;

export const signupRouter = createTRPCRouter({
	/**
	 * Administradora self-signup (docs/features/19). Creates the admin user, the
	 * administradora (status "onboarding") and sends a sign-in link. Sign-up is
	 * open only here; everyone else is invited.
	 */
	administradora: publicProcedure
		.input(
			z.object({
				name: z.string().trim().min(2, "Informe seu nome"),
				email: z.string().trim().toLowerCase().email("Email inválido"),
				companyName: z.string().trim().min(2, "Informe a razão social"),
				cnpj: z
					.string()
					.transform(onlyDigits)
					.refine(isValidCnpj, "CNPJ inválido"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const ip =
				ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
			const recent = await ctx.db.auditLog.count({
				where: {
					action: "administradora.signup",
					entity: "ip",
					entityId: ip,
					createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
				},
			});
			if (recent >= MAX_SIGNUPS_PER_IP_PER_HOUR) {
				throw new TRPCError({
					code: "TOO_MANY_REQUESTS",
					message: "Muitas tentativas. Tente novamente mais tarde.",
				});
			}

			const existing = await ctx.db.administradora.findUnique({
				where: { cnpj: input.cnpj },
				select: { id: true },
			});
			if (existing) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Este CNPJ já está cadastrado. Peça acesso ao administrador da sua empresa.",
				});
			}

			const administradora = await ctx.db.$transaction(async (tx) => {
				const user = await tx.user.upsert({
					where: { email: input.email },
					update: {},
					// Same reasoning as invited users: no password exists, and both
					// ways in (email link, Google) prove ownership of the email.
					create: { email: input.email, name: input.name, emailVerified: true },
				});
				const created = await tx.administradora.create({
					data: {
						name: input.companyName,
						cnpj: input.cnpj,
						email: input.email,
						members: { create: { userId: user.id, role: "admin" } },
					},
				});
				return created;
			});

			await audit({
				administradoraId: administradora.id,
				actorUserId: null,
				action: "administradora.signup",
				entity: "ip",
				entityId: ip,
				data: { email: input.email },
			});

			await auth.api.signInMagicLink({
				body: { email: input.email },
				headers: ctx.headers,
			});

			return { ok: true };
		}),
});
