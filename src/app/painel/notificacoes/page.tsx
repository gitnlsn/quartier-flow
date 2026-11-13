"use client";

import { cn } from "cn";
import { CheckCheck, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { buttonVariants } from "~/components/ui/button";
import { PREFERENCES_PATH } from "~/lib/notifications";
import { api } from "~/trpc/react";
import {
	Button,
	EmptyState,
	ErrorMessage,
	Loading,
	PageTitle,
	errorMessage,
} from "../_components/ui";

const relative = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
const dateTime = new Intl.DateTimeFormat("pt-BR", {
	dateStyle: "short",
	timeStyle: "short",
	timeZone: "America/Sao_Paulo",
});

/** "há 5 minutos", "ontem"... up to a week, then the date. */
function when(date: Date) {
	const seconds = Math.round((date.getTime() - Date.now()) / 1000);
	const abs = Math.abs(seconds);
	if (abs < 60) return "agora";
	if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
	if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
	if (abs < 7 * 86_400)
		return relative.format(Math.round(seconds / 86_400), "day");
	return dateTime.format(date);
}

/** Inbox with every notification the user received (docs/features/16). */
export default function NotificationsPage() {
	const router = useRouter();
	const utils = api.useUtils();
	const list = api.notification.list.useInfiniteQuery(
		{},
		{ getNextPageParam: (page) => page.nextCursor },
	);
	const refresh = () =>
		Promise.all([
			utils.notification.list.invalidate(),
			utils.notification.unreadCount.invalidate(),
		]);
	const markRead = api.notification.markRead.useMutation({
		onSuccess: refresh,
	});
	const markAll = api.notification.markAllRead.useMutation({
		onSuccess: refresh,
	});

	const items = list.data?.pages.flatMap((p) => p.items) ?? [];
	const hasUnread = items.some((n) => !n.readAt);

	const open = (n: (typeof items)[number]) => {
		if (!n.readAt) markRead.mutate({ id: n.id });
		if (n.url) router.push(n.url);
	};

	return (
		<div className="space-y-6">
			<PageTitle
				title="Notificações"
				subtitle="Avisos sobre suas reservas, cobranças e o seu condomínio."
				actions={
					<>
						{hasUnread && (
							<Button
								variant="outline"
								pending={markAll.isPending}
								onClick={() => markAll.mutate()}
							>
								<CheckCheck aria-hidden />
								Marcar todas como lidas
							</Button>
						)}
						<a
							href={PREFERENCES_PATH}
							className={buttonVariants({ variant: "outline", size: "lg" })}
						>
							<Settings2 aria-hidden />
							Preferências
						</a>
					</>
				}
			/>

			<ErrorMessage message={errorMessage(list.error ?? markAll.error)} />

			{list.isLoading ? (
				<Loading />
			) : items.length === 0 ? (
				<EmptyState title="Nenhuma notificação por enquanto">
					Quando houver novidades sobre suas reservas, cobranças ou o
					condomínio, elas aparecem aqui.
				</EmptyState>
			) : (
				<ul className="divide-y overflow-hidden rounded-lg border bg-card">
					{items.map((n) => (
						<li key={n.id}>
							<button
								type="button"
								onClick={() => open(n)}
								className={cn(
									"flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted",
									!n.readAt && "bg-muted/40",
								)}
							>
								<span
									aria-hidden
									className={cn(
										"mt-2 size-2.5 shrink-0 rounded-full",
										n.readAt ? "bg-transparent" : "bg-primary",
									)}
								/>
								<span className="min-w-0 flex-1 space-y-1">
									<span className="flex items-baseline justify-between gap-3">
										<span
											className={cn(
												"text-base",
												n.readAt ? "font-medium" : "font-semibold",
											)}
										>
											{n.title}
											{!n.readAt && (
												<span className="sr-only"> (não lida)</span>
											)}
										</span>
										<time
											dateTime={n.createdAt.toISOString()}
											title={dateTime.format(n.createdAt)}
											className="shrink-0 text-muted-foreground text-xs"
										>
											{when(n.createdAt)}
										</time>
									</span>
									<span className="block whitespace-pre-line text-muted-foreground text-sm">
										{n.body}
									</span>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}

			{list.hasNextPage && (
				<div className="flex justify-center">
					<Button
						variant="outline"
						pending={list.isFetchingNextPage}
						onClick={() => list.fetchNextPage()}
					>
						Ver mais antigas
					</Button>
				</div>
			)}
		</div>
	);
}
