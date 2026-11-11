# 09 — Occurrence Log

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 02

## Summary
A digital version of the "livro de ocorrências": a formal record of incidents (noise,
rule violations, damage, security events) that the síndico reviews and responds to.
Different from 08: an occurrence is about conduct or events, not repairs.

## Roles
- **Morador:** register an occurrence, follow the response.
- **Portaria:** register occurrences during their shift.
- **Síndico:** respond, issue warnings or fines (multa) linked to a unit.

## User stories
- As a **morador**, I register a noise complaint with date, time and description.
- As **portaria**, I log an incident during my shift so the next shift and the síndico
  know about it.
- As a **síndico**, I respond formally and, if needed, issue a warning or fine to a unit.

## Functional requirements
1. Occurrence: type, date/time, description, optional photos, optional involved unit.
2. Visibility: private between author and management (never public).
3. Síndico response with outcome: no action, warning, fine.
4. A fine creates a `Charge` (03) of type "fine".
5. Immutable history: entries can be complemented, not edited or deleted.
6. Shift log mode for portaria.

## Data model (draft)
```prisma
model Occurrence {
  id             String   @id @default(cuid())
  condominiumId  String
  authorId       String
  involvedUnitId String?
  type           String
  occurredAt     DateTime
  description    String
  outcome        String?  // "none" | "warning" | "fine"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  @@index([condominiumId, occurredAt])
}
```

## Platform & security considerations
- **LGPD / conflict risk:** the reporter's identity must not be shown to the involved
  unit. Restrict access to management only.
- Append-only design gives the log value as evidence; keep an audit trail.

## Open questions
- Do warnings and fines require a formal notice template per the convenção?

## Market references
- Lello and Conduweb include an occurrence log
  ([Lello](https://apps.apple.com/app/id1583983294), [Conduweb](https://apps.apple.com/br/app/conduweb/id1199536076?l=en-GB)).
