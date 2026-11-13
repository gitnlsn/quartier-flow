# 16 — Notifications (push, email, SMS)

**Status:** Implemented slice 1 (Nov/2026): inbox + email · **Phase:** MVP (cross-cutting) · **Depends on:** 01

## Summary
One notification service used by every feature to reach users through the right
channel: in-app inbox, push (Android app and web), email and SMS.

## Roles
All roles receive notifications; each user controls their preferences.

## User stories
- As a **morador**, I get a push when a package arrives or my visitor enters.
- As a **morador**, I choose which notifications I get by email and which by push.
- As a **síndico**, urgent announcements reach everyone, even residents who disabled
  normal notifications.
- As any user, I see a notification inbox in the app with everything I received.

## Functional requirements
1. Single API: `notify({ userIds, type, payload, priority })` used by all features.
2. Channels: in-app inbox (always), push, email, SMS (urgent / security only).
3. Per-user, per-type preferences; urgent and security messages can't be disabled.
4. Templates per notification type, in Portuguese.
5. Delivery log with status per channel; retries on failure.
6. Deep links: tapping a push opens the related screen in the app.

## Implemented (slice 1, Nov/2026)
- **One entry point:** `notify({ userIds, type, title, body, url, condominiumId, data,
  excludeUserId })` in `src/server/notifications/index.ts`. Dedupes recipients, drops
  the actor, never throws into the caller (a failed notification must not fail the
  action). Text is rendered by the caller in Portuguese and frozen on the row.
- **Types** are a catalog in `src/lib/notifications.ts` (`NOTIFICATION_TYPES`): group,
  label, description, default channels, `mandatory` (can't be turned off; none yet,
  urgent avisos from 07 will be the first). Add a type there before calling `notify`.
- **Channels:** the in-app inbox always; **email** through SendPulse
  (`src/server/email/sendpulse.ts`, static API key `SEND_PULSE_API_KEY`, sender
  `EMAIL_FROM`). Without a key in development, emails are printed to the console.
  The same sender now delivers the auth emails (magic links), invites and invoices
  (`src/server/auth/messaging.ts`), which used to throw in production.
- **Delivery log:** `NotificationDelivery` per channel: `pending` → `sent` |
  `failed`, or `skipped` when the user turned that channel off. Sent right after the
  response with `after()`; on error retried with backoff (5 min, 30 min, 2 h, 12 h,
  then `failed`) by `GET /api/cron/notifications` (daily in `vercel.json`; every 15
  min on a Pro plan). A delivery is claimed before sending, so the cron and `after()`
  never send it twice. Paced to stay under SendPulse's ~10 requests/second.
- **Preferences:** `NotificationPreference` stores only the user's overrides of the
  defaults, per type. Screen: `/painel/notificacoes/preferencias`.
- **Inbox:** bell with the unread count in the sidebar (desktop) and the top bar
  (phones), polling every minute; `/painel/notificacoes` with "Marcar todas como
  lidas"; opening one marks it read and goes to its `url`. Router: `notification`.
- **Recipients helpers:** `condominiumManagers(condominiumId)` (administradora admins
  + active síndicos) and `unitResidents(unitId)` in
  `src/server/notifications/recipients.ts`.
- **First consumers:** reservations (06): request awaiting approval → managers;
  approved / rejected / canceled by the administration → the resident who booked;
  confirmed booking canceled by the resident → managers. Acordos (04): registered and
  ended → the payer (no amounts in the text). Delinquency (04, slice 2): the app's
  payment reminders (`charge.due_reminder`, `charge.overdue_reminder`) → the payer,
  escalation steps (`delinquency.escalation`) and acordos ended by the auto rule
  (`agreement.auto_broken`) → managers; sent by `GET /api/cron/delinquency`.

**Not yet:** web push (service worker + VAPID), Android push (needs the Capacitor
project, FCM), SMS (no phone numbers on users yet, provider to choose), delivery
status webhooks from SendPulse (bounces), push/SMS channels for the reminders.

**Sending domain:** `quartier-flow.com` is authenticated in SendPulse (SPF
`include:mxsspf.sendpulse.com`, DKIM `sign._domainkey`, DMARC `p=none` for now; DNS at
Squarespace) and mail goes from `contato@quartier-flow.com`. The SendPulse free plan
allows 50 emails per hour: upgrade before condominium-wide sends (07).

## Data model
```prisma
model Notification {
  id            String    @id @default(cuid())
  userId        String
  type          String
  title         String
  body          String
  url           String?
  condominiumId String?
  data          Json?
  readAt        DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([userId, createdAt])
  @@index([userId, readAt])
}

model NotificationDelivery {
  id             String    @id @default(cuid())
  notificationId String
  channel        String    // email
  status         String    @default("pending") // pending | sent | failed | skipped
  attempts       Int       @default(0)
  nextAttemptAt  DateTime  @default(now())
  error          String?
  providerId     String?
  sentAt         DateTime?
  @@index([status, nextAttemptAt])
}

model NotificationPreference {
  userId   String
  type     String
  channels String[]
  @@id([userId, type])
}
```

## Platform & security considerations
- **Android:** `@capacitor/push-notifications` with Firebase Cloud Messaging; requires a
  Firebase project and `google-services.json`. Android 13+ asks for the
  `POST_NOTIFICATIONS` runtime permission.
- **Web:** Web Push with a service worker (VAPID keys).
- Sending should go through a queue so slow providers don't block the request.
- SMS is the most expensive channel; restrict to 2FA (01), urgent notices (07) and
  optionally collection steps (04).
- Never put sensitive data (debt amounts, codes) in push previews.
- **Charge notifications overlap with Asaas** (17): Asaas can email/SMS/WhatsApp
  payers itself. If we send charge reminders, set `notificationDisabled: true` on the
  Asaas customer; otherwise don't send our own. Never both.
- **Payment reminders:** each administradora chooses the sender (04, item 6:
  `Administradora.reminderSender`). "asaas": `BillingConfig.reminder*`, synced per
  payer by `src/server/asaas/notifications.ts`. "app": `CollectionStep` sent through
  this service, with the Asaas reminders switched off for those payers.

## Open questions
- ~~Which email provider?~~ SendPulse (slice 1). SMS provider still open.
- Is WhatsApp a channel we want (business API cost and approval)?

## Market references
- _(market practice, unverified)_ Push notifications are standard in all surveyed apps.
