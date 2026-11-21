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
| CAT-4  |       P0 |  done  | 7-status machine (AVAILABLE/ON_LOAN/RESERVED/IN_TRANSIT/LOST/DAMAGED/WITHDRAWN); `ALLOWED_TRANSITIONS` matrix enforced in `CopiesService`; 409 on invalid transition; `transition()` exported for Circulation use. | Circulation runtime enforcement at CIR-1/CIR-2 |
| CAT-5  |       P0 |  done  | `categories` table with optional `parent_id` hierarchy; `call_number`, `shelf_location`, `subjects[]`, `category_id` on `catalogue_items`; `CategoriesModule` CRUD; 10 unit tests. | None |
| SRC-1  |       P0 | todo   | No search module found                                 | PostgreSQL full-text search and p95 benchmark                                                   |
| SRC-2  |       P0 | todo   | No catalogue filter implementation found               | Availability/category/language/format/year filters                                              |
| CIR-1  |       P0 | todo   | No circulation module found                            | Barcode/member checkout, due date, idempotency and latency test                                 |
| CIR-2  |       P0 | todo   | No return workflow found                               | Return, overdue calculation, fine posting, hold handoff                                         |
| CIR-3  |       P0 | todo   | No renewal workflow found                              | Policy limits, hold block and role restrictions                                                 |
| CIR-4  |       P0 | todo   | Member type schema only                                | Item-format loan policies and missing-policy block                                              |
| CIR-5  |       P0 | doing  | Membership-expiry schema field; audit table foundation | Enforce suspended-account, expired-membership and fine-threshold blocks; allow ADMIN/LIBRARIAN overrides only for these blocks with mandatory reason and audit; keep copy-status and max-item-limit blocks non-overridable; verify checkout behaviour |
| CIR-6  |       P0 | todo   | No scanner UI found                                    | Camera barcode/QR scanner and manual fallback                                                   |
| CIR-9  |       P1 | todo   | No lost/damaged workflow found                         | Reason capture, copy status and replacement charge                                              |
| HLD-1  |       P0 | todo   | No holds module found                                  | Hold eligibility and FIFO queue                                                                 |
| HLD-2  |       P0 | todo   | No ready/expiry workflow found                         | Ready state, configurable expiry and notification trigger                                       |
| HLD-3  |       P0 | todo   | No hold management found                               | Member self-cancel and librarian queue management                                               |
| FIN-1  |       P0 | todo   | No fine rules module found                             | Per-day amount, cap, grace and item-format rules                                                |
| FIN-2  |       P0 | todo   | Audit table only; no fine ledger found                 | Append-only charge/payment/waiver ledger, reason and audit                                      |
| FIN-3  |       P1 | todo   | No receipt workflow found                              | Receipt generation and retrieval                                                                |
| MEM-1  |       P0 | doing  | Member profile/group/identification schema             | Member CRUD, contacts/photo and staff permissions                                               |
| MEM-2  |       P0 |  done  | `member_types` and `loan_policies` schema, matrix configuration, `MemberTypesService`, `MemberTypesController`, `/member-types` web UI, unit tests | Checkout runtime enforcement at CIR-4 |
| MEM-4  |       P0 | todo   | No loans/history module found                          | Current loans and self-only history access                                                      |
| NOT-1  |       P0 | todo   | No email delivery module found                         | Due-soon/overdue/hold-ready/fine events, dedupe, retry and status                               |
| NOT-2  |       P0 | todo   | No SMS integration found                               | Africa's Talking or approved alternative, quiet hours, retry/status                             |
| INV-2  |       P0 | todo   | No inventory workflow found                            | Lost/damaged/withdrawn reason and availability exclusion                                        |
| RPT-1  |       P0 | todo   | No dashboard module found                              | Active loans, overdue, popular titles, new members; under-2s target                             |
| ADM-1  |       P0 | todo   | No library profile module found                        | Name/logo/hours/contact management and presentation                                             |
| ADM-2  |       P0 |  done  | Member type & borrowing/fine policy settings API & UI (`MemberTypesController`, `loan_policies`), admin-only RBAC, audit logging | Remaining hold policies when HLD module lands |

## Cross-cutting foundations

| Area             | Evidence                                                           | Boundary                                                                                 |
| ---------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Workspace        | pnpm workspace; `apps/web`, `apps/api`, `packages/shared`          | Scaffold only                                                                            |
| Web              | Next.js App Router package                                         | No functional LMS UI evidenced                                                           |
| API              | NestJS app, database and auth modules                              | Feature modules absent from inspected source inventory                                   |
| Database         | Five Drizzle migrations                                            | Core catalogue/circulation/fines schema not yet present                                  |
| Tenant isolation | RLS on seven tenant-owned tables; transaction-local tenant context | Does not replace application RBAC                                                        |
| Audit            | `audit_logs` schema and append-only runtime grants                 | Application event workflows/UI remain                                                    |
| Identity         | HMAC identity lookup and restricted database functions             | Does not constitute login/session endpoints                                              |
| Passwords/tokens | Argon2id and JOSE token services                                   | Does not constitute complete authentication                                              |
| Redis            | Redis-only Compose service                                         | PostgreSQL is separate; BullMQ integration not evidenced                                 |
| CI               | `.github/workflows/ci.yml` and `.github/workflows/security.yml` | Both workflows verified green on commit `82c9b1d`; database-dependent API E2E and integration tests remain excluded from CI |
| Backups          | No automation or restore evidence                                  | Operational requirement outstanding                                                      |

## Verification evidence policy

- Link code paths and test names when a requirement's implementation is added.
- Record the exact command and result for each verification run.
- Do not carry historical test totals forward as current results without rerunning.
- Database schema existence is evidence for a schema subtask only.
- A requirement becomes `done` only after functional behaviour, automated tests, permissions, mobile viewport and documentation updates are verified.

## Source and approved scope notes

The v1.0 MVP Requirements document is the requirement baseline. The PRD is marked Draft; approved product-owner decisions in `DECISIONS.md` resolve known conflicts.

- AUTH-4 is manual/single-add only in v1.0; CSV import is deferred.
- AUTH-5 is tracked inside AUTH-1 implementation, while retaining its P1 identity.
- CIR-9 and FIN-3 remain P1.
- Offline circulation transactions are deferred; no offline checkout/return workflow in v1.0.
- Parent-child access to borrowing history is deferred; parents do not see child history in v1.0.
- Membership expiry and CIR-5 enforcement are in v1.0; broader membership renewal is deferred.
- Security audit events are required in v1.0; standalone audit-log UI is deferred.
