import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import { z } from "zod";

import { MAX_AGREEMENT_INSTALLMENTS } from "~/lib/delinquency";
import {
	MAX_COLLECTION_STEPS,
	MAX_STEP_OFFSET,
	MIN_STEP_OFFSET,
	REMINDER_AFTER_OPTIONS,
	REMINDER_BEFORE_OPTIONS,
	sortSteps,
	validReminders,
} from "~/lib/reminders";
import { assertCanViewCondominium, getAccess } from "~/server/access";
import {
	asUserError,
	assertManagedCondominium,
} from "~/server/api/routers/billing";
import {
	adminProcedure,
	createTRPCRouter,
	protectedProcedure,
} from "~/server/api/trpc";
import { applyReminders, reminderSettings } from "~/server/asaas/notifications";
import { audit } from "~/server/audit";
import { db } from "~/server/db";
import {
	breakAgreement,
	cancelPendingAgreement,
	createAgreement,
	delinquencyOverview,
	exportRows,
	finalizeAgreement,
	forgiveCharges,
	renegotiateAgreement,
} from "~/server/delinquency";
import { collectionSteps } from "~/server/reminders";

/**
 * Delinquency management (docs/features/04). Only the administradora and the
 * síndico see the list (never residents); only the administradora acts.
 */

async function assertManagedAgreement(
	db: Parameters<typeof assertManagedCondominium>[0],
	administradoraId: string,
	agreementId: string,
) {
	const agreement = await db.agreement.findUniqueOrThrow({
		where: { id: agreementId },
		select: { condominiumId: true },
	});
	await assertManagedCondominium(db, administradoraId, agreement.condominiumId);
}

/**
 * Re-applies the Asaas reminder settings to every current payer of the given
 * condominiums, in the background (after the response). A payer in several
 * of them gets the settings of the last one: Asaas settings are per payer.
 * Payers that fail are synced again before their next boleto.
 */
async function resyncPayers(condominiumIds: string[]) {
	const condos = await db.condominium.findMany({
		where: { id: { in: condominiumIds }, billingConfig: { isNot: null } },
		select: {
			id: true,
			billingConfig: true,
			administradora: { select: { reminderSender: true } },
			memberships: {
				where: {
					endedAt: null,
					financiallyResponsible: true,
					user: { paymentCustomer: { isNot: null } },
				},
				select: {
					user: {
						select: {
							paymentCustomer: {
								select: { userId: true, asaasCustomerId: true },
							},
						},
					},
				},
			},
		},
	});
	const jobs = new Map<
		string,
		{
			customer: { userId: string; asaasCustomerId: string };
			settings: ReturnType<typeof reminderSettings>;
		}
	>();
	for (const condo of condos) {
		if (!condo.billingConfig) continue;
		const settings = reminderSettings(
			condo.billingConfig,
			condo.administradora.reminderSender,
		);
		for (const m of condo.memberships) {
			const customer = m.user.paymentCustomer;
			if (customer) jobs.set(customer.userId, { customer, settings });
		}
	}
	after(async () => {
		let failed = 0;
		for (const job of jobs.values()) {
			if (!(await applyReminders(job.customer, job.settings))) failed++;
		}
		if (failed > 0) {
			console.error(
				`[reminders] ${failed}/${jobs.size} payers failed to sync (${condominiumIds.length} condominiums)`,
			);
		}
	});
	return jobs.size;
}

const offsets = (allowed: readonly number[]) =>
	z
		.array(z.number().int())
		.refine((values) => validReminders(values, allowed), {
			message: "Escolha o lembrete do dia e no máximo um outro",
		});

