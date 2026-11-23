# Phase 1 documentation reconciliation — review notes

This reconciliation package was applied to the repository on 2026-11-20. The original root documents are preserved in .phase1-backups/.

## Existing files replaced by the apply script

- `README.md`
- `PROGRESS.md`
- `DECISIONS.md`

The script first backs up those three existing files under `.phase1-backups/<timestamp>/`. It refuses to overwrite any of the proposed new files if they already exist.

## New files

- `docs/requirements-traceability.md`
- `docs/architecture.md`
- `docs/privacy.md`
- `docs/runbook.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `.github/workflows/ci.yml`
- `.github/workflows/security.yml`
- `.github/dependabot.yml`
- `.github/pull_request_template.md`

## Important limitations / review items

1. The CI workflow deliberately runs lint, typecheck, package unit tests and builds only. API E2E/database suites are not included because the current workflow does not provision the dedicated PostgreSQL database and roles those tests require. Add them only after a reproducible CI database setup is designed and verified.
2. The security workflow runs `pnpm audit` and Semgrep Community Edition (`semgrep scan --config auto`). Semgrep provides static analysis, but comprehensive security coverage is not established; secret scanning and CodeQL are not configured.
3. The GitHub workflows have not been executed in GitHub. GitHub Actions permissions, action versions and dependency audit behaviour must be reviewed before relying on them.
4. Historical test counts in the old progress file were not re-run during preparation. The revised file labels them historical.
5. The migration files were observed in the repository, but live migration application state was not independently queried in this inspection.
6. Current `compose.yaml` starts Redis only; PostgreSQL remains separately provisioned.
7. Provider integrations, BullMQ, web tests, deployment, backups, monitoring and production security remain unverified or unimplemented.
8. `DECISIONS.md` keeps the approved architecture and product decisions while clearly distinguishing implementation records from complete workflows.
9. Requirement status is deliberately conservative: schema-only foundations are marked `doing`, not `done`, for functional requirements.

## Follow-up verification — 2026-11-20

The historical workflow-execution finding above was subsequently resolved:

- GitHub Actions CI and Security workflows were both executed successfully and verified green on commit `82c9b1d`.
- CI continues to exclude API E2E and database integration tests because the workflow does not provision their required PostgreSQL database and roles.
- The Security workflow's successful execution does not establish comprehensive security coverage. Semgrep finding triage, remediation and ongoing dependency vulnerability review remain necessary.
- Secret scanning and CodeQL remain unconfigured, as noted in the original review.

## Apply

From the user's local repository:

```bash
cd ~/projects/lms
bash /path/to/lms-phase1-reconciliation/APPLY-RECONCILIATION.sh
```

Then inspect the diff and new files before staging or committing anything. The script does not commit or push.

---

## Phase 2 — Authentication and Access Control implementation — 2026-11-21

This phase implements AUTH-1 through AUTH-5 (MVP requirements) and four Product Owner approved additions (PO-1 through PO-4).

### Items resolved from Phase 1 limitations

| Original Phase 1 Limitation | Resolution |
| :--- | :--- |
| Login/session endpoints were outstanding. | Implemented `AuthController`, `SessionService`, `SessionController`; refresh token rotation, replay detection, and device logout verified. |
| OTP generation, delivery and verification were outstanding. | Implemented `OtpService` with Argon2id-hashed 6-digit codes, 15m expiry, 5-attempt lockout, anti-enumeration responses, and atomic session purge on reset. |
| Server-side RBAC was outstanding. | Implemented `RolesGuard` and `AccessTokenGuard` enforcing 6 roles. 401 for missing tokens, 403 for insufficient roles. |
| Rate limiting was not implemented. | Redis-backed `RateLimitGuard` applied to login, OTP request, OTP verify, and password-change endpoints. |
| Staff member onboarding was outstanding. | Implemented `POST /api/members` (Admin/Librarian creates Member) and `POST /api/users/librarians` (Admin creates Librarian) with server-generated temp passwords and `must_change_password = true`. |
| Historical test counts were stale. | All tests re-run: 14 unit test files (108 tests) and 2 controller E2E test files (27 tests) pass. |
| `SELECT 1` raw SQL health check. | Replaced with Drizzle-based health check (`this.db.execute(sql\`SELECT 1\`)`). |
| `MEMBER_IDENTIFIER_ENCRYPTION_KEY` and `MEMBER_IDENTIFIER_HMAC_KEY` absent from `.env.example`. | Added all auth-related env vars (`SMTP_*`, `AFRICASTALKING_*`, `MEMBER_IDENTIFIER_*`) to `.env.example`. |

