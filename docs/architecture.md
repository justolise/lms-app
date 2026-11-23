# Architecture — Current State and Target Boundaries

Reviewed 23 November 2026. This document records the implemented v1.0 architecture, boundaries, and runtime topology.

## Current repository layout

```text
apps/
  api/       NestJS 12 REST API, Drizzle schema/15 migrations, platform & circulation modules
  web/       Next.js 16 App Router application (48 routes across public, workspace, and platform)
packages/
  shared/    Shared TypeScript contracts and interfaces
```

## Current stack

- Workspace: pnpm 10+.
- Web: Next.js 16.4.6, React 19.3.0, Tailwind CSS 4.3.3, Biome.
- API: NestJS 12, TypeScript (strict), REST, Oxlint.
- Data: PostgreSQL 16, Drizzle ORM 0.45.4, Drizzle Kit migrations.
- Tenant isolation: PostgreSQL Row-Level Security (RLS) with fail-closed transaction context.
- Platform SaaS: Dedicated Super Admin domain (`/platform`) outside tenant RLS with TOTP MFA.
- Cache & Rate Limiting: Redis 7 Alpine, sliding-window rate limiting, distributed caching (120s TTL).
- Auth: Argon2id, JOSE JWT dual tokens, HMAC-SHA-256 identity lookup, AES-256-GCM encryption for ID docs and MFA secrets.
- Observability: `X-Correlation-ID` tracing, request logging, `/health/live` and `/health/ready` probes, real-time platform telemetry.
- API tests: Vitest (349 unit tests across 42 test suites, 27 Controller E2E tests).
- Orchestration: Docker Compose (`docker-compose.yml`) with multi-stage Alpine Dockerfiles for API and Web, and automated migration runner.

## API Module Inventory

The `apps/api/src` tree contains 15 active modules:

1. `AppModule`: Root module orchestrating all domain and infrastructure providers.
2. `DatabaseModule`: `DatabaseService`, Drizzle schema connection, transaction-local tenant context (`withTenant`), and standalone migrator.
3. `RedisModule`: `RedisService` providing distributed cache and sliding-window rate limiting.
4. `HealthModule`: `HealthController` exposing `/health/live` and `/health/ready` probes with PostgreSQL and Redis connectivity verification.
5. `AuthModule`: `AuthController`, `AuthService`, `SessionService`, `OtpService`, `TokenService`, `IdentityService`, `PasswordService`.
6. `PlatformModule`: Platform Super Admin domain:
   - `PlatformAuthController`: Two-step Super Admin login with TOTP MFA.
   - `PlatformSessionService`: Isolated platform session management and lineage tracking (`lms_platform_*` cookies).
   - `PlatformMfaService`: 6-digit TOTP generation and verification with AES-256-GCM encrypted secrets.
   - `PlatformTenantsController` / `PlatformTenantsService`: Multi-tenant lifecycle and status management.
   - `PlatformTenantAdminsController` / `PlatformTenantAdminsService`: Tenant initial admin provisioning and emergency credential resets.
   - `PlatformMonitoringController` / `PlatformMonitoringService`: Real-time system telemetry and resource metrics.
   - `PlatformAuditLogsController` / `PlatformAuditLogsService`: Append-only platform audit log exploration.
7. `UsersModule`: `UsersController`, `ProfileController`, `UsersService` (staff directory, self-service profile, promotion).
8. `MembersModule`: `MembersController`, `MembersService`, `MemberIdentifierService` (member CRUD, profile editing, loan history, enquiry review).
9. `MemberTypesModule`: `MemberTypesController`, `MemberTypesService` (borrower types and cascading loan/fine policy matrix).
10. `CategoriesModule`: `CategoriesController`, `CategoriesService` (hierarchical categories with parent-child taxonomy).
11. `CatalogueModule`: `CatalogueController`, `CatalogueService`, `CopiesService`, `IsbnLookupService` (bibliographic items, physical copies, Open Library/Google Books ISBN metadata lookup).
12. `CirculationModule`: `CirculationController`, `CirculationService` (checkout, return, renewals, CIR-9 lost/damaged workflows, barcode/QR scanning).
13. `HoldsModule`: `HoldsController`, `HoldsService` (FIFO queue, return-desk ready fulfillment, cancellation).
14. `FinesModule`: `FinesController`, `FinesService` (append-only ledger, payments, waivers with mandatory reasons, receipt generation).
15. `NotificationsModule`: `NotificationsService`, `EmailDeliveryService`, `SmsDeliveryService` (due-soon/overdue/hold-ready alerts, Nairobi quiet-hours compliance).
16. `ReportsModule`: `ReportsController`, `ReportsService` (real-time circulation & executive dashboard KPIs).
17. `AdminModule`: `AdminController`, `AdminService` (library profile branding, contacts, operating hours).
18. `PublicModule`: `PublicController`, `PublicService` (slug-based tenant resolution, public catalogue search, membership enquiries).

## Database Foundation

15 Drizzle SQL migration files exist (`0000` through `0015_platform_saas_core.sql`):

1. `0000_slice_1_tenant_member_identity.sql`: Tenant/member identity schema.
2. `0001_slice_2_auth_security.sql`: Session and OTP security schema.
3. `0002_slice_3_tenant_isolation.sql`: Tenant RLS policies.
4. `0003_slice_4_audit_logs.sql`: Audit log schema and grants.
5. `0004_slice_5_identity_lookup.sql`: Global identity lookup and restricted functions.
6. `0005_auth_4_first_login_password_change.sql`: Adds `must_change_password` to `users`.
7. `0006_categories.sql` / `0007_catalogue.sql`: Hierarchical categories and bibliographic catalogue schema.
8. `0008_circulation.sql`: Circulation loans, policies, and checkout blocks schema.
9. `0009_holds.sql`: FIFO hold queues and reservation fulfillment schema.
10. `0010_membership_enquiries.sql`: Public membership enquiries schema.
11. `0011_fine_ledger.sql`: Append-only fine ledger schema with database immutability triggers.
12. `0012_fine_receipts.sql`: Fine payment receipts schema and numbering sequences.
13. `0013_library_profile.sql`: Tenant branding and profile configuration schema.
14. `0014_notifications.sql`: Multi-tenant notification queue and delivery tracking schema.
15. `0015_platform_saas_core.sql`: Dedicated platform super-admin credentials, TOTP MFA, platform sessions, and tenant slug extensions.

Tenant-owned RLS tables use `DatabaseService.withTenant()` to establish `app.tenant_id` transaction-locally. Missing tenant context fails closed.

## Runtime Topology

The runtime infrastructure is fully containerized via `docker-compose.yml`:

- **postgres**: PostgreSQL 16 Alpine with initialized database, schemas, and persistent volumes.
- **redis**: Redis 7 Alpine with persistent volume and password authentication.
- **migrator**: Standalone TypeScript migration container (`apps/api/src/database/migrate.ts`) applying all pending Drizzle SQL migrations prior to service boot.
- **api**: Multi-stage Alpine container running NestJS 12 API with health check probes on `/health/ready`.
- **web**: Multi-stage Alpine container running Next.js 16 standalone output on port 3001 with proxying to the API.

CI workflows are configured in `.github/workflows/ci.yml` and `.github/workflows/security.yml`, verified green on `main`.
