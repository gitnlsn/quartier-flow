import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import { z } from "zod";

import { MAX_AGREEMENT_INSTALLMENTS } from "~/lib/delinquency";
import {
	REMINDER_AFTER_OPTIONS,
	REMINDER_BEFORE_OPTIONS,
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
import {
	breakAgreement,
	cancelPendingAgreement,
	createAgreement,
	delinquencyOverview,
	exportRows,
	finalizeAgreement,
	forgiveCharges,
} from "~/server/delinquency";

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
			const config = await ctx.db.billingConfig.update({
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

			const payers = await ctx.db.membership.findMany({
				where: {
					condominiumId: input.condominiumId,
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
			});
			const customers = [
				...new Map(
					payers
						.map((p) => p.user.paymentCustomer)
						.filter((c) => c !== null)
						.map((c) => [c.userId, c]),
				).values(),
			];
			const settings = reminderSettings(config);
			after(async () => {
				let failed = 0;
				for (const customer of customers) {
					if (!(await applyReminders(customer, settings))) failed++;
				}
				if (failed > 0) {
					console.error(
						`[reminders] ${failed}/${customers.length} payers failed to sync for ${input.condominiumId}`,
					);
				}
			});
			return { payers: customers.length };
		}),
});
