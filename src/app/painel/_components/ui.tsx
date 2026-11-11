"use client";

import { cn } from "cn";
import { AlertCircle, Loader2 } from "lucide-react";
import type {
	ComponentProps,
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
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
	CardContent,
	CardHeader,
	CardTitle,
	Card as UiCard,
} from "~/components/ui/card";
import { Input as UiInput } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";

/**
 * App-area primitives (light theme, shadcn/ui). Pages use these instead of
 * raw elements so the look stays consistent for residents, síndicos and
 * administradoras.
 */

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
	children,
	className,
}: {
	title?: ReactNode;
	description?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<UiCard className={className}>
			{(title || description) && (
				<CardHeader>
					{title && <CardTitle className="text-lg">{title}</CardTitle>}
					{description && (
						<p className="text-muted-foreground text-sm">{description}</p>
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
	hint?: string;
	error?: string;
	children: ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the control is passed as children
		<label className="block space-y-1.5">
			<span className="block font-medium text-sm">{label}</span>
			{children}
			{hint && !error && (
				<span className="block text-muted-foreground text-xs">{hint}</span>
			)}
			{error && (
				<span role="alert" className="block text-destructive text-sm">
					{error}
				</span>
			)}
		</label>
	);
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<UiInput {...props} className={cn("h-11 text-base", props.className)} />
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
	const message = (error as { message?: string }).message;
	return message && !message.startsWith("[") ? message : "Algo deu errado.";
}

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
