import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { onlyDigits } from "~/lib/br";
import { adminProcedure, createTRPCRouter } from "~/server/api/trpc";
import {
	createSubaccount,
	findSubaccountByCpfCnpj,
	getAccountStatus,
	getPendingDocuments,
	subaccountApiKey,
	toKycStatus,
} from "~/server/asaas/accounts";
import { AsaasError } from "~/server/asaas/client";
import { audit } from "~/server/audit";
import { decryptSecret, encryptSecret } from "~/server/crypto";
import type { db as Db } from "~/server/db";

/** Distinct active residents and síndicos across the administradora (docs/features/18). */
export async function countSeats(db: typeof Db, administradoraId: string) {
	const active = {
		endedAt: null,
		condominium: { administradoraId },
	};
	const [residents, sindicos] = await Promise.all([
		db.membership.findMany({
			where: { ...active, role: "resident" },
			distinct: ["userId"],
			select: { userId: true },
		}),
		db.membership.findMany({
			where: { ...active, role: "sindico" },
			distinct: ["userId"],
			select: { userId: true },
		}),
	]);
	return { residents: residents.length, sindicos: sindicos.length };
}

const companySchema = z.object({
	companyType: z.enum(["LIMITED", "ASSOCIATION", "MEI", "INDIVIDUAL"]),
	mobilePhone: z
		.string()
		.transform(onlyDigits)
		.refine((v) => v.length === 10 || v.length === 11, "Telefone inválido"),
	incomeValue: z.coerce.number().int().positive("Informe o faturamento mensal"),
	postalCode: z
		.string()
		.transform(onlyDigits)
		.refine((v) => v.length === 8, "CEP inválido"),
	address: z.string().trim().min(2, "Informe o endereço"),
	addressNumber: z.string().trim().min(1, "Informe o número"),
	complement: z.string().trim().optional(),
	province: z.string().trim().min(2, "Informe o bairro"),
});

