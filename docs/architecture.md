# Architecture — Current State and Target Boundaries

Reviewed 20 November 2026. This document distinguishes repository evidence from planned architecture.

## Current repository layout

```text
apps/
  api/       NestJS 12 API, Drizzle schema/migrations, auth foundation
  web/       Next.js 16 App Router application scaffold
packages/
  shared/    Shared package scaffold
```

## Current stack

- Workspace: pnpm 12.21.0.
- Web: Next.js 16.4.6, React 19.3.0, Tailwind CSS 4.3.3.
- API: NestJS 12, TypeScript, REST.
- Data: PostgreSQL, Drizzle ORM 0.45.4, Drizzle Kit migrations.
- Tenant isolation: PostgreSQL RLS.
- Redis: Redis 7 Alpine through Docker Compose, bound to loopback.
- Auth foundation: Argon2id, JOSE JWT services, HMAC identity lookup.
- API tests: Vitest; unit, E2E and database integration configurations exist.

The package manifests are the source of truth for installed dependencies. BullMQ, provider integrations and Playwright are not evidenced in the inspected current API/web package manifests.

## Current API module inventory

The inspected `apps/api/src` tree contains:

- `AppModule`, `AppController`, `AppService`
- `DatabaseModule`, `DatabaseService`, Drizzle schema
- `AuthModule`
- identity normalization and identity lookup services
- password service
- token service and token payload DTOs

The inspected `AppModule` imports the auth foundation only. Catalogue, search, circulation, holds, fines, member workflows, notifications, dashboard and admin settings modules were not present in the inspected source inventory.

## Database foundation

Five migration files exist:

1. Tenant/member identity schema.
2. Session and OTP security schema.
3. Tenant RLS policies.
4. Audit log schema and grants.
5. Global identity lookup and restricted functions.

Tenant-owned RLS tables recorded in the implementation are `users`, `groups`, `member_types`, `member_profiles`, `sessions`, `otp_codes` and `audit_logs`. The `tenants` registry is intentionally outside RLS to support tenant discovery before authenticated tenant context exists.

Tenant-scoped database operations use `DatabaseService.withTenant()` to validate tenant identity and establish `app.tenant_id` transaction-locally. Missing tenant context must fail closed.

The global identity lookup stores HMAC-SHA-256 hashes rather than raw email/phone. Restricted SECURITY DEFINER functions are owned by `lms_identity_owner`; the runtime `lms_app` role does not receive direct lookup-table access.

## Authentication foundation boundary

Implemented service-level foundations include identity normalization/lookup, Argon2id password hashing, credential verification and access/library-selection token signing and verification.

Not yet implemented as complete workflows: login endpoint, SessionService, refresh-token rotation, logout, OTP generation/delivery/verification, rate limiting and server-side RBAC guards.

## Runtime topology

- `compose.yaml` starts Redis only.
- PostgreSQL is provisioned separately.
- `.env.example` defines runtime/migration database URLs, Redis URL, HMAC key and token secrets.
- CI workflows are configured in `.github/workflows/ci.yml` and `.github/workflows/security.yml`; GitHub execution has not yet been verified.
- No deployment environment, production host, monitoring stack or backup automation was found in the inspected repository.

## Target architecture (not yet implemented)

The v1.0 target adds catalogue/copies, search, circulation, holds, fine ledger, member management, email/SMS notification workers, dashboard and admin settings. Redis/BullMQ may support background jobs when implemented and dependencies/configuration are added.

Do not interpret this target diagram or list as evidence of existing modules. Each slice must be approved, implemented, tested and reflected in `PROGRESS.md`.
