import "server-only";

import { db } from "~/server/db";
import { type AsaasList, asaasRequest } from "./client";

/**
 * Payment reminders sent by Asaas to a payer (docs/features/04, 17).
 * Asaas creates a fixed set of notifications per customer and the API can't
 * add more. Per event there are two slots (verified on the sandbox, Nov/2026):
 * - a fixed one with scheduleOffset 0 (only on/off): "on the due date" for
 *   PAYMENT_DUEDATE_WARNING, "when it becomes overdue" for PAYMENT_OVERDUE;
 * - an adjustable one: 5/10/15/30 days before, or 1/7/15/30 days after.
 * Settings are lists where 0 means the fixed slot and at most one other value
 * is the adjustable slot. Rules in `src/lib/reminders.ts`.
 */

export type ReminderSettings = {
	before: number[]; // 0 = on the due date, plus at most one of 5/10/15/30
	after: number[]; // 0 = when overdue, plus at most one of 1/7/15/30
	email: boolean;
	sms: boolean;
	whatsapp: boolean;
};

type AsaasNotification = {
	id: string;
	event: string;
	scheduleOffset: number;
	enabled: boolean;
};

/** Stable key of the settings, stored per customer to skip unchanged syncs. */
export function reminderKey(settings: ReminderSettings) {
	const sorted = (values: number[]) =>
		[...values].sort((a, b) => a - b).join(",");
	return [
		`b:${sorted(settings.before)}`,
		`a:${sorted(settings.after)}`,
		`e:${settings.email ? 1 : 0}`,
		`s:${settings.sms ? 1 : 0}`,
		`w:${settings.whatsapp ? 1 : 0}`,
	].join("|");
}

/** Applies the reminder settings to one Asaas customer. */
export async function syncCustomerNotifications(
	customerId: string,
	settings: ReminderSettings,
) {
	const id = encodeURIComponent(customerId);
	const [customer, list] = await Promise.all([
		asaasRequest<{ mobilePhone?: string | null; phone?: string | null }>(
			"GET",
			`/customers/${id}`,
		),
		asaasRequest<AsaasList<AsaasNotification>>(
			"GET",
			`/customers/${id}/notifications`,
		),
	]);
	// Asaas rejects the whole batch when SMS/WhatsApp is on for a customer
	// without a phone, so those channels only apply to payers with one.
	const hasPhone = Boolean(customer.mobilePhone || customer.phone);
	const sms = settings.sms && hasPhone;
	const whatsapp = settings.whatsapp && hasPhone;
	const channels = {
		emailEnabledForCustomer: settings.email,
		smsEnabledForCustomer: sms,
		whatsappEnabledForCustomer: whatsapp,
		// Asaas turns robocalls on by default for overdue reminders: never.
		phoneCallEnabledForCustomer: false,
	};
	const anyChannel = settings.email || sms || whatsapp;

	const off = {
		enabled: false,
		...(hasPhone
			? {}
			: { smsEnabledForCustomer: false, whatsappEnabledForCustomer: false }),
		phoneCallEnabledForCustomer: false,
	};
	const fill = (event: string, values: number[]) => {
		const slots = list.data.filter((n) => n.event === event);
		const fixed = slots.find((n) => n.scheduleOffset === 0);
		const adjustable = slots.find((n) => n !== fixed);
		const extra = values.find((v) => v !== 0);
		const result: Record<string, unknown>[] = [];
		if (fixed) {
			result.push(
				values.includes(0) && anyChannel
					? { id: fixed.id, enabled: true, ...channels }
					: { id: fixed.id, ...off },
			);
		}
		if (adjustable) {
			result.push(
				extra !== undefined && anyChannel
					? {
							id: adjustable.id,
							enabled: true,
							scheduleOffset: extra,
							...channels,
						}
					: { id: adjustable.id, ...off },
			);
		}
		return result;
	};

	const notifications = [
		...fill("PAYMENT_DUEDATE_WARNING", settings.before),
		...fill("PAYMENT_OVERDUE", settings.after),
	];
	if (notifications.length === 0) return;
	await asaasRequest("PUT", "/notifications/batch", {
		body: { customer: customerId, notifications },
	});
}

/**
 * Syncs a payer's reminders when the settings changed since the last sync
 * (or always with `force`). Best effort: a failure is logged and retried on
 * the next charge, it never blocks sending a boleto.
 */
export async function applyReminders(
	customer: { userId: string; asaasCustomerId: string },
	settings: ReminderSettings,
	options: { force?: boolean } = {},
): Promise<boolean> {
	const key = reminderKey(settings);
	if (!options.force) {
		const saved = await db.paymentCustomer.findUnique({
			where: { userId: customer.userId },
			select: { notificationsKey: true },
		});
		if (saved?.notificationsKey === key) return true;
	}
	try {
		await syncCustomerNotifications(customer.asaasCustomerId, settings);
		await db.paymentCustomer.update({
			where: { userId: customer.userId },
			data: { notificationsKey: key },
		});
		return true;
	} catch (error) {
		console.error(
			`[reminders] sync failed for customer ${customer.asaasCustomerId}`,
			error,
		);
		return false;
	}
}

/** Every Asaas reminder off: the app sends them instead. */
export const NO_ASAAS_REMINDERS: ReminderSettings = {
	before: [],
	after: [],
	email: false,
	sms: false,
	whatsapp: false,
};

/**
 * Reminder settings Asaas must apply for a condominium's payers: its
 * BillingConfig, or all off when the administradora sends reminders through
 * the app (reminderSender "app", src/server/reminders.ts). Only the reminder
 * notifications are turned off, not the customer's notifications as a whole:
 * the "new boleto" email from Asaas keeps going out.
 */
export const reminderSettings = (
	config: {
		reminderBefore: number[];
		reminderAfter: number[];
		reminderEmail: boolean;
		reminderSms: boolean;
		reminderWhatsapp: boolean;
	},
	sender: string,
): ReminderSettings =>
	sender === "app"
		? NO_ASAAS_REMINDERS
		: {
				before: config.reminderBefore,
				after: config.reminderAfter,
				email: config.reminderEmail,
				sms: config.reminderSms,
				whatsapp: config.reminderWhatsapp,
			};
