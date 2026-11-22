# LMS v1.0 Progress

Release: v1.0 MVP — Core Circulation
Status reviewed: 21 November 2026

Status meanings:

- `todo`: not implemented.
- `doing`: implementation is partial or in progress.
- `done`: implementation satisfies the requirement and has current verification evidence.
- `deferred`: intentionally postponed with reason and release reference.
- `blocked`: cannot proceed because of an unresolved dependency or decision.

A schema foundation, dependency, scaffold or historical test run does not by itself make a functional requirement `done`. Re-run checks before relying on test counts.

## Phase 0 — Foundations

| Task                                     | Status | Notes                                                                                                                                               |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspace and application structure | done   | `apps/web`, `apps/api`, `packages/shared` exist.                                                                                                    |
| Next.js web application foundation       | done   | Next.js 16 App Router with mobile-first auth workflows (`/login`, `/forgot-password`, `/reset-password`, `/change-password`, `/profile`, `/users`). |
| NestJS API foundation                    | done   | NestJS 12 and TypeScript scaffold with `AuthModule`, `UsersModule`, `MembersModule`, `DatabaseModule`, `RedisModule`.                               |
| PostgreSQL development database          | doing  | Local PostgreSQL used in migration/test work; fresh availability and migration state must be verified when running locally.                         |
| Redis development service                | done   | Redis-only `compose.yaml` exists; RedisService handles distributed rate limiting.                                                                   |
| Drizzle ORM and migration tooling        | done   | Six SQL migration files exist (`0000` through `0005`). All application CRUD uses Drizzle ORM query builders.                                        |
| Git repository                           | done   | `main` branch with verified clean history and uncommitted implementation changes intact.                                                            |
| Project documentation                    | done   | Root docs and comprehensive `docs/auth/` section (9 docs) maintain full traceability.                                                               |
| PostgreSQL RLS policies                  | done   | RLS ENABLE and FORCE enforced on tenant-owned tables (`users`, `groups`, `member_types`, `member_profiles`, `sessions`, `otp_codes`, `audit_logs`). |
| Tenant-aware database schema             | done   | Tenant/member identity schema with `must_change_password` column on `users`.                                                                        |
| GitHub Actions CI                        | done   | CI and Security workflows verified green on commit `82c9b1d`; database-dependent API integration tests remain outside CI.                           |
| Security automation / dependency updates | doing  | Security workflow verified green on commit `82c9b1d`; ongoing dependency audits and triage remain.                                                  |

## Phase 1 — Tenant, member identity and authentication foundation

| Task                                                     | Status | Notes                                                                                                                   |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------- |
| Tenant registry (`tenants`)                              | done   | Tenant registry table exists outside RLS for pre-auth discovery.                                                        |
| Tenant-scoped users and roles (`users`)                  | done   | Schema supports tenant-specific identity, persisted roles, and `must_change_password`.                                  |
| Groups and member types                                  | done   | Tenant-aware schema foundations exist; member type tenant scoping validated in `MembersService`.                        |
| Member profiles                                          | done   | One-to-one profile schema exists; created atomically with user in `MembersService.create`.                              |
| Member identification document fields                    | done   | AES-256-GCM encrypted value and HMAC lookup hash in `MemberIdentifierService`.                                          |
| Slice 1 migration                                        | done   | `0000_slice_1_tenant_member_identity.sql` exists.                                                                       |
| Session security table                                   | done   | Session schema includes refresh-token hash, expiry, revocation, user agent, ip, replacement ID.                         |
| OTP table                                                | done   | Password-reset OTP schema with Argon2id hash, expiry, consumption timestamp, and attempt counter.                       |
| Slice 2 migration                                        | done   | `0001_slice_2_auth_security.sql` exists.                                                                                |
| Tenant RLS policies                                      | done   | Slice 3 applies ENABLE and FORCE to tenant-owned tables.                                                                |
| Transaction-local tenant context                         | done   | `DatabaseService.withTenant()` establishes transaction-local tenant context (`set_config('app.tenant_id')`).            |
| Slice 3 migration                                        | done   | `0002_slice_3_tenant_isolation.sql` exists.                                                                             |
| Audit log table and append-only runtime permissions      | done   | Slice 4; runtime application role has read/insert permissions only. Audits auth events immutably.                       |
| Slice 4 migration                                        | done   | `0003_slice_4_audit_logs.sql` exists.                                                                                   |
| Global identity lookup and restricted functions          | done   | Slice 5; HMAC-SHA-256 hashes and restricted `identity_private` SECURITY DEFINER functions.                              |
| Slice 5 migration                                        | done   | `0004_slice_5_identity_lookup.sql` exists.                                                                              |
| First-login password change schema migration             | done   | `0005_auth_4_first_login_password_change.sql` adds `must_change_password` to `users`.                                   |
| Identity normalization and lookup services               | done   | Email normalization, Kenyan phone normalization to E.164, HMAC lookup/synchronization/deletion.                         |
| Password hashing and credential verification             | done   | Argon2id password hashing and credential verification services.                                                         |
| Access and library-selection token services              | done   | JWT signing and verification services with HS256 and `mustChangePassword` payload claims.                               |
| Login/session endpoints and SessionService               | done   | `SessionService` implemented using Drizzle ORM; endpoints mounted on `/auth` and `/api/auth`.                           |
| Refresh-token rotation and logout                        | done   | Automatic refresh token rotation, replay detection revoking session lineage, and per-device logout.                     |
| Password reset OTP generation, delivery and verification | done   | `OtpService` with 6-digit random code, Argon2id hashing, 15m expiry, 5 attempt lockout, and session purge on reset.     |
| Server-side application RBAC                             | done   | `RolesGuard` and `AccessTokenGuard` enforce 6-role RBAC (`ADMIN`, `LIBRARIAN`, `TEACHER`, `MEMBER`, `PARENT`, `GUEST`). |

