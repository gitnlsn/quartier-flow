"use client";

import { cn } from "cn";
import { Check, ChevronsUpDown, Home } from "lucide-react";
import { type ReactNode, createContext, useContext, useState } from "react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { type ResidentUnit, SELECTED_UNIT_COOKIE } from "./condo-nav";

type UnitState = {
	units: ResidentUnit[];
	selected: ResidentUnit | null;
	select: (id: string) => void;
};

const UnitContext = createContext<UnitState>({
	units: [],
	selected: null,
	select: () => {},
});

export function UnitProvider({
	units,
	selectedId,
	children,
}: {
	units: ResidentUnit[];
	selectedId: string | null;
	children: ReactNode;
}) {
	const [current, setCurrent] = useState(selectedId);
	const selected =
		units.find((u) => u.id === current) ??
		units.find((u) => u.id === selectedId) ??
		units[0] ??
		null;

	function select(id: string) {
		setCurrent(id);
		// Preference only: the layout reads it to reopen this unit next time.
		document.cookie = `${SELECTED_UNIT_COOKIE}=${id}; path=/painel; max-age=31536000; samesite=lax`;
	}

	return (
		<UnitContext.Provider value={{ units, selected, select }}>
			{children}
		</UnitContext.Provider>
	);
}

export const useSelectedUnit = () => useContext(UnitContext);

/** Unit picker at the head of "Minha área" (static when there's only one). */
export function UnitSwitcher({ className }: { className?: string }) {
	const { units, selected, select } = useSelectedUnit();
	if (!selected) return null;

	const face = (
		<>
			<Home className="size-4 shrink-0" aria-hidden />
			<span className="min-w-0 flex-1">
				<span className="block truncate font-medium">
					Unidade {selected.label}
				</span>
				<span className="block truncate text-muted-foreground text-xs">
					{selected.condominiumName}
				</span>
			</span>
		</>
	);
	const box =
		"flex min-h-11 w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-left text-sm";

	if (units.length === 1)
		return <div className={cn(box, className)}>{face}</div>;

	// Group by condominium so "101" in two buildings can't be confused.
	const byCondo = new Map<string, ResidentUnit[]>();
	for (const unit of units) {
		byCondo.set(unit.condominiumName, [
			...(byCondo.get(unit.condominiumName) ?? []),
			unit,
		]);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					aria-label={`Unidade selecionada: ${selected.label}, ${selected.condominiumName}. Trocar unidade`}
					className={cn(box, "shadow-xs hover:bg-muted", className)}
				>
					{face}
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
				{[...byCondo].map(([condoName, condoUnits]) => (
					<div key={condoName}>
						<DropdownMenuLabel className="truncate">
							{condoName}
						</DropdownMenuLabel>
						{condoUnits.map((unit) => (
							<DropdownMenuItem
								key={unit.id}
								className="min-h-10"
								onSelect={() => select(unit.id)}
							>
								<span className="flex-1 truncate">Unidade {unit.label}</span>
								{unit.id === selected.id && <Check aria-hidden />}
							</DropdownMenuItem>
						))}
					</div>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
