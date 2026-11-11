# 18 — Platform Billing (Quartier Flow's own revenue)

**Status:** Partially implemented (plan choice, monthly invoices, closing — Nov/2026) · **Phase:** MVP · **Depends on:** 02, 17, 19

## Summary
Quartier Flow charges each **administradora** monthly, from our main Asaas account (17).
The bill has two parts:

1. **Seats:** number of **residents** and **síndicos** in the administradora's account.
2. **Feature add-ons:** a monthly fee per paid feature in use, e.g. common area
   reservations (06).

Resident payments (condominium fees etc.) are **not** our revenue: they're split to the
administradora (17).

## Roles
- **Quartier Flow (us):** define plans, seat prices and add-on prices; see revenue.
- **Administradora:** see its plan, seat count, active add-ons, invoices and payment
  status in the manager area (19).

## User stories
- As an **administradora**, I see how many seats I'm paying for and why the amount
  changed this month.
- As an **administradora**, I turn on reservations for a condominium and see the add-on
  on my next invoice.
- As **Quartier Flow**, I see monthly recurring revenue per administradora.

## Functional requirements
1. **Seat counting:** active residents and síndicos per administradora. Define the rule
   precisely before launch: count at a fixed moment (e.g. invoice date) or the
   month's peak? Do invited-but-never-signed-in users count? Is a person in two
   condominiums one seat or two?
2. **Price table:** price per resident seat, per síndico seat (can differ), per add-on;
   optional minimum monthly fee and volume tiers.
3. **Add-on scope:** per administradora or per condominium (e.g. reservations enabled
   only in some buildings). Decide which.
4. **Monthly invoice:** on the billing day, compute seats + add-ons, save a snapshot of
   the calculation, and create one Asaas payment (boleto/Pix) from our main account
   with the administradora as customer. Individual monthly payments, not an Asaas
   subscription, because the amount varies.
5. **Overdue handling:** grace period, then restrict the manager area (19) and new
   features. **Never block residents** from seeing and paying their own condominium
   charges.
6. **Proration** when add-ons are enabled mid-month (decide: prorate or charge from
   next cycle).
7. Revenue report per administradora.

## Data model (draft)
```prisma
model Plan {
  id                 String   @id @default(cuid())
  name               String
  residentSeatCents  Int
  sindicoSeatCents   Int
  minimumMonthlyCents Int     @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt
}

model AddOn {
  id           String   @id @default(cuid())
  key          String   @unique // "reservations", …
  monthlyCents Int
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model AddOnActivation {
  id               String    @id @default(cuid())
  administradoraId String
  condominiumId    String?   // null = whole administradora
  addOnId          String
  startedAt        DateTime  @default(now())
  endedAt          DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  @@index([administradoraId])
}

model PlatformInvoice {
  id               String   @id @default(cuid())
  administradoraId String
  periodStart      DateTime
  periodEnd        DateTime
  residentSeats    Int
  sindicoSeats     Int
  lines            Json     // snapshot: seats, add-ons, prices
  totalCents       Int
  asaasPaymentId   String?  @unique
  status           String   // "draft" | "pending" | "paid" | "overdue" | "canceled"
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([administradoraId, periodStart])
}
```

## Decided (Nov/2026)
- **No free period:** billing starts in the month the plan is signed.
- **Calendar month:** invoice on the 1st for the previous month, by residents and
  síndicos active on its last day; **first invoice prorated** by days since signing.
  Sent by email with boleto/Pix, **due on the 10th**. Plan changes apply from the next
  invoice. Overdue: manager area may be restricted, residents never.
- **Minimum:** invoices below R$ 5,00 (Asaas minimum for boleto/Pix) are recorded as `waived`, nothing to pay.
- **Closing (self-service, replaces "cancel via contact"):** in Plano, effective immediately.
  The month of closing is billed for the days used (seats on the closing day) on the 1st;
  no invoices after that. Issued invoices stay payable forever in "Faturas do Quartier Flow".
- Stated in Termos de Uso 8.1–8.3 (`src/lib/terms.ts`) and shown before signing
  (`src/lib/onboarding.ts`). Text to be reviewed by a lawyer.

## Open questions
- Prices, seat rule and add-on scope (requirements 1–3, 6).
- Do we also take a fee on resident payments, or is seat + add-on pricing our only
  revenue? (Today: split sends 100% of net to the administradora, which pays the Asaas
  fees, see 17.)

## Implementation (slice 1)
- `Plan` catalog seeded by `scripts/seed-plans.ts` (**placeholder prices**), `AdministradoraPlan`; plan choice in onboarding and `/painel/plano` with seat count and monthly estimate.
- Plan signing with Termos de Uso acceptance in the onboarding (19); `/painel/plano` only switches plans (confirmation dialog).

## Implementation (slice 2: monthly invoices)
- `PlatformInvoice` (snapshot: period, billed range, plan, seats and prices, days, total, due date,
  status `pending | paid | overdue | canceled | failed | waived`, Asaas payment), unique per
  administradora + period. `Administradora.asaasCustomerId`.
- `src/server/platform-billing.ts`: `computeInvoice` (range = signing day or 1st → closing day or
  month end; seats via `countSeats(db, id, at)` in `src/server/seats.ts`; price = plan in force at
  the end of the range; prorated by days) and `issueInvoice` (customer via
  `ensureAdministradoraCustomer`, `createPayment` without split, due on the 10th or 3 days ahead
  when retried late; email). Idempotent; `failed` invoices are retried.
- Job `GET /api/cron/platform-invoices` (daily 10:00 UTC in `vercel.json`, `CRON_SECRET`;
  `?date=` outside production): issues last month's invoice for administradoras with a plan in it,
  closed ones included.
- Asaas webhook: payments that aren't resident charges are matched to `PlatformInvoice`
  (paid / overdue / canceled), never moving a paid invoice back except on refund/cancel.
- UI: `/painel/faturas` (list, breakdown, "Pagar" → Asaas invoice page), sidebar item for anyone who
  admin(ned) an administradora with a plan, home card for open/overdue invoices.
- Not yet: add-ons, restricting management on overdue invoices, a real email provider in production.