export const delinquencyRouter = createTRPCRouter({
	overview: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			const overview = await delinquencyOverview(input.condominiumId);
			return { canManage, ...overview };
		}),

	/** Rows for legal collection, with the full CPF: logged (LGPD). */
	exportRows: adminProcedure
		.input(z.object({ condominiumId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const rows = await exportRows(input.condominiumId);
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "delinquency.export",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { rows: rows.length },
			});
			return rows;
		}),

	createAgreement: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				unitId: z.string(),
				chargeIds: z.array(z.string()).min(1, "Selecione as cobranças"),
				totalCents: z.number().int().positive("Informe o valor do acordo"),
				downPaymentCents: z.number().int().min(0),
				downPaymentDueDate: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.nullable(),
				installments: z.number().int().min(1).max(MAX_AGREEMENT_INSTALLMENTS),
				notes: z.string().trim().max(500).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			return asUserError(() =>
				createAgreement({
					...input,
					notes: input.notes || null,
					actorUserId: ctx.session.user.id,
				}),
			);
		}),

	/** Writes off overdue charges of a unit, with a required reason. */
	forgiveCharges: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				unitId: z.string(),
				chargeIds: z.array(z.string()).min(1, "Selecione as cobranças"),
				reason: z
					.string()
					.trim()
					.min(5, "Explique o motivo (mínimo 5 caracteres)")
					.max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			return asUserError(() =>
				forgiveCharges({
					...input,
					actorUserId: ctx.session.user.id,
					administradoraId: ctx.administradoraId,
				}),
			);
		}),

	/** Finishes a pending acordo or re-issues a failed entrada. */
	retryAgreement: adminProcedure
		.input(z.object({ agreementId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedAgreement(
				ctx.db,
				ctx.administradoraId,
				input.agreementId,
			);
			return asUserError(() =>
				finalizeAgreement(input.agreementId, ctx.session.user.id),
			);
		}),

	breakAgreement: adminProcedure
		.input(z.object({ agreementId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedAgreement(
				ctx.db,
				ctx.administradoraId,
				input.agreementId,
			);
			await asUserError(() =>
				breakAgreement(input.agreementId, ctx.session.user.id),
			);
		}),

	/** "Renegociar saldo": ends the acordo and creates its replacement. */
	renegotiateAgreement: adminProcedure
		.input(
			z.object({
				agreementId: z.string(),
				extraChargeIds: z.array(z.string()),
				totalCents: z.number().int().positive("Informe o valor do acordo"),
				downPaymentCents: z.number().int().min(0),
				downPaymentDueDate: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.nullable(),
				installments: z.number().int().min(1).max(MAX_AGREEMENT_INSTALLMENTS),
				notes: z.string().trim().max(500).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedAgreement(
				ctx.db,
				ctx.administradoraId,
				input.agreementId,
			);
			return asUserError(() =>
				renegotiateAgreement({
					...input,
					notes: input.notes || null,
					actorUserId: ctx.session.user.id,
				}),
			);
		}),

	cancelAgreement: adminProcedure
		.input(z.object({ agreementId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedAgreement(
				ctx.db,
				ctx.administradoraId,
				input.agreementId,
			);
			await asUserError(() =>
				cancelPendingAgreement(input.agreementId, ctx.session.user.id),
			);
		}),

	/**
	 * Payment reminders sent by Asaas. Saved on the BillingConfig, then
	 * applied to every current payer in the background; payers that fail are
	 * synced again before their next boleto.
	 */
	saveReminders: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				before: offsets(REMINDER_BEFORE_OPTIONS),
				after: offsets(REMINDER_AFTER_OPTIONS),
				email: z.boolean(),
				sms: z.boolean(),
				whatsapp: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const existing = await ctx.db.billingConfig.findUnique({
				where: { condominiumId: input.condominiumId },
				select: { id: true },
			});
			if (!existing) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Configure a cobrança mensal deste condomínio primeiro.",
				});
			}
			await ctx.db.billingConfig.update({
				where: { condominiumId: input.condominiumId },
				data: {
					reminderBefore: input.before,
					reminderAfter: input.after,
					reminderEmail: input.email,
					reminderSms: input.sms,
					reminderWhatsapp: input.whatsapp,
				},
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "billing_config.reminders",
				entity: "condominium",
				entityId: input.condominiumId,
				data: {
					before: input.before,
					after: input.after,
					email: input.email,
					sms: input.sms,
					whatsapp: input.whatsapp,
				},
			});
			return { payers: await resyncPayers([input.condominiumId]) };
		}),

	/**
	 * Reminder setup of a condominium: who sends (per administradora), the
	 * app's collection steps (or the defaults) and the acordo auto-end rule.
	 */
	reminderSetup: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			await assertCanViewCondominium(ctx.db, access, input.condominiumId);
			const condo = await ctx.db.condominium.findUniqueOrThrow({
				where: { id: input.condominiumId },
				select: {
					administradora: { select: { reminderSender: true } },
					billingConfig: { select: { agreementAutoBreakDays: true } },
				},
			});
			return {
				sender: condo.administradora.reminderSender === "app" ? "app" : "asaas",
				...(await collectionSteps(input.condominiumId)),
				agreementAutoBreakDays:
					condo.billingConfig?.agreementAutoBreakDays ?? null,
			} as const;
		}),

	/**
	 * Who sends payment reminders for every condominium of the administradora.
	 * "app" turns the Asaas reminders off for all its payers; "asaas" turns
	 * them back on with each condominium's settings.
	 */
	setReminderSender: adminProcedure
		.input(z.object({ sender: z.enum(["asaas", "app"]) }))
		.mutation(async ({ ctx, input }) => {
			const administradora = await ctx.db.administradora.update({
				where: { id: ctx.administradoraId },
				data: { reminderSender: input.sender },
				select: { condominiums: { select: { id: true } } },
			});
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "administradora.reminder_sender",
				entity: "administradora",
				entityId: ctx.administradoraId,
				data: { sender: input.sender },
			});
			const payers = await resyncPayers(
				administradora.condominiums.map((c) => c.id),
			);
			return { payers };
		}),

	/** The app's collection schedule of a condominium (replaces all steps). */
	saveCollectionSteps: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				steps: z
					.array(
						z.object({
							offsetDays: z
								.number()
								.int()
								.min(
									MIN_STEP_OFFSET,
									`No máximo ${-MIN_STEP_OFFSET} dias antes`,
								)
								.max(
									MAX_STEP_OFFSET,
									`No máximo ${MAX_STEP_OFFSET} dias depois`,
								),
							audience: z.enum(["payer", "managers"]),
						}),
					)
					.max(
						MAX_COLLECTION_STEPS,
						`No máximo ${MAX_COLLECTION_STEPS} etapas`,
					),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const seen = new Set<string>();
			const steps = sortSteps(input.steps).filter((step) => {
				const key = `${step.offsetDays}:${step.audience}`;
				if (seen.has(key)) return false;
				seen.add(key);
				return !(step.audience === "managers" && step.offsetDays <= 0);
			});
			await ctx.db.$transaction([
				ctx.db.collectionStep.deleteMany({
					where: { condominiumId: input.condominiumId },
				}),
				ctx.db.collectionStep.createMany({
					data: steps.map((step) => ({
						condominiumId: input.condominiumId,
						...step,
					})),
				}),
			]);
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "collection_steps.save",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { steps },
			});
			return { steps };
		}),

	/** Ends acordos automatically after N days late (null = off). */
	saveAutoBreak: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				days: z.number().int().min(1).max(365).nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			const { count } = await ctx.db.billingConfig.updateMany({
				where: { condominiumId: input.condominiumId },
				data: { agreementAutoBreakDays: input.days },
			});
			if (count === 0) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Configure a cobrança mensal deste condomínio primeiro.",
				});
			}
			await audit({
				administradoraId: ctx.administradoraId,
				actorUserId: ctx.session.user.id,
				action: "billing_config.agreement_auto_break",
				entity: "condominium",
				entityId: input.condominiumId,
				data: { days: input.days },
			});
		}),
});