export const administradoraRouter = createTRPCRouter({
	overview: adminProcedure.query(async ({ ctx }) => {
		const administradora = await ctx.db.administradora.findUniqueOrThrow({
			where: { id: ctx.administradoraId },
			include: {
				payoutAccount: {
					select: { kycStatus: true, onboardingUrl: true, walletId: true },
				},
				plans: {
					where: { endedAt: null },
					include: { plan: true },
					take: 1,
				},
				_count: { select: { condominiums: true } },
			},
		});
		const seats = await countSeats(ctx.db, ctx.administradoraId);
		const plan = administradora.plans[0]?.plan ?? null;
		const estimatedMonthlyCents = plan
			? seats.residents * plan.residentSeatCents +
				seats.sindicos * plan.sindicoSeatCents
			: null;
		const { plans: _plans, ...rest } = administradora;
		return {
			...rest,
			plan,
			seats,
			estimatedMonthlyCents,
			companyComplete: Boolean(
				administradora.companyType &&
					administradora.mobilePhone &&
					administradora.incomeValue &&
					administradora.postalCode &&
					administradora.address &&
					administradora.addressNumber &&
					administradora.province,
			),
		};
	}),

	updateCompany: adminProcedure
		.input(companySchema)
		.mutation(async ({ ctx, input }) => {
			const payout = await ctx.db.payoutAccount.findUnique({
				where: { administradoraId: ctx.administradoraId },
				select: { id: true },
			});
			if (payout) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"A conta de recebimento já foi criada. Altere os dados cadastrais diretamente no Asaas.",
				});
			}
			await ctx.db.administradora.update({
				where: { id: ctx.administradoraId },
				data: input,
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "administradora.update_company",
				entity: "administradora",
				entityId: ctx.administradoraId,
			});
			return { ok: true };
		}),

	plans: adminProcedure.query(({ ctx }) =>
		ctx.db.plan.findMany({
			where: { active: true },
			orderBy: { residentSeatCents: "asc" },
		}),
	),

	choosePlan: adminProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const plan = await ctx.db.plan.findFirst({
				where: { id: input.planId, active: true },
			});
			if (!plan) throw new TRPCError({ code: "NOT_FOUND" });

			await ctx.db.$transaction([
				ctx.db.administradoraPlan.updateMany({
					where: { administradoraId: ctx.administradoraId, endedAt: null },
					data: { endedAt: new Date() },
				}),
				ctx.db.administradoraPlan.create({
					data: { administradoraId: ctx.administradoraId, planId: plan.id },
				}),
			]);
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "plan.choose",
				entity: "plan",
				entityId: plan.id,
				data: { key: plan.key },
			});
			return { ok: true };
		}),

	/** Creates the Asaas receiving account (subaccount) and starts KYC (docs/features/17). */
	createPayoutAccount: adminProcedure.mutation(async ({ ctx }) => {
		const administradora = await ctx.db.administradora.findUniqueOrThrow({
			where: { id: ctx.administradoraId },
			include: { payoutAccount: true },
		});
		if (administradora.payoutAccount) return { ok: true };

		const company = companySchema.safeParse({
			...administradora,
			complement: administradora.complement ?? undefined,
		});
		if (!company.success) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message: "Complete os dados da empresa antes de criar a conta.",
			});
		}

		try {
			// Recover a subaccount created earlier but not saved (no key then:
			// KYC status will arrive by webhook instead of on-demand refresh).
			const existing = await findSubaccountByCpfCnpj(administradora.cnpj);
			const account =
				existing ??
				(await createSubaccount({
					name: administradora.name,
					email: administradora.email,
					cpfCnpj: administradora.cnpj,
					...company.data,
					webhook: env.ASAAS_WEBHOOK_URL
						? {
								url: env.ASAAS_WEBHOOK_URL,
								authToken: env.ASAAS_WEBHOOK_TOKEN,
								email: administradora.email,
							}
						: undefined,
				}));
			const apiKey = existing ? null : subaccountApiKey(account);
			await ctx.db.payoutAccount.create({
				data: {
					administradoraId: administradora.id,
					asaasAccountId: account.id,
					walletId: account.walletId,
					apiKeyEncrypted: apiKey ? encryptSecret(apiKey) : null,
				},
			});
			await ctx.db.administradora.update({
				where: { id: administradora.id },
				data: { status: "active" },
			});
			await audit({
				administradoraId: administradora.id,
				actorUserId: ctx.session.user.id,
				action: "payout_account.create",
				entity: "payout_account",
				entityId: account.id,
			});
			return { ok: true };
		} catch (error) {
			if (error instanceof AsaasError) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.userMessage,
				});
			}
			throw error;
		}
	}),

	/** Pulls KYC status and the onboarding link from Asaas. */
	refreshKyc: adminProcedure.mutation(async ({ ctx }) => {
		const payout = await ctx.db.payoutAccount.findUnique({
			where: { administradoraId: ctx.administradoraId },
		});
		if (!payout) throw new TRPCError({ code: "NOT_FOUND" });
		if (!payout.apiKeyEncrypted) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"A situação desta conta é atualizada automaticamente pelo Asaas (notificações). Conclua a verificação pelo email de ativação do Asaas.",
			});
		}
		const apiKey = decryptSecret(payout.apiKeyEncrypted);
		try {
			const [status, documents] = await Promise.all([
				getAccountStatus(apiKey),
				getPendingDocuments(apiKey).catch(() => ({ data: [] })),
			]);
			const onboardingUrl =
				documents.data.find((d) => d.onboardingUrl)?.onboardingUrl ?? null;
			const updated = await ctx.db.payoutAccount.update({
				where: { id: payout.id },
				data: { kycStatus: toKycStatus(status.general), onboardingUrl },
			});
			return {
				kycStatus: updated.kycStatus,
				onboardingUrl: updated.onboardingUrl,
				detail: status,
				pendingDocuments: documents.data
					.filter((d) => d.status !== "APPROVED")
					.map((d) => ({
						id: d.id,
						title: d.title ?? d.type,
						status: d.status,
					})),
			};
		} catch (error) {
			if (error instanceof AsaasError) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.userMessage,
				});
			}
			throw error;
		}
	}),
});
