# 10 — Visitor & Access Control (QR / token)

**Status:** Proposed · **Phase:** MVP · **Depends on:** 01, 02

## Summary
Residents pre-authorize visitors and service providers; the visitor receives a QR code
or token that the doorman (portaria) validates at the entrance. This is the
"Token-based Access System" from the roadmap.

## Roles
- **Morador:** authorize visitors, see entry history for their unit.
- **Portaria:** validate QR/token, register walk-in visitors, record entries and exits.
- **Síndico:** configure rules, view the access log.

## User stories
- As a **morador**, I authorize a friend for Saturday and send them a QR code by WhatsApp.
- As a **morador**, I authorize a recurring cleaner every Tuesday.
- As **portaria**, I scan the QR code and immediately see who is visiting which unit.
- As **portaria**, when an unannounced visitor arrives, I ask the resident to approve
  through the app instead of calling the intercom.
- As a **morador**, I'm notified when my visitor enters.

## Functional requirements
1. Invitation: name, optional document, validity window (single or recurring).
2. Delivery: shareable link with QR code and short numeric token.
3. Validation screen for portaria: scan QR or type token; shows status and unit.
4. Walk-in approval: portaria creates a request, resident approves/denies in-app.
5. Entry/exit log per unit.
6. Guest lists from reservations (06) become batch invitations.
7. Revocation at any time.

## Data model (draft)
```prisma
model AccessPass {
  id          String   @id @default(cuid())
  condominiumId String
  unitId      String
  createdById String
  visitorName String
  visitorDoc  String?
  tokenHash   String   @unique
  validFrom   DateTime
  validUntil  DateTime
  recurrence  String?  // RRULE for recurring visitors
  revokedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  @@index([condominiumId, validFrom])
}

model AccessEvent {
  id        String   @id @default(cuid())
  passId    String?
  unitId    String
  type      String   // "entry" | "exit" | "denied"
  staffId   String
  createdAt DateTime @default(now())
  @@index([unitId, createdAt])
}
```

## Platform & security considerations
- **QR scanning on Android:** use a native ML Kit plugin
  (e.g. `@capacitor-mlkit/barcode-scanning`); much faster than `getUserMedia`. On web,
  a JS scanner or manual token entry.
- Tokens are random, unguessable, short-lived, stored only as hashes, and rate-limited at
  validation.
- **LGPD:** visitor documents are third-party personal data. Collect only if the
  condominium requires it and define a retention period.
- Integration with physical hardware (gates, turnstiles, intercoms) is out of scope for
  MVP; design the API so it can be added later.

## Open questions
- Does portaria use a shared tablet (staff account) or personal accounts?
- Which hardware vendors do target condominiums use?

## Market references
- Lello supports visitor entry authorization ([App Store](https://apps.apple.com/app/id1583983294)).
- Conduweb has visitor list and portaria modules ([App Store](https://apps.apple.com/br/app/conduweb/id1199536076?l=en-GB)).
- _(market practice, unverified)_ QR-code visitor passes.
