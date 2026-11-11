# 14 — Service Providers & Inventory

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 02

## Summary
Keep a registry of the condominium's suppliers and contracts (elevator maintenance,
cleaning, security) and of its assets (furniture, equipment, tools).

## Roles
- **Síndico / administradora:** manage providers, contracts and assets.
- **Funcionário:** check out / return tools and equipment.

## User stories
- As a **síndico**, I see when the elevator maintenance contract expires and get a reminder.
- As a **síndico**, I assign a maintenance request (08) to a registered provider.
- As a **síndico**, I know what assets the condominium owns, where they are and their state.

## Functional requirements
1. Provider registry: company, CNPJ, contact, service type, documents.
2. Contracts: start/end dates, value, renewal reminders (feeds 15).
3. Provider can be the assignee of maintenance requests (08) and the supplier on
   expenses (05).
4. Inventory: item, location, quantity, condition, photo.
5. Optional checkout log for tools and equipment.

## Data model (draft)
```prisma
model ServiceProvider {
  id            String   @id @default(cuid())
  condominiumId String
  name          String
  cnpj          String?
  serviceType   String
  contact       Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId])
}

model Contract {
  id          String   @id @default(cuid())
  providerId  String
  startsAt    DateTime
  endsAt      DateTime?
  amountCents Int?
  fileUrl     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([providerId])
}

model InventoryItem {
  id            String   @id @default(cuid())
  condominiumId String
  name          String
  location      String?
  quantity      Int      @default(1)
  condition     String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId])
}
```

## Platform & security considerations
- Management-only feature; residents never see contracts or values unless published
  through the balancete (05).

## Open questions
- Should providers get their own limited login to update assigned requests?

## Market references
- Conduweb lists Inventory and Service Providers modules
  ([App Store](https://apps.apple.com/br/app/conduweb/id1199536076?l=en-GB)).
