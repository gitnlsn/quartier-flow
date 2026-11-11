# 06 — Common Area Reservations

**Status:** Proposed · **Phase:** MVP · **Depends on:** 02, 04 (03 if fees apply)

## Summary
Residents book common areas (party room, barbecue area, gym, court) from their phone,
following rules the síndico defines. Staff are notified to prepare the space.

## Roles
- **Síndico:** register areas and rules, approve or cancel bookings.
- **Morador:** browse availability and book.
- **Funcionário:** see upcoming bookings to prepare and inspect the space.

## User stories
- As a **morador**, I see free dates, photos, capacity and price, and book in-app.
- As a **síndico**, I set rules (advance notice, max bookings per month, hours, fee,
  approval required) once, and the system enforces them.
- As a **síndico**, delinquent units can't book if our convenção allows it.
- As a **funcionário**, I'm notified of tomorrow's bookings to clean and prepare.
- As a **morador**, I cancel within the allowed window and get my fee refunded/voided.

## Functional requirements
1. Area registry: name, photos, capacity, rules text, opening hours.
2. Slot types: full day or hourly.
3. Rule engine: min/max advance, per-unit limits, blackout dates, approval required.
4. Delinquency block via `isDelinquent` (04), configurable per area.
5. Reservation fee creates a `Charge` (03).
6. Guest list per booking (feeds 10 visitor control).
7. Notifications to staff and resident (16); post-use inspection checklist.

## Data model (draft)
```prisma
model CommonArea {
  id            String   @id @default(cuid())
  condominiumId String
  name          String
  capacity      Int?
  feeCents      Int      @default(0)
  rules         Json     // advance notice, limits, approval, blockDelinquent...
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId])
}

model Reservation {
  id        String   @id @default(cuid())
  areaId    String
  unitId    String
  startsAt  DateTime
  endsAt    DateTime
  status    String   // "pending" | "confirmed" | "canceled" | "completed"
  chargeId  String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([areaId, startsAt])
  @@index([unitId])
}
```

## Platform & security considerations
- Prevent double booking with a DB-level constraint or transaction lock on the area/slot.
- Store times in UTC; display in America/Sao_Paulo.

## Open questions
- Is the fee charged at booking or added to the next monthly fee?

## Market references
- Noknox shows available dates, photos and prices for in-app booking
  ([SíndicoNet](https://www.sindiconet.com.br/informese/area-do-sindico-noticias-espaco-nok-nox/amp)).
- uCondo lets managers set rules (including blocking delinquent units) and alerts staff
  ([Group Software](https://www.groupsoftware.com.br/blog/reserva-areas-comuns/)).
- Superlógica, Lello, Conduweb and G4 Portaria all offer bookings.
