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

The `apps/api/src` tree contains:

- `AppModule`, `AppController`, `AppService`
- `DatabaseModule`, `DatabaseService`, Drizzle schema (with attached schema and Drizzle-based health check)
- `AuthModule`: `AuthController`, `AuthService`, `SessionService`, `OtpService`, `TokenService`, `IdentityService`, `PasswordService`
- `Guards`: `AccessTokenGuard` (with mandatory first-login password change check), `RolesGuard`
- `UsersModule`: `UsersController`, `ProfileController`, `UsersService`
- `MembersModule`: `MembersController`, `MembersService`, `MemberIdentifierService`
- `RedisModule`: `RedisService` (distributed rate-limiting)

Feature modules pending implementation: Catalogue, search, circulation, holds, fines, notifications, dashboard and admin settings.

## Database foundation

Six migration files exist:

1. `0000_slice_1_tenant_member_identity.sql`: Tenant/member identity schema.
2. `0001_slice_2_auth_security.sql`: Session and OTP security schema.
3. `0002_slice_3_tenant_isolation.sql`: Tenant RLS policies.
4. `0003_slice_4_audit_logs.sql`: Audit log schema and grants.
5. `0004_slice_5_identity_lookup.sql`: Global identity lookup and restricted functions.
6. `0005_auth_4_first_login_password_change.sql`: Adds `must_change_password` to `users`.

Tenant-owned RLS tables recorded in the implementation are `users`, `groups`, `member_types`, `member_profiles`, `sessions`, `otp_codes` and `audit_logs`. The `tenants` registry is intentionally outside RLS to support tenant discovery before authenticated tenant context exists.

Tenant-scoped database operations use `DatabaseService.withTenant()` to validate tenant identity and establish `app.tenant_id` transaction-locally. Missing tenant context must fail closed.

The global identity lookup stores HMAC-SHA-256 hashes rather than raw email/phone. Restricted SECURITY DEFINER functions are owned by `lms_identity_owner`; the runtime `lms_app` role does not receive direct lookup-table access.

All application queries use Drizzle ORM query builders (`tx.select()`, `tx.insert()`, `tx.update()`, `tx.delete()`).

## Authentication and Access Control Subsystem

Implemented and verified complete workflows:
- Login endpoints (`POST /api/auth/login`, `POST /api/auth/select-tenant`).
- Session management: `SessionService`, refresh token rotation, replay detection revoking session lineage, and logout (`POST /api/auth/logout`, `GET /api/auth/sessions`, `POST /api/auth/sessions/:sessionId/revoke`).
- Password reset via single-use OTP (`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`).
- Mandatory first-login password change and authenticated password update (`POST /api/auth/change-password`).
- Server-side RBAC guards enforcing 6 roles (`ADMIN`, `LIBRARIAN`, `TEACHER`, `MEMBER`, `PARENT`, `GUEST`).
- Staff-provisioned member accounts (`POST /api/members`) and librarian accounts (`POST /api/users/librarians`).
- Staff user directory (`GET /api/users`, `GET /api/users/:userId`).
- Self-service profile management and soft deactivation with last-admin and last-librarian protections (`GET /api/profile`, `PATCH /api/profile`, `DELETE /api/profile`).
- Librarian-to-Admin role promotion (`POST /api/users/:userId/promote`).
- Distributed Redis rate limiting across sensitive auth endpoints.
- Next.js 16 web application with responsive mobile-first UI for all authentication workflows.

## Runtime topology

- `compose.yaml` starts Redis only.
- PostgreSQL is provisioned separately.
- `.env.example` defines runtime/migration database URLs, Redis URL, HMAC key and token secrets.
- CI workflows are configured in `.github/workflows/ci.yml` and `.github/workflows/security.yml`; GitHub execution was verified green for both CI and Security workflows on commit `82c9b1d`.
- No deployment environment, production host, monitoring stack or backup automation was found in the inspected repository.

## Target architecture (not yet implemented)

The v1.0 target adds catalogue/copies, search, circulation, holds, fine ledger, member management, email/SMS notification workers, dashboard and admin settings. Redis/BullMQ may support background jobs when implemented and dependencies/configuration are added.

Do not interpret this target diagram or list as evidence of existing modules. Each slice must be approved, implemented, tested and reflected in `PROGRESS.md`.
