# LMS Authentication and Access Control Module (v1.0 MVP)

This directory contains the engineering and operational documentation for the **Authentication and Access Control** module of the Library Management System (LMS) v1.0.

The implementation is tailored for schools and community libraries in Kenya and East Africa, supporting multi-tenant isolation, Kenyan identity normalization, role-based access control, secure credential lifecycle management, and privacy-conscious session controls.

---

## 1. Scope and Supported Roles

The v1.0 MVP release provides production-quality implementations of requirements **AUTH-1** through **AUTH-5**, alongside product-owner approved user directory, self-service profile, safe account deactivation, and librarian role-promotion operations.

### Roles Defined in v1.0

| Role | Description | Stored in DB `user_role` Enum | Credential Account |
| :--- | :--- | :---: | :---: |
| **`ADMIN`** | Library administrator with full tenant-level configuration and staff management rights. | Yes | Yes |
| **`LIBRARIAN`** | Operational library staff managing members, catalog, and circulation. | Yes | Yes |
| **`TEACHER`** | School staff account with borrow/hold privileges. | Yes | Yes |
| **`MEMBER`** | Standard library patron (student, pupil, or community member). | Yes | Yes |
| **`PARENT`** | Parent or guardian account with child-overview privileges (v1.0 view own). | Yes | Yes |
| **`GUEST`** | Anonymous public browsing role for searching the catalogue. | No (anonymous) | No |

*Note: Platform Super Admin operations are isolated in a dedicated platform management domain (`PlatformModule` / `/platform`) outside tenant roles and outside tenant RLS. Within individual library tenants, `ADMIN` is the highest role. `GUEST` accounts do not possess credentials, sessions, or tokens and cannot access protected endpoints.*

---

## 2. Core Authentication Architecture

```
                       ┌────────────────────────────────────────┐
                       │           Next.js 16 Web App           │
                       │    (Mobile-First, Low-End Android)     │
                       └───────────────────┬────────────────────┘
                                           │ HTTP / SameSite Cookies
                                           ▼
                       ┌────────────────────────────────────────┐
                       │           NestJS 12 API Engine         │
                       │   ┌────────────────────────────────┐   │
                       │   │ AccessTokenGuard & RolesGuard  │   │
                       │   └───────────────┬────────────────┘   │
                       │   ┌───────────────┴────────────────┐   │
                       │   │  Auth / Users / Member Service │   │
                       │   └──────┬──────────────────┬──────┘   │
                       └──────────┼──────────────────┼──────────┘
                                  │                  │
                Redis 7 (Rate Limit)     PostgreSQL (RLS & Drizzle ORM)
```

- **Identity Lookup**: Cross-library identity discovery is performed using HMAC-SHA-256 digests via PostgreSQL SECURITY DEFINER functions (`identity_private.find_user_identity`). Raw emails and phone numbers are never stored in the global identity table.
- **Tenant Context**: All tenant-owned operations use `DatabaseService.withTenant(tenantId, tx)` which executes `set_config('app.tenant_id', tenantId, true)` inside the transaction. PostgreSQL Row-Level Security (RLS) enforces tenant isolation at the database level.
- **ORM Standard**: All application queries are executed via **Drizzle ORM** query-builder syntax (`tx.select()`, `tx.insert()`, `tx.update()`, `tx.delete()`). Handwritten raw SQL is restricted exclusively to the tenant context configuration and the three approved identity lookup functions.
- **Password Security**: Passwords and OTP verification digests are hashed using **Argon2id**.
- **Token & Session Architecture**: Access tokens are signed JWTs (JOSE) with short lifespans (15 minutes). Refresh tokens are long-lived (7 days), stored as SHA-256 hashes in PostgreSQL, and rotated on every refresh. Replay detection automatically revokes compromised session chains.

---

## 3. Directory Navigation

- [Authentication Flows](./authentication-flows.md): Step-by-step documentation and Mermaid sequence diagrams for login, selection, password change, reset, onboarding, and deactivation.
- [Authorization and RBAC](./authorization.md): Permissions matrix, role responsibilities, guard implementations, and last-active protections.
- [API Reference](./api-reference.md): Detailed endpoint definitions, request/response DTOs, error contracts, and curl examples.
- [Security Architecture](./security.md): Cryptographic algorithms, cookie settings, RLS policies, rate limiting, and audit logging.
- [Environment Configuration](./environment.md): Environment variable catalog, purpose, and generation guidelines.
- [Testing Runbook](./testing.md): How to run unit tests, integration tests, E2E tests, and verify each requirement.
- [Operations Guide](./operations.md): Diagnostic runbooks, troubleshooting rate limits, session revocations, and audit monitoring.
- [Requirements Traceability](./requirements-traceability.md): Traceability matrix mapping AUTH-1 through AUTH-5 to code and tests.

---

## 4. Running Authentication Tests

Execute tests from the repository root:

```bash
# Run all unit tests
pnpm test

# Run API controller E2E tests (mocked transport & guards)
pnpm --filter @lms/api exec vitest run --config ./vitest.config.e2e.ts test/auth.controller.e2e-spec.ts test/users.controller.e2e-spec.ts

# Run static type checking
pnpm typecheck

# Run production build
pnpm build
```
