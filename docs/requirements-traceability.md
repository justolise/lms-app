# v1.0 Requirements Traceability

Status reviewed: 21 November 2026. This document maps each requirement to evidence visible in the current repository inventory and records the remaining work. `todo` means no functional implementation evidence was found; schema-only evidence may exist. `doing` means a foundation or partial implementation exists. A requirement is `done` only after functional implementation and verification.

## Requirement map

| ID     | Priority | Status | Current evidence                                       | Remaining work                                                                                  |
| ------ | -------: | :----: | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| AUTH-1 |       P0 |  done  | Identity, password, token and session services; login/tenant-selection/change-password endpoints; mobile web login; passing unit and E2E controller tests | Core circulation and catalog integrations |
| AUTH-2 |       P0 |  done  | Server-side `RolesGuard` and `AccessTokenGuard` enforcing 6 roles (`ADMIN`, `LIBRARIAN`, `TEACHER`, `MEMBER`, `PARENT`, `GUEST`); RLS tenant isolation; unit/E2E test verification | Feature-specific circulation permissions in subsequent slices |
| AUTH-3 |       P0 |  done  | `OtpService` password reset via email/SMS OTP; Argon2id hash, 15m expiry, 5-attempt limit, anti-enumeration response, session purge; unit and E2E tests | Production SMS/SMTP credentials configuration |
| AUTH-4 |       P0 |  done  | Staff-only manual account onboarding: Admin creates Librarian, Admin/Librarian create Member (`POST /api/members`); temp password; `must_change_password` flag; unit and E2E tests | CSV bulk import deferred to v1.5 |
| AUTH-5 |       P1 |  done  | Session lifecycle management in `SessionService`: token rotation, replay detection, device logout, own session revocation, Redis rate limiting; unit and E2E tests | None |
| PO-1   |       P0 |  done  | Staff User Directory (`GET /api/users`, `GET /api/users/:userId`) restricted to Admin/Librarian; safe field projections; directory UI | None |
| PO-2   |       P0 |  done  | Self-Service Profile (`GET /api/profile`, `PATCH /api/profile`); whitelisted editable fields; role/tenant immutability | None |
| PO-3   |       P0 |  done  | Soft Account Deactivation (`DELETE /api/profile`); sets status SUSPENDED, revokes sessions; transaction-locked last-admin and last-librarian checks | None |
| PO-4   |       P0 |  done  | Role Promotion (`POST /api/users/:userId/promote`); Admin promotes Librarian to Admin; self-promotion rejected; audit logged | None |
| CAT-1  |       P0 |  done  | `CatalogueService.create/update/archive`; `POST /api/catalogue`, `PATCH /api/catalogue/:id`, `DELETE /api/catalogue/:id` (soft archive to ARCHIVED status); RLS on `catalogue_items`; audit log; 11 unit tests. | None |
| CAT-2  |       P0 |  done  | `IsbnLookupService` with Open Library → Google Books fallback; ISBN-10→ISBN-13 conversion; server-side only (no API keys in browser); returns metadata for staff confirmation. | None |
| CAT-3  |       P0 |  done  | `copies` table with tenant-scoped unique barcode; `CopiesService.addCopy`; `POST /api/catalogue/:id/copies`; barcode uniqueness enforced at DB index and service layer; 9 unit tests. | None |
| CAT-4  |       P0 |  done  | 7-status machine (AVAILABLE/ON_LOAN/RESERVED/IN_TRANSIT/LOST/DAMAGED/WITHDRAWN); `ALLOWED_TRANSITIONS` matrix enforced in `CopiesService`; 409 on invalid transition; `transition()` exported for Circulation use. | Fully verified across circulation issue/return/lost/damaged transitions. |
| CAT-5  |       P0 |  done  | `categories` table with optional `parent_id` hierarchy; `call_number`, `shelf_location`, `subjects[]`, `category_id` on `catalogue_items`; `CategoriesModule` CRUD; 10 unit tests. | None |
| SRC-1  |       P0 |  done  | Full-text catalogue search by title, author, ISBN using PostgreSQL tsvector and GIN index; implemented in `CatalogueService.search` and `PublicService.getPublicCatalogue`. | Verified with unit tests in `catalogue.service.spec.ts` and `public.service.spec.ts`. |
| SRC-2  |       P0 |  done  | Filtering by item format, category, publication year, and available copies toggle; server-side pagination with page, limit, totalPages. | Verified in `CatalogueService` and `PublicService` with UI chips and pagination controls. |
| PUB-CAT|       P0 |  done  | Tenant-specific public catalogue (`/libraries/:slug/catalogue`) and book detail (`/libraries/:slug/catalogue/:bookId`); Section 2.4 approved 2-state availability (`Available`, `On loan`, hidden). | Verified in `PublicService`, unit tests, and Next.js Turbopack build. |
| PUB-ENQ|       P0 |  done  | Tenant-specific public membership enquiry form (`/libraries/:slug/request-membership`); Redis rate limiting; initial PENDING status; resilient email receipt dispatch; staff review desk at `/members`. | Verified in `PublicService`, `MembersController`, and `MembersDeskPage`. |
| CIR-1  |       P0 |  done  | Atomic loan issuance with copy status transition to `ON_LOAN`, concurrent borrowing limit checks, policy due-date calculation, and idempotency protection | Implemented in `CirculationService.checkout`, `CirculationController`, and Web UI desk; unit tests verified. |
| CIR-2  |       P0 |  done  | Return workflow calculating overdue calendar days, grace period deduction, fine debit posting, and hold fulfillment handoff | Implemented in `CirculationService.returnCopy`; unit tests verified. |
| CIR-3  |       P0 |  done  | Renewal endpoint checking max renewals, policy duration extension, and hold queue blocks | Implemented in `CirculationService.renewLoan`; unit tests verified. |
| CIR-4  |       P0 |  done  | Loan policy resolution cascading by member type and item format with system-safe fallbacks and missing policy blocks | Implemented in `MemberTypesService` and `CirculationService`; unit tests verified. |
| CIR-5  |       P0 |  done  | Checkout blocks for suspended accounts, expired membership, and fine ceilings with mandatory staff override logging | Implemented in `CirculationService.checkout` with audit logging; unit tests verified. |
| CIR-6  |       P0 |  done  | Phone camera barcode and QR scanning with manual input fallback | Implemented using `@zxing/wasm` multi-format scanner component in `apps/web/features/circulation`. |
| CIR-9  |       P1 |  done  | Lost/damaged workflow with reason capture, status transition, automated loan closure, and fine replacement charge assessment | Implemented in `CirculationService.markLostDamaged`, `CirculationController`, and `/circulation` UI; 7 unit tests verified. |
| HLD-1  |       P0 |  done  | Fair FIFO holds queue on checked-out titles with duplicate checks and pickup window resolution | Implemented in `HoldsService.placeHold`, `HoldsController`, and `/holds` UI; unit tests verified. |
| HLD-2  |       P0 |  done  | Return desk hold fulfillment reserving copies for ready claimants and setting pickup expiry window | Implemented in `HoldsService.fulfillNextHoldOnReturn` and `CirculationService`; unit tests verified. |
| HLD-3  |       P0 |  done  | Hold cancellation (patron self-cancel or staff desk) with ready copy release and queue re-indexing | Implemented in `HoldsService.cancelHold`; unit tests verified. |
| FIN-1  |       P0 |  done  | Configurable fine rules with daily rate, grace days, and ceiling caps per loan policy | Implemented in `FinesService`, `MemberTypesService`, and policy matrix; unit tests verified. |
| FIN-2  |       P0 |  done  | Append-only fine ledger with database mutation triggers, payments recording, and waivers with mandatory reason capture | Implemented in `FinesService`, `FinesController`, and `/fines` UI; unit tests verified. |
| FIN-3  |       P1 |  done  | Tamper-proof fine payment receipts with sequential numbering and printable receipt layouts | Implemented in `FinesService` and Web receipt modal (`RCP-YYYYMMDD-XXXX`). |
| MEM-1  |       P0 |  done  | Member directory, detail views, and profile editing modal with admission number, class group, and notes | Implemented in `MembersService`, `MembersController`, and `/members` UI; unit tests verified. |
| MEM-2  |       P0 |  done  | Member types and borrowing policy matrix configuration | Implemented in `MemberTypesService`, `MemberTypesController`, and `/member-types` UI; unit tests verified. |
| MEM-4  |       P0 |  done  | Patron borrowing history and current loans access with self-only and staff-authorized visibility | Implemented in `MembersService.getMemberLoans` and Web UI history modal; unit tests verified. |
| NOT-1  |       P0 |  done  | Automated email notifications for due-soon, overdue, hold-ready, and fine events with deduplication keys | Implemented in `NotificationsModule`, `EmailDeliveryService`; unit tests verified. |
| NOT-2  |       P0 |  done  | Automated SMS notifications via Africa's Talking with strict Africa/Nairobi quiet hours (20:00–07:00 EAT) deferral | Implemented in `SmsDeliveryService`; unit tests verified. |
| INV-2  |       P0 |  done  | Lost, damaged, and withdrawn copy tracking with mandatory reason capture, copy notes history, and audit trail | Implemented in `CopiesService.transition` and Web copy status modal; unit tests verified. |
| RPT-1  |       P0 |  done  | Real-time circulation and executive dashboard with KPI counters, popular titles, and activity feed (< 2s) | Implemented in `ReportsService.getDashboardMetrics`, `ReportsController`, and `/dashboard` UI; unit tests verified. |
| ADM-1  |       P0 |  done  | Library tenant profile branding (name, logo, operating hours, contacts, address, borrowing rules summary) | Implemented in `AdminService`, `AdminController`, and `/settings` UI; unit tests verified. |
| ADM-2  |       P0 |  done  | Policy configuration matrix for loans, fines, renewals, and member types | Implemented in `MemberTypesController` and `/member-types` UI; unit tests verified. |
| PLAT-1 |       P0 |  done  | Platform Super Admin isolated boundary, dedicated session management, and dual HttpOnly cookies | Implemented in `PlatformAuthService`, `PlatformSessionService`, `PlatformAuthController`, and `/platform/login`; unit tests verified. |
| PLAT-2 |       P0 |  done  | Two-Step TOTP Multi-Factor Authentication with AES-256-GCM encrypted secret persistence | Implemented in `PlatformMfaService`; 11 unit tests verified. |
| PLAT-3 |       P0 |  done  | Multi-tenant lifecycle directory and provisioning with slug resolution and status controls | Implemented in `PlatformTenantsService`, `PlatformTenantsController`, and `/platform/tenants`; unit tests verified. |
| PLAT-4 |       P0 |  done  | Tenant initial administrator provisioning and emergency credential resets | Implemented in `PlatformTenantAdminsService`, `PlatformTenantAdminsController`, and `/platform/tenants/[id]`; unit tests verified. |
| PLAT-5 |       P0 |  done  | Platform telemetry, memory usage, PostgreSQL/Redis health probes, and uptime monitoring | Implemented in `PlatformMonitoringService`, `HealthController`, and `/platform/monitoring`; unit tests verified. |
| PLAT-6 |       P0 |  done  | Platform append-only audit trail explorer with action, actor, tenant, IP, and metadata filters | Implemented in `PlatformAuditLogsService`, `PlatformAuditLogsController`, and `/platform/audit-logs`; unit tests verified. |
| PLAT-POL|      P0 |  done  | 9 Kenya Data Protection Act 2019 compliant legal and operational policies deployed at `/legal/*` | Implemented in Next.js public routes with responsive sidebar and search index; verified in web build. |
| INFRA-1|       P0 |  done  | Production Docker Compose orchestration, Alpine multi-stage Dockerfiles, and standalone migration runner | Implemented in `docker-compose.yml`, `apps/api/Dockerfile`, `apps/web/Dockerfile`, `apps/api/src/database/migrate.ts`. |

