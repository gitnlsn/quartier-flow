import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "~/env";
import { onlyDigits } from "~/lib/br";
import { assertActivePlan } from "~/server/access";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import {
	type PendingDocuments,
	approveSandboxSubaccount,
	asaasLoginUrl,
	createSubaccount,
	findSubaccountByCpfCnpj,
	getAccountStatus,
	getCommercialInfo,
	getPendingDocuments,
	isAsaasSandbox,
	subaccountApiKey,
	toKycStatus,
} from "~/server/asaas/accounts";
import { AsaasError } from "~/server/asaas/client";
import { audit } from "~/server/audit";
import { deliver, sendEmail } from "~/server/auth/messaging";
import { decryptSecret, encryptSecret } from "~/server/crypto";
import {
	MINIMUM_INVOICE_CENTS,
	computeInvoice,
	localDay,
	periodKey,
} from "~/server/platform-billing";
import { countSeats } from "~/server/seats";

const companySchema = z.object({
	companyType: z.enum(["LIMITED", "ASSOCIATION", "MEI", "INDIVIDUAL"], {
		errorMap: () => ({ message: "Selecione o tipo de empresa" }),
	}),
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
			asaasLoginUrl: asaasLoginUrl(),
			asaasSandbox: isAsaasSandbox(),
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

	/** Plan catalog (public prices): any signed-in user, e.g. reopening. */
	plans: protectedProcedure.query(({ ctx }) =>
		ctx.db.plan.findMany({
			where: { active: true },
			orderBy: { residentSeatCents: "asc" },
		}),
	),

	/**
	 * Switches the signed plan (/painel/plano). The first plan is only started
	 * by onboarding.signPlan, together with the Termos de Uso acceptance.
	 */
	choosePlan: adminProcedure
		.input(z.object({ planId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertActivePlan(ctx.db, ctx.administradoraId);
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
		const accountEmail = (
			await ctx.db.administradora.findUniqueOrThrow({
				where: { id: ctx.administradoraId },
				select: { email: true },
			})
		).email;
		if (!payout.apiKeyEncrypted) {
			// Account linked without its own key (it already existed in Asaas):
			// we can't query it, its status arrives by webhook. Not an error.
			return {
				viaWebhooksOnly: true as const,
				kycStatus: payout.kycStatus,
				onboardingUrl: payout.onboardingUrl,
				detail: null,
				pendingDocuments: [],
				rejectReasons: null,
				asaasLoginUrl: asaasLoginUrl(),
				sandbox: isAsaasSandbox(),
				accountEmail,
			};
		}
		const apiKey = decryptSecret(payout.apiKeyEncrypted);
		try {
			const [status, documents, company] = await Promise.all([
				getAccountStatus(apiKey),
				getPendingDocuments(apiKey).catch(
					(): PendingDocuments => ({ data: [] }),
				),
				getCommercialInfo(apiKey).catch(() => null),
			]);
			// After the account exists, the company data is edited in Asaas:
			// keep our copy in sync so the form shows what Asaas has.
			if (company) {
				await ctx.db.administradora.update({
					where: { id: ctx.administradoraId },
					data: {
						companyType: company.companyType ?? undefined,
						mobilePhone: company.mobilePhone ?? undefined,
						incomeValue:
							company.incomeValue != null
								? Math.round(company.incomeValue)
								: undefined,
						postalCode: company.postalCode ?? undefined,
						address: company.address ?? undefined,
						addressNumber: company.addressNumber ?? undefined,
						complement: company.complement,
						province: company.province ?? undefined,
					},
				});
			}
			const onboardingUrl =
				documents.data.find((d) => d.onboardingUrl)?.onboardingUrl ?? null;
			const updated = await ctx.db.payoutAccount.update({
				where: { id: payout.id },
				data: { kycStatus: toKycStatus(status.general), onboardingUrl },
			});
			return {
				viaWebhooksOnly: false as const,
				kycStatus: updated.kycStatus,
				onboardingUrl: updated.onboardingUrl,
				detail: status,
				pendingDocuments: documents.data
					.filter((d) => d.status !== "APPROVED")
					.map((d) => ({
						id: d.id,
						title: d.title ?? d.type,
						status: d.status,
						responsible: d.responsible?.name ?? null,
						onboardingUrl: d.onboardingUrl ?? null,
						expiresAt: d.onboardingUrlExpirationDate ?? null,
					})),
				rejectReasons: documents.rejectReasons ?? null,
				asaasLoginUrl: asaasLoginUrl(),
				sandbox: isAsaasSandbox(),
				accountEmail,
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
	/**
	 * Sandbox only: approves the receiving account in Asaas, since the
	 * Sandbox can't review real documents. Refused against production.
	 */
	approveSandboxAccount: adminProcedure.mutation(async ({ ctx }) => {
		if (!isAsaasSandbox()) {
			throw new TRPCError({
				code: "FORBIDDEN",
				message: "Disponível apenas no ambiente de testes do Asaas.",
			});
		}
		const payout = await ctx.db.payoutAccount.findUnique({
			where: { administradoraId: ctx.administradoraId },
		});
		if (!payout) throw new TRPCError({ code: "NOT_FOUND" });
		if (!payout.apiKeyEncrypted) {
			throw new TRPCError({
				code: "BAD_REQUEST",
				message:
					"Esta conta foi conectada sem a chave da subconta. Aprove-a pelo painel do Sandbox do Asaas.",
			});
		}
		try {
			await approveSandboxSubaccount(decryptSecret(payout.apiKeyEncrypted));
		} catch (error) {
			if (error instanceof AsaasError) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: error.userMessage,
				});
			}
			throw error;
		}
		await audit({
			administradoraId: ctx.administradoraId,
			actorUserId: ctx.session.user.id,
			action: "payout.sandbox_approve",
			entity: "payoutAccount",
			entityId: payout.id,
		});
		return { ok: true };
	}),
	/** What closing would do now (docs/features/19): shown before confirming. */
	closePreview: adminProcedure.query(async ({ ctx }) => {
		const now = new Date();
		const [administradora, condominiums, openCharges, payout, estimate] =
			await Promise.all([
				ctx.db.administradora.findUniqueOrThrow({
					where: { id: ctx.administradoraId },
					select: { name: true, cnpj: true },
				}),
				ctx.db.condominium.count({
					where: { administradoraId: ctx.administradoraId },
				}),
				ctx.db.charge.aggregate({
					where: {
						condominium: { administradoraId: ctx.administradoraId },
						status: { in: ["pending", "overdue"] },
					},
					_count: true,
					_sum: { amountCents: true },
				}),
				ctx.db.payoutAccount.findUnique({
					where: { administradoraId: ctx.administradoraId },
					select: { id: true },
				}),
				computeInvoice(
					ctx.db,
					ctx.administradoraId,
					periodKey(localDay(now).year, localDay(now).month),
					now,
				),
			]);
		return {
			name: administradora.name,
			condominiums,
			openCharges: {
				count: openCharges._count,
				totalCents: openCharges._sum.amountCents ?? 0,
			},
			hasPayoutAccount: Boolean(payout),
			finalInvoice: estimate
				? {
						totalCents: estimate.totalCents,
						billedDays: estimate.billedDays,
						daysInMonth: estimate.daysInMonth,
						residentSeats: estimate.residentSeats,
						sindicoSeats: estimate.sindicoSeats,
						waived: estimate.totalCents < MINIMUM_INVOICE_CENTS,
						dueDate: estimate.dueDate,
					}
				: null,
		};
	}),

	/**
	 * Closes the administradora (docs/features/19): management stops now, the
	 * plan ends (the month is billed up to today on the 1st), automatic
	 * billing is turned off and unsent drafts are discarded. Charges already
	 * sent stay valid in Asaas. Condominiums remain as a read-only archive.
	 */
	close: adminProcedure
		.input(z.object({ confirmName: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const administradora = await ctx.db.administradora.findUniqueOrThrow({
				where: { id: ctx.administradoraId },
				select: { id: true, name: true, email: true },
			});
			const typed = input.confirmName.trim().toLocaleLowerCase("pt-BR");
			if (typed !== administradora.name.trim().toLocaleLowerCase("pt-BR")) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Digite o nome da administradora exatamente como aparece.",
				});
			}

			const now = new Date();
			const draftRuns = {
				condominium: { administradoraId: administradora.id },
				status: "draft",
			};
			await ctx.db.$transaction([
				ctx.db.administradora.update({
					where: { id: administradora.id },
					data: {
						status: "closed",
						closedAt: now,
						closedById: ctx.session.user.id,
					},
				}),
				ctx.db.administradoraPlan.updateMany({
					where: { administradoraId: administradora.id, endedAt: null },
					data: { endedAt: now },
				}),
				ctx.db.billingConfig.updateMany({
					where: { condominium: { administradoraId: administradora.id } },
					data: { enabled: false },
				}),
				ctx.db.charge.deleteMany({
					where: {
						run: draftRuns,
						status: { in: ["draft", "skipped"] },
					},
				}),
				ctx.db.billingRun.deleteMany({ where: draftRuns }),
			]);
			await audit({
				administradoraId: administradora.id,
				actorUserId: ctx.session.user.id,
				action: "administradora.close",
				entity: "administradora",
				entityId: administradora.id,
			});

			const day = localDay(now);
			const nextFirst = new Date(
				Date.UTC(
					day.month === 12 ? day.year + 1 : day.year,
					day.month % 12,
					1,
					12,
				),
			).toLocaleDateString("pt-BR", { timeZone: "UTC" });
			deliver(
				sendEmail({
					to: administradora.email,
					subject: `Administradora encerrada: ${administradora.name}`,
					text: [
						`A administradora ${administradora.name} foi encerrada no Quartier Flow em ${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
						"",
						"O que acontece agora:",
						"- A gestão foi encerrada: não é mais possível criar cobranças, convidar pessoas ou alterar os condomínios.",
						`- A última fatura do Quartier Flow, proporcional aos dias usados neste mês, sai em ${nextFirst}. Depois dela, não há novas faturas.`,
						"- As faturas emitidas continuam disponíveis para pagamento em Faturas do Quartier Flow.",
						"- As cobranças já enviadas aos moradores continuam valendo e os pagamentos seguem para a conta Asaas da administradora.",
						"- Os condomínios ficam disponíveis só para consulta, para moradores, síndicos e para você.",
						"- A conta Asaas continua sendo da administradora: saldos são sacados direto no Asaas.",
						"- Para voltar a gerenciar, reabra a administradora em Início, assinando um plano e os Termos de Uso novamente.",
						"",
						`Faturas: ${new URL("/painel/faturas", env.BETTER_AUTH_URL).toString()}`,
					].join("\n"),
				}),
			);
			return { ok: true };
		}),
});
