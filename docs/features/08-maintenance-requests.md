# 08 — Maintenance Requests

**Status:** Proposed · **Phase:** MVP · **Depends on:** 02, 16

## Summary
Residents report problems in common areas (a burnt-out lamp, a broken gate) with a
photo; the request goes to the management panel, is assigned, and is tracked to
completion.

## Roles
- **Morador:** open a request, follow its status, rate the resolution.
- **Síndico:** triage, assign, close.
- **Funcionário / prestador:** receive assignments, update status, attach "after" photos.

## User stories
- As a **morador**, I take a photo of the problem and submit it in under a minute.
- As a **síndico**, I see all open requests by priority and age.
- As a **funcionário**, I get my assigned tasks and mark them done with a photo.
- As a **morador**, I'm notified when my request is resolved.

## Functional requirements
1. Request: category, location, description, up to 5 photos.
2. Status flow: open → in progress → resolved / rejected, with comments.
3. Assignment to staff or a service provider (14).
4. Priority and SLA indicators (time open).
5. Notifications on every status change (16).
6. Duplicate hint: show open requests in the same location before submitting.

## Data model (draft)
```prisma
model MaintenanceRequest {
  id            String    @id @default(cuid())
  condominiumId String
  openedById    String
  assignedToId  String?
  category      String
  location      String
  description   String
  priority      String    @default("normal")
  status        String    @default("open")
  resolvedAt    DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  @@index([condominiumId, status])
}

model RequestAttachment {
  id        String   @id @default(cuid())
  requestId String
  url       String
  kind      String   // "before" | "after"
  createdAt DateTime @default(now())
  @@index([requestId])
}
```

## Platform & security considerations
- **Camera:** main use case for `@capacitor/camera` on Android; `<input type="file"
  accept="image/*" capture>` on web. Requires `CAMERA` permission in the Android manifest.
- Compress images client-side before upload; use `resultType: Uri`, not Base64.
- Store photos in private storage with signed URLs; strip EXIF location data.

## Open questions
- Can residents open requests about their own unit (private), or only common areas?

## Market references
- Group Software describes residents reporting a burnt-out lamp with a photo that goes
  straight to the admin panel ([Group Software](https://www.groupsoftware.com.br/blog/aplicativo-para-gestao-de-condominios)).
