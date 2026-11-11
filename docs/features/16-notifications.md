# 16 — Notifications (push, email, SMS)

**Status:** Proposed · **Phase:** MVP (cross-cutting) · **Depends on:** 01

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

## Data model (draft)
```prisma
model Notification {
  id        String    @id @default(cuid())
  userId    String
  type      String
  payload   Json
  readAt    DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@index([userId, createdAt])
}

model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  platform  String   // "android" | "web"
  token     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
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

## Open questions
- Which email and SMS providers?
- Is WhatsApp a channel we want (business API cost and approval)?

## Market references
- _(market practice, unverified)_ Push notifications are standard in all surveyed apps.
