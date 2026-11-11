# 13 — Condominium Documents

**Status:** Proposed · **Phase:** Post-MVP · **Depends on:** 02

## Summary
A central library for the condominium's official documents: convenção, regimento
interno, assembly minutes (atas), insurance policy, contracts and manuals.

_(market practice, unverified — not confirmed by the Nov/2026 survey sources.)_

## Roles
- **Síndico / administradora:** upload and organize documents, set visibility.
- **Morador:** browse and download documents visible to residents.

## User stories
- As a **morador**, I check the regimento interno to see the quiet hours.
- As a **síndico**, I publish the minutes of the last assembly for everyone.
- As a **síndico**, I keep contracts visible only to management.

## Functional requirements
1. Upload PDF/images with title, category and date.
2. Categories: convenção, regimento, atas, insurance, contracts, manuals, other.
3. Visibility: all residents, owners only, management only.
4. Versioning: new version replaces the current one, old versions kept.
5. Search by title and category.

## Data model (draft)
```prisma
model Document {
  id            String   @id @default(cuid())
  condominiumId String
  title         String
  category      String
  visibility    String   // "residents" | "owners" | "management"
  fileUrl       String
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([condominiumId, category])
}
```

## Platform & security considerations
- Private storage with short-lived signed URLs; check visibility on every download.
- On Android, opening PDFs may need a viewer plugin or download to the device.

## Open questions
- Should we index document text so residents can ask questions about the rules?
