# 17 — Asaas Payments Platform (cross-cutting)

**Status:** Proposed · **Phase:** MVP (foundation) · **Depends on:** 02
**Used by:** 03, 04, 05, 06, 09, 18, 19

## Decision
**Every payment in Quartier Flow goes through [Asaas](https://www.asaas.com)** (decided
Nov/2026; direct Santander integration was dropped). This document is the single
reference for how we use Asaas. Feature docs describe *what* is charged; this one
describes *how* money moves.

Facts below come from the official docs (docs.asaas.com, read through the Asaas docs
MCP server in `.mcp.json`) on 2026-11-11. Re-check before implementing.

## Money flows
Our customer is the **administradora**. There are two independent flows:

```
1) Resident charges (condominium fees, reservations, fines…)
   Resident ──pays──▶ Quartier Flow main Asaas account (charge issuer)
                            │ split (net value) ──▶ Administradora's Asaas account (walletId)

2) Platform billing (our revenue, see 18)
   Administradora ──pays──▶ Quartier Flow main Asaas account
```

- **All charges are issued by our main account** with our API key. Residents are
  Asaas customers of our main account.
- Each charge carries a **split to the administradora's `walletId`**, so the money ends
  up in the administradora's Asaas account, from where it withdraws to its bank.
- The administradora gets a `walletId` by having an Asaas account: we create a
  **subaccount** for it (`POST /v3/accounts`), and it completes **KYC** (documents and
  approval) to receive and withdraw funds. An administradora that already has its own
  Asaas account could provide its `walletId` instead (to confirm with Asaas).
- Because we never operate *inside* the administradora's account, we **don't need its
  API key** after creation, which avoids the BaaS requirement and key expiry that
  apply to long-term subaccount API access. (We still receive `ACCOUNT_STATUS_*`
  events to track its KYC.)

## ⚠️ Points to validate before building
1. **Beneficiary on the boleto:** the issuer is Quartier Flow, so residents will see
   *Quartier Flow* (not the condominium or administradora) as the beneficiary. Check
   that this is acceptable to administradoras and residents, and what Asaas shows.
2. **Tax and legal (accountant/lawyer):** condominium money passes through our account
   before the split. Confirm how it's treated (is it our revenue? invoices?) and that
   the contracts make clear the funds belong to the condominium.
3. **Per-condominium segregation:** with one wallet per administradora, funds from all
   its condominiums arrive in the same account. Condominiums legally own their money;
   many administradoras keep one account per condominium. Options: our ledger
   attributes every split to a condominium (minimum), or one Asaas subaccount per
   condominium owned by the administradora (stronger). Decide with administradoras.
4. **Asaas evaluation period:** starts with the first production subaccount: max **10
   subaccounts**, **R$ 2.000** in charges per subaccount, **60 days**. Hitting a limit
   blocks new subaccounts and charges until Asaas finishes evaluating. Plan the pilot
   around it and ask Asaas how it applies when charges are issued by the main account.
5. **Branding:** customer touchpoints must show Asaas branding and responsibility text,
   per the Playbook Asaas provides.