## Phase 2 — Catalogue

| Task                                        | Status | Notes                                                                                                                                                              |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `categories` schema table                   | done   | Hierarchical categories with optional `parent_id`; unique name per tenant; RLS enforced.                                                                           |
| `catalogue_items` schema table              | done   | Bibliographic records: title, authors, ISBN-13/10, publisher, year, language, format, description, cover, call number, shelf, category, subjects, status, metadata. |
| `copies` schema table                       | done   | Physical copies linked to catalogue items; tenant-scoped unique barcode; 7-status lifecycle; condition tracking.                                                   |
| Migration `0007_catalogue.sql`              | done   | Enums, tables, RLS policies, all indexes including GIN tsvector for SRC-1 (search-ready).                                                                          |
| `CategoriesModule`                          | done   | CRUD at `/api/categories`; Admin/Librarian write; all roles read; self-reference guard; audit log; 10 unit tests.                                                  |
| `CatalogueModule` — `CatalogueService`      | done   | List (Redis cached, 120s TTL), getById (with copies), create, update, archive; audit log; 11 unit tests.                                                           |
| `CatalogueModule` — `CopiesService`         | done   | Add, update, withdraw, transition; 7-status machine with 409 on invalid transitions; audit log; 9 unit tests.                                                      |
| `CatalogueModule` — `IsbnLookupService`     | done   | Open Library → Google Books fallback; ISBN-10→13 conversion; 5 s timeout; returns metadata for staff confirmation only.                                            |
| `CatalogueController`                       | done   | REST endpoints for catalogue items and copies; permission matrix enforced by `RolesGuard`.                                                                         |
| `PublicModule` — Public Catalogue & Enquiries | done | Public endpoints (`GET /api/public/libraries/:slug/catalogue`, `GET /api/public/libraries/:slug/catalogue/:bookId`, `POST /api/public/libraries/:slug/membership-requests`); slug-based tenant resolution; RLS isolation; approved 2-state availability; sliding-window rate limiting; 8 unit tests. |



