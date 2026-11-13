import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
	EXTRA_CHANNELS,
	NOTIFICATION_TYPES,
	isNotificationType,
	typeInfo,
} from "~/lib/notifications";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const PAGE_SIZE = 20;

/**
 * The signed-in user's notifications (docs/features/16): inbox and email
 * preferences. Everything is scoped to `ctx.session.user.id`.
 */
export const notificationRouter = createTRPCRouter({
	/** Newest first, paginated by cursor (the last id of the previous page). */
	list: protectedProcedure
		.input(z.object({ cursor: z.string().nullish() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db.notification.findMany({
				where: { userId: ctx.session.user.id },
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				take: PAGE_SIZE + 1,
				...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
				select: {
					id: true,
					type: true,
					title: true,
					body: true,
					url: true,
					readAt: true,
					createdAt: true,
				},
			});
			const more = rows.length > PAGE_SIZE;
			const items = more ? rows.slice(0, PAGE_SIZE) : rows;
			return {
				items,
				nextCursor: more ? (items.at(-1)?.id ?? null) : null,
			};
		}),

	unreadCount: protectedProcedure.query(({ ctx }) =>
		ctx.db.notification.count({
			where: { userId: ctx.session.user.id, readAt: null },
		}),
	),

	markRead: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await ctx.db.notification.updateMany({
				where: { id: input.id, userId: ctx.session.user.id, readAt: null },
				data: { readAt: new Date() },
			});
			return { ok: true };
		}),

	markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
		const { count } = await ctx.db.notification.updateMany({
			where: { userId: ctx.session.user.id, readAt: null },
			data: { readAt: new Date() },
		});
		return { count };
	}),

	/** Every type with the channels this user gets it on. */
	preferences: protectedProcedure.query(async ({ ctx }) => {
		const saved = await ctx.db.notificationPreference.findMany({
			where: { userId: ctx.session.user.id },
			select: { type: true, channels: true },
		});
		const byType = new Map(saved.map((p) => [p.type, p.channels]));
		return Object.entries(NOTIFICATION_TYPES).map(([type, info]) => {
			const mandatory = "mandatory" in info && Boolean(info.mandatory);
			const channels = (!mandatory && byType.get(type)) || [
				...info.defaultChannels,
			];
			return {
				type,
				group: info.group,
				label: info.label,
				description: info.description,
				mandatory,
				email: channels.includes("email"),
			};
		});
	}),

	setPreference: protectedProcedure
		.input(
			z.object({
				type: z.string(),
				channel: z.enum(EXTRA_CHANNELS),
				enabled: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const info = typeInfo(input.type);
			if (!info || !isNotificationType(input.type)) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			if (info.mandatory) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Este aviso é obrigatório e não pode ser desativado.",
				});
			}
			const userId = ctx.session.user.id;
			const current = await ctx.db.notificationPreference.findUnique({
				where: { userId_type: { userId, type: input.type } },
				select: { channels: true },
			});
			const set = new Set(current?.channels ?? info.defaultChannels);
			if (input.enabled) set.add(input.channel);
			else set.delete(input.channel);
			const channels = EXTRA_CHANNELS.filter((c) => set.has(c));
			await ctx.db.notificationPreference.upsert({
				where: { userId_type: { userId, type: input.type } },
				create: { userId, type: input.type, channels },
				update: { channels },
			});
			return { channels };
		}),
});
