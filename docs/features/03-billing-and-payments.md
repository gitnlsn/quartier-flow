# 03 — Billing & Payments (boleto / Pix via Asaas)

**Status:** Proposed · **Phase:** MVP (foundation) · **Depends on:** 01, 02, 17

## Summary
Issue the monthly condominium fee and extra charges, and let residents pay by boleto or
Pix. All charges are issued by **Quartier Flow's main Asaas account** with a **split of
the net value to the administradora's Asaas account** (see 17 for money flows,
webhooks and security). This feature owns *what* is charged and *to whom*; Asaas
handles payment processing, boleto registration, Pix and settlement.

## Roles
- **Síndico / administradora:** configure fees, issue charges, cancel or adjust them,
  register manual payments.
- **Morador (financially responsible):** view and pay charges.

## User stories
- As a **morador**, I see my open and paid charges and pay with Pix in a few taps.
- As a **morador**, I copy the boleto line or open the payment page after the due
  date, with fine and interest already calculated.
- As a **síndico**, I generate the month's charges for all units at once, including
  per-unit amounts (fração ideal) and one-off extras (taxa extra, fundo de reserva).
- As a **síndico**, payments are reconciled automatically: no matching bank statements.
- As a **síndico**, I can't issue charges until the administradora's Asaas account has
  passed KYC, and I see what is pending.

## Functional requirements
1. **Charge types:** monthly fee, extra fee, reservation fee (06), fine (09),
   agreement installment (04).
2. **Amount rules:** fixed per unit or proportional to fração ideal.
3. **Monthly run:** the síndico reviews a draft for all units, then confirms; we create
   one Asaas payment per unit. Individual charges, **not** Asaas subscriptions: the fee
   changes every month.
4. **Payer:** the unit's financially responsible member (02), mapped once to an Asaas
   customer in our main account (`externalReference` = our id; reused, never
   duplicated).
5. **Payment methods:** boleto with Pix QR code (requires a Pix key on our main
   account) and Pix. Show `invoiceUrl`, the boleto line and Pix copia-e-cola in the app.
6. **Fine, interest and early-payment discount** sent on the Asaas payment
   (`fine`, `interest`, `discount`), using the condominium's configured rates.
7. **Reconciliation by webhook** (17): `PAYMENT_CONFIRMED` / `PAYMENT_RECEIVED` mark the
   charge paid; `PAYMENT_OVERDUE` feeds 04; refunds and deletions handled.
8. **Changes:** editing value or due date updates the Asaas payment (and re-fetches the
   boleto line); canceling deletes it on Asaas.
9. **Manual payments** (cash/transfer) registered in Asaas as received in cash, with an
   audit trail.
10. **Receipts** from the Asaas payment.
11. **Split:** every charge carries `split: [{ walletId: <administradora>,
    percentualValue: 100 }]`; our ledger also records which condominium each charge
    belongs to, so the administradora can account per condominium (17, point 3).
    Our own revenue is billed separately (18).

## Status lifecycle
`draft` → `pending` (created on Asaas) → `confirmed` (paid, funds not yet available)
→ `received` (funds available) · or `overdue` · `canceled` · `refunded`.
A unit with a `confirmed` charge is **not** delinquent.

## Data model (draft)
```prisma
model Charge {
  id              String    @id @default(cuid())
  condominiumId   String
  unitId          String
  type            String    // "monthly" | "extra" | "reservation" | "fine" | "agreement"
  description     String
  amountCents     Int
  dueDate         DateTime
  status          String    // "draft" | "pending" | "confirmed" | "received" | "overdue" | "canceled" | "refunded"
  asaasPaymentId  String?   @unique
  invoiceUrl      String?
  bankSlipUrl     String?
  paidAt          DateTime?
  paidAmountCents Int?      // includes fine/interest when paid late
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  @@index([condominiumId, status])
  @@index([unitId])
}
```
Asaas customers, payment accounts and webhook events: see 17.

## Platform & security considerations
- Money as integer cents in our DB; Asaas uses decimals: convert at the boundary only.
- Charge creation must be idempotent: on timeout, look up by `externalReference`
  before retrying.
- Asaas evaluation period limits a pilot (17); confirm how they apply to charges issued
  by the main account.
- Residents see **Quartier Flow** as the boleto beneficiary (17, point 1).
- Asaas branding must appear where residents pay (17).
- Android: Pix copia-e-cola uses the Clipboard plugin; `invoiceUrl` opens in the browser.

## Open questions
- Who absorbs Asaas fees per boleto/Pix: deducted from the administradora's split
  (default) or absorbed by Quartier Flow?
- Credit card too, or boleto + Pix only?
- Do we let Asaas send charge notifications, or send our own (see 17)?

## Market references
- Superlógica's resident app shows open/paid charges, second copies and barcode copy
  ([App Store](https://apps.apple.com/BR/app/id1160849001)).
- Lello includes boletos in the resident app ([App Store](https://apps.apple.com/app/id1583983294)).
