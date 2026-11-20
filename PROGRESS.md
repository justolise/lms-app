# LMS v1.0 Progress

Release: v1.0 MVP — Core Circulation
Status reviewed: 20 November 2026

Status meanings:

- `todo`: not implemented.
- `doing`: implementation is partial or in progress.
- `done`: implementation satisfies the requirement and has current verification evidence.

A schema foundation, dependency, scaffold or historical test run does not by itself make a functional requirement `done`. Re-run checks before relying on old test counts.

## Phase 0 — Foundations

| Task                                     | Status | Notes                                                                                                                                   |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspace and application structure | done   | `apps/web`, `apps/api`, `packages/shared` exist.                                                                                        |
| Next.js web application foundation       | done   | Next.js App Router scaffold exists; product workflows are not complete.                                                                 |
| NestJS API foundation                    | done   | NestJS 12 and TypeScript scaffold exists.                                                                                               |
| PostgreSQL development database          | doing  | Local PostgreSQL was used in earlier migration/test work; fresh availability and migration state must be verified when running locally. |
| Redis development service                | done   | Redis-only `compose.yaml` exists.                                                                                                       |
| Drizzle ORM and migration tooling        | done   | Five SQL migration files exist.                                                                                                         |
| Git repository                           | done   | `main` contains commit `82c9b1d`; current reconciliation changes are uncommitted. |
| Project documentation                    | doing  | Root docs exist; this reconciliation updates accuracy and traceability.                                                                 |
| PostgreSQL RLS policies                  | done   | RLS ENABLE and FORCE recorded for seven tenant-owned tables in the five-slice implementation.                                           |
| Tenant-aware database schema             | done   | Initial tenant/member identity schema and constraints exist.                                                                            |
| GitHub Actions CI                        | done   | CI and Security workflows verified green on commit `82c9b1d`; database-dependent API E2E and integration tests remain outside CI. |
| Security automation / dependency updates | doing  | Security workflow verified green on commit `82c9b1d`; finding triage, remediation and ongoing dependency review remain. |

## Phase 1 — Tenant, member identity and authentication foundation

| Task                                                     | Status | Notes                                                                                                                         |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Tenant registry (`tenants`)                              | done   | Tenant registry table exists.                                                                                                 |
| Tenant-scoped users and roles (`users`)                  | done   | Schema supports tenant-specific identity and persisted roles.                                                                 |
| Groups and member types                                  | done   | Tenant-aware schema foundations exist; management workflows remain outstanding.                                               |
| Member profiles                                          | done   | One-to-one profile schema exists; member management is not complete.                                                          |
| Member identification document fields                    | done   | One optional document; encrypted-value and lookup-hash fields are present in schema.                                          |
| Slice 1 migration                                        | done   | `0000_slice_1_tenant_member_identity.sql` exists.                                                                             |
| Session security table                                   | done   | Session schema includes refresh-token hash, expiry, revocation and replacement fields.                                        |
| OTP table                                                | done   | Password-reset OTP schema exists; OTP workflows/delivery remain outstanding.                                                  |
| Slice 2 migration                                        | done   | `0001_slice_2_auth_security.sql` exists.                                                                                      |
| Tenant RLS policies                                      | done   | Slice 3 applies ENABLE and FORCE to six tenant-owned tables.                                                                  |
| Transaction-local tenant context                         | done   | `DatabaseService.withTenant()` establishes transaction-local tenant context.                                                  |
| Slice 3 migration                                        | done   | `0002_slice_3_tenant_isolation.sql` exists.                                                                                   |
| Audit log table and append-only runtime permissions      | done   | Slice 4; runtime application role has read/insert permissions only.                                                           |
| Slice 4 migration                                        | done   | `0003_slice_4_audit_logs.sql` exists.                                                                                         |
| Global identity lookup and restricted functions          | done   | Slice 5; HMAC-SHA-256 hashes and restricted SECURITY DEFINER functions.                                                       |
| Slice 5 migration                                        | done   | `0004_slice_5_identity_lookup.sql` exists.                                                                                    |
| Identity normalization and lookup services               | done   | Email normalization, Kenyan phone normalization to E.164, HMAC lookup/synchronization/deletion.                               |
| Password hashing and credential verification             | done   | Argon2id and credential verification services exist with unit tests in the prior checkpoint.                                  |
| Access and library-selection token services              | done   | JWT signing and verification services exist.                                                                                  |
| Login/session endpoints and SessionService               | todo   | No login/session controller/service workflow in current source inventory.                                                     |
| Refresh-token rotation and logout                        | todo   | Session table exists; operational session lifecycle remains outstanding.                                                      |
| Password reset OTP generation, delivery and verification | todo   | OTP table exists; application workflow remains outstanding.                                                                   |
| Server-side application RBAC                             | todo   | Role schema/payload foundations exist; guards and endpoint authorization are not implemented in the current source inventory. |

## Requirement status — v1.0

