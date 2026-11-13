# 05 — Financial Transparency & Dashboard

**Status:** Implemented slice 1 · **Phase:** MVP · **Depends on:** 03, 17

## Summary
Give the síndico a real-time view of the condominium's finances and give residents
access to the monthly balance sheet (balancete) and their own charge history.

## Roles
- **Administradora:** records expenses, sets the opening balance, publishes and
  unpublishes balancetes.
- **Síndico:** views the dashboard and every balancete (drafts included), read-only,
  like the rest of the management area (19).
- **Morador:** views published balancetes of their unit's condominium and their own
  charge history (`/painel/cobrancas`).

## User stories
- As a **síndico**, I see income, expenses, cash balance and delinquency on one screen.
- As an **administradora**, I record an expense with its invoice attached.
- As a **morador**, I read the monthly balancete without asking the administration.
- As a **morador**, I see a detailed history of my unit's fees.

## Functional requirements
1. Expense entries with category, supplier, date, amount and attachment. ✅
2. Income comes automatically from payments (03): recorded on Asaas
   `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`, with the gross amount and the Asaas fee
   (`Charge.paidAmountCents`, `Charge.feeCents`). Every charge belongs to a
   condominium, so our ledger splits the administradora's single Asaas account by
   condominium. ✅
3. Dashboard on the condominium's Visão geral: cash balance, this month's net income
   and expenses, delinquency rate today, 12-month income vs. expenses chart, top
   expense categories. ✅
4. Monthly balancete: computed live from charges and expenses while a draft;
   **published** by the administradora once the month has ended. ✅
5. Residents only see published balancetes, never drafts. ✅
6. Export to PDF (server-generated, `@react-pdf/renderer`) and CSV (browser). ✅

## Decisions (slice 1)
- **Cash-flow ledger, not double-entry.** Enough for condominium accountability;
  a real accounting export is a later integration.
- **Income is cash basis:** a charge counts in the month of its `paidAt` once it is
  `confirmed` or `received` (card payments show up right away; we don't store when
  the funds became available). Gross amount per charge type, Asaas fees as their own
  line, then net. Refunded, canceled and forgiven charges never count.
- **Opening balance:** `Condominium.openingBalanceCents` at the start of
  `openingBalanceDate`'s month (cash before Quartier Flow). The ledger starts in that
  month; every balance is opening + the results of the months since. It can only be
  changed while nothing is published.
- **Publishing freezes the numbers.** `BalanceSheet.snapshot` stores the whole
  balancete (`BalanceSheetData`, `src/lib/finance.ts`) and residents only ever read
  that snapshot. Only past months can be published.
- **Published months are locked:** expenses dated in them can't be added or deleted.
  To correct one, unpublish (audited, with the snapshot residents had seen), fix,
  publish again.
- **Delinquency at month end** follows 04 "Delinquency indicators": a charge due at
  least a day before the month's end and not paid by then; renegotiated charges
  count until their acordo, forgiven ones until written off.

## Data model
```prisma
model Expense {
  id             String   @id @default(cuid())
  condominiumId  String
  category       String
  supplier       String?
  description    String
  amountCents    Int
  paidAt         DateTime @db.Date
  createdById    String?
  attachmentKey  String?   // private "attachments" bucket, served via signed URLs
  attachmentName String?
  attachmentType String?
  attachmentSize Int?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([condominiumId, paidAt])
}

model BalanceSheet {
  id            String    @id @default(cuid())
  condominiumId String
  period        String    // YYYY-MM
  status        String    @default("draft") // draft | published
  snapshot      Json?     // frozen BalanceSheetData, set on publish
  notes         String?   // shown to residents
  publishedAt   DateTime?
  publishedById String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@unique([condominiumId, period])
  @@index([condominiumId, status])
}

// Condominium: openingBalanceCents Int @default(0), openingBalanceDate DateTime? @db.Date
```

## Where it lives
- Ledger and dashboard: `src/server/finance.ts`; shared types, CSV:
  `src/lib/finance.ts`.
- API: `finance` router (management), `portal.balanceSheets` / `portal.balanceSheet`
  (residents); PDF: `GET /api/condominios/[id]/balancetes/[period]/pdf`.
- UI: Financeiro → Balancetes (`/painel/condominios/[id]/balancetes`), the Finanças
  card on Visão geral, and Minha área → Balancetes (`/painel/balancetes`).

## Platform & security considerations
- Invoice photos via camera on Android, file upload on web; files are stored
  privately (signed URLs), not in a public bucket.
- The PDF is a plain download link, which also works inside the Android app.
- Aggregates are computed per request with grouped SQL; cache them if condominiums
  grow large.

## Open questions
- Should we integrate with the administradora's existing accounting software?
- Should the síndico approve a balancete before it is published (two-step)?
- Accrual view (income by competência) alongside the cash view?

## Market references
- Omeupredio lets the síndico share the monthly balancete and residents see their fee
  details ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-gestao-de-condominios)).
- Group COM offers a financial health dashboard ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-condominios/)).
