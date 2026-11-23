# Commonplace API — NestJS 12 Application

The core backend API engine for **Commonplace Library Management System**, built with NestJS 12, TypeScript (strict mode), Drizzle ORM, PostgreSQL 16 with Row-Level Security, and Redis 7.

---

## Architecture Overview

The API consists of 15 modular feature and infrastructure domains:

- **`auth/`**: Argon2id password hashing, JOSE dual-token JWT signing, sessions with rotation and replay detection, OTP password resets.
- **`platform/`**: Platform Super Admin domain operating outside tenant RLS with TOTP MFA, tenant provisioning, system telemetry, and immutable audit logs.
- **`circulation/`**: Atomic checkout, returns with overdue calculations, renewals, CIR-9 lost/damaged handling, and barcode/QR scanning.
- **`catalogue/` & `categories/`**: Bibliographic records, physical copy state machines, Open Library/Google Books ISBN lookup, hierarchical categories.
- **`holds/`**: Fair FIFO reservation queues and return-desk fulfillment.
- **`fines/`**: Append-only fine ledger with database mutation trigger protection, payments with sequential receipts (`RCP-YYYYMMDD-XXXX`), and waivers.
- **`members/` & `member-types/`**: Patron management, borrowing history, cascading loan/fine policy matrix.
- **`notifications/`**: Automated email and SMS dispatch with Africa/Nairobi quiet-hours enforcement.
- **`reports/`**: High-performance circulation and executive dashboard SQL metrics (< 2s).
- **`public/`**: Public catalogue search and unauthenticated membership enquiries with slug-based tenant resolution.
- **`health/`**: `/health/live` and `/health/ready` liveness and readiness probes verifying PostgreSQL and Redis connectivity.
- **`database/`**: Drizzle ORM schema, transaction-local tenant context (`withTenant`), and standalone migration runner.
- **`redis/`**: Distributed sliding-window rate limiting and caching.

---

## Development

```bash
# Start development server on port 3000
pnpm start:dev

# Run unit tests
pnpm test

# Run controller E2E tests
pnpm test:e2e

# Run database migrations
pnpm db:migrate

# Type check
pnpm typecheck

# Production build
pnpm build
```
