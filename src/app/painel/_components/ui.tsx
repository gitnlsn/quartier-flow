"use client";

import { cn } from "cn";
import { AlertCircle, LifeBuoy, Loader2, X } from "lucide-react";
import {
	type ComponentProps,
	type InputHTMLAttributes,
	type ReactNode,
	type SelectHTMLAttributes,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

import { Alert, AlertDescription } from "~/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Badge as UiBadge } from "~/components/ui/badge";
import { Button as UiButton } from "~/components/ui/button";
import {
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
	Card as UiCard,
} from "~/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { Input as UiInput } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { type MaskName, masks } from "~/lib/masks";

/**
 * App-area primitives (light theme, shadcn/ui). Pages use these instead of
 * raw elements so the look stays consistent for residents, síndicos and
 * administradoras.
 */

/** "Como funciona?" link to a Central de ajuda article (opens a new tab). */
export function HelpLink({ slug }: { slug: string }) {
	return (
		<a
			href={`/ajuda/${slug}`}
			target="_blank"
			rel="noreferrer"
			className="inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-muted-foreground text-sm hover:bg-muted hover:text-foreground"
		>
			<LifeBuoy className="size-4" aria-hidden />
			Como funciona?
		</a>
	);
}

export function PageTitle({
	title,
	subtitle,
	actions,
}: {
	title: string;
	subtitle?: ReactNode;
	actions?: ReactNode;
}) {
	return (
		<div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
			<div className="space-y-1">
				<h1 className="font-semibold text-2xl tracking-tight md:text-3xl">
					{title}
				</h1>
				{subtitle && <div className="text-muted-foreground">{subtitle}</div>}
			</div>
			{actions && <div className="flex flex-wrap gap-2">{actions}</div>}
		</div>
	);
}

export function Card({
	title,
	description,
	action,
	children,
	className,
}: {
	title?: ReactNode;
	description?: ReactNode;
	/** Buttons aligned with the title (top right). */
	action?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<UiCard className={className}>
			{(title || description || action) && (
				<CardHeader className="max-sm:grid-cols-1!">
					{title && <CardTitle className="text-lg">{title}</CardTitle>}
					{description && <CardDescription>{description}</CardDescription>}
					{action && (
						// Phones: buttons under the title, so the description keeps
						// the full width; wider screens: top right of the card.
						<CardAction className="flex flex-wrap gap-2 max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-auto max-sm:mt-2 max-sm:justify-self-start sm:justify-end">
							{action}
						</CardAction>
					)}
				</CardHeader>
			)}
			<CardContent>{children}</CardContent>
		</UiCard>
	);
}

type ButtonProps = ComponentProps<typeof UiButton> & { pending?: boolean };

export function Button({
	pending,
	disabled,
	children,
	type = "button",
	size = "lg",
	...props
}: ButtonProps) {
	return (
		<UiButton type={type} size={size} disabled={disabled || pending} {...props}>
			{pending && <Loader2 className="animate-spin" aria-hidden />}
			{children}
		</UiButton>
	);
}

export function Field({
	label,
	hint,
	error,
	children,
}: {
	label: string;
	hint?: ReactNode;
	error?: string;
	children: ReactNode;
}) {
	// Errors come from the last submit: hide this field's error as soon as the
	// person edits it, and show it again on the next submit or a new error.
	const ref = useRef<HTMLLabelElement>(null);
	const [edited, setEdited] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset when a new error arrives
	useEffect(() => setEdited(false), [error]);
	useEffect(() => {
		const form = ref.current?.closest("form");
		if (!form) return;
		const onSubmit = () => setEdited(false);
		form.addEventListener("submit", onSubmit);
		return () => form.removeEventListener("submit", onSubmit);
	}, []);
	const shownError = edited ? undefined : error;

	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed as children
		<label
			ref={ref}
			className="block space-y-1.5"
			// Only while an error is shown: no extra renders while typing.
			onChangeCapture={shownError ? () => setEdited(true) : undefined}
		>
			<span className="block font-medium text-sm">{label}</span>
			{children}
			{hint && !shownError && (
				<span className="block text-muted-foreground text-xs">{hint}</span>
			)}
			{shownError && (
				<span role="alert" className="block text-destructive text-sm">
					{shownError}
				</span>
			)}
		</label>
	);
}

export function Input(props: ComponentProps<"input">) {
	return (
		<UiInput {...props} className={cn("h-11 text-base", props.className)} />
	);
}

/**
 * Input that formats as the person types (CPF, CNPJ, CEP, phone, money...).
 * Keeps the caret after the same digit, so editing in the middle works.
 */
