/**
 * Legal collection of a unit's debt (docs/features/04, item 3), shared by
 * server and client.
 */

export const COLLECTION_STAGES = [
	"extrajudicial",
	"judicial",
	"closed",
] as const;
export type CollectionStage = (typeof COLLECTION_STAGES)[number];

export const STAGE_LABEL: Record<CollectionStage, string> = {
	extrajudicial: "Cobrança extrajudicial",
	judicial: "Cobrança judicial",
	closed: "Encerrada",
};

export const STAGE_TONE: Record<
	CollectionStage,
	"neutral" | "info" | "warning" | "danger"
> = {
	extrajudicial: "warning",
	judicial: "danger",
	closed: "neutral",
};

export const isStage = (value: string): value is CollectionStage =>
	(COLLECTION_STAGES as readonly string[]).includes(value);

export const stageOf = (value: string): CollectionStage =>
	isStage(value) ? value : "extrajudicial";

/**
 * Timeline kinds. Stored ones (CollectionEvent.kind): note, stage, handler,
 * opened. Derived from the unit's data: overdue, payment, agreement,
 * agreement_broken, forgiveness, reminder.
 */
export type TimelineKind =
	| "opened"
	| "note"
	| "stage"
	| "handler"
	| "overdue"
	| "payment"
	| "agreement"
	| "agreement_broken"
	| "forgiveness"
	| "reminder";

export const TIMELINE_LABEL: Record<TimelineKind, string> = {
	opened: "Cobrança aberta",
	note: "Anotação",
	stage: "Etapa alterada",
	handler: "Responsável alterado",
	overdue: "Cobrança vencida",
	payment: "Pagamento",
	agreement: "Acordo",
	agreement_broken: "Acordo encerrado",
	forgiveness: "Perdão de dívida",
	reminder: "Lembrete enviado",
};
