# Authentication Testing Guide & Suite Documentation

This document describes the test strategy, structure, execution instructions, and test coverage for the LMS Authentication and Access Control subsystem (AUTH-1 through AUTH-5 and Product Owner additions).

---

## 1. Test Architecture

The LMS authentication test suite is divided into three tiers:

```
├── apps/api/src/**/*.spec.ts          # Unit Tests (Fast, mocked Drizzle ORM / Redis)
├── apps/api/test/*.controller.e2e-spec.ts # Controller E2E Tests (Supertest, mocked services)
└── apps/api/test/*.e2e-spec.ts        # Database Integration Tests (Requires live PostgreSQL)
```

### 1.1 Unit Tests (`src/**/*.spec.ts`)
- Target business logic, hashing algorithms, token lifecycle, Drizzle query chains, and domain services in complete isolation.
- Dependencies such as `DatabaseService`, `RedisService`, and `OtpService` are mocked using Vitest mocks (`vi.fn()`).
- Chainable Drizzle query builders (`tx.select()`, `tx.insert()`, `tx.update()`, `tx.delete()`) are simulated using mock chaining utilities.

### 1.2 Controller E2E Tests (`test/*.controller.e2e-spec.ts`)
- Use `@nestjs/testing` and `supertest` to verify HTTP endpoints, validation pipes (`ValidationPipe`), authentication guards (`AccessTokenGuard`), role guards (`RolesGuard`), and dual route prefixes (`/` and `/api/*`).
- Verify HTTP status codes: `401 Unauthorized` for missing/invalid tokens, `403 Forbidden` for unauthorized roles or required password changes, `400 Bad Request` for validation failures.

### 1.3 Database Integration Tests (`test/*.e2e-spec.ts`)
- Test real PostgreSQL schema, migrations, Row-Level Security (`app.tenant_id`), `identity_private` stored procedures, and concurrency locks against an active database container.

---

## 2. Test Execution Commands

From the workspace root (`/home/elly/projects/lms`):

```bash
# 1. Typecheck the entire monorepo
pnpm typecheck

# 2. Run all unit and controller E2E test suites
pnpm test

# 3. Run API unit tests specifically
pnpm --filter @lms/api test

# 4. Run Controller E2E tests specifically
pnpm --filter @lms/api exec vitest run test/auth.controller.e2e-spec.ts test/users.controller.e2e-spec.ts

# 5. Run with test coverage
pnpm --filter @lms/api exec vitest run --coverage
```

---

## 3. Test Coverage by Requirement

| Requirement | Description | Unit Tests | E2E / Integration Tests | Status |
| :--- | :--- | :--- | :--- | :--- |
| **AUTH-1** | Register & Log In with Email/Phone | `src/auth/auth.service.spec.ts`<br>`src/auth/identity/identity.service.spec.ts`<br>`src/auth/password/password.service.spec.ts` | `test/auth.controller.e2e-spec.ts` | **PASS** |
| **AUTH-1** | Mandatory First-Login Password Change | `src/auth/guards/access-token.guard.spec.ts`<br>`src/auth/auth.service.spec.ts` | `test/auth.controller.e2e-spec.ts` | **PASS** |
| **AUTH-2** | Server-Side Role-Based Access Control | `src/auth/guards/roles.guard.spec.ts`<br>`src/auth/guards/access-token.guard.spec.ts` | `test/auth.controller.e2e-spec.ts`<br>`test/users.controller.e2e-spec.ts` | **PASS** |
| **AUTH-3** | Password Reset via Email / SMS OTP | `src/auth/otp/otp.service.spec.ts` | `test/auth.controller.e2e-spec.ts` | **PASS** |
| **AUTH-4** | Staff-Created Accounts (Members & Librarians) | `src/members/members.service.spec.ts`<br>`src/users/users.service.spec.ts` | `test/users.controller.e2e-spec.ts` | **PASS** |
| **AUTH-5** | Session Management & Device Logout | `src/auth/session/session.service.spec.ts` | `test/auth.controller.e2e-spec.ts` | **PASS** |
| **PO-1** | Staff User Directory | `src/users/users.service.spec.ts` | `test/users.controller.e2e-spec.ts` | **PASS** |
| **PO-2** | Self-Service Profile & Soft Deactivation | `src/users/users.service.spec.ts` | `test/users.controller.e2e-spec.ts` | **PASS** |
| **PO-3** | Last Active Admin / Librarian Protection | `src/users/users.service.spec.ts` | `test/users.controller.e2e-spec.ts` | **PASS** |
| **PO-4** | Librarian Role Promotion to Admin | `src/users/users.service.spec.ts` | `test/users.controller.e2e-spec.ts` | **PASS** |

---

## 4. Key Test Scenarios Implemented

### 4.1 First-Login Password Change Guard
- User with `mustChangePassword === true` accesses `/api/users`: Expects `403 Forbidden` (`Password change required on first login`).
- User with `mustChangePassword === true` accesses `/api/auth/change-password`: Expects `200 OK` (Allowed).
- User with `mustChangePassword === true` accesses `/api/auth/logout`: Expects `200 OK` (Allowed).

### 4.2 OTP Single-Use & Expiry
- Requesting OTP creates an active record with hashed code.
- Verification with wrong code increments attempt counter; rejects after 5 attempts.
- Consuming the OTP with correct code resets password, marks `consumedAt = NOW()`, revokes all active user sessions, and prohibits re-use.

### 4.3 Last-Admin and Last-Librarian Protections
- Attempting to deactivate the only active `ADMIN` in a tenant: Throws `ConflictException: Cannot deactivate the last active administrator for this tenant.`
- Attempting to deactivate the only active `LIBRARIAN` in a tenant: Throws `ConflictException: Cannot deactivate the last active librarian for this tenant.`
- Deactivation of one admin when another active admin exists: Succeeds, updates status to `SUSPENDED`, revokes sessions, writes audit log.

### 4.4 Role Promotion Restrictions
- Non-admin attempts promotion: Expects `403 Forbidden`.
- Admin attempts to promote self: Throws `BadRequestException: Cannot promote yourself`.
- Admin attempts to promote non-librarian (e.g. member or teacher): Throws `BadRequestException: Only librarians can be promoted to admin`.
- Target in another tenant: Throws `NotFoundException`.
- Valid promotion: Sets role to `ADMIN`, records audit event, revokes target user's active sessions to force re-authentication with new privileges.