| ID     | Priority | Status | Requirement / workstream                                  | Evidence and remaining work                                                                                                 |
| ------ | -------: | ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| AUTH-1 |       P0 | doing  | Email/phone and password authentication                   | Identity, Argon2id, credential verification and token services exist. Login/session endpoints and session lifecycle remain. |
| AUTH-2 |       P0 | doing  | Admin, librarian, teacher, member, parent and guest roles | Five persisted/authenticated roles exist; GUEST is anonymous and excluded from JWT authentication. JWT role validation verified; server-side authorization remains. |
| AUTH-3 |       P0 | todo   | Password reset by email/SMS OTP                           | OTP table only; generation, delivery, verification and throttling remain.                                                   |
| AUTH-4 |       P0 | todo   | Staff-provisioned member accounts                         | Manual/single-add only in v1.0; account creation workflow remains. CSV import deferred.                                     |
| CAT-1  |       P0 | todo   | Bibliographic record create/edit/archive                  | Not implemented.                                                                                                            |
| CAT-2  |       P0 | todo   | ISBN metadata lookup                                      | Not implemented.                                                                                                            |
| CAT-3  |       P0 | todo   | Multiple physical copies and unique barcodes              | Not implemented.                                                                                                            |
| CAT-4  |       P0 | todo   | Copy statuses and transitions                             | Not implemented.                                                                                                            |
| CAT-5  |       P0 | todo   | Categories, subjects, shelf locations and call numbers    | Not implemented.                                                                                                            |
| SRC-1  |       P0 | todo   | Full-text catalogue search                                | Not implemented.                                                                                                            |
| SRC-2  |       P0 | todo   | Catalogue filters                                         | Not implemented.                                                                                                            |
| CIR-1  |       P0 | todo   | Checkout                                                  | Not implemented.                                                                                                            |
| CIR-2  |       P0 | todo   | Return and fine detection                                 | Not implemented.                                                                                                            |
| CIR-3  |       P0 | todo   | Configurable renewals; block when held                    | Not implemented.                                                                                                            |
| CIR-4  |       P0 | todo   | Loan policies per member type/item type                   | Not implemented.                                                                                                            |
| CIR-5  |       P0 | doing  | Checkout blocks and librarian/admin override              | Membership-expiry schema field exists; checkout enforcement, override and audit workflow remain.                            |
| CIR-6  |       P0 | todo   | Phone camera barcode/QR scanning                          | Not implemented.                                                                                                            |
| CIR-9  |       P1 | todo   | Lost/damaged workflow and replacement charge              | Not implemented; remains P1.                                                                                                |
| HLD-1  |       P0 | todo   | FIFO holds on checked-out titles                          | Not implemented.                                                                                                            |
| HLD-2  |       P0 | todo   | Ready notification and configurable expiry                | Not implemented.                                                                                                            |
| HLD-3  |       P0 | todo   | Hold cancellation and queue management                    | Not implemented.                                                                                                            |
| FIN-1  |       P0 | todo   | Configurable fine rules                                   | Not implemented.                                                                                                            |
| FIN-2  |       P0 | todo   | Fine ledger, payment and waiver                           | Not implemented.                                                                                                            |
| FIN-3  |       P1 | todo   | Fine receipts                                             | Not implemented; remains P1.                                                                                                |
| MEM-1  |       P0 | doing  | Member profiles                                           | Profile/group/identification schema foundations exist; member workflows and UI remain.                                      |
| MEM-2  |       P0 | doing  | Member types and borrowing rules                          | `member_types` schema exists; policy configuration/enforcement remain.                                                      |
| MEM-4  |       P0 | todo   | Borrowing history/current loans                           | Not implemented.                                                                                                            |
| NOT-1  |       P0 | todo   | Email notifications                                       | Not implemented.                                                                                                            |
| NOT-2  |       P0 | todo   | SMS notifications                                         | Not implemented.                                                                                                            |
| INV-2  |       P0 | todo   | Lost/damaged/withdrawn tracking with reasons              | Not implemented.                                                                                                            |
| RPT-1  |       P0 | todo   | Basic circulation dashboard                               | Not implemented.                                                                                                            |
| ADM-1  |       P0 | todo   | Library profile                                           | Not implemented.                                                                                                            |
| ADM-2  |       P0 | todo   | Loan/fine/hold/member-type settings                       | Not implemented.                                                                                                            |
| AUTH-5 |       P1 | doing  | Session management, device logout, rate limiting          | Tracked within AUTH-1 by product-owner decision; no separate duplicate workstream.                                          |

## Engineering and non-functional requirements

| ID / area                                                  | Status | Notes                                                                                                                          |
| ---------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| INFRA-1 — Monorepo scaffold                                | done   | Workspace and application scaffolds exist.                                                                                     |
| INFRA-2 — CI                                               | doing  | CI and Security workflows verified green on commit `82c9b1d`; database-dependent API E2E and integration tests remain outside CI. |
| INFRA-3 — Local PostgreSQL + Redis Compose and env example | doing  | `.env.example` exists; Compose currently starts Redis only, not PostgreSQL.                                                    |
| INFRA-4 — Database baseline                                | doing  | Five migrations and RLS/audit/identity foundations exist; complete product schema is not implemented.                          |
| NFR-1 — Daily automated backups                            | todo   | No backup automation or restore evidence.                                                                                      |
| NFR-2 — Privacy and minors' data                           | doing  | Tenant isolation and privacy decisions exist; consent, access workflows, retention and operational compliance evidence remain. |
| NFR-3 — Search/checkout performance                        | todo   | No measured p95 search or 3G checkout benchmark; the relevant features are not implemented.                                    |
| Mobile/browser verification                                | todo   | No end-to-end mobile/browser evidence.                                                                                         |
| Production deployment and monitoring                       | todo   | Not configured or verified.                                                                                                    |

## Verification record

The previous implementation checkpoint reported 42 unit tests, 38 API E2E tests and 37 database integration tests passing, with TypeScript typecheck, Oxlint and NestJS build passing. These are historical results, not a fresh run from this documentation update. Re-run the checks before using them as current release evidence.

Root commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @lms/api test:e2e
```

`pnpm test` does not include API E2E tests. Database integration tests require the dedicated local PostgreSQL test setup.

## Next implementation gate

Continue with one approved vertical slice at a time. Do not mark a functional requirement `done` until its implementation, automated tests, role permissions and mobile behaviour have been verified and recorded here.
