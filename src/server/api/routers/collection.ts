import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { COLLECTION_STAGES } from "~/lib/collection";
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
import {
	caseDetail,
	listCases,
	openCase,
	setHandler,
	setStage,
} from "~/server/collection";

/**
 * Legal collection cases (docs/features/04, item 3). The síndico sees them
 * read-only, like the rest of Inadimplência; only the administradora acts.
 * Notes with files go through POST /api/cobrancas-juridicas/[id]/eventos.
 */

const handler = z
	.string()
	.trim()
	.max(160, "Use no máximo 160 caracteres")
	.transform((v) => v || null)
	.nullable();
const note = z
	.string()
	.trim()
	.max(2000, "Use no máximo 2000 caracteres")
	.transform((v) => v || null)
	.nullable();

async function assertManagedCase(
	db: Parameters<typeof assertManagedCondominium>[0],
	administradoraId: string,
	caseId: string,
) {
	const found = await db.collectionCase.findUniqueOrThrow({
		where: { id: caseId },
		select: { condominiumId: true },
	});
	await assertManagedCondominium(db, administradoraId, found.condominiumId);
}

export const collectionRouter = createTRPCRouter({
	list: protectedProcedure
		.input(z.object({ condominiumId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			await assertCanViewCondominium(ctx.db, access, input.condominiumId);
			return listCases(input.condominiumId);
		}),

	get: protectedProcedure
		.input(z.object({ condominiumId: z.string(), caseId: z.string() }))
		.query(async ({ ctx, input }) => {
			const access = await getAccess(ctx.db, ctx.session.user.id);
			const { canManage } = await assertCanViewCondominium(
				ctx.db,
				access,
				input.condominiumId,
			);
			const detail = await caseDetail(input.caseId);
			if (detail.condominium.id !== input.condominiumId) {
				throw new TRPCError({ code: "NOT_FOUND" });
			}
			return { canManage, ...detail };
		}),

	open: adminProcedure
		.input(
			z.object({
				condominiumId: z.string(),
				unitId: z.string(),
				handler,
				note,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCondominium(
				ctx.db,
				ctx.administradoraId,
				input.condominiumId,
			);
			return asUserError(() =>
				openCase({
					...input,
					actorUserId: ctx.session.user.id,
					administradoraId: ctx.administradoraId,
				}),
			);
		}),

	setStage: adminProcedure
		.input(
			z.object({
				caseId: z.string(),
				stage: z.enum(COLLECTION_STAGES),
				note,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertManagedCase(ctx.db, ctx.administradoraId, input.caseId);
			await asUserError(() =>
				setStage({
					...input,
					actorUserId: ctx.session.user.id,
					administradoraId: ctx.administradoraId,
				}),
			);
		}),

	setHandler: adminProcedure
		.input(z.object({ caseId: z.string(), handler }))
		.mutation(async ({ ctx, input }) => {
			await assertManagedCase(ctx.db, ctx.administradoraId, input.caseId);
			await asUserError(() =>
				setHandler({ ...input, actorUserId: ctx.session.user.id }),
			);
		}),
});
