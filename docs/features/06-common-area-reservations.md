# 06 — Common Area Reservations

**Status:** Implemented slice 1 (Nov/2026) · **Phase:** MVP · **Depends on:** 02, 04 (03 if fees apply)
**Paid add-on:** monthly fee charged to the administradora when enabled (18).

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
5. Reservation fee creates a `Charge` (03), i.e. an Asaas payment from our main account
   split to the administradora (Pix for immediate confirmation). Cancellation inside the allowed window
   deletes the unpaid payment or refunds a paid one on Asaas (17).
6. Guest list per booking (feeds 10 visitor control).
7. Notifications to staff and resident (16); post-use inspection checklist.

## Implemented (slice 1, Nov/2026)
- **Switch:** `Condominium.reservationsEnabled`, turned on/off in the Reservas module.
  Not billed yet; the add-on price comes with platform billing add-ons (18).
- **Who manages:** administradora admins **and the condominium's síndicos** (the first
  write permission for síndicos; `assertCanManageReservations` in
  `src/server/reservations.ts`). Residents book for their own unit(s).
- **Areas** (`CommonArea`): name, rules text, capacity, fee, full day or hourly (opening
  hours, max hours), min/max advance, per-unit monthly limit, resident cancel deadline,
  approval required, delinquency block, weekdays it's closed every week.
- **One-off closures** (`AreaBlock`): "Bloquear datas" on the Reservas page, for one area
  or all, a date range and a reason residents see on the calendar. Kept out of the area
  settings on purpose: a date list there goes stale and the síndico would have to clean
  it up; blocks in the past simply stop mattering. Refused while active bookings fall in
  the range (cancel them first, so residents are told).
- **Bookings** (`Reservation`): `pending` (awaiting approval) and `confirmed` hold the slot;
  `rejected` / `canceled` free it; a past confirmed one shows as "Realizada". Double
  booking is prevented by a `SELECT … FOR UPDATE` on the area row inside the booking
  transaction. Guest names are stored per booking (for 10).
- **Fee:** charged on the monthly charge **after the latest one already sent** (or the
  current month, if later), as a one-off `UnitBillingItem` (`source: "reservation"`),
  created when the booking is confirmed. A
  draft run of that month is rebuilt. Canceling/rejecting archives the item while its
  month is unsent; if already sent, the fee stays and the manager is told to refund it.
- **Delinquency:** `isDelinquent(unitId)` from 04 (`src/server/delinquency.ts`): the
  unit has a charge with status `overdue`.
- **Time:** stored in UTC, computed in São Paulo time (fixed UTC-3) by
  `src/lib/reservations.ts`, shared by server and calendar.
- **Screens:** `/painel/condominios/[id]/reservas` (bookings: approve, reject, cancel) and
  `…/reservas/areas` (areas and rules); `/painel/reservas` for residents (areas, month
  calendar, booking, "Minhas reservas", cancel within the deadline).

- **Notifications (16):** requests awaiting approval go to the managers; approvals,
  rejections and cancellations by the administration go to the resident who booked;
  a resident canceling a confirmed booking notifies the managers.

**Not yet:** photos, staff role and staff notifications, post-use inspection checklist,
managers booking on behalf of a unit, fee via a separate Pix charge.

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
- ~~Is the fee charged at booking or added to the next monthly fee?~~ Next monthly fee
  (slice 1). Revisit a Pix-at-booking option for non-residents or high fees.

## Market references
- Noknox shows available dates, photos and prices for in-app booking
  ([SíndicoNet](https://www.sindiconet.com.br/informese/area-do-sindico-noticias-espaco-nok-nox/amp)).
- uCondo lets managers set rules (including blocking delinquent units) and alerts staff
  ([Group Software](https://www.groupsoftware.com.br/blog/reserva-areas-comuns/)).
- Superlógica, Lello, Conduweb and G4 Portaria all offer bookings.
