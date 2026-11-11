# 05 — Financial Transparency & Dashboard

**Status:** Proposed · **Phase:** MVP · **Depends on:** 03

## Summary
Give the síndico a real-time view of the condominium's finances and give residents
access to the monthly balance sheet (balancete) and their own charge history.

## Roles
- **Síndico / administradora:** record expenses, publish balancetes, view the dashboard.
- **Morador:** view published balancetes and their unit's history.

## User stories
- As a **síndico**, I see income, expenses, cash balance and delinquency on one screen.
- As a **síndico**, I record an expense with its invoice attached.
- As a **morador**, I read the monthly balancete without asking the administration.
- As a **morador**, I see a detailed history of my unit's fees.

## Functional requirements
1. Expense entries with category, supplier, date, amount and attachment.
2. Income comes automatically from payments (03).
3. Dashboard: monthly income vs. expenses, balance, delinquency rate, top categories.
4. Monthly balancete: generated from entries, reviewed and **published** by the síndico.
5. Residents only see published balancetes, never drafts.
6. Export to PDF/CSV.

## Data model (draft)
```prisma
model Expense {
  id            String   @id @default(cuid())
  condominiumId String
  category      String
  supplier      String?
  description   String
  amountCents   Int
  paidAt        DateTime
  attachmentUrl String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId, paidAt])
}

model BalanceSheet {
  id            String    @id @default(cuid())
  condominiumId String
  month         DateTime
  publishedAt   DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@unique([condominiumId, month])
}
```

## Platform & security considerations
- Invoice photos via camera on Android, file upload on web; store files privately
  (signed URLs), not in a public bucket.
- Aggregate dashboard queries can be cached and invalidated on new entries.

## Open questions
- Do we need double-entry accounting, or is a simple cash-flow ledger enough for MVP?
- Should we integrate with the administradora's existing accounting software?

## Market references
- Omeupredio lets the síndico share the monthly balancete and residents see their fee
  details ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-gestao-de-condominios)).
- Group COM offers a financial health dashboard ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-condominios/)).
