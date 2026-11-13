# Quartier Flow — Feature Catalog

Each feature has its own document, numbered in **dependency order**: lower numbers are
foundations that later features build on. Status of every feature is **Proposed** until
it is scoped for a release.

Market references come from a survey of existing Brazilian condominium apps
(Superlógica, uCondo, Lello, Noknox, Conduweb, Condomob, Omeupredio, G4 Portaria) done
in Nov/2026. Items marked _(market practice, unverified)_ were not confirmed by a source.

## Roles

| Role | Description |
|---|---|
| **Morador** (resident) | Owner or tenant of a unit. Uses the web app or the Android app. |
| **Síndico** (manager) | Elected manager of a condominium. Full admin rights in that condominium. |
| **Administradora** | Management company that runs several condominiums. **Our paying customer** (seats + add-ons, 18) and the receiver of residents' payments via Asaas split (17). |
| **Portaria / Funcionário** (staff) | Doorman, janitor, maintenance staff. Limited, operational access. |

## Features

| # | Feature | Proposed phase | Depends on |
|---|---|---|---|
| [01](01-authentication-and-2fa.md) | Authentication (email link + Google) | MVP (foundation) — implemented v1 | — |
| [02](02-condominium-units-and-residents.md) | Condominium, units & residents | MVP (foundation) — implemented slice 1 | 01 |
| [03](03-billing-and-payments.md) | Billing & payments (boleto / Pix via Asaas) | MVP (foundation) — implemented slice 1 | 01, 02, 17 |
| [04](04-delinquency-management.md) | Delinquency management | MVP — implemented slices 1–2, sandbox-validated (left: voting block, needs 12) | 03, 17 |
| [05](05-financial-transparency.md) | Financial transparency & dashboard | MVP — implemented slice 1 | 03, 17 |
| [06](06-common-area-reservations.md) | Common area reservations (paid add-on) | MVP — implemented slice 1 | 02, 04, 18 |
| [07](07-announcements-board.md) | Announcements board | MVP | 02, 16 |
| [08](08-maintenance-requests.md) | Maintenance requests | MVP | 02, 16 |
| [09](09-occurrence-log.md) | Occurrence log | Post-MVP | 02 |
| [10](10-visitor-and-access-control.md) | Visitor & access control (QR / token) | MVP | 01, 02 |
| [11](11-package-management.md) | Package management | Post-MVP | 02, 16 |
| [12](12-virtual-assemblies-and-polls.md) | Virtual assemblies & polls | Post-MVP | 01, 02, 04 |
| [13](13-condominium-documents.md) | Condominium documents | Post-MVP | 02 |
| [14](14-service-providers-and-inventory.md) | Service providers & inventory | Post-MVP | 02 |
| [15](15-manager-task-calendar.md) | Manager task calendar | Post-MVP | 02 |
| [16](16-notifications.md) | Notifications (push, email, SMS) | MVP (cross-cutting) — implemented slice 1 (inbox + email) | 01 |
| [17](17-asaas-payments-platform.md) | Asaas payments platform (all money flows) | MVP (foundation, cross-cutting) — implemented slice 1 (sandbox) | 02 |
| [18](18-platform-billing.md) | Platform billing (seats + add-ons) | MVP — monthly invoices implemented | 02, 17, 19 |
| [19](19-administradora-manager-area.md) | App area for all users + administradora management | MVP — implemented slice 1 | 01, 02, 17, 18 |
| [20](20-condominium-workspace-navigation.md) | Condominium workspace navigation (switcher + modules) | MVP (cross-cutting) — implemented | 19 |

## Platform notes that apply to every feature

- **Web + Android:** the same Next.js app serves browsers and the Capacitor Android app
  (loaded via `server.url`). Features that use native capabilities (camera, push,
  QR scanning) call out how they behave in each.
- **Multi-tenancy:** `Administradora` → `Condominium` → `Unit`. Every record belongs to a
  condominium (and through it to an administradora). Every query must be scoped and
  checked against the user's role.
- **Payments:** every payment in the app goes through Asaas. See 17 before touching
  anything that involves money.
- **LGPD:** residents' personal data (CPF, phone, plates, photos, visitor data) is
  sensitive. A leak can lead to lawsuits against the condominium and fines from the ANPD.
  Collect the minimum, log access to sensitive data, and define retention periods.

## Document template

Each feature file follows the same sections: Summary, Roles, User stories, Functional
requirements, Data model (draft), Platform & security considerations, Open questions,
Market references.