| ID     | Priority | Status | Requirement / workstream                                  | Evidence and remaining work                                                                                                |
| ------ | -------: | :----: | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| AUTH-1 |       P0 |  done  | Email/phone and password authentication                   | E.164 Kenyan phone/email login, multi-library selection, Argon2id, generic error responses, first-login password change.   |
| AUTH-2 |       P0 |  done  | Admin, librarian, teacher, member, parent and guest roles | Server-side `RolesGuard` and `AccessTokenGuard` enforcing RBAC. 401 unauthenticated, 403 unauthorized. Tenant RLS active.  |
| AUTH-3 |       P0 |  done  | Password reset by email/SMS OTP                           | 6-digit OTP, Argon2id hash, 15m expiry, 5 attempt limit, anti-enumeration response, atomic consumption, session purge.     |
| AUTH-4 |       P0 |  done  | Staff-provisioned member accounts                         | Single-add by Admin/Librarian (`POST /api/members`); server-generated temp password; mustChangePassword=true; no CSV.      |
| AUTH-5 |       P1 |  done  | Session management, device logout, rate limiting          | Token rotation, replay detection, own session list/revocation, Redis-backed rate limiting.                                 |
| PO-1   |       P0 |  done  | Staff User Directory                                      | `GET /api/users` and `GET /api/users/:userId` restricted to Admin/Librarian; safe field projections; directory UI.         |
| PO-2   |       P0 |  done  | Self-Service Profile                                      | `GET /api/profile` and `PATCH /api/profile` for viewing and updating own profile; whitelisted fields only; role unchanged. |
| PO-3   |       P0 |  done  | Soft Account Deactivation                                 | `DELETE /api/profile` sets status to SUSPENDED, revokes sessions; transaction-locked last-admin and last-librarian checks. |
| PO-4   |       P0 |  done  | Role Promotion                                            | `POST /api/users/:userId/promote` allows Admin to promote Librarian to Admin; self-promotion rejected; audit logged.       |
| CAT-1  |       P0 |  done  | Bibliographic record create/edit/archive                  | `POST /api/catalogue`, `PATCH /api/catalogue/:id`, `DELETE /api/catalogue/:id` (soft archive); RLS; audit log; 11 unit tests. |
| CAT-2  |       P0 |  done  | ISBN metadata lookup                                      | `POST /api/catalogue/isbn-lookup`; Open Library → Google Books fallback; ISBN-13 checksum conversion; returns metadata for staff confirmation only. |
| CAT-3  |       P0 |  done  | Multiple physical copies and unique barcodes              | `POST /api/catalogue/:id/copies`; tenant-scoped unique barcode enforced at DB index and service layer; 9 unit tests.       |
| CAT-4  |       P0 |  done  | Copy statuses and transitions                             | 7-status machine (AVAILABLE/ON_LOAN/RESERVED/IN_TRANSIT/LOST/DAMAGED/WITHDRAWN); transition matrix enforced with 409 on invalid move; `CopiesService.transition()` for circulation use. |
| CAT-5  |       P0 |  done  | Categories, subjects, shelf locations and call numbers    | `categories` table with parent hierarchy; `call_number`, `shelf_location`, `subjects[]` on `catalogue_items`; `CategoriesModule` CRUD; 10 unit tests. |
| SRC-1  |       P0 |  done  | Full-text catalogue search                                | PostgreSQL GIN tsvector full-text search endpoint `GET /api/catalogue/search?q=...` with ranking and format/category filtering. |
| SRC-2  |       P0 |  done  | Catalogue filters                                         | Dynamic filtering by item format, category hierarchy, and real-time available copy toggle. |
| CIR-1  |       P0 |  done  | Checkout                                                  | Atomic loan issuance with copy status transition to ON_LOAN, concurrent borrowing limit verification, and Redis cache eviction. |
| CIR-2  |       P0 |  done  | Return and fine detection                                 | Checkin workflow calculating overdue calendar days, grace period deduction, and daily fine minor units capped at maxFine. |
| CIR-3  |       P0 |  done  | Configurable renewals; block when held                    | Renewal endpoint checking max renewals, policy duration extension, and status updates. |
| CIR-4  |       P0 |  done  | Loan policies per member type/item type                   | Loan policy resolution cascading by member type and item format with system-safe fallbacks. |
| CIR-5  |       P0 |  done  | Checkout blocks and librarian/admin override              | Verification of overdue loans, fine ceilings, and membership expiry with staff override audit logging. |
| CIR-6  |       P0 |  done  | Phone camera barcode/QR scanning                          | In-browser `zxing-wasm` multi-format scanner (QR, Code128, Code39, EAN13) with fallback manual input. |
| CIR-9  |       P1 |  todo  | Lost/damaged workflow and replacement charge              | Not implemented; remains P1.                                                                                               |
| HLD-1  |       P0 |  done  | FIFO holds on checked-out titles                          | Hold placement on titles with zero available copies; duplicate check; pickup window resolution; verified in HoldsService and CirculationService checkout integration; unit tests. |
| HLD-2  |       P0 |  done  | Ready notification and configurable expiry                | Return desk fulfillment (`fulfillNextHoldOnReturn`) reserving copy to `RESERVED` and setting pickup countdown; verification on checkout; unit tests. |
| HLD-3  |       P0 |  done  | Hold cancellation and queue management                    | Hold cancellation (patron own or staff any) with copy release if ready; queue re-indexing; full staff queue table and patron My Holds UI. |
| FIN-1  |       P0 |  done  | Configurable fine rules                                   | Daily fine, grace days, and ceiling cap per loan policy; boundary conditions verified in unit tests (zero, exactly grace, grace+1, exactly cap, exceeding cap, unlimited). |
| FIN-2  |       P0 |  done  | Fine ledger, payment and waiver                           | Append-only `fine_entries` with database mutation trigger prevention; automatic charge posting on overdue return; payment recording (`POST /api/fines/payments`); waiver recording (`POST /api/fines/waivers`) with mandatory audit reason; checkout soft blocks (CIR-5); interactive desk at `/fines`. |
| FIN-3  |       P1 |  done  | Fine receipts                                             | Tamper-proof receipt numbering (`RCP-YYYYMMDD-XXXX`), receipt modal, and printable receipt layout at `/fines`. |
| MEM-1  |       P0 |  done  | Member profiles                                           | Member directory table (`GET /api/members`), detail view (`GET /api/members/:id`), and profile edit modal (`PATCH /api/members/:id`) with admission number, class group, and notes editing; verified in unit tests and Web UI. |
| MEM-2  |       P0 |  done  | Member types and borrowing rules                          | `member_types` and `loan_policies` matrix schema; `MemberTypesService` & `MemberTypesController`; full UI at `/member-types`; unit tests. |
| PUB-CAT|       P0 |  done  | Tenant-Specific Public Catalogue                          | Isolated public catalogue at `/libraries/:slug/catalogue` and detail `/libraries/:slug/catalogue/:bookId`; search by title/author/ISBN; format & availability filters; responsive pagination; approved 2-state availability (`Available`, `On loan`, or hidden); zero patron/copy privacy leakage. |
| PUB-ENQ|       P0 |  done  | Public Membership Enquiry & Staff Review                  | Unauthenticated enquiry form at `/libraries/:slug/request-membership`; backend tenant assignment; Redis rate limiting; initial `PENDING` status; resilient email receipt dispatch; staff review queue and 1-click patron account provisioning at `/members`. |
| MEM-4  |       P0 |  done  | Borrowing history/current loans                           | Patron borrowing history & current loans endpoint (`GET /api/members/:id/loans`), staff Member History modal with active/returned loan badges and KES fine tracking; verified in unit tests and Web UI. |
| NOT-1  |       P0 |  todo  | Email notifications                                       | Notification events pending; email delivery provider configured for OTP in AUTH-3.                                         |
| NOT-2  |       P0 |  todo  | SMS notifications                                         | Notification events pending; SMS delivery provider configured for OTP in AUTH-3.                                           |
| INV-2  |       P0 |  done  | Lost/damaged/withdrawn tracking with reasons              | Comprehensive status lifecycle (AVAILABLE, ON_LOAN, RESERVED, IN_TRANSIT, LOST, DAMAGED, WITHDRAWN) with mandatory audit reason logging (`PATCH /api/catalogue/:itemId/copies/:copyId/status`, `DELETE /api/catalogue/:itemId/copies/:copyId?reason=...`), copy notes appending (`[YYYY-MM-DD] STATUS: reason`), audit trail entries (`audit_logs`), preset quick reason chips, and copy status modal UI in Next.js web. |
| RPT-1  |       P0 |  done  | Basic circulation dashboard                               | Executive & circulation dashboard endpoint (`GET /api/reports/dashboard`); real-time KPI counts (active & overdue loans, active holds, total titles & copy availability, new monthly members, outstanding & collected fines); top 5 popular borrowed titles; recent circulation activity feed; verified in unit tests and Web UI. |
| ADM-1  |       P0 |  done  | Library profile                                           | Tenant library profile (name, logo, contacts, opening hours, address, website, description, public borrowing rules summary) implemented with DDL migration 0013, AdminModule (`GET /api/admin/profile`, `PATCH /api/admin/profile`), audit logging, automated unit tests, and Next.js settings UI (`/settings`) with live preview, plus public catalogue integration. |
| ADM-2  |       P0 |  done  | Loan/fine/hold/member-type settings                       | Member-type & loan policy configuration (loanDurationDays, maxConcurrentLoans, maxRenewals, grace, daily/max fines) active. |

