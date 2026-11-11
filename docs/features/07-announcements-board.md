# 07 — Announcements Board

**Status:** Proposed · **Phase:** MVP · **Depends on:** 02, 16

## Summary
A digital bulletin board (mural) where the síndico and administradora publish notices
that reach every resident by app, push and email, replacing paper in the elevator.

## Roles
- **Síndico / administradora:** publish, pin, schedule and remove announcements.
- **Morador:** read announcements, receive notifications.

## User stories
- As a **síndico**, I post "water shutdown Thursday 9–12h" and every resident is notified.
- As a **síndico**, I target one block only, and see how many residents read the notice.
- As a **morador**, I see the latest announcements first and important ones pinned.

## Functional requirements
1. Rich-text announcements with optional image/PDF attachments.
2. Audience: whole condominium, specific blocks, or specific units.
3. Priority levels: normal, important (pinned), urgent (push + SMS).
4. Scheduling and expiry dates.
5. Read receipts (count, and who read it for the síndico).

## Data model (draft)
```prisma
model Announcement {
  id            String    @id @default(cuid())
  condominiumId String
  authorId      String
  title         String
  body          String
  priority      String    // "normal" | "important" | "urgent"
  audience      Json      // { blocks?: string[], unitIds?: string[] }
  publishAt     DateTime
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([condominiumId, publishAt])
}

model AnnouncementRead {
  announcementId String
  userId         String
  readAt         DateTime @default(now())
  @@id([announcementId, userId])
}
```

## Platform & security considerations
- Urgent SMS costs money; limit who can send urgent notices.
- No resident-to-all posting in MVP to avoid moderation issues.

## Open questions
- Do residents get comments/reactions, or is it one-way only?

## Market references
- Superlógica shows notices from the administradora and síndico
  ([App Store](https://apps.apple.com/BR/app/id1160849001)).
- Conduweb has an electronic bulletin board (Mural Eletrônico)
  ([App Store](https://apps.apple.com/br/app/conduweb/id1199536076?l=en-GB)).
