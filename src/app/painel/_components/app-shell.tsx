"use client";

import { cn } from "cn";
import {
	Building2,
	CalendarDays,
	Check,
	ChevronsUpDown,
	ClipboardCheck,
	CreditCard,
	FileText,
	Home,
	Landmark,
	LayoutDashboard,
	LayoutGrid,
	LifeBuoy,
	LogOut,
	Menu,
	Receipt,
	ReceiptText,
	Settings,
	Users,
	Wallet,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { Button } from "~/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Separator } from "~/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "~/components/ui/sheet";
import { authClient } from "~/lib/auth-client";
import {
	CONDO_BASE,
	type ResidentUnit,
	condoPath,
	parseCondoPath,
	switchPath,
} from "./condo-nav";
import { UnitProvider, UnitSwitcher, useSelectedUnit } from "./unit-context";

type NavItem = {
	href: string;
	label: string;
	icon: ReactNode;
	exact?: boolean;
	/** Opens in a new tab (pages outside the app, e.g. /ajuda). */
	external?: boolean;
};
type NavGroup = {
	title?: string;
	/** Shown under the title (the unit picker of "Minha área"). */
	header?: ReactNode;
	items: NavItem[];
};
type CondoOption = { id: string; name: string };

/**
 * Sidebar groups. With a condominium selected, its modules come first,
 * grouped by area (docs/features/20); then the personal area and, for
 * administradora admins, the company-level pages.
 */
function buildGroups(
	isAdmin: boolean,
	adminNeedsPlan: boolean,
	hasPlatformBilling: boolean,
	/** Unit picker when the user lives somewhere ("Minha área" belongs to it). */
	unitPicker: ReactNode,
	hasReservations: boolean,
	condoId: string | null,
): NavGroup[] {
	const groups: NavGroup[] = [];
	if (condoId) {
		groups.push(
			{
				items: [
					{
						href: condoPath(condoId),
						label: "Visão geral",
						icon: <LayoutDashboard />,
						exact: true,
					},
				],
			},
			{
				title: "Financeiro",
				items: [
					{
						href: condoPath(condoId, "cobrancas"),
						label: "Cobranças",
						icon: <ReceiptText />,
					},
					{
						href: condoPath(condoId, "despesas"),
						label: "Despesas",
						icon: <Wallet />,
					},
				],
			},
			{
				title: "Operação",
				items: [
					{
						href: condoPath(condoId, "reservas"),
						label: "Reservas",
						icon: <CalendarDays />,
					},
				],
			},
			{
				title: "Cadastro",
				items: [
					{
						href: condoPath(condoId, "unidades"),
						label: "Unidades e moradores",
						icon: <Users />,
					},
					{
						href: condoPath(condoId, "config"),
						label: "Configurações",
						icon: <Settings />,
					},
				],
			},
		);
	}
	groups.push({
		title: "Minha área",
		header: unitPicker,
		items: [
			{ href: "/painel", label: "Início", icon: <Home />, exact: true },
			{
				href: "/painel/cobrancas",
				label: "Minhas cobranças",
				icon: <Receipt />,
			},
			// The selected unit's condominium has the reservations module on.
			...(hasReservations
				? [
						{
							href: "/painel/reservas",
							label: "Reservar área comum",
							icon: <CalendarDays />,
						},
					]
				: []),
		],
	});
	// Not about a unit: platform invoices and help.
	groups.push({
		items: [
			// Kept after the administradora is closed: last invoices stay payable.
			...(hasPlatformBilling
				? [
						{
							href: "/painel/faturas",
							label: "Faturas do Quartier Flow",
							icon: <FileText />,
						},
					]
				: []),
			{
				href: "/ajuda",
				label: "Ajuda",
				icon: <LifeBuoy />,
				external: true,
			},
		],
	});
	if (isAdmin && adminNeedsPlan) {
		// Registered an administradora but hasn't signed a plan yet.
		groups.push({
			title: "Administradora",
			items: [
				{
					href: "/painel/comecar",
					label: "Concluir cadastro",
					icon: <ClipboardCheck />,
				},
			],
		});
	} else if (isAdmin) {
		groups.push({
			title: "Administradora",
			items: [
				{
					href: CONDO_BASE,
					label: "Todos os condomínios",
					icon: <LayoutGrid />,
					exact: true,
				},
				{ href: "/painel/plano", label: "Plano", icon: <CreditCard /> },
				{
					href: "/painel/onboarding",
					label: "Conta de recebimento",
					icon: <Landmark />,
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
				<div key={group.title ?? group.items[0]?.href} className="space-y-1">
					{group.title && (
						<p className="px-3 font-medium text-muted-foreground text-xs uppercase tracking-wide">
							{group.title}
						</p>
					)}
					{group.header && <div className="pt-1 pb-2">{group.header}</div>}
					{group.items.map((item) => {
						const active = isActive(pathname, item);
						return (
							<a
								key={item.href}
								href={item.href}
								{...(item.external && { target: "_blank", rel: "noreferrer" })}
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

/**
 * Picks the condominium the modules act on. Switching keeps the current
 * module, so an administradora can compare Despesas across buildings.
 */
function CondoSwitcher({
	condos,
	activeId,
	showAll,
	className,
}: {
	condos: CondoOption[];
	activeId: string | null;
	showAll: boolean;
	className?: string;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [filter, setFilter] = useState("");
	const active = condos.find((c) => c.id === activeId);
	const query = filter.trim().toLocaleLowerCase("pt-BR");
	const visible = query
		? condos.filter((c) => c.name.toLocaleLowerCase("pt-BR").includes(query))
		: condos;

	return (
		<DropdownMenu onOpenChange={(open) => !open && setFilter("")}>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex min-h-11 w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm shadow-xs hover:bg-muted",
						className,
					)}
				>
					<Building2 className="size-4 shrink-0" aria-hidden />
					<span className="min-w-0 flex-1">
						<span className="block text-muted-foreground text-xs">
							Condomínio
						</span>
						<span className="block truncate font-medium">
							{active?.name ?? "Escolha um condomínio"}
						</span>
					</span>
					<ChevronsUpDown
						className="size-4 shrink-0 text-muted-foreground"
						aria-hidden
					/>
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="app max-h-[70vh] w-(--radix-dropdown-menu-trigger-width) min-w-64 overflow-y-auto"
			>
				{condos.length > 8 && (
					<div className="p-1">
						<input
							value={filter}
							onChange={(e) => setFilter(e.target.value)}
							// Typing must not trigger the menu's type-ahead.
							onKeyDown={(e) => e.stopPropagation()}
							placeholder="Buscar condomínio"
							aria-label="Buscar condomínio"
							className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
						/>
					</div>
				)}
				<DropdownMenuLabel>Condomínios</DropdownMenuLabel>
				{visible.map((condo) => (
					<DropdownMenuItem
						key={condo.id}
						className="min-h-10"
						onSelect={() => router.push(switchPath(pathname, condo.id))}
					>
						<span className="flex-1 truncate">{condo.name}</span>
						{condo.id === activeId && <Check aria-hidden />}
					</DropdownMenuItem>
				))}
				{visible.length === 0 && (
					<p className="px-2 py-2 text-muted-foreground text-sm">
						Nenhum condomínio encontrado.
					</p>
				)}
				{showAll && (
					<>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							className="min-h-10"
							onSelect={() => router.push(CONDO_BASE)}
						>
							<LayoutGrid aria-hidden />
							Todos os condomínios
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
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
 * Administradora admins and síndicos pick a condominium in the switcher;
 * the sidebar then lists that condominium's modules.
 */
type ShellProps = {
	children: ReactNode;
	userName: string;
	userEmail: string;
	contextName: string | null;
	isAdmin: boolean;
	adminNeedsPlan: boolean;
	/** Admin(ned) an administradora that signed a plan (docs/features/18). */
	hasPlatformBilling: boolean;
	isSindico: boolean;
	/** Condominiums the user can open (managed, síndico, or closed archive). */
	condos: CondoOption[];
	lastCondoId: string | null;
};

export function AppShell({
	units,
	selectedUnitId,
	...props
}: ShellProps & {
	/** Units the user lives in; "Minha área" shows one at a time. */
	units: ResidentUnit[];
	selectedUnitId: string | null;
}) {
	return (
		<UnitProvider units={units} selectedId={selectedUnitId}>
			<Shell {...props} />
		</UnitProvider>
	);
}

function Shell({
	children,
	userName,
	userEmail,
	contextName,
	isAdmin,
	adminNeedsPlan,
	hasPlatformBilling,
	isSindico,
	condos,
	lastCondoId,
}: ShellProps) {
	const pathname = usePathname();
	const { selected: selectedUnit } = useSelectedUnit();
	const [menuOpen, setMenuOpen] = useState(false);

	// The condominium in the URL wins; elsewhere, reopen the last one used.
	const fromUrl = parseCondoPath(pathname)?.condominiumId;
	const known = (id: string | null | undefined) =>
		id && condos.some((c) => c.id === id) ? id : null;
	const activeCondoId =
		known(fromUrl) ?? known(lastCondoId) ?? condos[0]?.id ?? null;
	const hasCondos = condos.length > 0;

	const groups = buildGroups(
		isAdmin,
		adminNeedsPlan,
		hasPlatformBilling,
		selectedUnit ? <UnitSwitcher /> : null,
		Boolean(selectedUnit?.reservationsEnabled),
		hasCondos ? activeCondoId : null,
	);
	const switcher = hasCondos ? (
		<CondoSwitcher
			condos={condos}
			activeId={activeCondoId}
			showAll={isAdmin || condos.length > 1}
		/>
	) : null;
	const tabs: NavItem[] = [
		{ href: "/painel", label: "Início", icon: <Home />, exact: true },
		{ href: "/painel/cobrancas", label: "Cobranças", icon: <Receipt /> },
	];

	const brand = (
		<a href="/painel" className="block min-w-0">
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
				<div className="mb-4 px-3">{brand}</div>
				{switcher && <div className="mb-6">{switcher}</div>}
				<div className="flex-1 overflow-y-auto">
					<NavLinks groups={groups} />
				</div>
				<Separator className="my-4" />
				{user}
				<SignOut className="mt-2 w-full" />
			</aside>

			{/* Mobile top bar: brand and, for managers, the condominium switcher */}
			<header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur md:hidden">
				{brand}
				{switcher ? (
					<div className="w-1/2 max-w-56 shrink-0">{switcher}</div>
				) : (
					// Residents only: their unit takes the switcher's place.
					selectedUnit && (
						<div className="w-1/2 max-w-56 shrink-0">
							<UnitSwitcher />
						</div>
					)
				)}
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
