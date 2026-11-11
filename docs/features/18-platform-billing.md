# 18 — Platform Billing (Quartier Flow's own revenue)

**Status:** Proposed · **Phase:** MVP · **Depends on:** 02, 17, 19

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

## Open questions
- Prices, seat rule and add-on scope (requirements 1–3, 6).
- Free trial? (Asaas evaluation-period limits in 17.)
- Do we also take a fee on resident payments, or is seat + add-on pricing our only
  revenue? (Today: split sends 100% of net to the administradora, which pays the Asaas
  fees, see 17.)
