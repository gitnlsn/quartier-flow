# 04 — Delinquency Management

**Status:** Slice 1 implemented (Nov/2026); see [Remaining work](#remaining-work) · **Phase:** MVP · **Depends on:** 03, 17

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
> Superseded by the implementation (`Agreement`, `Charge.agreementId`,
> `BillingConfig.reminder*` in `prisma/schema.prisma`); kept for history.
> `CollectionStep` is still the starting point for our own reminders (item 6 below).

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

## Remaining work
Ordered by priority. Items 1–5 have no dependency on unbuilt features; 6 and 7 wait for
16 and 12.

### 1. Asaas end-to-end validation (no dependency)
**Why:** the Asaas side of slice 1 was only partly exercised on the sandbox. The entrada
boleto and the reminder sync were tested; deleting and restoring real payments were
not (the test charges were never on Asaas).
**To verify on the sandbox, fixing what breaks:**
- Acordo over charges that exist on Asaas: `DELETE /payments/{id}` on an `OVERDUE`
  payment succeeds, the `PAYMENT_DELETED` webhook leaves the charge `renegotiated`.
- Retry after a partial failure (one deletion fails): no duplicates, `pending` until done.
- Cancelling a `pending` acordo: `POST /payments/{id}/restore` brings the payment back
  as `OVERDUE` (or `PENDING`), and `PAYMENT_RESTORED` sets the matching status.
- A charge paid between "Propor acordo" and the deletion: clear error, acordo can be
  cancelled.
- Forgiving a charge that is on Asaas: deleted there, stays `forgiven` after the webhook.
- Asaas docs don't say which statuses can be deleted; record what the sandbox allows.

**Done when:** each case above has run on the sandbox, the results are written down
here, and any fix is committed.

### 2. Delinquency indicators (no dependency; overlaps 05)
**Why:** the module shows today's snapshot only. The síndico and the assembly want to
know if delinquency is getting better or worse.
**Sketch:**
- Aging of the overdue amount: 0–30, 31–60, 61–90, 90+ days (from `Charge.dueDate` of
  `overdue` charges; no schema change).
- Monthly delinquency rate for the last 12 months: units with a charge overdue at month
  end ÷ units. Reconstructed from charges: due before month end and not paid by then
  (`paidAt`), excluding `canceled`/`refunded`. Renegotiated charges count as overdue
  until their acordo's `createdAt`; forgiven ones until `forgivenAt`.
- Amount under acordo (active, late) and recovered through acordos.
- Optionally a shareable view for the conselho, without unit names (see LGPD below).

**Done when:** the Inadimplência module shows the aging and the 12-month chart, and
the numbers match a manual count on test data.

### 3. Legal collection workflow (no dependency)
**Why:** today the export is the last step. After that, the administradora tracks
extrajudicial/judicial collection outside the app.
**Sketch:**
- Per-unit collection case with a stage (`extrajudicial` → `judicial` → `closed`), who
  handles it (lawyer/office name), and a timeline of events: notices sent, acordos,
  forgiveness, payments, free-text notes, attachments (reuse expense attachments
  storage, `src/server/storage.ts`).
  ```prisma
  model CollectionCase {
    id            String    @id @default(cuid())
    condominiumId String
    unitId        String
    stage         String    // extrajudicial | judicial | closed
    handler       String?   // law office / lawyer
    openedAt      DateTime  @default(now())
    closedAt      DateTime?
    createdAt     DateTime  @default(now())
    updatedAt     DateTime  @updatedAt
    @@index([condominiumId])
    @@index([unitId])
  }
  model CollectionEvent {   // timeline, append-only
    id        String   @id @default(cuid())
    caseId    String
    kind      String   // note | notice | agreement | forgiveness | payment | stage
    text      String?
    fileKey   String?
    actorId   String?
    createdAt DateTime @default(now())
    @@index([caseId])
  }
  ```
- Unit "dossiê" export (PDF or CSV): debts with fine/interest estimate, acordos and
  their installments, reminders sent, timeline, payer CPF. Admin only, audited
  (`AuditLog`), like the current export.
- Badge on the unit in the Inadimplência list ("Em cobrança judicial").
- To evaluate: Asaas *negativação* (Serasa) through the API, as an extra paid
  step _(unverified: check the Asaas docs and fees)_.

**Done when:** a unit can be moved through the stages with notes and files, the
timeline shows the automatic events, and the dossiê downloads.

### 4. Edit an active acordo (no dependency)
**Why:** today changing an acordo takes two steps: "Encerrar" (the unbilled installments
become "Saldo do acordo encerrado") and then a new acordo over that saldo.
**Sketch:** one action, "Renegociar saldo", that does both in one go: archives the
current installments item, creates the saldo charge and a new acordo over it with the
new number of installments/amount, and links the two (`Agreement.replacesId`). Reuse
`breakAgreement` and `createAgreement` in `src/server/delinquency.ts`. The resident's
card shows only the current acordo.

**Done when:** an active acordo can be re-planned in one dialog, the history keeps both
acordos, and the totals don't double count.

### 5. Automatic end of an acordo (no dependency; off by default)
**Why:** some administradoras want a rule ("acordo quebra após 30 dias de atraso")
instead of deciding case by case. Slice 1 keeps it manual on purpose.
**Sketch:** `BillingConfig.agreementAutoBreakDays Int?` (null = off), set in
Configurações → Lembretes/Inadimplência. A daily cron (new `/api/cron/delinquency`, same
auth and `?date=` simulation as `/api/cron/billing`) calls `breakAgreement` with a
system actor when an installment or the entrada is overdue for more than N days.
Idempotent (only `active` acordos), audited with `actorUserId: null`. Notify the
administradora with `notify()` (16).

**Done when:** with the setting on, an acordo with an installment overdue past N days
is ended by the cron exactly once, and nothing happens with the setting off.

### 6. Our own reminders (16 slice 1 is in: inbox + email)
**Why:** Asaas reminders cost per message, are limited to 2 slots per side of the due
date, and are configured per payer (a payer in two condominiums gets the settings saved
last). With 16 we can send email (push later) ourselves via `notify()`.
**Sketch:**
- `BillingConfig.reminderSender = "asaas" | "app"`. When `app`, set
  `notificationDisabled: true` on the payer's Asaas customer (customer-level: affects
  every condominium the payer is in; switch per administradora, not per condominium,
  or accept the trade-off). Never both senders at once (17).
