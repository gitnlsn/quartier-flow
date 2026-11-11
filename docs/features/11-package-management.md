# 11 — Package Management

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 02, 16

## Summary
Portaria registers deliveries as they arrive; the resident is notified immediately and
picks up with a code, giving a traceable chain of custody.

_(market practice, unverified — not confirmed by the Nov/2026 survey sources.)_

## Roles
- **Portaria:** register packages, hand them over.
- **Morador:** get notified, confirm pickup.

## User stories
- As **portaria**, I photograph the package label and pick the unit; the resident is
  notified automatically.
- As a **morador**, I get a push saying a package arrived and a pickup code.
- As **portaria**, I hand the package over only after confirming the pickup code.
- As a **síndico**, I see packages waiting for more than N days.

## Functional requirements
1. Register: unit, carrier, optional label photo, storage location.
2. Notification to all residents of the unit (16).
3. Pickup with code or signature; records who picked up and when.
4. Reminders for packages not picked up.

## Data model (draft)
```prisma
model Package {
  id           String    @id @default(cuid())
  condominiumId String
  unitId       String
  carrier      String?
  photoUrl     String?
  pickupCodeHash String
  receivedById String
  receivedAt   DateTime  @default(now())
  pickedUpAt   DateTime?
  pickedUpBy   String?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  @@index([unitId, pickedUpAt])
}
```

## Platform & security considerations
- **Camera:** portaria uses the camera for label photos; OCR of the label to suggest
  the unit is a possible later improvement.
- Label photos contain names and addresses; store privately and delete after pickup +
  retention period.

## Open questions
- Does the condominium have a locker system we should integrate with?