## Cross-cutting foundations

| Area             | Evidence                                                           | Boundary                                                                                 |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Workspace        | pnpm workspace; `apps/web`, `apps/api`, `packages/shared`          | Monorepo configuration active with shared packages and clean builds                     |
| Web              | Next.js 16 App Router (Turbopack, React 19, Tailwind CSS 4)        | 48 static and partial prerendered routes across public, workspace, and platform groups   |
| API              | NestJS 12 modular REST API                                         | 15 active modules with full controller, service, guard, and Drizzle ORM implementation   |
| Database         | 15 Drizzle SQL migrations (`0000` through `0015_platform_saas_core.sql`) | PostgreSQL 16 with Row-Level Security, append-only triggers, and isolation schemas       |
| Tenant isolation | RLS on all tenant-owned tables; transaction-local tenant context   | Dedicated Platform Super Admin domain operating outside tenant RLS with TOTP MFA        |
| Audit            | `audit_logs` schema with append-only runtime grants                | Full application and platform audit logging with UI explorers                            |
| Identity         | HMAC identity lookup and restricted database functions             | AES-256-GCM encryption for ID docs and MFA secrets; E.164 phone normalization            |
| Passwords/tokens | Argon2id and JOSE dual-token JWT architecture                      | Refresh token rotation with replay detection and automatic session lineage revocation   |
| Redis            | Redis 7 container and `RedisService`                               | Sliding-window rate limiting, distributed caching (120s TTL), and session management     |
| CI / CD          | `.github/workflows/ci.yml` and `.github/workflows/security.yml`    | Green on `main` branch with lint, typecheck, unit tests, and production builds           |
| Deployment       | Docker Compose orchestration & multi-stage Alpine Dockerfiles      | Containerized API, Web, PostgreSQL, Redis, and Migrator with persistent volumes          |

## Verification evidence policy

- Link code paths and test names when a requirement's implementation is added.
- Record the exact command and result for each verification run.
- Do not carry historical test totals forward as current results without rerunning.
- Database schema existence is evidence for a schema subtask only.
- A requirement becomes `done` only after functional behaviour, automated tests, permissions, mobile viewport and documentation updates are verified.

## Source and approved scope notes

The v1.0 MVP Requirements document and Product Owner decisions in `DECISIONS.md` define the requirement baseline:

- AUTH-4 is manual/single-add only in v1.0; CSV import is deferred to v1.5.
- CIR-9 and FIN-3 are fully implemented and verified in v1.0.
- Platform Super Admin is fully implemented in v1.0 with dedicated MFA, tenant provisioning, monitoring, and audit logs.
- Public catalogue and membership enquiries are fully isolated by tenant slug.
- All frontend API calls are centrally governed via `apps/web/lib/api/endpoints.ts`.
