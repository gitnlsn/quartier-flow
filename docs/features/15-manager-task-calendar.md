# 15 — Manager Task Calendar

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 02

## Summary
An agenda and reminder system for the síndico's legal and operational obligations:
inspections, certificates, contract renewals, tax deadlines, assemblies.

## Roles
- **Síndico / administradora:** manage tasks and deadlines.

## User stories
- As a **síndico**, I'm reminded before the fire department certificate (AVCB) expires.
- As a **síndico**, recurring tasks (water tank cleaning every 6 months) appear
  automatically.
- As a **síndico**, contract end dates from 14 and assembly dates from 12 show up in the
  same calendar.

## Functional requirements
1. Tasks with due date, recurrence, description and attachments.
2. Template of common legal obligations for Brazilian condominiums, applied on setup.
3. Reminders at configurable offsets (e.g. 30, 7 and 1 days before) via 16.
4. Calendar view aggregating tasks, contract expirations (14), assemblies (12) and
   reservations (06).
5. Completion with evidence (e.g. upload of the new certificate).

## Data model (draft)
```prisma
model ManagerTask {
  id            String    @id @default(cuid())
  condominiumId String
  title         String
  description   String?
  dueDate       DateTime
  recurrence    String?   // RRULE
  completedAt   DateTime?
  evidenceUrl   String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([condominiumId, dueDate])
}
```

## Platform & security considerations
- Reminders run in the same daily scheduled job as delinquency notices (04).
- The obligations template must be reviewed by a condominium management professional;
  requirements vary by city and state.

## Open questions
- Export to Google Calendar / iCal?

## Market references
- Noknox added a síndico assistant that reminds of important deadlines and tasks
  ([SíndicoNet](https://www.sindiconet.com.br/informese/area-do-sindico-noticias-espaco-nok-nox/amp)).
