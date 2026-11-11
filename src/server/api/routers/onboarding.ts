import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { formatBRL, formatCnpj, isValidCnpj, onlyDigits } from "~/lib/br";
import { BILLING_RULES, nextSteps } from "~/lib/onboarding";
import { TERMS_VERSION, termsVersionLabel } from "~/lib/terms";
import { getAccess, getActivePlan } from "~/server/access";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { audit } from "~/server/audit";
import { deliver, sendEmail } from "~/server/auth/messaging";

const companyInput = z.object({
	companyName: z.string().trim().min(2, "Informe a razão social").max(150),
	cnpj: z.string().transform(onlyDigits).refine(isValidCnpj, "CNPJ inválido"),
});

/**
 * Becoming an administradora (docs/features/19): any signed-in user can
 * register one administradora and sign a plan, accepting the Termos de Uso.
 */
export const onboardingRouter = createTRPCRouter({
	/** Where the person is in the wizard (resumable). */
	state: protectedProcedure.query(async ({ ctx }) => {
		const access = await getAccess(ctx.db, ctx.session.user.id);
		const administradora = access.administradoraId
			? await ctx.db.administradora.findUnique({
					where: { id: access.administradoraId },
					select: { id: true, name: true, cnpj: true },
				})
			: null;
		const active = administradora
			? await getActivePlan(ctx.db, administradora.id)
			: null;
		return {
			name: ctx.session.user.name ?? "",
			email: ctx.session.user.email,
			administradora,
			plan: active
				? {
						id: active.plan.id,
						name: active.plan.name,
						residentSeatCents: active.plan.residentSeatCents,
						sindicoSeatCents: active.plan.sindicoSeatCents,
						signedAt: active.startedAt,
					}
				: null,
			termsVersion: TERMS_VERSION,
		};
	}),

	saveName: protectedProcedure
		.input(
			z.object({ name: z.string().trim().min(2, "Informe seu nome").max(120) }),
		)
		.mutation(async ({ ctx, input }) => {
			await ctx.db.user.update({
				where: { id: ctx.session.user.id },
				data: { name: input.name },
			});
			return { ok: true };
		}),

	/** Creates the person's administradora, or edits it until a plan is signed. */
	saveAdministradora: protectedProcedure
		.input(companyInput)
		.mutation(async ({ ctx, input }) => {
			const userId = ctx.session.user.id;
			const access = await getAccess(ctx.db, userId);

			const taken = await ctx.db.administradora.findUnique({
				where: { cnpj: input.cnpj },
				select: { id: true },
			});
			if (taken && taken.id !== access.administradoraId) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Este CNPJ já está cadastrado. Peça acesso a quem administra a conta da sua empresa.",
				});
			}

			if (access.administradoraId) {
				if (await getActivePlan(ctx.db, access.administradoraId)) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message:
							"O plano já foi assinado. Para alterar razão social ou CNPJ, fale com o suporte.",
					});
				}
				await ctx.db.administradora.update({
					where: { id: access.administradoraId },
					data: { name: input.companyName, cnpj: input.cnpj },
				});
				return { id: access.administradoraId };
			}

			const administradora = await ctx.db.administradora.create({
				data: {
					name: input.companyName,
					cnpj: input.cnpj,
					email: ctx.session.user.email,
					members: { create: { userId, role: "admin" } },
				},
			});
			await audit({
				administradoraId: administradora.id,
				actorUserId: userId,
				action: "administradora.create",
				entity: "administradora",
				entityId: administradora.id,
			});
			return { id: administradora.id };
		}),

	/**
	 * Signs the plan: records the Termos de Uso acceptance (version, IP, user
	 * agent) and starts the plan in one transaction, then emails a summary.
	 */
	signPlan: protectedProcedure
		.input(
			z.object({
				planId: z.string(),
				termsVersion: z.string(),
				acceptTerms: z.literal(true),
				acceptBilling: z.literal(true),
				acceptFees: z.literal(true),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const user = ctx.session.user;
			const access = await getAccess(ctx.db, user.id);
			if (!access.administradoraId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Cadastre a administradora antes de assinar o plano.",
				});
			}
			if (input.termsVersion !== TERMS_VERSION) {
				throw new TRPCError({
					code: "CONFLICT",
					message:
						"Os Termos de Uso foram atualizados. Recarregue a página e leia a nova versão.",
				});
			}
			const plan = await ctx.db.plan.findFirst({
				where: { id: input.planId, active: true },
			});
			if (!plan) throw new TRPCError({ code: "NOT_FOUND" });
			if (await getActivePlan(ctx.db, access.administradoraId)) {
				throw new TRPCError({
					code: "CONFLICT",
					message: "O plano já foi assinado.",
				});
			}

			const administradoraId = access.administradoraId;
			const ipAddress =
				ctx.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
				ctx.headers.get("x-real-ip") ??
				null;
			const userAgent = ctx.headers.get("user-agent")?.slice(0, 500) ?? null;

			const [subscription] = await ctx.db.$transaction([
				ctx.db.administradoraPlan.create({
					data: { administradoraId, planId: plan.id },
				}),
				ctx.db.termsAcceptance.create({
					data: {
						userId: user.id,
						administradoraId,
						planId: plan.id,
						termsVersion: TERMS_VERSION,
						ipAddress,
						userAgent,
					},
				}),
			]);
			await audit({
				administradoraId,
				actorUserId: user.id,
				action: "plan.sign",
				entity: "plan",
				entityId: plan.id,
				data: { key: plan.key, termsVersion: TERMS_VERSION },
			});

			const administradora = await ctx.db.administradora.findUniqueOrThrow({
				where: { id: administradoraId },
				select: { name: true, cnpj: true },
			});
			const steps = nextSteps({
				planName: plan.name,
				signedAt: subscription.startedAt,
			});
			deliver(
				sendEmail({
					to: user.email,
					subject: `Assinatura confirmada: plano ${plan.name}`,
					text: [
						`Olá${user.name ? `, ${user.name.split(" ")[0]}` : ""}!`,
						"",
						`A assinatura do Quartier Flow para ${administradora.name} (CNPJ ${formatCnpj(administradora.cnpj)}) está confirmada.`,
						"",
						`Plano: ${plan.name}`,
						`- ${formatBRL(plan.residentSeatCents)} por morador ativo / mês`,
						`- ${formatBRL(plan.sindicoSeatCents)} por síndico ativo / mês`,
						"",
						"Regras de cobrança:",
						...BILLING_RULES.map((rule) => `- ${rule}`),
						"",
						"O que acontece agora:",
						...steps.flatMap((step, i) => [
							`${i + 1}. ${step.title}`,
							`   ${step.text}`,
						]),
						"",
						`Termos de Uso aceitos: versão de ${termsVersionLabel()} (${new URL("/termos", env.BETTER_AUTH_URL).toString()}).`,
						"",
						`Continue a configuração: ${new URL("/painel/onboarding", env.BETTER_AUTH_URL).toString()}`,
					].join("\n"),
				}),
			);
			return { ok: true };
		}),
});
