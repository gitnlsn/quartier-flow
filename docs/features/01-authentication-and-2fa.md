# 01 — Authentication

**Status:** Implemented (v1) · **Phase:** MVP (foundation) · **Depends on:** —

## Summary
Passwordless sign-in for every role, open to everyone (since Nov/2026), with two methods:
**email link** (magic link) and **Google**. No passwords, no SMS.

## Decisions (Nov/2026)
| Decision | Choice | Why |
|---|---|---|
| Library | **Better Auth 1.7 (self-managed)** in the Next.js app, data in our Postgres via Prisma | Neon Auth (Managed Better Auth) was evaluated; it lacks 2FA and has no documented migration path off it. Self-managed keeps every Better Auth plugin available and works with the local Docker DB. |
| Sign-in methods | Email link + Google | Residents don't want to manage passwords. |
| Sign-up | **Open** for both methods (changed Nov/2026; was invite-only) | Anyone can create an account and become an administradora through the onboarding (19). A new account has **no role**: `/painel` welcomes it and residents/síndicos still get access only by invitation. |
| Second factor | **None** | Whoever controls the email controls the account. A compromised email is the owner's responsibility. |
| Recovery | An authorized person **updates the email** (see below) | No passwords to reset. |
| Session | 30 days, extended once a day while active | Passwordless users shouldn't need a new link every day. |

## Recovery chain (who can change whose email)
- **Quartier Flow support** → administradora
- **Administradora** → síndico
- **Síndico** → residents of their own condominium

Every email change must:
1. **Revoke all sessions** of that user (otherwise the attacker stays signed in).
2. Notify the **old** email address.
3. Write an audit log entry (who, whom, old → new, when).

To build together with feature 02 (roles and memberships don't exist yet).

## How it works
- **Email link:** `/entrar` or `/cadastro` → `POST /api/auth/sign-in/magic-link`. Any
  email gets a message ("Seu link de acesso" or, for a new address, "Crie sua conta");
  verifying it creates the account. The
  email links to `/entrar/confirmar?token=…&next=…` (`next` limited to `/painel…` paths,
  `src/lib/next-path.ts`), a page with an **Entrar** button: the
  one-time token is consumed only on click, so email security scanners that pre-open
  links don't burn it. Link valid for 15 minutes, single use, stored hashed.
- **Google:** `signIn.social({ provider: "google" })`. `disableSignUp: false`: a new
  Google account creates a user; account linking by verified email connects an
  invited user to their existing row.
  Invited users are created with `emailVerified: true` so linking works; this is safe
  because the row has no password and both ways in prove email ownership.
- **Rate limiting** (production): stored in Postgres (`rateLimit` table) because
  serverless instances don't share memory. 3 link requests/min, 10 verifications/min.

## Code map
| File | Purpose |
|---|---|
| `src/server/auth/index.ts` | Better Auth server config, `getSession()` helper |
| `src/server/auth/messaging.ts` | Email/SMS delivery. **Dev: prints to console. Prod: throws until a provider is wired.** |
| `src/app/api/auth/[...all]/route.ts` | Auth HTTP endpoints |
| `src/lib/auth-client.ts` | Browser client |
| `src/app/entrar/` | Sign-in page and link confirmation page |
| `src/app/conta/` | Protected account page (sign-out) |
| `src/server/api/trpc.ts` | `ctx.session` for `protectedProcedure` |
| `scripts/create-user.ts` | Creates a user until invitations exist |

## Before production
- [ ] Choose and wire an **email provider** in `messaging.ts` (sign-in is impossible in
      production without it).
- [ ] Set `AUTH_SECRET`, `BETTER_AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` on Vercel.
- [ ] Google Cloud Console: authorized redirect URI
      `<BETTER_AUTH_URL>/api/auth/callback/google` for each environment; own
      production OAuth client with consent screen verified.
- [ ] Apply the schema to Neon (replaces the old NextAuth tables).
- [ ] Email change + session revocation + audit log (with feature 02).

## Known limitations
- **Android app (Capacitor):** Google blocks OAuth inside WebViews
  (`disallowed_useragent`), and an email link opens in the phone's browser, not the
  app. Needs Android App Links and/or a native Google sign-in plugin before the app
  ships.
- Google sign-in callback was not tested end to end locally (needs a browser and the
  redirect URI registered in Google Cloud Console).
