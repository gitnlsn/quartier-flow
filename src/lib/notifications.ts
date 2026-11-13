/**
 * Notification types (docs/features/16), shared by `notify()` and the
 * preferences screen. The in-app inbox always receives every notification;
 * `defaultChannels` are the extra channels used until the user changes them.
 * Mandatory types (urgent / security) can't be turned off.
 *
 * Never put sensitive data (amounts, codes, documents) in notification text:
 * it ends up in email previews. Link to the screen instead.
 */

export const EXTRA_CHANNELS = ["email"] as const;
export type Channel = (typeof EXTRA_CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = { email: "Email" };

type TypeInfo = {
	group: string;
	label: string;
	description: string;
	defaultChannels: Channel[];
	mandatory?: boolean;
};

export const NOTIFICATION_TYPES = {
	"reservation.requested": {
		group: "Reservas",
		label: "Reserva aguardando aprovação",
		description: "Para quem administra: um morador pediu uma reserva.",
		defaultChannels: ["email"],
	},
	"reservation.canceled_by_resident": {
		group: "Reservas",
		label: "Reserva cancelada pelo morador",
		description: "Para quem administra: uma reserva confirmada foi cancelada.",
		defaultChannels: ["email"],
	},
	"reservation.approved": {
		group: "Reservas",
		label: "Reserva aprovada",
		description: "Sua reserva foi aprovada pela administração.",
		defaultChannels: ["email"],
	},
	"reservation.rejected": {
		group: "Reservas",
		label: "Reserva recusada",
		description: "Sua reserva foi recusada pela administração.",
		defaultChannels: ["email"],
	},
	"reservation.canceled": {
		group: "Reservas",
		label: "Reserva cancelada",
		description: "A administração cancelou uma reserva sua.",
		defaultChannels: ["email"],
	},
	"agreement.created": {
		group: "Cobranças",
		label: "Acordo registrado",
		description: "Um acordo de pagamento da sua unidade foi registrado.",
		defaultChannels: ["email"],
	},
	"agreement.broken": {
		group: "Cobranças",
		label: "Acordo encerrado",
		description: "Um acordo de pagamento da sua unidade foi encerrado.",
		defaultChannels: ["email"],
	},
} satisfies Record<string, TypeInfo>;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

export const typeInfo = (type: string): TypeInfo | undefined =>
	(NOTIFICATION_TYPES as Record<string, TypeInfo>)[type];

export const isNotificationType = (type: string): type is NotificationType =>
	type in NOTIFICATION_TYPES;

/** Where the user manages which notifications they get by email. */
export const PREFERENCES_PATH = "/painel/notificacoes/preferencias";
