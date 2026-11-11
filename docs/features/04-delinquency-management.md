# 04 — Delinquency Management

**Status:** Proposed · **Phase:** MVP · **Depends on:** 03, 17

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
