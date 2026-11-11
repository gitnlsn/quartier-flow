# 19 — Administradora Manager Area

**Status:** Implemented (slice 1, Nov/2026) · **Phase:** MVP (later in the MVP) · **Depends on:** 01, 02, 17, 18

## Summary
The administradora's back office: manage its condominiums and user accounts, complete
its payment-account KYC, and see its Quartier Flow bill.

## Roles
- **Administradora (admin user):** full access to everything below for its own
  administradora only.
- **Quartier Flow support:** can act on an administradora's behalf (audited), e.g. to
  recover an administradora admin's account (01).

## User stories
- As an **administradora**, I add a condominium and invite its síndico.
- As an **administradora**, I see all residents and síndicos across my condominiums,
  invite, deactivate or move them.
- As an **administradora**, I change a síndico's email when their account is
  compromised, which signs them out everywhere (01 recovery chain).
- As an **administradora**, I complete KYC so condominium payments reach my account.
- As an **administradora**, I see my seat count, add-ons and Quartier Flow invoices.

## Functional requirements
1. **Condominiums:** create/edit, assign síndicos (02).
2. **User accounts:** list residents and síndicos with filters (condominium, role,
   status); invite, resend invite, deactivate, reactivate.
3. **Email change** for síndicos (and residents if the síndico is unavailable):
   revoke all sessions, notify the old address, audit log (01).
4. **Payment account (KYC):** status checklist from Asaas `ACCOUNT_STATUS_*` events,
   link to complete documents (`onboardingUrl` / Asaas), rejection reasons. Resident
   charges are blocked until approved (17).
5. **Billing (18):** current seat count with breakdown, active add-ons, enable/disable
   add-ons, invoices with payment links and status.
6. **Seat impact preview:** inviting users shows how the next invoice changes.
7. **Audit log** of every administrative action.

## Platform & security considerations
- Tenant isolation: an administradora sees only its own condominiums and users;
  enforced in a tRPC middleware from the user's membership (02).
- Administradora admins can change emails, so their accounts are the most sensitive
  after Quartier support: consider requiring re-confirmation (fresh email link) before
  email changes and add-on/billing changes.
- Deactivating a user ends their seat from the next billing cycle (18).

## Open questions
- Can one administradora have several admin users with different permissions?
- Do self-managed condominiums (no administradora) exist? If so, model them as an
  administradora of one condominium.

## Implementation (slice 1)
- **One area for every user** at `/painel` (`AppShell`): residents (Minhas cobranças), síndicos (read-only condominiums), administradora admins (everything residents/síndicos see in their condominiums + management).
- Self-signup at `/cadastro` (CNPJ validated, rate-limited) → sign-in link → onboarding wizard `/painel/onboarding` (company data → plan → Asaas account/KYC).
- Light shadcn/ui theme scoped to the app area (see CLAUDE.md "App area design system").
- Not yet: multiple admin users per administradora, email change with session revocation, audit log screen.
