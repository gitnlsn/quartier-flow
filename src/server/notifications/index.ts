import "server-only";

import type { Prisma } from "@prisma/client";
import { after } from "next/server";

import {
	type Channel,
	EXTRA_CHANNELS,
	NOTIFICATION_TYPES,
	type NotificationType,
} from "~/lib/notifications";
import { sendEmail } from "~/server/auth/messaging";
import { db } from "~/server/db";
import { notificationEmail } from "~/server/notifications/email";

/**
 * Notifications (docs/features/16). Every feature calls `notify()`:
 * - one inbox row per recipient (always);
 * - one delivery per extra channel the recipient wants for that type
 *   (only email for now), sent right after the response with `after()` and
 *   retried by /api/cron/notifications with backoff.
 *
 * `notify()` never throws: a notification failing must not undo or fail the
 * action that caused it.
 */

export type NotifyInput = {
	userIds: (string | null | undefined)[];
	type: NotificationType;
	title: string;
	body: string;
	/** Screen to open, inside the app (/painel/...) */
	url?: string | null;
	condominiumId?: string | null;
	data?: Prisma.InputJsonValue;
	/** Usually the person who did the action: they don't need to be told. */
	excludeUserId?: string | null;
};

/** Delays before each retry; after the last one the delivery is `failed`. */
const RETRY_DELAYS_MS = [5, 30, 120, 720].map((m) => m * 60_000);
const MAX_ATTEMPTS = RETRY_DELAYS_MS.length + 1;
/** A claimed delivery is retried by the cron if its sender died mid-way. */
const CLAIM_MS = 10 * 60_000;
/** SendPulse allows ~10 requests per second. */
const BATCH_SIZE = 5;
const BATCH_INTERVAL_MS = 600;

/** Channels each user wants for a type: their saved choice, or the defaults. */
async function channelsFor(userIds: string[], type: NotificationType) {
	const info = NOTIFICATION_TYPES[type];
	const defaults: Channel[] = [...info.defaultChannels];
	const result = new Map(userIds.map((id) => [id, defaults]));
	if ("mandatory" in info && info.mandatory) return result;
	const saved = await db.notificationPreference.findMany({
		where: { userId: { in: userIds }, type },
		select: { userId: true, channels: true },
	});
	for (const pref of saved) {
		result.set(
			pref.userId,
			EXTRA_CHANNELS.filter((c) => pref.channels.includes(c)),
		);
	}
	return result;
}

/** Creates the inbox rows and deliveries; returns the ids of pending deliveries. */
async function create(input: NotifyInput) {
	const userIds = [
		...new Set(
			input.userIds.filter(
				(id): id is string => Boolean(id) && id !== input.excludeUserId,
			),
		),
	];
	if (!userIds.length) return [];
	const channels = await channelsFor(userIds, input.type);

	return db.$transaction(async (tx) => {
		const notifications = await tx.notification.createManyAndReturn({
			data: userIds.map((userId) => ({
				userId,
				type: input.type,
				title: input.title.slice(0, 200),
				body: input.body.slice(0, 2000),
				url: input.url ?? null,
				condominiumId: input.condominiumId ?? null,
				data: input.data,
			})),
			select: { id: true, userId: true },
		});
		const deliveries = await tx.notificationDelivery.createManyAndReturn({
			data: notifications.flatMap((n) =>
				EXTRA_CHANNELS.map((channel) => ({
					notificationId: n.id,
					channel,
					status: channels.get(n.userId)?.includes(channel)
						? "pending"
						: "skipped",
				})),
			),
			select: { id: true, status: true },
		});
		return deliveries.filter((d) => d.status === "pending").map((d) => d.id);
	});
}

export async function notify(input: NotifyInput): Promise<void> {
	try {
		const pending = await create(input);
		if (!pending.length) return;
		const send = processDeliveries(pending).catch((error: unknown) => {
			console.error("[notify] delivery failed", error);
		});
		try {
			after(send);
		} catch {
			// Outside a request (scripts): the promise just runs.
		}
	} catch (error) {
		console.error(`[notify] ${input.type} failed`, error);
	}
}

/** Takes a delivery for this sender; false if someone else has it or it's not due. */
async function claim(id: string, now: Date) {
	const { count } = await db.notificationDelivery.updateMany({
		where: { id, status: "pending", nextAttemptAt: { lte: now } },
		data: { nextAttemptAt: new Date(now.getTime() + CLAIM_MS) },
	});
	return count === 1;
}

async function sendOne(id: string) {
	if (!(await claim(id, new Date()))) return "skipped" as const;
	const delivery = await db.notificationDelivery.findUniqueOrThrow({
		where: { id },
		select: {
			attempts: true,
			channel: true,
			notification: {
				select: {
					title: true,
					body: true,
					url: true,
					user: { select: { email: true, name: true } },
				},
			},
		},
	});
	const attempts = delivery.attempts + 1;
	try {
		const { notification } = delivery;
		const email = notificationEmail(notification);
		const providerId = await sendEmail({
			to: notification.user.email,
			toName: notification.user.name,
			...email,
		});
		await db.notificationDelivery.update({
			where: { id },
			data: {
				status: "sent",
				attempts,
				sentAt: new Date(),
				providerId: providerId || null,
				error: null,
			},
		});
		return "sent" as const;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const delay = RETRY_DELAYS_MS[attempts - 1];
		await db.notificationDelivery.update({
			where: { id },
			data: {
				attempts,
				error: message.slice(0, 500),
				...(attempts >= MAX_ATTEMPTS || delay === undefined
					? { status: "failed" }
					: { nextAttemptAt: new Date(Date.now() + delay) }),
			},
		});
		console.error(`[notify] delivery ${id} attempt ${attempts}`, message);
		return "failed" as const;
	}
}

/**
 * Sends pending deliveries: the given ones (right after `notify`), or every
 * due one (cron). Paced to stay under the provider's rate limit.
 */
export async function processDeliveries(ids?: string[]) {
	const due = ids
		? ids
		: (
				await db.notificationDelivery.findMany({
					where: { status: "pending", nextAttemptAt: { lte: new Date() } },
					orderBy: { nextAttemptAt: "asc" },
					take: 200,
					select: { id: true },
				})
			).map((d) => d.id);

	const summary = { sent: 0, failed: 0, skipped: 0 };
	for (let i = 0; i < due.length; i += BATCH_SIZE) {
		const started = Date.now();
		const results = await Promise.all(
			due.slice(i, i + BATCH_SIZE).map(sendOne),
		);
		for (const r of results) summary[r]++;
		const wait = BATCH_INTERVAL_MS - (Date.now() - started);
		if (i + BATCH_SIZE < due.length && wait > 0) {
			await new Promise((resolve) => setTimeout(resolve, wait));
		}
	}
	return summary;
}
