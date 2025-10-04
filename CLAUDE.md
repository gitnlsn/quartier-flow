# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Quartier Flow** is a pre-launch SaaS platform for condominium management built with the T3 Stack. The current implementation is a marketing landing page with waitlist capture, targeting a Julho 2025 launch.

**Tech Stack:**
- **Framework:** Next.js 15 (App Router) + React 19
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL + Prisma ORM
- **API:** tRPC for type-safe API calls
- **Auth:** NextAuth.js v5 with Google OAuth
- **Styling:** Tailwind CSS v4
- **Animation:** Motion (Framer Motion)
- **Validation:** Zod
- **Linting:** Biome

## Development Commands

### Essential Commands
```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production

npm run typecheck        # Run both TSC and Biome checks
npm run typecheck:tsc    # TypeScript type checking only
npm run typecheck:biome  # Biome linting and formatting

npm run db:push          # Push Prisma schema to database (dev)
npm run db:studio        # Open Prisma Studio GUI
npm run script           # Run scripts with env vars: npm run script path/to/script.ts
```

### Environment Setup
Copy `.env.example` to `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - NextAuth secret (generate with `openssl rand -base64 32`)
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` - Google OAuth credentials

## Architecture

### Core Application Structure

**App Router Layout (SSG by default):**
- All pages use Static Site Generation unless explicitly using dynamic functions
- `src/app/page.tsx` - Main landing page (fully static)
- `src/app/blog/` - Blog with `generateStaticParams` for pre-rendering
- `src/app/layout.tsx` - Root layout with metadata, fonts, structured data

**tRPC API Layer:**
- `src/server/api/root.ts` - Router registry (manually register all routers here)
- `src/server/api/routers/` - Individual API routers
- `src/server/api/trpc.ts` - tRPC context and procedure builders
- Convention: All new routers must be added to `appRouter` in `root.ts`

**Database (Prisma):**
- `prisma/schema.prisma` - Single source of truth for database schema
- Models: `User`, `Account`, `Session`, `Newsletter` (+ NextAuth tables)
- After schema changes: `npm run db:push` (dev) or create migration (prod)

**Authentication:**
- `src/server/auth/config.ts` - NextAuth configuration
- Strategy: JWT (not database sessions) with 12-hour expiry
- Google OAuth with automatic token refresh
- Custom JWT callback validates user on every request

### Frontend Architecture

**Component Organization:**
- `src/app/_components/` - Shared components
- `src/app/_components/ui/` - Reusable UI primitives (Button, Container, Section, etc.)
- `src/app/_components/layouts/` - Layout components (blog-layout, etc.)

**Design System:**
- **Typography:** Saira font family (Google Fonts)
- **Color Scheme:** Black (#000) and white (#FFF) only - no grays in primary palette
- **Design Language:** Sharp edges (NO rounded corners), minimal padding (p-2 mobile standard)
- **Animations:** Only entrance animations (fade-in, slide-up) - NO scale or bounce effects
- **Responsive:** Mobile-first with p-2 (8px) mobile, scaling up for desktop

**Custom Animations (globals.css):**
- `.animate-fade-in` - Opacity 0 to 1
- `.animate-slide-up` - Slide from bottom with fade
- `.animate-spin-slow` - 20s rotation for circular text
- `.animate-delay-{100,200,300,400}` - Stagger animations
- Background patterns: `.bg-dot-pattern`, `.bg-radial-gradient`

### SEO Implementation

**Metadata Strategy:**
- Root metadata in `src/app/layout.tsx` with Open Graph, Twitter Cards, keywords
- Page-specific metadata via `generateMetadata` functions
- `src/app/sitemap.ts` - Dynamic sitemap generation
- `src/app/robots.ts` - Crawler directives
- `src/app/opengraph-image.tsx` - Social share image (1200x630px)

**Structured Data (Rich Snippets):**
- `src/app/_components/structured-data.tsx` - JSON-LD schemas
- Organization schema for company info
- WebSite schema for search
- SoftwareApplication schema for product
- FAQPage schema for FAQ rich snippets

### Path Aliases
- `~/*` maps to `src/*` (configured in tsconfig.json)
- Example: `import { api } from "~/trpc/react"`

## Development Roadmap Context

**Current Phase:** Pre-launch landing page (Beta: Maio 2025, Launch: Julho 2025)

**Planned Core Architecture (MVP - Janeiro 2025):**
1. **Payment System** (Core foundation)
2. **Resident Authentication** with 2FA (Email + SMS)
3. **Token-based Access System** for residents
4. Admin dashboard for condominium managers

**Key Principle:** Payment system + authentication unlock all subsequent features. All future features depend on these two systems being implemented first.

## Important Conventions

### TypeScript
- Strict mode enabled with `noUncheckedIndexedAccess`
- Use `type` for object shapes, `interface` for extensible contracts
- Zod schemas for all user input validation

### tRPC Patterns
```typescript
// Always use input validation
.input(z.object({ email: z.string().email() }))

// Use publicProcedure for unauthenticated, protectedProcedure for authenticated
export const newsletterRouter = createTRPCRouter({
  subscribe: publicProcedure.input(schema).mutation(async ({ ctx, input }) => {
    // ctx.db for Prisma client
  })
})
```

### Prisma Conventions
- Use `cuid()` for IDs (not autoincrement)
- Add `@@index([field])` for frequently queried fields
- Always include `createdAt` and `updatedAt` for audit trails

### Component Patterns
- Server Components by default (no "use client" unless needed)
- Client Components only for interactivity (forms, animations, state)
- Colocate related components in feature folders when appropriate

### Blog Content Structure
- Blog posts in `src/app/blog/[slug]/blog-posts.ts` with structured content sections
- Each post has: title, subtitle, category, publishedDate, readTime, heroImage, content
- Content sections typed: h2, h3, p, ul, ol, image
- Use `generateStaticParams` to pre-render all posts at build time

## Testing & Quality

- Run `npm run typecheck` before committing
- Biome handles formatting automatically (no Prettier/ESLint)
- Use `npm run db:studio` to inspect database changes
- **Warnings are acceptable** - Only TypeScript errors and Biome errors need to be fixed, warnings can be ignored

## Special Notes

- **WhatsApp Button:** Placeholder number needs real contact before launch
- **Metadata Base URL:** Update `metadataBase` in layout.tsx when domain is finalized
- **Blog Metadata Keywords:** Update keyword mappings in `blog/[slug]/page.tsx` when adding new posts
- **Environment Variables:** Validated via `src/env.js` using @t3-oss/env-nextjs - add new vars there first

## Production Considerations

- Static generation preferred for performance (landing page, blog)
- For dynamic data: use `revalidate` (ISR) or `dynamic = 'force-dynamic'` (SSR)
- NextAuth session expires after 12 hours for security
- Google OAuth requires verified email (enforced in signIn callback)
