# 04 — Delinquency Management

**Status:** Slice 1 implemented (Nov/2026) · **Phase:** MVP · **Depends on:** 03, 17

## Summary
Track units with overdue charges and run an automatic collection schedule (régua de
cobrança). Delinquency status is also used by other features to block privileges.

## Roles
- **Síndico / administradora:** configure the schedule, see the delinquency list,
  negotiate agreements.
- **Morador:** receive reminders, see what is owed, accept an installment agreement.

## User stories
- As a **síndico**, reminders go out automatically before and after due dates, so I
  don't have to chase residents personally.
- As a **síndico**, I see total delinquency and the list of overdue units at any time.
- As a **morador**, I'm reminded 3 days before my fee is due.
- As a **síndico**, I offer an installment agreement (acordo) and track its payments.

## Functional requirements
1. Configurable schedule: e.g. D-3 reminder, D+1, D+7, D+15 notices, D+30 escalation.
2. Channels per step: push, email, SMS (see 16). **Asaas can send these reminders
   itself** (email/SMS/WhatsApp, per-message fee). Pick one sender per condominium so
   residents never get duplicates (see 17).
3. Delinquency status per unit, driven by Asaas webhooks: `PAYMENT_OVERDUE` marks it,
   `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` clears it. A `confirmed` payment (paid,
   funds not yet available) already counts as paid.
4. Installment agreements that replace overdue charges with new ones, created on Asaas
   as an installment payment (`installmentCount`), with a carnê PDF.
5. Fine and interest are calculated by Asaas from the `fine` / `interest` sent with
   each charge (03); we don't compute them ourselves.
6. Exposed rule `isDelinquent(unitId)` for other features (06 reservations, 12 voting).
7. Export of the delinquency list for legal collection.

## Data model (draft)
```prisma
model CollectionStep {
  id            String   @id @default(cuid())
  condominiumId String
  offsetDays    Int      // negative = before due date
  channels      String[] // "push" | "email" | "sms"
  template      String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId])
}

model Agreement {
  id            String   @id @default(cuid())
  unitId        String
  originalChargeIds String[]
  installments  Int
  status        String   // "active" | "completed" | "broken"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([unitId])
}
```

## Platform & security considerations
- Scheduled jobs (daily cron) send the notices; must be idempotent so a re-run doesn't
  double-send.
- **Legal / ethical:** collection messages must not expose a resident's debt to other
  residents (no public lists). Only the síndico/administradora sees the list.
- Brazilian law limits penalties on condominium debt (e.g. fine cap); validate rules
  with a lawyer before launch.

## Open questions
- Which privileges can be blocked for delinquent units (reservations, voting)?
  This depends on each condominium's convenção and the law.

## Market references
- Condomob advertises automated delinquency management and a collection schedule
  ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-gestao-de-condominios)).
- Group COM's dashboard tracks delinquency ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-condominios/)).

## Implementation (slice 1, Nov/2026)
Decisions that change the draft above:
- **Acordos ride on the monthly charges** instead of an Asaas installment payment:
  the installments are a `UnitBillingItem` (`source: "agreement"`, recurrence
  `installments`) starting in the next month not yet sent, shown as "Acordo (2/6)"
  in the monthly boleto. One boleto (and one Asaas fee) per month, no carnê.
  An optional **entrada** is a standalone charge (`type: "agreement"`) issued at once.
- The renegotiated overdue charges are **deleted on Asaas** and get status
  `renegotiated` (the webhook never changes them again). Creation is two-step and
  retryable: `Agreement.status` stays `pending` until every deletion succeeded
  ("Tentar novamente"); a pending acordo can be cancelled, which restores the
  deleted payments on Asaas.
- **Broken acordos are not automatic.** An unpaid installment makes the monthly charge
  overdue, so the unit is delinquent again and the acordo shows "Em atraso"; the
  administradora decides to "Encerrar" it (no more installments; issued ones stay owed).
  "Concluído" / "Em atraso" are derived from the charges, not stored.
- **Reminders are sent by Asaas** (17), configured per condominium and applied to
  each payer's Asaas notifications (`BillingConfig.reminder*`,
  `PaymentCustomer.notificationsKey`), synced on save and before each boleto.
  Asaas has, per side of the due date, a **fixed** reminder (on the due date / when
  it becomes overdue: on/off only) and **one adjustable** one (5/10/15/30 days
  before; 1/7/15/30 days after); verified on the sandbox. SMS/WhatsApp only reach
  payers with a phone on Asaas (we don't collect phones yet), others get email.
- **Ending an acordo keeps the debt:** the installments never issued become one
  overdue charge "Saldo do acordo encerrado" (not on Asaas), so it stays in the totals,
  the export and `isDelinquent`, and can go to a new acordo or be forgiven.
- **Forgiveness ("Perdoar cobranças"):** the administradora writes off overdue charges
  with a required reason (e.g. a unit whose payer left). Each is deleted on Asaas and
  gets status `forgiven` with `forgivenAt/By/Reason` (shown in Histórico) plus an
  `AuditLog` entry (`charge.forgive`). Not reversible.
- **Permissions:** administradora admins act (acordos, forgiveness, reminders, export); the síndico
  sees the module read-only. Residents never see the list.

What exists:
- `isDelinquent(unitId)` in `src/server/delinquency.ts` (used by reservations, 06).
- Module **Inadimplência** (`/painel/condominios/[id]/inadimplencia`): totals, overdue
  units (days late, payer), acordos with progress, "Propor acordo" dialog with a
  fine/interest estimate (Asaas computes the real value), CSV export with full CPF for
  legal collection (admin only, logged in `AuditLog` as `delinquency.export`).
- Settings → **Lembretes de pagamento**.
- Residents: "Seu acordo" card in Minhas cobranças (progress, remaining, entrada link).
- Code: `src/server/delinquency.ts`, `src/server/api/routers/delinquency.ts`,
  `src/server/asaas/notifications.ts`, `src/lib/delinquency.ts`.

- Acordo installments (and reservation fees) can't be edited or removed in Cobranças →
  Itens individuais; they link to their module instead.
- New items (acordo, reservation fee) never start in a month whose due date has
  passed or whose run was already sent (`nextOpenPeriod`), so no installment is lost.

Not yet: our own reminders through 16 (push), automatic break after N days, blocking
voting (12), editing an active acordo, legal-collection workflow beyond the export.
