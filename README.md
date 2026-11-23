<div align="center">

# 📚 Commonplace — Library Management System

**Mobile-first, multi-tenant SaaS library platform built for schools and community libraries in Kenya and East Africa.**

_Every library. One connected world._

[![CI](https://github.com/justolise/lms-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/ci.yml)
[![Security](https://github.com/justolise/lms-app/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/security.yml)
[![Latest Release](https://img.shields.io/github/v/release/justolise/lms-app?include_prereleases&color=blue&label=release)](https://github.com/justolise/lms-app/releases)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-349%20passed-brightgreen?logo=vitest)
![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-RLS%20enforced-336791?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs)
![Docker](https://img.shields.io/badge/Docker-compose%20orchestrated-2496ED?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/license-proprietary-red)

</div>

---

## The Problem

Over **90% of school libraries in Kenya** run on paper ledgers or outdated desktop software that:

- Requires expensive hardware and constant internet connectivity
- Crashes or corrupts data on power outages during peak borrowing hours
- Offers no multi-library or multi-tenant isolation for library networks
- Cannot be operated on the low-end Android devices that students and librarians carry

**The result:** Books go untracked, fines go uncollected, reading programs fail, and school administrations lose visibility into their library's impact.

---

## The Solution

Commonplace is a **cloud-native, mobile-first SaaS library management system** designed from the ground up for the Kenyan and East African education market. It delivers a modern, secure, and low-bandwidth experience that works on a 3G connection with an affordable Android smartphone.

### Key differentiators

| Differentiator                  | Detail                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenant SaaS isolation** | Each library is a fully isolated tenant with PostgreSQL Row-Level Security — zero cross-tenant data leakage by design                        |
| **Platform Super Admin**        | Dedicated super-admin portal (`/platform`) with TOTP MFA, tenant provisioning, system monitoring telemetry, and immutable audit logs         |
| **Public tenant portals**       | Isolated public catalogue search and unauthenticated membership enquiry requests at `/libraries/[slug]` and `/libraries/[slug]/login`        |
| **Legal & Policy Center**       | 9 comprehensive Kenya Data Protection Act 2019 (KDPA) compliant policies accessible to all users at `/legal`                                 |
| **Mobile-first & 3G-ready**     | Checkout target < 1 second on 3G; progressive-enhancement UI; camera-based QR and barcode scanning with manual fallback                      |
| **Zero-trust security**         | Argon2id password hashing · Helmet HTTP security headers · Redis-backed rate limiting · Append-only audit logs · CSRF and CSP hardened       |
| **Append-only fine ledger**     | Immutable fine and payment transactions protected by database triggers; tamper-proof payment receipt generation                              |
| **CIR-9 Lost/Damaged fees**     | Structured item condition handling, automated replacement charge debiting to fine ledger, and mandatory reason capture                       |
| **Fair FIFO holds queue**       | Automated queue management and return-desk hold fulfillment reserving copies for ready claimants                                             |
| **Fault-tolerant bulkheading**  | Isolated error boundaries and non-blocking dashboard telemetry so secondary failures never interrupt core circulation                        |
| **Zero hardcoded API calls**    | Strictly centralized API client registry (`lib/api/endpoints.ts`) across all frontend views and services                                     |
| **Full-stack Docker stack**     | Production-ready multi-stage Alpine Dockerfiles, automated migration runner, and full `docker-compose.yml` orchestrating API, Web, DB, Redis |

---

## Status — v1.0 MVP

> **Phases delivered: Authentication & Identity · Catalogue & Classification · Core Circulation (CIR-1..6, CIR-9) · Holds & Reservations (HLD-1..3) · Fine Ledger & Receipts (FIN-1..3) · Members & History (MEM-1..4) · Notifications (NOT-1..2) · Inventory Tracking (INV-2) · Dashboard (RPT-1) · Library Profile & Settings (ADM-1..2) · Platform Super Admin (PLAT-1..6) · Legal & Policy Center (PLAT-POL-01..09) · Docker Deployment Orchestration**

| Metric                       | Value                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------- |
| Unit tests passing           | ✅ **349 / 349** (42 test suites)                                               |
| Controller E2E tests passing | ✅ **27 / 27** (2 test files)                                                   |
| TypeScript errors            | ✅ **0** (`tsc --noEmit` across API and Web)                                    |
| Linting status               | ✅ **0 errors** (Oxlint type-aware in API; Biome in Web)                        |
| Production build             | ✅ **API + Web (48 App Router static & partial prerendered routes)**            |
| CI pipeline                  | ✅ Green on `main`                                                              |
| Security workflow            | ✅ Green on `main`                                                              |
| Database migrations applied  | ✅ **15 Drizzle SQL migrations** (`0000` through `0015_platform_saas_core.sql`) |
| Completed v1.0 requirements  | ✅ **100% of approved v1.0 scope delivered & verified**                         |

Full traceability: [`PROGRESS.md`](PROGRESS.md) · [`docs/requirements-traceability.md`](docs/requirements-traceability.md)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Client (Browser / Mobile Android)                         │
│               Next.js 16  ·  React 19  ·  Tailwind CSS 4  ·  Forest Theme               │
│  (public) Tenant Portals & Legal  │  (workspace) Staff Desks  │  (platform) Super Admin │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │  HTTPS / REST (JSON) via Next.js Proxy & Central Registry
┌───────────────────────────────────────────▼────────────────────────────────────────────┐
│                                     NestJS 12 API                                      │
│  AuthModule · UsersModule · MembersModule · MemberTypesModule · PlatformModule         │
│  CatalogueModule · CategoriesModule · CirculationModule · HoldsModule · FinesModule    │
│  NotificationsModule · ReportsModule · PublicModule · DatabaseModule · RedisModule     │
│  Helmet CSP/HSTS · Correlation IDs · Rate Limiting · RBAC Guards · Sessions · Audits   │
└─────────────────────────────┬──────────────────────────────────┬───────────────────────┘
                              │                                  │
┌─────────────────────────────▼────────┐          ┌──────────────▼──────────────┐
│            PostgreSQL 16             │          │            Redis            │
│  Drizzle ORM                         │          │  Sliding-window Rate Limits │
│  Row-Level Security (RLS)            │          │  Distributed Cache          │
│  15 Drizzle SQL Migrations           │          │  Session Token Store        │
│  Append-only Ledger Triggers         │          └─────────────────────────────┘
│  Platform SaaS Isolation Schema      │
└──────────────────────────────────────┘
```

### Security architecture (zero-trust)

- **Argon2id** password hashing with tuned memory and iteration cost parameters
- **PostgreSQL RLS** enforced at database level — `FORCE ROW LEVEL SECURITY` on all tenant-owned tables
- **Transaction-local tenant context** — `set_config('app.tenant_id')` scopes every transaction; missing context fails closed
- **Dedicated Platform Super Admin** — isolated from tenant RLS, secured by 6-digit TOTP MFA, dedicated cookies (`lms_platform_*`), and session lineage tracking
- **Immutable fine ledger** — PostgreSQL trigger `trg_fine_entries_immutable` rejects `UPDATE` and `DELETE` on `fine_entries`
- **Redis rate limiting** — per-IP sliding window via proxy-aware `request.ip`; protection on auth, platform, and public endpoints
- **Helmet security headers** — strict CSP, HSTS with preload, `X-Frame-Options: DENY`, `noSniff`, `xssFilter`
- **Append-only audit logs** — tamper-proof event records for auth, platform actions, circulation, holds, overrides, and fee waivers
- **Correlation ID tracing** — `X-Correlation-ID` injected and propagated across all incoming requests and structured log entries
- **HMAC-SHA-256 global identity lookup** — owned by `lms_identity_owner`, accessed only through `SECURITY DEFINER` functions
- **AES-256-GCM** encryption for member identification documents (national ID, passport) and TOTP secrets
- **Refresh token rotation** with replay detection — compromised tokens immediately revoke the entire session lineage

---

## Technology Stack

| Area                 | Technology                                                                   |
| -------------------- | ---------------------------------------------------------------------------- |
| **Monorepo**         | pnpm workspaces (`@lms/api`, `@lms/web`, `@lms/shared`)                      |
| **Web Application**  | Next.js 16 (Turbopack, App Router, PPR) · React 19 · Tailwind CSS 4 · Biome  |
| **Backend API**      | NestJS 12 · TypeScript (strict) · Oxlint                                     |
| **Database**         | PostgreSQL 16 · Drizzle ORM · 15 SQL migrations                              |
| **Tenant Isolation** | PostgreSQL Row-Level Security (RLS) with fail-closed transaction context     |
| **Platform SaaS**    | Multi-tenant management, TOTP MFA, live health probes, system telemetry      |
| **Cache & Limiting** | Redis · Sliding-window rate limiter · `RedisService`                         |
| **Authentication**   | Argon2id · JOSE JWT (HS256) · Server-side RBAC · HttpOnly cookies · TOTP MFA |
| **Scanning**         | `@zxing/wasm` multi-format barcode & QR reader (in-browser camera)           |
| **Test Suites**      | Vitest · 349 unit tests across 42 suites · 27 Controller E2E tests           |
| **CI/CD**            | GitHub Actions (`ci.yml`, `security.yml`)                                    |
| **Infrastructure**   | Docker Compose (Postgres 16, Redis 7, Migrator, API, Web)                    |

---

## Completed Features

### Authentication & Access Control

| ID              | Requirement                         | Implementation                                                                           |
| :-------------- | :---------------------------------- | :--------------------------------------------------------------------------------------- |
| **AUTH-1**      | Email & Kenyan phone authentication | E.164 normalization, multi-library selection, Argon2id, first-login password change gate |
| **AUTH-2**      | 6-role RBAC                         | `ADMIN · LIBRARIAN · TEACHER · MEMBER · PARENT · GUEST` with server-side `RolesGuard`    |
| **AUTH-3**      | Password reset by OTP               | 6-digit OTP, Argon2id hash, 15-minute expiry, 5-attempt lockout, session purge           |
| **AUTH-4**      | Staff-provisioned accounts          | `POST /api/members`, server-generated temporary passwords, `mustChangePassword` flag     |
| **AUTH-5**      | Session management & rate limiting  | Token rotation, replay detection, Redis rate limiting, per-device revocation             |
| **PO-1 → PO-4** | People operations                   | User directory, self-service profile, soft deactivation, admin role promotion            |

### Catalogue, Classification & Inventory

| ID               | Requirement                      | Implementation                                                                          |
| :--------------- | :------------------------------- | :-------------------------------------------------------------------------------------- |
| **CAT-1**        | Bibliographic records            | Full CRUD with soft archive, tenant RLS, audit logging                                  |
| **CAT-2**        | ISBN metadata lookup             | Server-side Open Library with Google Books fallback; ISBN-13 checksum validation        |
| **CAT-3**        | Physical copies & barcodes       | Tenant-scoped unique barcodes enforced at database index and service layer              |
| **CAT-4**        | Copy status lifecycle            | 7-status state machine (`AVAILABLE/ON_LOAN/RESERVED/IN_TRANSIT/LOST/DAMAGED/WITHDRAWN`) |
| **CAT-5**        | Categories, shelf & call numbers | Hierarchical categories, call number tracking, shelf location overrides                 |
| **SRC-1, SRC-2** | Catalogue search & filters       | PostgreSQL GIN tsvector full-text search with ranking, format, and availability filters |

### Circulation & Holds

| ID        | Requirement                       | Implementation                                                                                 |
| :-------- | :-------------------------------- | :--------------------------------------------------------------------------------------------- |
| **CIR-1** | Book checkout                     | Atomic checkout, copy transition to `ON_LOAN`, policy concurrency limit enforcement            |
| **CIR-2** | Return & automated fine detection | Africa/Nairobi calendar-day overdue calculation, grace period deduction, automated fine charge |
| **CIR-3** | Renewals & hold queue blocks      | Configurable renewal limits, extension from due date, blocking renewal when holds wait         |
| **CIR-4** | Loan policy cascading             | Resolution matrix by member type and item format with system fallbacks                         |
| **CIR-5** | Checkout blocks & staff overrides | Enforcement of suspended accounts, expired cards, and unpaid fine ceilings with audit logging  |
| **CIR-6** | Camera barcode/QR scanning        | Client-side `@zxing/wasm` multi-format camera scanner with manual barcode fallback             |
| **HLD-1** | FIFO holds queue                  | Placement on titles with zero available copies, duplicate prevention, pickup window resolution |
| **HLD-2** | Return hold fulfillment           | Automated copy reservation (`RESERVED`) on return, pickup countdown timer, hold fulfillment    |
| **HLD-3** | Hold queue management             | Self-service patron cancellation, staff queue re-indexing, copy release                        |

### Fines & Payments

| ID        | Requirement                       | Implementation                                                                                                 |
| :-------- | :-------------------------------- | :------------------------------------------------------------------------------------------------------------- |
| **FIN-1** | Configurable fine rules           | Daily rate, grace days, and ceiling cap per loan policy; comprehensive boundary tests                          |
| **FIN-2** | Append-only fine ledger & waivers | Immutable `fine_entries` ledger with trigger protection; payment recording; waiver desk with mandatory reasons |
| **FIN-3** | Fine payment receipts             | Unique tamper-proof receipt numbers (`RCP-YYYYMMDD-XXXX`), viewable receipt modal, printable receipt           |

### Public Portals & Enquiries

| ID               | Requirement               | Implementation                                                                                                            |
| :--------------- | :------------------------ | :------------------------------------------------------------------------------------------------------------------------ |
| **PUB-CAT**      | Tenant public catalogue   | Isolated public catalogue at `/libraries/:slug/catalogue` with search, filters, and pagination                            |
| **PUB-ENQ**      | Public membership enquiry | Unauthenticated request form at `/libraries/:slug/request-membership`, slug resolution, email receipt, staff review queue |
| **MEM-2, ADM-2** | Borrowing rules & matrix  | Dynamic loan policy configuration matrix API and web UI at `/member-types`                                                |

---

## Remaining v1.0 Backlog

| Workstream        | Requirement ID | Feature Description                                                                          | Priority |
| :---------------- | :------------- | :------------------------------------------------------------------------------------------- | :------: |
| **Members**       | `MEM-1`        | Member profile updates, photo attachments, and unique admission numbers                      |    P0    |
| **Members**       | `MEM-4`        | Patron borrowing history inspection (self & staff only)                                      |    P0    |
| **Notifications** | `NOT-1`        | Automated email dispatch for due-soon, overdue, hold-ready, and fine events                  |    P0    |
| **Notifications** | `NOT-2`        | Automated SMS notifications via Africa's Talking                                             |    P0    |
| **Inventory**     | `INV-2`        | Mandatory reason tracking when copies are marked lost, damaged, or withdrawn                 |    P0    |
| **Reporting**     | `RPT-1`        | High-performance circulation dashboard SQL aggregations (< 2s)                               |    P0    |
| **Admin**         | `ADM-1`        | Library tenant profile branding (name, logo, operating hours, contacts)                      |    P0    |
| **Circulation**   | `CIR-9`        | Lost/damaged workflow with replacement charges and fine ledger posting                       |    P1    |
| **Platform**      | `PLAT-1 → 6`   | Platform Super Admin (MFA TOTP, tenant management, monitoring telemetry, audit logs)         |    P0    |
| **Policies**      | `PLAT-POL`     | 9 Kenya Data Protection Act 2019 compliant legal and operational policies (`/legal`)         |    P0    |
| **Deployment**    | `INFRA`        | Full Docker Compose production stack (`docker-compose.yml`), Alpine Dockerfiles, DB migrator |    P0    |

Track progress on the [Commonplace v1.0 GitHub Project Board](https://github.com/users/justolise/projects/5).

---

## Quick Start

### Option A: Complete Docker Compose Stack (Recommended)

Run the full platform stack (PostgreSQL 16, Redis 7, Auto-Migrator, NestJS API, Next.js Web) in one command:

```bash
docker compose up --build -d
docker compose ps
```

The services will be available at:

- **Public Portal & Workspace**: `http://localhost:3001`
- **Platform Super Admin**: `http://localhost:3001/platform`
- **Backend API**: `http://localhost:3000`
- **Health Probes**: `http://localhost:3000/health/live` and `http://localhost:3000/health/ready`

### Option B: Local Development

#### Prerequisites

- **Node.js** 22+ (v24 recommended)
- **pnpm** 10+ (`npm install -g pnpm`)
- **Docker Engine** (for local PostgreSQL & Redis)

#### 1. Clone & install

```bash
git clone https://github.com/justolise/lms-app.git
cd lms-app
pnpm install
```

#### 2. Configure environment

```bash
cp .env.example .env
```

Ensure `.env` contains:

```ini
DATABASE_URL=postgresql://lms_app:library@127.0.0.1:5432/lms
MIGRATION_DATABASE_URL=postgresql://lms_migrator:library@127.0.0.1:5432/lms
REDIS_URL=redis://127.0.0.1:6379
ACCESS_TOKEN_SECRET=your-minimum-32-char-random-secret-here
REFRESH_TOKEN_SECRET=your-minimum-32-char-random-secret-here
LIBRARY_SELECTION_TOKEN_SECRET=your-minimum-32-char-random-secret-here
IDENTITY_LOOKUP_HMAC_KEY=your-minimum-32-char-random-secret-here
PLATFORM_JWT_SECRET=your-minimum-32-char-random-secret-here
PLATFORM_MFA_ENCRYPTION_KEY=your-minimum-32-char-random-secret-here
FRONTEND_URL=http://localhost:3001
```

#### 3. Start supporting database & cache services

```bash
docker compose up -d postgres redis
```

#### 4. Apply database migrations

```bash
pnpm --filter @lms/api db:migrate
```

#### 5. Start development servers

```bash
# Terminal 1 — NestJS API (port 3000)
pnpm --filter @lms/api start:dev

# Terminal 2 — Next.js Web (port 3001)
pnpm --filter @lms/web dev
```

---

## Verification & Quality Gates

Run the complete monorepo verification suite in one command:

```bash
pnpm typecheck && pnpm -r --if-present lint && pnpm test && pnpm --filter @lms/web build
```

Run Controller E2E test suites:

```bash
pnpm --filter @lms/api exec vitest run \
  --config ./vitest.config.e2e.ts \
  test/auth.controller.e2e-spec.ts \
  test/users.controller.e2e-spec.ts
```

**Quality gate results (verified 23 November 2026):**

```
✓ pnpm typecheck       — 0 TypeScript errors across API, Web, and Shared
✓ pnpm lint            — 0 errors (Oxlint type-aware in API; Biome in Web)
✓ pnpm test            — 349 unit tests passed across 42 test suites
✓ E2E tests            — 27 controller integration tests passed
✓ pnpm build           — Production build clean (NestJS API + 48 Next.js App Router routes)
```

---

## Project Structure

```
lms-app/
├── apps/
│   ├── api/                          # NestJS 12 REST API
│   │   ├── Dockerfile                # Multi-stage Alpine production image
│   │   ├── drizzle/                  # 15 SQL migration files (0000 - 0015)
│   │   ├── src/
│   │   │   ├── auth/                 # AUTH-1 → AUTH-5 (JWT, Argon2id, OTP, Sessions)
│   │   │   ├── platform/             # PLAT-1 → PLAT-6 (Super Admin, MFA, Tenants, Audit)
│   │   │   ├── users/                # PO-1, PO-3, PO-4 (Staff directory, promotion)
│   │   │   ├── members/              # AUTH-4, MEM-1, Public enquiry staff review
│   │   │   ├── member-types/         # MEM-2, ADM-2 (Loan policies matrix)
│   │   │   ├── catalogue/            # CAT-1 → CAT-5, SRC-1, SRC-2 (Items, copies, ISBN)
│   │   │   ├── categories/           # CAT-5 (Classification hierarchy)
│   │   │   ├── circulation/          # CIR-1 → CIR-6, CIR-9 (Checkout, return, renewals, lost/damaged)
│   │   │   ├── holds/                # HLD-1 → HLD-3 (Queue, fulfillment, expiry)
│   │   │   ├── fines/                # FIN-1 → FIN-3 (Ledger, payments, waivers)
│   │   │   ├── notifications/        # NOT-1, NOT-2 (Email & SMS with Nairobi quiet hours)
│   │   │   ├── reports/              # RPT-1 (Circulation & executive dashboard)
│   │   │   ├── public/               # PUB-CAT, PUB-ENQ (Public catalogue & enquiries)
│   │   │   ├── health/               # /health/live and /health/ready liveness/readiness probes
│   │   │   ├── database/             # Drizzle schema, RLS context, standalone migrator
│   │   │   └── redis/                # Distributed cache & rate limiting
│   │   └── test/                     # Controller E2E test suites
│   └── web/                          # Next.js 16 App Router
│       ├── Dockerfile                # Multi-stage Alpine production runner
│       ├── app/
│       │   ├── (platform)/           # Dedicated Super Admin workspace (/platform)
│       │   ├── (public)/             # Public library portals, legal center & info
│       │   │   ├── about/            # Platform story & mission
│       │   │   ├── features/         # Detailed feature catalog
│       │   │   ├── for-schools-libraries/ # Institutional onboarding guide
│       │   │   ├── contact/          # Support & enquiries
│       │   │   ├── legal/            # 9 KDPA-compliant legal policies (/legal/*)
│       │   │   ├── libraries/[slug]/ # Tenant-scoped catalogue, home & login
│       │   │   └── request-membership/ # Public membership inquiry
│       │   └── (workspace)/          # Authenticated staff & member workspace
│       │       ├── dashboard/        # Circulation overview (fault-tolerant)
│       │       ├── circulation/      # Issue, return, renew, lost/damaged desk
│       │       ├── catalogue/        # Bibliographic records & physical copies
│       │       ├── categories/       # Subject classification tree
│       │       ├── holds/            # Active queue & ready pickups
│       │       ├── fines/            # Fines ledger, payments & waivers desk
│       │       ├── members/          # Patron directory & enquiry review
│       │       ├── member-types/     # Policy configuration matrix
│       │       ├── settings/         # Library profile & tenant branding
│       │       └── profile/          # Self-service settings, loans & holds
│       ├── features/                 # Modular components, services, and types
│       └── lib/api/endpoints.ts      # Zero-hardcoded central API endpoints registry
├── packages/
│   └── shared/                       # Shared TypeScript types & interfaces
├── docs/                             # Architecture, security audits, PRD, runbooks
├── PROGRESS.md                       # Canonical requirements traceability register
├── DECISIONS.md                      # Approved architecture and scope decisions
└── docker-compose.yml                # Full-stack Docker orchestration definition
```

---

## Roadmap

```
v1.0 MVP ─── Auth ✅ ─── Catalogue ✅ ─── Circulation ✅ ─── Holds ✅ ─── Fines ✅ ─── Pilot Launch 🎯
v1.5     ─── CSV Bulk Import · Offline Circulation Mode · Advanced SMS Templates
v2.0     ─── Full Offline PWA Sync · Parent Portal · Custom Report Builder
v6.0     ─── NEMIS / Government SSO Federation
```

---

## Contributing

This repository is in active pilot preparation. Before contributing:

1. Consult [`DECISIONS.md`](DECISIONS.md) and [`PROGRESS.md`](PROGRESS.md) — do not introduce scope changes without approval.
2. Run the full verification suite (`pnpm typecheck && pnpm -r --if-present lint && pnpm test && pnpm --filter @lms/web build`) before opening a pull request.
3. Ensure all commits adhere to conventional commit messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