## Administradora KYC (receiving account)
1. `POST /v3/accounts` with `name`, `email`, `cpfCnpj` (administradora's CNPJ),
   `incomeValue` (required), `companyType`, address and phones, plus the **`webhooks`**
   field so its `ACCOUNT_STATUS_*` events reach us. Only a company (CNPJ) account, like
   our main one, can create subaccounts.
2. Store the returned **`walletId`** (split destination) and account id. The `apiKey`
   is returned only once: store it encrypted or discard it if unused.
3. KYC: pending documents via `GET /v3/myAccount/documents` (≥ 15 s after creation). If
   an `onboardingUrl` is returned, the administradora completes KYC through that link.
   Without BaaS, the administradora receives an activation email and completes it in
   the Asaas web app.
4. Approval: `ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED` (or `GET /v3/myAccount/status`,
   `general = APPROVED`); review takes up to 48 h. Rejections arrive as
   `ACCOUNT_STATUS_*_REJECTED`.
5. Annual data confirmation is required for subaccounts.

The manager area (19) shows this checklist. Resident charges are blocked until the
administradora's account is approved.

## Charging residents
| Step | Asaas API (main account key) |
|---|---|
| Resident becomes payer | `POST /v3/customers` (`name`, `cpfCnpj`, `email`, `mobilePhone`, `externalReference` = our id). **Asaas allows duplicates**: store the `cus_…` id and reuse it. |
| Create charge | `POST /v3/payments`: `customer`, `billingType` (`BOLETO`, `PIX`, …), `value`, `dueDate` (`YYYY-MM-DD`), `externalReference` = our `Charge.id`, `fine: {value}`, `interest: {value}`, `discount: {value, dueDateLimitDays, type}`, **`split: [{ walletId: <administradora>, percentualValue: 100 }]`** |
| Store | `id`, `invoiceUrl` (payment page), `bankSlipUrl` (PDF), `status` |
| Boleto line | `GET /v3/payments/{id}/identificationField` → `identificationField`, `nossoNumero`, `barCode` (re-fetch after changes) |
| Pix | `GET /v3/payments/{id}/pixQrCode` → `encodedImage`, `payload` (copia e cola), `expirationDate` |
| Installment agreements (04) | `installmentCount` + `installmentValue`/`totalValue`; carnê via `GET /v3/installments/{id}/paymentBook` |

- Our main account needs a registered **Pix key** so boletos carry a Pix QR code and Pix
  QR codes don't expire the same day.
- **Idempotency on creation:** on timeout, look up by `externalReference` before
  retrying; never blindly re-POST.

## Split rules
- `split: [{ walletId, fixedValue | percentualValue }]`, computed on **`netValue`**
  (after Asaas fees); the total can't exceed it. With `percentualValue: 100`, the
  administradora receives the net value and Asaas fees come out of the payment.
- **Never include our own `walletId`**: the undistributed remainder stays with us
  automatically.
- **Disabled by default:** enable in the main account (Integrações > Segurança >
  Habilitar Split, SMS/token confirmation).
- Refunding a charge refunds its split; deleting a charge drops its split (re-add on
  restore). If the split exceeds the net value at receipt, Asaas sends
  `PAYMENT_SPLIT_DIVERGENCE_BLOCK`: fix within 2 business days or the split is
  cancelled (`PAYMENT_SPLIT_DIVERGENCE_BLOCK_FINISHED`).
- Track split status (`PENDING`, `AWAITING_CREDIT`, `DONE`, `CANCELLED`, `REFUSED`,
  `REFUNDED`) via `PAYMENT_SPLIT_DONE` / `PAYMENT_SPLIT_CANCELLED`.

## Webhooks
- Configured per account (main account; administradora subaccounts at creation); max
  10 per account; Sandbox and Production are separate.
- Endpoint: `POST /api/webhooks/asaas`. Auth: our `authToken` (32–255 chars) arrives in
  header **`asaas-access-token`**; reject anything else.
- **At least once** delivery: event `id` (`evt_…`) is the idempotency key.
- **Only HTTP 200 counts as success**, 10 s timeout, redirects not followed.
  Handler: validate token → store raw event (unique on event id) → return 200 →
  process asynchronously.
- After **15 consecutive failures the queue stops** until reactivated; events older than
  **14 days are deleted forever**. Monitor and alert.
- Use **sequential** delivery so a charge's events arrive in order.

| Event | Effect |
|---|---|
| `PAYMENT_CREATED` | `Charge` → `pending` |
| `PAYMENT_UPDATED` | refresh value / due date |
| `PAYMENT_CONFIRMED`: paid, balance **not yet available** | `confirmed` (unit not delinquent) |
| `PAYMENT_RECEIVED`: paid, balance **available** | `received` (counts as income in 05) |
| `PAYMENT_OVERDUE` | `overdue` (feeds 04) |
| `PAYMENT_DELETED` / `PAYMENT_RESTORED` | `canceled` / previous status |
| `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS` | refunded / partial |
| `PAYMENT_RECEIVED_IN_CASH_UNDONE` | revert manual payment |
| `PAYMENT_SPLIT_*` | transfer to the administradora done / cancelled / blocked |
| `ACCOUNT_STATUS_*` | administradora KYC status (19) |

Card, chargeback and risk-analysis events exist too; handle them if card is enabled.

## Notifications to payers
Asaas can notify payers by email, SMS, WhatsApp, Correios and voice. **Each send has a
fee**, charged to our main account (the issuer). Decide: Asaas-sent, or set
`notificationDisabled: true` and send our own through 16. Never both.

## Security
- Main API key (`$aact_prod_…` / `$aact_hmlg_…`) only on the server, in env vars.
  Consider Asaas's IP restriction for it.
- Send a `User-Agent` header (mandatory for accounts created after 13/06/2024).
- Webhook token checked on every request; consider allowlisting Asaas IPs.
- A compromised main key can create charges and change splits for every
  administradora: treat it as the most sensitive secret we hold.

## Data model (draft)
```prisma
model PayoutAccount {             // one per administradora (receiving account)
  id                String   @id @default(cuid())
  administradoraId  String   @unique
  asaasAccountId    String   @unique
  walletId          String
  kycStatus         String   // "pending_documents" | "awaiting_approval" | "approved" | "rejected"
  onboardingUrl     String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model PaymentCustomer {           // Asaas customer in our main account
  id              String   @id @default(cuid())
  userId          String   @unique
  asaasCustomerId String   @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model WebhookEvent {              // idempotency + audit
  id          String    @id        // Asaas evt_… id
  event       String
  payload     Json
  status      String    // "received" | "processed" | "error"
  processedAt DateTime?
  createdAt   DateTime  @default(now())
  @@index([status])
}
```

## Open questions
1. Points 1–4 in "Points to validate".
2. **Asaas fees** on resident charges (boleto, Pix, notifications): deducted from the
   administradora's split (default with 100% of net) or absorbed by us?
3. **Notifications:** Asaas-sent or ours?
4. **Payment methods:** boleto + Pix only, or credit card too?

## References
docs.asaas.com: autenticação, criação de subcontas, onboarding e envio de documentos,
detalhamento do fluxo de aprovação, cobranças via boleto / Pix, guia de cobranças,
criando um cliente, webhooks (introdução, FAQ, eventos, webhook para cobranças,
situação da conta), split de pagamentos e split em cobranças avulsas, notificações.
