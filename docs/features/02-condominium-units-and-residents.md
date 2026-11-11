# 02 — Condominium, Units & Residents

**Status:** Implemented (slice 1, Nov/2026) · **Phase:** MVP (foundation) · **Depends on:** 01

## Summary
The core registry every other feature references: condominiums, blocks/towers, units,
the people linked to each unit, and their pets and vehicles.

## Roles
- **Síndico / administradora:** create and maintain the registry, invite residents.
- **Morador:** view and update their own household (dependents, pets, vehicles).
- **Portaria:** read-only lookup of units, residents and vehicles.

## User stories
- As a **síndico**, I import the list of units once (CSV) instead of typing each one.
- As a **síndico**, I invite the owner and tenant of a unit and set who is responsible
  for paying the fee.
- As a **morador**, I register my pets and vehicles so the staff can identify them.
- As **portaria**, I search by unit or license plate.
- As an **administradora**, I switch between the condominiums I manage.

## Functional requirements
1. CRUD for condominium, block/tower and unit; CSV import of units.
2. Memberships linking a user to a unit with a type: owner, tenant, dependent.
3. One "financially responsible" membership per unit (used by 03 and 04).
4. Pets (name, species, photo) and vehicles (plate, model, color) per unit.
5. A user can belong to several condominiums and switch context.
6. Move-out flow: end a membership without deleting history.
7. **Administradora is the top-level tenant** (our paying customer, 18): it owns many
   condominiums. Its Asaas receiving account and KYC are handled in 17/19; no
   condominium can issue charges until that account is approved.

## Data model (draft)
```prisma
model Administradora {
  id        String   @id @default(cuid())
  name      String
  cnpj      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Condominium {
  id               String   @id @default(cuid())
  administradoraId String
  name      String
  cnpj      String?  @unique
  address   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Unit {
  id            String   @id @default(cuid())
  condominiumId String
  block         String?
  number        String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@unique([condominiumId, block, number])
  @@index([condominiumId])
}

model Membership {
  id                    String    @id @default(cuid())
  userId                String
  condominiumId         String
  unitId                String?   // null for síndico/staff not tied to a unit
  role                  String    // "resident" | "sindico" | "admin_company" | "staff"
  residentType          String?   // "owner" | "tenant" | "dependent"
  financiallyResponsible Boolean  @default(false)
  startedAt             DateTime  @default(now())
  endedAt               DateTime?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  @@index([condominiumId])
  @@index([userId])
}
```
Plus `Pet` and `Vehicle` tables keyed by `unitId`.

## Platform & security considerations
- **Multi-tenancy:** this is where tenant isolation is enforced. Add a tRPC middleware
  that resolves the user's membership for the current condominium.
- **LGPD:** CPF and vehicle plates are personal data. Only collect CPF where billing
  requires it.
- **Camera:** pet/vehicle photos via `@capacitor/camera` on Android, file input on web.

## Open questions
- Do we need CPF for residents, or only for the financially responsible person?
- Should tenants see the unit's financial data?

## Market references
- uCondo offers pet registration ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-gestao-de-condominios)).

## Implementation (slice 1)
- Models in `prisma/schema.prisma`: `Administradora`, `AdministradoraMember`, `Condominium`, `Unit` (`monthlyAmountCents` override), `Membership`, `User.cpf`.
- Management UI: `/painel/condominios` (create), condominium page tabs **Unidades** (add by list/range `101-110`, per-unit amount) and **Moradores** (invite, payer, remove).
- **Spreadsheet import** (CSV/XLSX): column mapping with auto-guess, server-side dry run per row (invalid email/CPF, missing unit, duplicates, payer without CPF, already registered), optional unit creation and invite emails. Code: `src/server/people.ts`, `import-people.tsx`. Excel numeric CPFs get leading zeros restored.
- Access: `src/server/access.ts` — síndicos see their condominiums read-only; administradora admins manage.
- Not yet: CSV export, pets/vehicles, move-out flow beyond "Remover", tenant/owner visibility rules.