- Steps from the draft `CollectionStep` model above (any offset, channels per step),
  sent by a daily cron, idempotent through a unique (chargeId, stepId) delivery log.
- Escalation step (e.g. D+30) notifies the administradora/síndico, not the resident.
- Message templates must not expose the debt to anyone but the payer.

**Done when:** a condominium on `app` gets the configured reminders exactly once per
step and Asaas sends none.

### 7. Block voting for delinquent units (depends on 12)
**Why:** the Código Civil (art. 1.335, III) gives the vote to the owner who is "quite"
(up to date), and many convenções apply it.
**Sketch:** per-assembly option "Bloquear unidades inadimplentes" (like the common
areas' `blockDelinquent`), checked with `isDelinquent(unitId)` when the vote is cast;
the resident sees why they can't vote. Validate the rule with a lawyer (open question
above).

**Done when:** in an assembly with the option on, a delinquent unit can't vote and is
told why; with it off, it votes normally.

### Known limitations of slice 1
- Asaas reminders are per payer, not per condominium (see item 6).
- We don't collect phone numbers, so SMS/WhatsApp only reach payers whose Asaas
  customer has a phone; the others get email only.
- "Saldo do acordo encerrado" isn't on Asaas, so it can't be paid directly: it goes
  into a new acordo or is forgiven. A future "Emitir boleto do saldo" would fix that.
- The fine/interest shown when proposing an acordo is an estimate; Asaas computes the
  real value at payment.
- The resident isn't notified when an acordo is created or ended (needs 16, or a
  transactional email through `src/server/auth/messaging.ts`).
- Forgiveness can't be undone.
- Penalty rules (fine cap, interest) still need legal review before launch.