export function MaskedInput({
	mask,
	value,
	onValueChange,
	...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> & {
	mask: MaskName;
	value: string;
	onValueChange: (value: string) => void;
}) {
	const ref = useRef<HTMLInputElement>(null);
	// Caret to restore right after React writes the formatted value
	// (synchronously: a deferred update loses keys typed in between).
	const pendingCaret = useRef<number | null>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: runs after each new value
	useLayoutEffect(() => {
		const pos = pendingCaret.current;
		pendingCaret.current = null;
		const el = ref.current;
		if (pos !== null && el && document.activeElement === el) {
			el.setSelectionRange(pos, pos);
		}
	}, [value]);

	return (
		<Input
			inputMode="numeric"
			{...props}
			ref={ref}
			value={value}
			onChange={(e) => {
				const el = e.target;
				const raw = el.value;
				const formatted = masks[mask](raw);
				const caret = el.selectionStart ?? raw.length;
				// Typing at the end (the usual case) or money (fills from the
				// right): the browser keeps the caret at the end by itself.
				if (mask !== "money" && caret < raw.length) {
					const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
					let pos = 0;
					for (
						let seen = 0;
						pos < formatted.length && seen < digitsBefore;
						pos++
					) {
						if (/\d/.test(formatted[pos] ?? "")) seen++;
					}
					pendingCaret.current = pos;
				}
				onValueChange(formatted);
			}}
		/>
	);
}

/** Native select styled like the inputs (works well on phones). */
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select
			{...props}
			className={cn(
				"h-11 w-full rounded-md border border-input bg-background px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50",
				props.className,
			)}
		/>
	);
}

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

export function Badge({
	children,
	tone = "neutral",
}: {
	children: ReactNode;
	tone?: Tone;
}) {
	const styles: Record<Tone, string> = {
		neutral: "border-border bg-muted text-muted-foreground",
		info: "border-transparent bg-primary text-primary-foreground",
		success: "border-transparent bg-success/15 text-success-foreground",
		warning: "border-transparent bg-warning/25 text-warning-foreground",
		danger: "border-transparent bg-destructive/12 text-destructive",
	};
	return (
		<UiBadge variant="outline" className={cn("font-medium", styles[tone])}>
			{children}
		</UiBadge>
	);
}

