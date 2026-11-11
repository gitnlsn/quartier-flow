# 20 — Condominium Workspace Navigation

**Status:** Implemented (Nov/2026) · **Phase:** MVP (cross-cutting) · **Depends on:** 19

## Summary
Administradora admins and síndicos pick a condominium once, in a switcher at the top of
the sidebar; the sidebar then lists that condominium's **modules**, grouped by area.
This replaces the condominium page's tabs, which did not scale to the roadmap
(04–15 add about twelve more areas per condominium).

## Structure
```
▾ Condomínio (switcher)        ← search when > 8; "Todos os condomínios"
Visão geral                    /painel/condominios/[id]
FINANCEIRO
  Cobranças                    …/cobrancas  (Mês atual · Acompanhamento · Histórico)
  Despesas                     …/despesas
CADASTRO
  Unidades e moradores         …/unidades
  Configurações                …/configuracoes
MINHA ÁREA                     Início, Minhas cobranças
ADMINISTRADORA                 Todos os condomínios, Plano, Conta de recebimento
```
Planned modules slot into the groups: Financeiro (Inadimplência 04, Balancetes 05),
Comunidade (Avisos 07, Assembleias 12, Documentos 13), Operação (Chamados 08,
Ocorrências 09, Portaria 10/11, Reservas 06 when the add-on is active, Fornecedores 14,
Agenda 15).

## Rules
- The condominium is always in the URL (shareable links, back button, notification
  deep links). The last one opened is remembered (`qf_condo` cookie) so pages outside
  a condominium (Plano, Início) keep its modules in the sidebar.
- Switching condominium keeps the current module; a page about one record (a billing
  run) falls back to its module's list.
- Every module page shows its name and the condominium's name, so it is always clear
  which building an action applies to.
- Old `?aba=` links redirect to the module routes.
- Residents have no switcher (they don't manage condominiums yet).

## Adding a module
1. Add it to `CondoModule` / `SUFFIX` in `src/app/painel/_components/condo-nav.ts`.
2. Add a route folder under `src/app/painel/condominios/[id]/` whose page uses
   `useCondo()` (loaded once by the `[id]` layout).
3. Add the item to its group in `buildGroups` (`app-shell.tsx`).

## Next
- Portfolio views under "Todos os condomínios" for Cobranças, Inadimplência and Chamados.
