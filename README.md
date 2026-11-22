<div align="center">

# 📚 LMS — Library Management System

**Mobile-first, multi-tenant library software built for schools and community libraries in Kenya and East Africa.**

[![CI](https://github.com/justolise/lms-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/ci.yml)
[![Security](https://github.com/justolise/lms-app/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/security.yml)
[![Latest Release](https://img.shields.io/github/v/release/justolise/lms-app?include_prereleases&color=blue&label=release)](https://github.com/justolise/lms-app/releases)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-244%20passed-brightgreen?logo=vitest)
![PostgreSQL RLS](https://img.shields.io/badge/PostgreSQL-RLS%20enforced-336791?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-12-E0234E?logo=nestjs)
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

LMS is a **cloud-native, mobile-first SaaS library management system** designed from the ground up for the Kenyan and East African education market. It delivers a modern, secure, and low-bandwidth experience that works on a 3G connection with an affordable Android smartphone.

### Key differentiators

| Differentiator                 | Detail                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Multi-tenant SaaS isolation**| Each library is a fully isolated tenant with PostgreSQL Row-Level Security — zero cross-tenant data leakage by design                 |
| **Public tenant portals**      | Isolated public catalogue search and unauthenticated membership enquiry requests with branch selection                                 |
| **Mobile-first & 3G-ready**    | Checkout target < 1 second on 3G; progressive-enhancement UI; camera-based QR and barcode scanning with manual fallback              |
| **Zero-trust security**        | Argon2id password hashing · Helmet HTTP security headers · Redis-backed rate limiting · Append-only audit logs · CSRF and CSP hardened  |
| **Append-only fine ledger**    | Immutable fine and payment transactions protected by database triggers; tamper-proof payment receipt generation                       |
| **Fair FIFO holds queue**      | Automated queue management and return-desk hold fulfillment reserving copies for ready claimants                                      |
| **Kenya Data Protection Act**  | Privacy-by-default data model, especially for minors' borrowing records; AES-256-GCM encrypted identification documents               |

---

## Status — v1.0 MVP

> **Phases delivered: Authentication & Identity · Catalogue & Classification · Core Circulation · Holds & Reservations · Fine Ledger & Waivers · Public Tenant Portals**
> Remaining v1.0 items: Member profile editing & history · Email/SMS notification triggers · Inventory loss reasons · Circulation dashboard · Library branding.

| Metric                       | Value                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------- |
| Unit tests passing           | ✅ **244 / 244** (24 test files)                                                  |
| Controller E2E tests passing | ✅ **27 / 27** (2 test files)                                                     |
| TypeScript errors            | ✅ **0** (`tsc --noEmit` across API and Web)                                      |
| Linting status               | ✅ **0 errors** (Oxlint type-aware in API; Biome in Web)                          |
| Production build             | ✅ **API + Web (23 App Router static & partial prerendered routes)**              |
| CI pipeline                  | ✅ Green on `main`                                                                |
| Security workflow            | ✅ Green on `main`                                                                |
| Database migrations applied  | ✅ **12 Drizzle SQL migrations** (`0000` through `0012_fine_ledger.sql`)          |
| Completed v1.0 requirements  | ✅ **25+ requirements delivered & verified**                                      |

Full traceability: [`PROGRESS.md`](PROGRESS.md) · [`docs/requirements-traceability.md`](docs/requirements-traceability.md)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client (Browser / Android)                      │
│            Next.js 16  ·  React 19  ·  Tailwind CSS 4  ·  Forest Theme  │
│        (public) Library Portal  │  (workspace) Staff & Patron Desks    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │  HTTPS / REST (JSON) via Next.js Proxy
┌───────────────────────────────────▼────────────────────────────────────┐
│                             NestJS 12 API                              │
│  AuthModule · UsersModule · MembersModule · MemberTypesModule          │
│  CatalogueModule · CategoriesModule · CirculationModule · HoldsModule  │
│  FinesModule · PublicModule · DatabaseModule · RedisModule             │
│  Helmet CSP/HSTS · Rate Limiting · RBAC Guards · Sessions · Audit Logs │
└─────────────────────┬──────────────────────────────────┬───────────────┘
                      │                                  │
┌─────────────────────▼────────┐          ┌──────────────▼──────────────┐
│        PostgreSQL 16         │          │            Redis            │
│  Drizzle ORM                 │          │  Sliding-window Rate Limits │
│  Row-Level Security (RLS)    │          │  Distributed Cache          │
│  12 Drizzle SQL Migrations   │          │  Session Token Store        │
│  Append-only Ledger Triggers │          └─────────────────────────────┘
└──────────────────────────────┘
```

### Security architecture (zero-trust)

- **Argon2id** password hashing with tuned memory and iteration cost parameters
- **PostgreSQL RLS** enforced at database level — `FORCE ROW LEVEL SECURITY` on all tenant-owned tables
- **Transaction-local tenant context** — `set_config('app.tenant_id')` scopes every transaction; missing context fails closed
- **Immutable fine ledger** — PostgreSQL trigger `trg_fine_entries_immutable` rejects `UPDATE` and `DELETE` on `fine_entries`
- **Redis rate limiting** — per-IP sliding window via proxy-aware `request.ip`; protection on auth and public endpoints
- **Helmet security headers** — strict CSP, HSTS with preload, `X-Frame-Options: DENY`, `noSniff`, `xssFilter`
- **Append-only audit logs** — tamper-proof event records for auth, circulation, holds, overrides, and fee waivers
- **HMAC-SHA-256 global identity lookup** — owned by `lms_identity_owner`, accessed only through `SECURITY DEFINER` functions
- **AES-256-GCM** encryption for member identification documents (national ID, passport)
- **Refresh token rotation** with replay detection — compromised tokens immediately revoke the entire session lineage

---

## Technology Stack

| Area                 | Technology                                                                     |
| -------------------- | ------------------------------------------------------------------------------ |
| **Monorepo**         | pnpm workspaces (`@lms/api`, `@lms/web`, `@lms/shared`)                       |
| **Web Application**  | Next.js 16 (Turbopack, App Router, PPR) · React 19 · Tailwind CSS 4 · Biome    |
| **Backend API**      | NestJS 12 · TypeScript (strict) · Oxlint                                       |
| **Database**         | PostgreSQL 16 · Drizzle ORM · SQL migrations                                   |
| **Tenant Isolation** | PostgreSQL Row-Level Security (RLS) with fail-closed transaction context       |
| **Cache & Limiting** | Redis · Sliding-window rate limiter · `RedisService`                           |
| **Authentication**   | Argon2id · JOSE JWT (HS256) · Server-side RBAC · HttpOnly cookies              |
| **Scanning**         | `@zxing/wasm` multi-format barcode & QR reader (in-browser camera)              |
| **Test Suites**      | Vitest · 244 unit tests · 27 Controller E2E tests                              |
| **CI/CD**            | GitHub Actions (`ci.yml`, `security.yml`)                                      |
| **Infrastructure**   | Docker Compose (Redis)                                                         |

---

## Completed Features

### Authentication & Access Control
| ID | Requirement | Implementation |
| :--- | :--- | :--- |
| **AUTH-1** | Email & Kenyan phone authentication | E.164 normalization, multi-library selection, Argon2id, first-login password change gate |
| **AUTH-2** | 6-role RBAC | `ADMIN · LIBRARIAN · TEACHER · MEMBER · PARENT · GUEST` with server-side `RolesGuard` |
| **AUTH-3** | Password reset by OTP | 6-digit OTP, Argon2id hash, 15-minute expiry, 5-attempt lockout, session purge |
| **AUTH-4** | Staff-provisioned accounts | `POST /api/members`, server-generated temporary passwords, `mustChangePassword` flag |
| **AUTH-5** | Session management & rate limiting | Token rotation, replay detection, Redis rate limiting, per-device revocation |
| **PO-1 → PO-4** | People operations | User directory, self-service profile, soft deactivation, admin role promotion |

### Catalogue, Classification & Inventory
| ID | Requirement | Implementation |
| :--- | :--- | :--- |
| **CAT-1** | Bibliographic records | Full CRUD with soft archive, tenant RLS, audit logging |
| **CAT-2** | ISBN metadata lookup | Server-side Open Library with Google Books fallback; ISBN-13 checksum validation |
| **CAT-3** | Physical copies & barcodes | Tenant-scoped unique barcodes enforced at database index and service layer |
| **CAT-4** | Copy status lifecycle | 7-status state machine (`AVAILABLE/ON_LOAN/RESERVED/IN_TRANSIT/LOST/DAMAGED/WITHDRAWN`) |
| **CAT-5** | Categories, shelf & call numbers | Hierarchical categories, call number tracking, shelf location overrides |
| **SRC-1, SRC-2** | Catalogue search & filters | PostgreSQL GIN tsvector full-text search with ranking, format, and availability filters |

### Circulation & Holds
| ID | Requirement | Implementation |
| :--- | :--- | :--- |
| **CIR-1** | Book checkout | Atomic checkout, copy transition to `ON_LOAN`, policy concurrency limit enforcement |
| **CIR-2** | Return & automated fine detection | Africa/Nairobi calendar-day overdue calculation, grace period deduction, automated fine charge |
| **CIR-3** | Renewals & hold queue blocks | Configurable renewal limits, extension from due date, blocking renewal when holds wait |
| **CIR-4** | Loan policy cascading | Resolution matrix by member type and item format with system fallbacks |
| **CIR-5** | Checkout blocks & staff overrides | Enforcement of suspended accounts, expired cards, and unpaid fine ceilings with audit logging |
| **CIR-6** | Camera barcode/QR scanning | Client-side `@zxing/wasm` multi-format camera scanner with manual barcode fallback |
| **HLD-1** | FIFO holds queue | Placement on titles with zero available copies, duplicate prevention, pickup window resolution |
| **HLD-2** | Return hold fulfillment | Automated copy reservation (`RESERVED`) on return, pickup countdown timer, hold fulfillment |
| **HLD-3** | Hold queue management | Self-service patron cancellation, staff queue re-indexing, copy release |

### Fines & Payments
| ID | Requirement | Implementation |
| :--- | :--- | :--- |
| **FIN-1** | Configurable fine rules | Daily rate, grace days, and ceiling cap per loan policy; comprehensive boundary tests |
| **FIN-2** | Append-only fine ledger & waivers | Immutable `fine_entries` ledger with trigger protection; payment recording; waiver desk with mandatory reasons |
| **FIN-3** | Fine payment receipts | Unique tamper-proof receipt numbers (`RCP-YYYYMMDD-XXXX`), viewable receipt modal, printable receipt |

### Public Portals & Enquiries
| ID | Requirement | Implementation |
| :--- | :--- | :--- |
| **PUB-CAT** | Tenant public catalogue | Isolated public catalogue at `/libraries/:slug/catalogue` with search, filters, and pagination |
| **PUB-ENQ** | Public membership enquiry | Unauthenticated request form at `/libraries/:slug/request-membership`, slug resolution, email receipt, staff review queue |
| **MEM-2, ADM-2**| Borrowing rules & matrix | Dynamic loan policy configuration matrix API and web UI at `/member-types` |

---

## Remaining v1.0 Backlog

| Workstream | Requirement ID | Feature Description | Priority |
| :--- | :--- | :--- | :---: |
| **Members** | `MEM-1` | Member profile updates, photo attachments, and unique admission numbers | P0 |
| **Members** | `MEM-4` | Patron borrowing history inspection (self & staff only) | P0 |
| **Notifications** | `NOT-1` | Automated email dispatch for due-soon, overdue, hold-ready, and fine events | P0 |
| **Notifications** | `NOT-2` | Automated SMS notifications via Africa's Talking | P0 |
| **Inventory** | `INV-2` | Mandatory reason tracking when copies are marked lost, damaged, or withdrawn | P0 |
| **Reporting** | `RPT-1` | High-performance circulation dashboard SQL aggregations (< 2s) | P0 |
| **Admin** | `ADM-1` | Library tenant profile branding (name, logo, operating hours, contacts) | P0 |
| **Circulation** | `CIR-9` | Lost/damaged workflow with replacement charges | P1 |

Track progress on the [LMS v1.0 GitHub Project Board](https://github.com/users/justolise/projects/5).

---

## Quick Start

### Prerequisites

- **Node.js** 22+ (v24 recommended)
- **pnpm** 10+ (`npm install -g pnpm`)
- **PostgreSQL 16+** with runtime and migration roles provisioned
- **Docker Engine** for Redis

### 1. Clone & install

```bash
git clone https://github.com/justolise/lms-app.git
cd lms-app
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Ensure `.env` contains:

```ini
DATABASE_URL=postgresql://lms_app:library@127.0.0.1:5432/lms
MIGRATION_DATABASE_URL=postgresql://lms_app:library@127.0.0.1:5432/lms
REDIS_URL=redis://127.0.0.1:6379
ACCESS_TOKEN_SECRET=your-minimum-32-char-random-secret-here
REFRESH_TOKEN_SECRET=your-minimum-32-char-random-secret-here
LIBRARY_SELECTION_TOKEN_SECRET=your-minimum-32-char-random-secret-here
IDENTITY_LOOKUP_HMAC_KEY=your-minimum-32-char-random-secret-here
FRONTEND_URL=http://localhost:3001
```

### 3. Start Redis

```bash
docker compose up -d redis
```

### 4. Apply database migrations

```bash
pnpm --filter @lms/api exec drizzle-kit migrate
```

### 5. Start development servers

```bash
# Terminal 1 — NestJS API (port 3000)
pnpm --filter @lms/api start:dev

# Terminal 2 — Next.js Web (port 3001)
pnpm --filter @lms/web dev
```

---

## Verification & Quality Gates

Run the complete workspace verification suite in one command:

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

**Quality gate results (verified 22 November 2026):**

```
✓ pnpm typecheck       — 0 TypeScript errors across all packages
✓ pnpm lint            — 0 errors (Oxlint type-aware in API; Biome in Web)
✓ pnpm test            — 244 unit tests passed (24 test files)
✓ E2E tests            — 27 controller integration tests passed
✓ pnpm build           — Production build clean (API + 23 App Router routes)
```

---

## Project Structure

```
lms-app/
├── apps/
│   ├── api/                          # NestJS 12 REST API
│   │   ├── drizzle/                  # 12 SQL migration files (0000 - 0012)
│   │   ├── src/
│   │   │   ├── auth/                 # AUTH-1 → AUTH-5 (JWT, Argon2id, OTP, Sessions)
│   │   │   ├── users/                # PO-1, PO-3, PO-4 (Staff directory, promotion)
│   │   │   ├── members/              # AUTH-4, MEM-1, Public enquiry staff review
│   │   │   ├── member-types/         # MEM-2, ADM-2 (Loan policies matrix)
│   │   │   ├── catalogue/            # CAT-1 → CAT-5, SRC-1, SRC-2 (Items, copies, ISBN)
│   │   │   ├── categories/           # CAT-5 (Classification hierarchy)
│   │   │   ├── circulation/          # CIR-1 → CIR-6 (Checkout, return, renewals)
│   │   │   ├── holds/                # HLD-1 → HLD-3 (Queue, fulfillment, expiry)
│   │   │   ├── fines/                # FIN-1 → FIN-3 (Ledger, payments, waivers)
│   │   │   ├── public/               # PUB-CAT, PUB-ENQ (Public catalogue & enquiries)
│   │   │   ├── database/             # Drizzle schema, RLS client context
│   │   │   └── redis/                # Distributed cache & rate limiting
│   │   └── test/                     # Controller E2E test suites
│   └── web/                          # Next.js 16 App Router
│       ├── app/
│       │   ├── (public)/             # Public library portal
│       │   │   ├── browse/           # General catalogue search
│       │   │   ├── libraries/[slug]/ # Tenant-scoped catalogue, book detail & enquiries
│       │   │   └── request-membership/ # Branch-aware membership request form
│       │   └── (workspace)/          # Authenticated staff & member workspace
│       │       ├── dashboard/        # Circulation overview
│       │       ├── circulation/      # Issue, return, renew desk
│       │       ├── catalogue/        # Bibliographic records & physical copies
│       │       ├── categories/       # Subject classification tree
│       │       ├── holds/            # Active queue & ready pickups
│       │       ├── fines/            # Fines ledger, payments & waivers desk
│       │       ├── members/          # Patron directory & enquiry review
│       │       ├── member-types/     # Policy configuration matrix
│       │       └── profile/          # Self-service settings, loans & holds
│       └── features/                 # Modular components, services, and types
├── packages/
│   └── shared/                       # Shared TypeScript types & interfaces
├── docs/                             # Architecture, security audits, PRD, runbooks
├── PROGRESS.md                       # Canonical requirements traceability register
├── DECISIONS.md                      # Approved architecture and scope decisions
└── compose.yaml                      # Redis container definition
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
