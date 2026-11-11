"use client";

import { cn } from "cn";
import {
	Building2,
	CreditCard,
	Home,
	Landmark,
	LogOut,
	Menu,
	Receipt,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { authClient } from "~/lib/auth-client";

type NavItem = {
	href: string;
	label: string;
	icon: ReactNode;
	exact?: boolean;
};
type NavGroup = { title: string; items: NavItem[] };

function buildGroups(isAdmin: boolean, isSindico: boolean): NavGroup[] {
	const groups: NavGroup[] = [
		{
			title: "Minha área",
			items: [
				{ href: "/painel", label: "Início", icon: <Home />, exact: true },
				{
					href: "/painel/cobrancas",
					label: "Minhas cobranças",
					icon: <Receipt />,
				},
			],
		},
	];
	if (isAdmin) {
		groups.push({
			title: "Administradora",
			items: [
				{
					href: "/painel/condominios",
					label: "Condomínios",
					icon: <Building2 />,
				},
				{ href: "/painel/plano", label: "Plano", icon: <CreditCard /> },
				{
					href: "/painel/onboarding",
					label: "Conta de recebimento",
					icon: <Landmark />,
				},
			],
		});
	} else if (isSindico) {
		groups.push({
			title: "Síndico",
			items: [
				{
					href: "/painel/condominios",
					label: "Meus condomínios",
					icon: <Building2 />,
				},
			],
		});
	}
	return groups;
}

function isActive(pathname: string, item: NavItem) {
	return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

function NavLinks({
	groups,
	onNavigate,
}: {
	groups: NavGroup[];
	onNavigate?: () => void;
}) {
	const pathname = usePathname();
	return (
		<nav className="space-y-6">
			{groups.map((group) => (
				<div key={group.title} className="space-y-1">
					<p className="px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
						{group.title}
					</p>
					{group.items.map((item) => {
						const active = isActive(pathname, item);
						return (
							<a
								key={item.href}
								href={item.href}
								onClick={onNavigate}
								aria-current={active ? "page" : undefined}
								className={cn(
									"flex items-center gap-3 rounded-md px-3 py-2.5 font-medium text-sm transition-colors [&_svg]:size-4",
									active
										? "bg-primary text-primary-foreground"
										: "text-foreground hover:bg-muted",
								)}
							>
								{item.icon}
								{item.label}
							</a>
						);
					})}
				</div>
			))}
		</nav>
	);
}

function SignOut({ className }: { className?: string }) {
	const router = useRouter();
	const [pending, setPending] = useState(false);
	return (
		<Button
			variant="ghost"
			className={cn("justify-start", className)}
			disabled={pending}
			onClick={async () => {
				setPending(true);
				await authClient.signOut();
				router.replace("/entrar");
				router.refresh();
			}}
		>
			<LogOut aria-hidden />
			{pending ? "Saindo..." : "Sair"}
		</Button>
	);
}

/**
 * App frame for every user: sidebar on desktop; on phones a top bar and a
 * bottom tab bar with the resident essentials, plus "Mais" for the rest.
 */
export function AppShell({
	children,
	userName,
	userEmail,
	contextName,
	isAdmin,
	isSindico,
}: {
	children: ReactNode;
	userName: string;
	userEmail: string;
	contextName: string | null;
	isAdmin: boolean;
	isSindico: boolean;
}) {
	const pathname = usePathname();
	const [menuOpen, setMenuOpen] = useState(false);
	const groups = buildGroups(isAdmin, isSindico);
	const tabs: NavItem[] = [
		{ href: "/painel", label: "Início", icon: <Home />, exact: true },
		{ href: "/painel/cobrancas", label: "Cobranças", icon: <Receipt /> },
	];

	const brand = (
		<a href="/painel" className="block">
			<span className="font-bold font-sans text-lg tracking-tight">
				Quartier Flow
			</span>
			{contextName && (
				<span className="block truncate text-muted-foreground text-xs">
					{contextName}
				</span>
			)}
		</a>
	);

	const user = (
		<div className="min-w-0 px-3">
			<p className="truncate font-medium text-sm">{userName || userEmail}</p>
			<p className="truncate text-muted-foreground text-xs">{userEmail}</p>
		</div>
	);

	return (
		<div className="app min-h-screen">
			{/* Desktop sidebar */}
			<aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r bg-card p-4 md:flex">
				<div className="mb-8 px-3">{brand}</div>
				<div className="flex-1 overflow-y-auto">
					<NavLinks groups={groups} />
				</div>
				<Separator className="my-4" />
				{user}
				<SignOut className="mt-2 w-full" />
			</aside>

			{/* Mobile top bar */}
			<header className="sticky top-0 z-30 flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur md:hidden">
				{brand}
			</header>

			<main className="px-4 pt-6 pb-28 md:ml-64 md:px-8 md:pt-10 md:pb-10">
				<div className="mx-auto max-w-5xl">{children}</div>
			</main>

			{/* Mobile bottom tab bar */}
			<nav
				aria-label="Navegação principal"
				className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
			>
				{tabs.map((tab) => {
					const active = isActive(pathname, tab);
					return (
						<a
							key={tab.href}
							href={tab.href}
							aria-current={active ? "page" : undefined}
							className={cn(
								"flex flex-col items-center gap-1 py-2.5 font-medium text-xs [&_svg]:size-5",
								active ? "text-foreground" : "text-muted-foreground",
							)}
						>
							{tab.icon}
							{tab.label}
						</a>
					);
				})}
				<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
					<SheetTrigger asChild>
						<button
							type="button"
							className="flex flex-col items-center gap-1 py-2.5 font-medium text-muted-foreground text-xs [&_svg]:size-5"
						>
							<Menu />
							Mais
						</button>
					</SheetTrigger>
					<SheetContent side="bottom" className="app max-h-[85vh] rounded-t-xl">
						<SheetHeader>
							<SheetTitle>Menu</SheetTitle>
						</SheetHeader>
						<div className="space-y-4 overflow-y-auto px-4 pb-6">
							<NavLinks groups={groups} onNavigate={() => setMenuOpen(false)} />
							<Separator />
							{user}
							<SignOut className="w-full" />
						</div>
					</SheetContent>
				</Sheet>
			</nav>
		</div>
	);
}
