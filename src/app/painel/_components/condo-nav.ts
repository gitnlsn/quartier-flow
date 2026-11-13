/**
 * Condominium workspace navigation (docs/features/20).
 *
 * The condominium is chosen once in the sidebar switcher; each module is a
 * route under /painel/condominios/[id]. New roadmap modules add an entry here
 * and a route folder, never another tab.
 */

export type CondoModule =
	| "visao"
	| "cobrancas"
	| "acompanhamento"
	| "historico"
	| "despesas"
	| "balancetes"
	| "inadimplencia"
	| "reservas"
	| "areas"
	| "unidades"
	| "config";

const SUFFIX: Record<CondoModule, string> = {
	visao: "",
	cobrancas: "/cobrancas",
	acompanhamento: "/cobrancas/acompanhamento",
	historico: "/cobrancas/historico",
	despesas: "/despesas",
	balancetes: "/balancetes",
	inadimplencia: "/inadimplencia",
	reservas: "/reservas",
	areas: "/reservas/areas",
	unidades: "/unidades",
	config: "/configuracoes",
};

export const CONDO_BASE = "/painel/condominios";

export const condoPath = (
	condominiumId: string,
	module: CondoModule = "visao",
) => `${CONDO_BASE}/${condominiumId}${SUFFIX[module]}`;

/** Old `?aba=` values of the tabbed page, redirected to their module route. */
export const LEGACY_TABS: Record<string, CondoModule> = {
	visao: "visao",
	unidades: "unidades",
	moradores: "unidades",
	cobrancas: "cobrancas",
	acompanhamento: "acompanhamento",
	historico: "historico",
	despesas: "despesas",
	config: "config",
};

/** Splits /painel/condominios/<id>/<rest> (null outside a condominium). */
export function parseCondoPath(pathname: string) {
	const match = pathname.match(/^\/painel\/condominios\/([^/]+)(\/.*)?$/);
	if (!match?.[1]) return null;
	return { condominiumId: match[1], rest: match[2] ?? "" };
}

/**
 * Where the switcher goes for another condominium: the same module, except
 * pages about one record (a billing run) fall back to their module's list.
 */
export function switchPath(pathname: string, condominiumId: string) {
	const current = parseCondoPath(pathname);
	if (!current) return condoPath(condominiumId);
	const [, module = "", sub = ""] = current.rest.split("/");
	if (module === "cobrancas") {
		const keep = sub === "acompanhamento" || sub === "historico";
		return `${CONDO_BASE}/${condominiumId}/cobrancas${keep ? `/${sub}` : ""}`;
	}
	if (module === "reservas") {
		return `${CONDO_BASE}/${condominiumId}/reservas${sub === "areas" ? "/areas" : ""}`;
	}
	return `${CONDO_BASE}/${condominiumId}${module ? `/${module}` : ""}`;
}

/** Cookie with the last condominium opened, so the sidebar reopens it. */
export const LAST_CONDO_COOKIE = "qf_condo";

/**
 * The unit "Minha área" belongs to. A resident can live in (or pay for) more
 * than one unit, even in different condominiums: they pick one in the
 * sidebar and Início, Minhas cobranças and Reservas show only that unit.
 */
export type ResidentUnit = {
	id: string;
	/** "A · 101" or "101" */
	label: string;
	condominiumId: string;
	condominiumName: string;
	reservationsEnabled: boolean;
};

/** Cookie with the selected unit (a preference; read by the painel layout). */
export const SELECTED_UNIT_COOKIE = "qf_unit";