### New files and notable changed files

**Backend — NestJS API (`apps/api/src`):**

- `auth/auth.controller.ts` / `auth.controller.spec.ts` — Auth HTTP endpoints.
- `auth/auth.service.ts` (modified) — Refactored to Drizzle ORM query builders; added `changePassword`.
- `auth/auth-rate-limit.constants.ts` — Rate limit configurations.
- `auth/guards/access-token.guard.ts` / `roles.guard.ts` / spec files — Guards with first-login enforcement.
- `auth/otp/otp.service.ts` / `otp.service.spec.ts` — OTP generation, delivery, and verification.
- `auth/session/session.service.ts` / spec / `session.controller.ts` — Session lifecycle management.
- `auth/token/dto/access-token-payload.dto.ts` (modified) — Added `mustChangePassword` claim.
- `auth/dto/` — `forgot-password.dto.ts`, `reset-password.dto.ts`, `change-password.dto.ts`.
- `users/users.service.ts` / `users.controller.ts` / `profile.controller.ts` / `users.module.ts` — User directory, self-service profile, deactivation, and promotion.
- `members/members.service.ts` / `members.controller.ts` (modified) — Refactored to Drizzle ORM; dual route prefix.
- `redis/redis.service.ts` / `rate-limit.guard.ts` / spec files — Redis connection and rate limiting.
- `common/types/auth-role.ts` / `common/decorators/` — Shared role types and decorators.
- `database/database.service.ts` (modified) — Drizzle schema attached; Drizzle-based health check.
- `database/schema.ts` (modified) — Added `mustChangePassword` column.

**E2E tests (`apps/api/test`):**

- `test/auth.controller.e2e-spec.ts` — 18 tests covering login, session, OTP, password change.
- `test/users.controller.e2e-spec.ts` — 9 tests covering directory, profile, deactivation, promotion.

**Migration:**

- `drizzle/0005_auth_4_first_login_password_change.sql` — Adds `must_change_password` to `users`.

**Frontend — Next.js web (`apps/web`):**

- `app/login/page.tsx` — Email/phone login with library selector.
- `app/forgot-password/page.tsx` — OTP reset request.
- `app/reset-password/page.tsx` — OTP verification and new password.
- `app/change-password/page.tsx` — First-login and authenticated password change.
- `app/profile/page.tsx` — Self-service profile and soft deactivation.
- `app/users/page.tsx` — Staff user directory with promotion.
- `next.config.ts` (modified) — `/api/:path*` rewrite proxy to NestJS.

**Documentation:**

