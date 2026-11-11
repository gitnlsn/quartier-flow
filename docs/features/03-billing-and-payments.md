# 03 — Billing & Payments (boleto / Pix)

**Status:** Proposed · **Phase:** MVP (foundation) · **Depends on:** 01, 02

## Summary
Issue the monthly condominium fee and extra charges, and let residents pay by boleto or
Pix. This is the second roadmap foundation: delinquency, transparency, reservation fees
and payment-gated features all build on it.

## Roles
- **Síndico / administradora:** configure fees, issue charges, register manual payments.
- **Morador (financially responsible):** view and pay charges.

## User stories
- As a **morador**, I see my open and paid charges and pay with Pix in a few taps.
- As a **morador**, I copy the boleto barcode or get an updated second copy (segunda via)
  after the due date, with fine and interest calculated.
- As a **síndico**, I generate the month's charges for all units at once, including
  per-unit amounts (fração ideal) and one-off extras (taxa extra, fundo de reserva).
- As a **síndico**, payments are reconciled automatically, without matching bank
  statements by hand.

## Functional requirements
1. Charge types: monthly fee, extra fee, reservation fee (from 06), fine.
2. Amount rules: fixed per unit or proportional to fração ideal.
3. Payment methods: Pix (QR + copia-e-cola) and boleto, via a payment provider.
4. Automatic reconciliation through provider webhooks.
5. Late fees: configurable fine (multa) and daily interest (juros).
6. Second copy with recalculated amount; payment receipt.
7. Manual payment registration for cash/transfer exceptions, with audit trail.

## Data model (draft)
```prisma
model Charge {
  id            String    @id @default(cuid())
  condominiumId String
  unitId        String
  type          String    // "monthly" | "extra" | "reservation" | "fine"
  description   String
  amountCents   Int
  dueDate       DateTime
  status        String    // "open" | "paid" | "canceled" | "overdue"
  paidAt        DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([condominiumId, status])
  @@index([unitId])
}

model Payment {
  id               String   @id @default(cuid())
  chargeId         String
  method           String   // "pix" | "boleto" | "manual"
  providerId       String?  @unique
  amountCents      Int
  receivedAt       DateTime
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  @@index([chargeId])
}
```

## Platform & security considerations
- Store money as integer cents; never floats.
- Webhooks must be verified (signature) and idempotent (`providerId` unique).
- Choice of provider defines fees, settlement time and whether funds go to the
  condominium's own account (preferred) or a marketplace account.
- Android: Pix copia-e-cola uses the Clipboard plugin; no native payment SDK needed.

## Open questions
- Which payment provider (bank API vs. payment gateway)?
- Do funds settle directly into each condominium's bank account?
- Do we generate the boleto, or does the administradora keep its current bank?

## Market references
- Superlógica's resident app shows open/paid charges, second copies and barcode copy
  ([App Store](https://apps.apple.com/BR/app/id1160849001)).
- Lello includes boletos in the resident app ([App Store](https://apps.apple.com/app/id1583983294)).
- _(market practice, unverified)_ Pix payment inside the app.