export function ErrorMessage({ message }: { message?: string | null }) {
	if (!message) return null;
	return (
		<Alert variant="destructive">
			<AlertCircle aria-hidden />
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

export function Loading() {
	return (
		<div className="space-y-3" aria-busy="true" aria-label="Carregando">
			<Skeleton className="h-8 w-48" />
			<Skeleton className="h-24 w-full" />
			<Skeleton className="h-24 w-full" />
		</div>
	);
}

export function EmptyState({
	title,
	children,
}: {
	title: string;
	children?: ReactNode;
}) {
	return (
		<div className="rounded-lg border border-dashed p-8 text-center">
			<p className="font-medium">{title}</p>
			{children && (
				<div className="mt-1 text-muted-foreground text-sm">{children}</div>
			)}
		</div>
	);
}

/** Confirmation for destructive or important actions (in-page dialog). */
export function ConfirmButton({
	children,
	title,
	description,
	confirmLabel = "Confirmar",
	onConfirm,
	pending,
	disabled,
	variant = "ghost",
	size = "sm",
	className,
}: {
	children: ReactNode;
	title: string;
	description?: ReactNode;
	confirmLabel?: string;
	onConfirm: () => void;
	pending?: boolean;
	disabled?: boolean;
	variant?: ButtonProps["variant"];
	size?: ButtonProps["size"];
	className?: string;
}) {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant={variant}
					size={size}
					pending={pending}
					disabled={disabled}
					className={className}
				>
					{children}
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					{description && (
						<AlertDialogDescription>{description}</AlertDialogDescription>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>
						{confirmLabel}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

/** Field errors from a tRPC zod error, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
	const zodError = (
		error as {
			data?: {
				zodError?: { fieldErrors?: Record<string, string[] | undefined> };
			};
		}
	)?.data?.zodError;
	const result: Record<string, string> = {};
	for (const [key, messages] of Object.entries(zodError?.fieldErrors ?? {})) {
		if (messages?.[0]) result[key] = messages[0];
	}
	return result;
}

/** Top-level message of a tRPC error (hides zod details shown per field). */
export function errorMessage(error: unknown): string | null {
	if (!error) return null;
	if (Object.keys(fieldErrors(error)).length > 0) {
		return "Revise os campos destacados.";
	}
	const { message, data } = error as {
		message?: string;
		data?: { code?: string };
	};
	// Errors thrown without a message carry only the code (e.g. "NOT_FOUND").
	if (!message || message === data?.code || /^[A-Z_]+$/.test(message)) {
		return (
			ERROR_CODE_MESSAGE[data?.code ?? message ?? ""] ?? "Algo deu errado."
		);
	}
	if (/failed to fetch|fetch failed|networkerror|load failed/i.test(message)) {
		return "Sem conexão com o servidor. Verifique sua internet e tente novamente.";
	}
	return message.startsWith("[") ? "Algo deu errado." : message;
}

const ERROR_CODE_MESSAGE: Record<string, string> = {
	UNAUTHORIZED: "Sua sessão expirou. Entre novamente.",
	FORBIDDEN: "Você não tem permissão para fazer isso.",
	NOT_FOUND: "Não encontramos o que você procurava. Recarregue a página.",
	CONFLICT: "Este registro já existe ou foi alterado. Recarregue a página.",
	BAD_REQUEST: "Revise os dados e tente novamente.",
	TOO_MANY_REQUESTS: "Muitas tentativas. Aguarde um pouco e tente novamente.",
	TIMEOUT: "O servidor demorou para responder. Tente novamente.",
	INTERNAL_SERVER_ERROR: "Algo deu errado do nosso lado. Tente novamente.",
};

/** Quartier Flow invoice to the administradora (docs/features/18). */
export const INVOICE_STATUS: Record<string, { label: string; tone: Tone }> = {
	pending: { label: "Em aberto", tone: "warning" },
	overdue: { label: "Vencida", tone: "danger" },
	paid: { label: "Paga", tone: "success" },
	waived: { label: "Dispensada", tone: "neutral" },
	canceled: { label: "Cancelada", tone: "neutral" },
	failed: { label: "Em emissão", tone: "info" },
};

export const KYC_LABEL: Record<string, string> = {
	pending: "Pendente",
	awaiting_approval: "Em análise",
	approved: "Aprovada",
	rejected: "Recusada",
};

export const KYC_TONE: Record<string, Tone> = {
	pending: "warning",
	awaiting_approval: "warning",
	approved: "success",
	rejected: "danger",
};

export const CHARGE_STATUS_LABEL: Record<string, string> = {
	draft: "Rascunho",
	skipped: "Não enviada",
	pending: "A vencer",
	confirmed: "Pago (compensando)",
	received: "Pago",
	overdue: "Vencida",
	canceled: "Cancelada",
	refunded: "Estornada",
	failed: "Falhou",
	renegotiated: "Renegociada",
	forgiven: "Perdoada",
};

export const CHARGE_STATUS_TONE: Record<string, Tone> = {
	draft: "neutral",
	skipped: "neutral",
	pending: "warning",
	confirmed: "success",
	received: "success",
	overdue: "danger",
	canceled: "neutral",
	refunded: "neutral",
	failed: "danger",
	renegotiated: "info",
	forgiven: "neutral",
};

export const RUN_STATUS_LABEL: Record<string, string> = {
	draft: "Aguardando auditoria",
	sending: "Enviando",
	sent: "Enviada",
	partially_failed: "Enviada com falhas",
};

export const RUN_STATUS_TONE: Record<string, Tone> = {
	draft: "warning",
	sending: "info",
	sent: "success",
	partially_failed: "danger",
};

/**
 * Centered modal for forms and details (unit panel, invite, imports).
 * Scrolls inside on small screens; `size` controls the max width.
 */
export function Modal({
	open,
	onOpenChange,
	title,
	description,
	size = "md",
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: ReactNode;
	description?: ReactNode;
	size?: "md" | "lg" | "xl";
	children: ReactNode;
}) {
	const width = {
		md: "sm:max-w-lg",
		lg: "sm:max-w-2xl",
		xl: "sm:max-w-4xl",
	}[size];
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className={cn("app max-h-[90vh] gap-0 overflow-y-auto p-0", width)}
			>
				<DialogHeader className="sticky top-0 z-10 flex-row items-start justify-between gap-4 border-b bg-popover p-5">
					<div className="space-y-1">
						<DialogTitle className="text-lg">{title}</DialogTitle>
						{description && (
							<DialogDescription>{description}</DialogDescription>
						)}
					</div>
					<DialogClose asChild>
						<UiButton variant="ghost" size="icon-sm" aria-label="Fechar">
							<X aria-hidden />
						</UiButton>
					</DialogClose>
				</DialogHeader>
				<div className="p-5">{children}</div>
			</DialogContent>
		</Dialog>
	);
}

/** Numbered step heading; turns into a check mark when done. */
export function StepTitle({
	n,
	title,
	done,
}: {
	n: number;
	title: string;
	done: boolean;
}) {
	return (
		<span className="flex items-center gap-3">
			<span
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-full border font-semibold text-sm",
					done
						? "border-transparent bg-success text-white"
						: "border-border bg-muted",
				)}
			>
				{done ? "✓" : n}
			</span>
			{title}
		</span>
	);
}