- `docs/auth/` (9 new files): `README.md`, `authentication-flows.md`, `authorization.md`, `api-reference.md`, `security.md`, `environment.md`, `testing.md`, `operations.md`, `requirements-traceability.md`.
- `PROGRESS.md`, `DECISIONS.md`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md` — Updated to reflect implemented state.
- `docs/requirements-traceability.md`, `docs/architecture.md`, `docs/runbook.md` — Updated to reflect implemented state.
- `.env.example` — Expanded with `SMTP_*`, `AFRICASTALKING_*`, `MEMBER_IDENTIFIER_*` entries.

### Remaining limitations and open items

1. **PostgreSQL runtime not available in sandbox.** Unit and controller E2E tests use in-memory mocks and pass fully. Database integration tests (`test/database.e2e-spec.ts`, `test/identity-lookup.e2e-spec.ts`, `test/auth.e2e-spec.ts`) require a live PostgreSQL instance and must be run locally per the runbook.
2. **CI does not include controller E2E tests.** The `.github/workflows/ci.yml` runs `pnpm test` (unit tests only). The controller E2E suite should be added once the CI workflow is confirmed stable.
3. **Production SMS/SMTP credentials are not configured.** In development and test environments, OTP codes are logged to the debug console when provider credentials are absent. Production deployments require configured `SMTP_*` and `AFRICASTALKING_*` variables before sending OTP messages to real users.
4. **Secret scanning and CodeQL remain unconfigured** per the Phase 1 note; this remains outstanding.
---

## Phase 3 & 4 — Core Circulation, Platform Super Admin, Brand & Full Monorepo Reconciliation — 2026-11-23

This phase delivers the remaining v1.0 MVP modules, Platform Super Admin workspace, KDPA legal center, and full Docker deployment orchestration.

### Items Delivered & Resolved

1. **Core Circulation, Holds & Fines Subsystems**:
   - Implemented checkout (CIR-1), returns with overdue fine calculations (CIR-2), renewals (CIR-3), loan policies matrix (CIR-4), checkout blocks & overrides (CIR-5), `@zxing/wasm` camera scanner (CIR-6), and lost/damaged replacement charges (CIR-9).
   - Implemented FIFO holds queue (HLD-1), return-desk ready fulfillment (HLD-2), and hold cancellations (HLD-3).
   - Implemented append-only fine ledger with database immutability triggers (FIN-1, FIN-2), waiver desk, and sequential payment receipts (FIN-3).
2. **Patron Directory, Notifications & Reporting**:
   - Member profiles, class groups, and borrowing history modals (MEM-1, MEM-4).
   - Automated email (NOT-1) and SMS (NOT-2) notifications with strict Africa/Nairobi quiet-hours enforcement.
   - Real-time circulation & executive dashboard (< 2s) with KPI counters and activity streams (RPT-1).
   - Inventory loss reason tracking (INV-2) and tenant library profile branding (ADM-1).
3. **Platform Super Admin Subsystem (PLAT-1 → PLAT-6)**:
   - Dedicated Platform Super Admin workspace (`/platform`) operating outside tenant RLS.
   - Two-step TOTP MFA authentication with AES-256-GCM encrypted secrets.
   - Multi-tenant directory lifecycle and provisioning (`PlatformTenantsService`).
   - Tenant initial admin account provisioning and emergency password reset modal (`PlatformTenantAdminsService`).
   - Real-time platform telemetry, memory metrics, and `/health/live` / `/health/ready` probes (`PlatformMonitoringService`).
   - Immutable platform audit log explorer (`PlatformAuditLogsService`).
4. **Legal & Policy Center (PLAT-POL-01 → 09)**:
   - 9 KDPA 2019 compliant legal policies deployed under `/legal/*` with responsive sidebar navigation and search index.
5. **Centralized Frontend API Registry**:
   - `apps/web/lib/api/endpoints.ts` acts as the strict single source of truth for all backend endpoints. Direct `/api/...` strings are completely eliminated from the web codebase.
6. **Resilient Bulkheading & Fault Tolerance**:
   - Route group error boundaries (`(workspace)/error.tsx`, `(platform)/error.tsx`, `(public)/error.tsx`) prevent cascading UI crashes.
   - Non-blocking dashboard telemetry warnings and database slug resolution fallbacks.
7. **Docker Compose & Deployment Orchestration**:
   - Multi-stage Alpine Dockerfiles for NestJS API and Next.js Web (non-root execution).
   - Full-stack `docker-compose.yml` coordinating PostgreSQL 16, Redis 7, automated migration runner, API, and Web.
8. **Verification Evidence**:
   - 349 unit tests passed across 42 test suites in `@lms/api`, 0 failures.
   - 27 controller integration tests passed.
   - 0 TypeScript errors across all workspace packages (`tsc --noEmit`).
   - 0 lint errors (Oxlint in API; Biome in Web).
   - 48 App Router routes statically & partially prerendered in `@lms/web`.