## Deferred Scope

| Item                                 | Deferred Release | Reason                                                                                                        |
| :----------------------------------- | :--------------: | :------------------------------------------------------------------------------------------------------------ |
| AUTH-6: SSO Integration              |       v6.0       | Schools and community libraries rely on local email/phone credentials; external identity federation deferred. |
| AUTH-7: Parent-Child Account Linking |       v4.0       | Independent accounts supported in v1.0; account hierarchy deferred to dedicated parent portal release.        |
| CSV Bulk Member Import               |       v1.5       | Manual single-account provisioning prioritized for initial school pilot; bulk validation pipeline deferred.   |
| Platform Super Admin Role            |      Future      | Multi-tenant isolation model treats tenant ADMIN as organization boundary; platform admin separate.           |
| Public Self-Registration             |    Prohibited    | Strict policy: all accounts must be provisioned by authorized library staff to prevent unauthorized access.   |

## Verification Record

Current verification run completed on **22 November 2026**:

- **pnpm typecheck**: Passed across all workspace projects (0 TypeScript errors).
- **pnpm -r --if-present lint**: Passed across all workspace projects (0 errors in Biome and Oxlint).
- **pnpm test (Unit Tests)**: 24 test files, 244 tests passed, 0 failed.
- **Controller E2E Tests**: 2 test files, 27 tests passed, 0 failed (`test/auth.controller.e2e-spec.ts`, `test/users.controller.e2e-spec.ts`).
- **Comprehensive Security Audit & Hardening**:
  - Critical concurrency hardening in checkout/return/renew with pessimistic `.for('update')`, copy status optimistic guards, and `0010_circulation_concurrency.sql` partial unique index `loans_tenant_copy_active_unique`.
  - Rate limiting IP spoofing defense using Express proxy-validated `request.ip`.
  - Scoped cookie path for refresh token (`/api/auth`) and selection token (`/api/auth/select-membership`).
  - Active user status verification in `SessionService.isSessionActive`.
  - Password complexity regex enforcement (uppercase, lowercase, number, symbol) in `ChangePasswordDto` and `ResetPasswordDto`.
  - HTTPS protocol enforcement for profile `photoUrl`.
  - Strict Content-Security-Policy (CSP) and Permissions-Policy (`camera=(self)`) configured in Next.js web application.
  - Centralized NestJS `HttpExceptionFilter` preventing internal error stack leaks.
  - Supply-chain remediation: pnpm overrides applied; `pnpm audit` reports 0 vulnerabilities.
  - Comprehensive documentation suite delivered across 15 documents in `docs/security/`.
- **Phase 2 Circulation, Holds, Fines & Public Module**: `CategoriesModule`, `CatalogueModule`, `CirculationModule`, `HoldsModule`, `FinesModule`, and `PublicModule` active; 71 unit tests across circulation, holds, fines, catalogue, and public modules; 12 migration files (`0000` through `0012_fine_ledger.sql`) with idempotent RLS, indexes, FIFO queue ordering, append-only trigger enforcement, and `app.tenant_id` context enforcement.
- **Multi-Tenant SaaS Hardening**: Removed all hardcoded library codes/fallbacks from public catalogue and enquiry pages; dynamic tenant branch selection on `/request-membership` and `/libraries/:slug/request-membership`; relative `/api/public/...` routing through Next.js proxy.
- **pnpm build**: Production build succeeded for `@lms/api` (NestJS) and `@lms/web` (Next.js 16 with 23 prerendered routes).

Verification commands:

```bash
pnpm typecheck
pnpm test
pnpm --filter @lms/api exec vitest run --config ./vitest.config.e2e.ts test/auth.controller.e2e-spec.ts test/users.controller.e2e-spec.ts
pnpm -r --if-present build
```
