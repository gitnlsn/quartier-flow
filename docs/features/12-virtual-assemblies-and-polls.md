# 12 — Virtual Assemblies & Polls

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 01, 02, 04

## Summary
Run condominium assemblies online (agenda, voting, minutes) and quick informal polls,
increasing participation compared with in-person meetings.

## Roles
- **Síndico / administradora:** create assemblies and polls, publish results and minutes.
- **Morador (owner or proxy):** vote.

## User stories
- As a **síndico**, I convene an assembly with an agenda and send the formal notice
  through the app.
- As an **owner**, I vote on each agenda item from my phone during the voting window.
- As an **owner**, I appoint a proxy (procurador) to vote for me.
- As a **síndico**, I run a quick poll ("which color for the lobby?") without formal rules.
- As a **síndico**, I export the results to attach to the minutes (ata).

## Functional requirements
1. Assembly: type (ordinary/extraordinary), notice date, agenda items, voting window.
2. One vote per unit per item, weighted by fração ideal when the convenção requires.
3. Eligibility rules: owners only by default; delinquent units blocked if allowed (04).
4. Proxy registration with document upload.
5. Quorum tracking and result calculation per item.
6. Polls: simple, non-binding, one vote per unit or per user.
7. Results export and minutes publishing (13).

## Data model (draft)
```prisma
model Assembly {
  id            String   @id @default(cuid())
  condominiumId String
  type          String   // "ordinary" | "extraordinary" | "poll"
  title         String
  opensAt       DateTime
  closesAt      DateTime
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId])
}

model AgendaItem {
  id         String @id @default(cuid())
  assemblyId String
  question   String
  options    Json
  weighting  String // "per_unit" | "fracao_ideal"
}

model Vote {
  agendaItemId String
  unitId       String
  voterId      String
  option       String
  weight       Decimal
  createdAt    DateTime @default(now())
  @@id([agendaItemId, unitId])
}
```

## Platform & security considerations
- **Legal validity:** virtual assemblies in Brazil must follow the Civil Code and each
  condominium's convenção. Get legal review before positioning this as a formal
  assembly tool.
- Strong authentication (2FA from 01) before voting; votes are immutable and audited.
- Decide whether individual votes are secret or visible to management.

## Open questions
- Do we need live video, or only asynchronous voting with an agenda?
- How do we verify ownership (owner vs. tenant) for voting rights?

## Market references
- Lello and Conduweb offer virtual assemblies
  ([Lello](https://apps.apple.com/app/id1583983294), [Conduweb](https://apps.apple.com/br/app/conduweb/id1199536076?l=en-GB)).
