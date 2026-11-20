# Library Management System (LMS)

Mobile-first library management software for schools and community libraries in Kenya and East Africa.

> **Current implementation status (20 November 2026):** this repository contains the monorepo scaffold and five database foundation slices. It is not yet a usable v1.0 library management application. The v1.0 feature list below is the release target, not a claim that those workflows are implemented.

## Release target

The v1.0 MVP targets core circulation and the supporting workflows defined in the approved v1.0 MVP Requirements document. Later releases remain out of scope until the v1.0 pilot has been completed and reviewed.

The release target includes authentication and roles; catalogue and copies; search; circulation; holds; fines; member management; email and SMS notifications; a basic dashboard; and library administration/settings. See `PROGRESS.md` and `docs/requirements-traceability.md` for implementation status.

## Technology stack

| Area                      | Technology                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Monorepo                  | pnpm workspaces                                                                                               |
| Web                       | Next.js App Router, React 19, Tailwind CSS 4                                                                  |
| API                       | NestJS 12, TypeScript, REST                                                                                   |
| Database                  | PostgreSQL, Drizzle ORM, SQL migrations                                                                       |
| Tenant isolation          | PostgreSQL Row-Level Security (RLS)                                                                           |
| Cache / background jobs   | Redis is configured locally; BullMQ integration is planned, not yet present in the inspected API dependencies |
| Authentication foundation | Argon2id, JOSE JWT signing/verification, identity lookup                                                      |
| Tests                     | Vitest; API E2E and database integration test suites                                                          |
| Local supporting service  | Docker Compose (Redis only)                                                                                   |
| CI                        | GitHub Actions; workflows configured, GitHub execution not yet verified                                       |

The repository's actual package manifests are authoritative for dependency versions and available scripts.

## Current implementation

### Implemented foundation

- pnpm workspace with `apps/web`, `apps/api` and `packages/shared`.
- Next.js web application scaffold.
- NestJS API scaffold.
- PostgreSQL schema and five Drizzle SQL migrations.
- Tenant-scoped identity/member schema foundations.
- RLS and transaction-local tenant context for seven tenant-owned tables: `users`, `groups`, `member_types`, `member_profiles`, `sessions`, `otp_codes` and `audit_logs`.
- Append-only database permissions for runtime audit records.
- Restricted HMAC-based global identity lookup foundation.
- Argon2id password hashing, credential verification, and access/library-selection token signing and verification services.

### Not yet implemented as complete user workflows

Login/session endpoints, refresh rotation, logout, password reset delivery/verification, server-side application RBAC, staff member onboarding, catalogue, search, copies, circulation, holds, fine ledger, notifications, dashboard, and admin settings remain outstanding. Database tables or service foundations do not by themselves satisfy the corresponding functional requirement.

### Database migrations

The repository contains:

- `0000_slice_1_tenant_member_identity.sql`
- `0001_slice_2_auth_security.sql`
- `0002_slice_3_tenant_isolation.sql`
- `0003_slice_4_audit_logs.sql`
- `0004_slice_5_identity_lookup.sql`

The migration files are present in the repository. Whether they have been applied to a particular database must be checked against that database; do not infer live migration state from the files alone.

### Tenant isolation

The `tenants` registry is intentionally outside RLS to permit tenant discovery before authentication establishes tenant context. Tenant-owned operations use `DatabaseService.withTenant()` to set `app.tenant_id` transaction-locally. The RLS policy design fails closed when tenant context is missing.

The runtime role `lms_app` is distinct from the migration role. The restricted global identity functions are owned by `lms_identity_owner`; the runtime role accesses them through approved function execution rather than direct access to the global identity lookup table.

## Requirements and decisions

- `PROGRESS.md` is the project status register.
- `DECISIONS.md` records approved product and technical decisions.
- `docs/requirements-traceability.md` maps requirements to implementation evidence and remaining work.
- `docs/business-rules.md`, `docs/permissions.md` and `docs/acceptance-criteria.md` contain the approved working rules and test expectations, subject to the explicit decisions recorded in `DECISIONS.md`.

Key scope decisions:

- AUTH-4: manual/single-account creation only in v1.0; CSV bulk onboarding is deferred.
- GUEST is anonymous, not a persisted account role.
- Teacher/member borrowing history is self-only; parent access to a child's borrowing history is excluded from v1.0.
- Teacher/member loan renewal is not permitted; librarian/admin renewal is permitted.
- No offline checkout/return transaction workflow in v1.0; retain architectural readiness only.
- CIR-9 and FIN-3 remain P1 unless the product owner changes their priority.

## Local development

### Prerequisites

- Node.js 22 or later (the workspace currently uses Node 24 in development).
- pnpm 12.21.0 (declared in the root `package.json`).
- PostgreSQL with the required runtime and migration roles.
- Docker Engine and Docker Compose for Redis.
- Git.

### Configure environment

```bash
cp .env.example .env
```

Set local-only credentials and secrets in `.env`. The example file documents `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `REDIS_URL`, `IDENTITY_LOOKUP_HMAC_KEY`, `ACCESS_TOKEN_SECRET` and `LIBRARY_SELECTION_TOKEN_SECRET`.

Never print, commit or share `.env` contents. `.env` is ignored by the current `.gitignore`; verify this remains true before the first commit.

### Install dependencies

```bash
pnpm install
```

### Start Redis

```bash
docker compose up -d redis
docker compose ps
```

`compose.yaml` starts Redis only. PostgreSQL is managed separately and must be running/configured before database-backed tests or API operations.

### Apply database migrations

Confirm that `MIGRATION_DATABASE_URL` targets the intended local development database and that the migration role is correctly provisioned.

```bash
pnpm --filter @lms/api exec drizzle-kit migrate
```

Do not run development migrations against production.

### Run checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The root `pnpm test` runs package `test` scripts recursively. It does **not** include API E2E tests.

Run API E2E tests separately:

```bash
pnpm --filter @lms/api test:e2e
```

Database integration tests also require the dedicated local LMS database and its required roles/permissions. Check the test configuration before running them.

### Start applications

API:

```bash
pnpm --filter @lms/api start:dev
```

Web:

```bash
pnpm --filter @lms/web dev
```

The web package currently has no configured test script. Do not treat the existence of a Next.js scaffold as proof of mobile usability or completed workflows.

## Engineering principles

- Mobile-first, low-bandwidth and low-end Android support.
- Fast, reliable circulation; the checkout performance target is under one second on 3G.
- Server-side authorization and tenant isolation.
- Tenant-owned records carry `tenant_id`.
- Privacy by default, especially for minors' data, under the Kenya Data Protection Act 2019.
- Test business rules, boundary cases and permissions.
- Keep secrets in environment variables.
- Do not silently change requirements, schema or stack.

## Release gate

Before v1.0 pilot readiness, run a P0 requirement checklist, close or document gaps, verify security and permissions, validate mobile workflows, and prepare a pilot deployment guide. Do not begin v1.5 implementation before pilot feedback.
