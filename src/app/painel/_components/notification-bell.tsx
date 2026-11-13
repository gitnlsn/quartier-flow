"use client";

import { cn } from "cn";
import { Bell } from "lucide-react";
import { usePathname } from "next/navigation";

import { api } from "~/trpc/react";

/** Link to the inbox with the unread count (docs/features/16). */
export function NotificationBell({ className }: { className?: string }) {
	const pathname = usePathname();
	const unread = api.notification.unreadCount.useQuery(undefined, {
		refetchInterval: 60_000,
		refetchOnWindowFocus: true,
	});
	const count = unread.data ?? 0;
	const active = pathname.startsWith("/painel/notificacoes");
	return (
		<a
			href="/painel/notificacoes"
			aria-label={
				count > 0 ? `Notificações: ${count} não lidas` : "Notificações"
			}
			aria-current={active ? "page" : undefined}
			className={cn(
				"relative inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-muted [&_svg]:size-5",
				active && "bg-muted",
				className,
			)}
		>
			<Bell aria-hidden />
			{count > 0 && (
				<span
					aria-hidden
					className="absolute top-1.5 right-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-destructive px-1 font-semibold text-[10px] text-white leading-none"
				>
					{count > 9 ? "9+" : count}
				</span>
			)}
		</a>
	);
}
