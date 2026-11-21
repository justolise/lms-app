<div align="center">

# 📚 LMS — Library Management System

**Mobile-first, multi-tenant library software built for schools and community libraries in Kenya and East Africa.**

[![CI](https://github.com/justolise/lms-app/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/ci.yml)
[![Security](https://github.com/justolise/lms-app/actions/workflows/security.yml/badge.svg?branch=main)](https://github.com/justolise/lms-app/actions/workflows/security.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-166%20passed-brightgreen?logo=vitest)
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

LMS is a **cloud-native, mobile-first library management system** designed from the ground up for the Kenyan and East African education market. It delivers a modern, secure, and low-bandwidth experience that works on a 3G connection with an ₹30 Android phone.

### Key differentiators

| Differentiator | Detail |
|---|---|
| **Multi-tenant isolation** | Each library is a fully isolated tenant with PostgreSQL Row-Level Security — zero cross-tenant data leakage by design |
| **Mobile-first & 3G-ready** | Checkout target < 1 second on 3G; progressive-enhancement UI for low-end Android |
| **Zero-trust security** | Argon2id password hashing · Helmet HTTP security headers · Redis-backed rate limiting · Append-only audit log · CSRF and CSP hardened |
| **Offline-ready architecture** | Schema and architecture designed for future offline sync without rewrites |
| **Kenya Data Protection Act** | Privacy-by-default data model, especially for minors' borrowing records |
| **Open REST API** | Versioned JSON API ready for integrations with government NEMIS, school SMS gateways, and third-party apps |

---

## Status — v1.0 MVP

> **Phase complete: Authentication & Access Control (AUTH-1 → AUTH-5 + People Operations)**
> Circulation, Catalogue, Search, Holds, Fines, Notifications, and Dashboard are in the [v1.0 backlog](https://github.com/users/justolise/projects/5).

| Metric | Value |
|---|---|
| Unit tests passing | ✅ **139 / 139** (16 test files) |
| Controller E2E tests passing | ✅ **27 / 27** (2 test files) |
| TypeScript errors | ✅ **0** (strict mode) |
| Production build | ✅ API + Web both clean |
| CI pipeline | ✅ Green on `main` |
| Security workflow | ✅ Green on `main` |
| Database migrations applied | ✅ 6 Drizzle SQL migrations |
| Completed v1.0 requirements | ✅ **9 / 29 P0 requirements done** |
| MVP requirements remaining | 🔵 20 (Catalogue · Circulation · Holds · Fines · Notifications · Dashboard) |

Full traceability: [`PROGRESS.md`](PROGRESS.md) · [`docs/requirements-traceability.md`](docs/requirements-traceability.md)

---

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                        Client (Browser / Android)          │
│            Next.js 16  ·  React 19  ·  Tailwind CSS 4      │
│           Mobile-first  ·  3G-optimized  ·  Progressive    │
└──────────────────────────┬─────────────────────────────────┘
                           │  HTTPS / REST (JSON)
┌──────────────────────────▼─────────────────────────────────┐
│                    NestJS 12 API                            │
│  AuthModule · UsersModule · MembersModule · MemberTypes     │
│  Helmet CSP/HSTS · Rate Limiting · RBAC Guards · Sessions   │
└───────────┬──────────────────────────────────┬─────────────┘
            │                                  │
┌───────────▼──────────┐          ┌────────────▼────────────┐
│   PostgreSQL 18       │          │       Redis              │
│   Drizzle ORM         │          │  Rate Limiting · Cache   │
│   Row-Level Security  │          │  Session Token Store     │
│   6 SQL Migrations    │          └─────────────────────────┘
│   Append-only Audit   │
└──────────────────────┘
```

### Security architecture (zero-trust)

- **Argon2id** password hashing with tuned cost parameters
- **PostgreSQL RLS** enforced at database level — `FORCE ROW LEVEL SECURITY` on all 7 tenant-owned tables
- **Transaction-local tenant context** — `set_config('app.tenant_id')` scopes every query; missing context fails closed
- **Redis rate limiting** — per-IP, proxy-aware (`x-forwarded-for` → socket fallback), `RateLimitGuard` on auth endpoints
- **Helmet** — strict CSP, HSTS with preload, `X-Frame-Options: DENY`, `noSniff`, `xssFilter`
- **Global `Cache-Control: no-store`** on all API responses
- **Append-only audit log** — application role has `INSERT`-only permission; no mutation of past records
- **HMAC-SHA-256 global identity lookup** — owned by `lms_identity_owner`, accessed only through `SECURITY DEFINER` functions
- **AES-256-GCM** encryption for member identification documents (national ID, passport)
- **Refresh token rotation** with replay detection — compromised token revokes the entire session lineage
- **1 MB payload limit** on all API routes

---

## Technology Stack

| Area | Technology |
|---|---|
| **Monorepo** | pnpm workspaces |
| **Web** | Next.js 16 App Router · React 19 · Tailwind CSS 4 |
| **API** | NestJS 12 · TypeScript (strict) · REST |
| **Database** | PostgreSQL · Drizzle ORM · SQL migrations |
| **Tenant isolation** | PostgreSQL Row-Level Security (RLS) |
| **Cache** | Redis · `RedisService` with typed `get/set/del/delByPattern` |
| **Auth** | Argon2id · JOSE JWT (HS256) · Server-side RBAC |
| **Security** | Helmet · CORS env-driven · Rate limiting · AES-256-GCM |
| **Tests** | Vitest · Unit + Controller E2E |
| **CI/CD** | GitHub Actions (CI + Security workflows) |
| **Dev services** | Docker Compose (Redis) |

---

## Completed Requirements (AUTH & People Operations)

| ID | Priority | Requirement | Evidence |
|---|---|---|---|
| **AUTH-1** | P0 ✅ | Email & Kenyan phone login | E.164 normalization · Argon2id · multi-library selection · first-login password change gate |
| **AUTH-2** | P0 ✅ | 6-role RBAC | `ADMIN · LIBRARIAN · TEACHER · MEMBER · PARENT · GUEST` · server-side `RolesGuard` · 401/403 |
| **AUTH-3** | P0 ✅ | Password reset by OTP | 6-digit OTP · Argon2id hash · 15 min expiry · 5-attempt lockout · session purge |
| **AUTH-4** | P0 ✅ | Staff-provisioned accounts | `POST /api/members` · server-generated temp password · `mustChangePassword` gate |
| **AUTH-5** | P1 ✅ | Sessions & rate limiting | Token rotation · replay detection · Redis rate limiting · per-device logout |
| **PO-1** | P0 ✅ | Staff user directory | `GET /api/users` · `GET /api/users/:id` · Admin/Librarian only · safe projections |
| **PO-2** | P0 ✅ | Self-service profile | `GET /api/profile` · `PATCH /api/profile` · whitelisted fields · role immutable |
| **PO-3** | P0 ✅ | Soft account deactivation | `DELETE /api/profile` → `SUSPENDED` · session revoke · last-admin guard |
| **PO-4** | P0 ✅ | Role promotion | `POST /api/users/:id/promote` · Admin-only · self-promotion rejected · audit logged |
| **MEM-2** | P0 ✅ | Member types & borrowing rules | Loan policy matrix · `MemberTypesService` · full UI at `/member-types` |
| **ADM-2** | P0 ✅ | Loan/fine/hold settings | Per-type loan duration · concurrent loan limits · grace periods · daily/max fines |

---

## v1.0 Remaining Backlog

| Workstream | Requirements |
|---|---|
| Catalogue | CAT-1 · CAT-2 · CAT-3 · CAT-4 · CAT-5 |
| Search | SRC-1 · SRC-2 |
| Circulation | CIR-1 · CIR-2 · CIR-3 · CIR-4 · CIR-5 · CIR-6 · CIR-9 |
| Holds | HLD-1 · HLD-2 · HLD-3 |
| Fines | FIN-1 · FIN-2 · FIN-3 |
| Members | MEM-1 · MEM-4 |
| Notifications | NOT-1 · NOT-2 |
| Inventory | INV-2 |
| Dashboard | RPT-1 |
| Admin | ADM-1 |

Track progress on the [LMS v1.0 GitHub Project board](https://github.com/users/justolise/projects/5).

---

## Quick Start

### Prerequisites

- **Node.js** 22+ (project uses Node 24 in development)
- **pnpm** 12.21.0 (`npm install -g pnpm@12.21.0`)
- **PostgreSQL** with LMS runtime and migration roles provisioned
- **Docker Engine** for Redis
- **Git**

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

Edit `.env` and set:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (runtime role) |
| `MIGRATION_DATABASE_URL` | PostgreSQL connection string (migration role) |
| `REDIS_URL` | Redis connection string (`redis://localhost:6379`) |
| `ACCESS_TOKEN_SECRET` | ≥32-char random secret for JWT access tokens |
| `LIBRARY_SELECTION_TOKEN_SECRET` | ≥32-char random secret for library-selection tokens |
| `IDENTITY_LOOKUP_HMAC_KEY` | ≥32-char secret for global identity HMAC |
| `FRONTEND_URL` | Web app origin for CORS (e.g. `http://localhost:3001`) |

> ⚠️ **Never commit `.env`.** It is git-ignored. Verify with `git status` before every commit.

### 3. Start Redis

```bash
docker compose up -d redis
```

### 4. Apply database migrations

```bash
pnpm --filter @lms/api exec drizzle-kit migrate
```

### 5. Start the API and web app

```bash
# Terminal 1 — API (port 3000)
pnpm --filter @lms/api start:dev

# Terminal 2 — Web (port 3001)
pnpm --filter @lms/web dev
```

---

## Verification

Run the full quality suite in one command:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Run controller E2E tests (no live database required):

```bash
pnpm --filter @lms/api exec vitest run \
  --config ./vitest.config.e2e.ts \
  test/auth.controller.e2e-spec.ts \
  test/users.controller.e2e-spec.ts
```

Run database integration tests (requires local PostgreSQL + Redis):

```bash
pnpm --filter @lms/api test:e2e
```

**Expected results (last verified 21 November 2026, commit `a23d45f`):**

```
✓ pnpm typecheck    — 0 TypeScript errors
✓ pnpm lint         — 0 linting errors
✓ pnpm test         — 139 unit tests passed (16 files)
✓ E2E tests         — 27 tests passed (2 files)
✓ pnpm build        — API + Web production build clean
```

---

## Project Structure

```
lms-app/
├── apps/
│   ├── api/                    # NestJS 12 REST API
│   │   ├── src/
│   │   │   ├── auth/           # AUTH-1 → AUTH-5
│   │   │   ├── users/          # PO-1, PO-3, PO-4
│   │   │   ├── members/        # AUTH-4, MEM-1, MEM-2
│   │   │   ├── member-types/   # MEM-2, ADM-2 (cached via Redis)
│   │   │   ├── common/         # Guards, decorators, rate limiting
│   │   │   ├── database/       # Drizzle ORM, RLS, migrations
│   │   │   └── redis/          # RedisService (cache + rate limit)
│   │   └── test/               # Controller E2E test suites
│   └── web/                    # Next.js 16 App Router
│       └── app/
│           ├── login/          # AUTH-1 login page
│           ├── forgot-password/ # AUTH-3 OTP request
│           ├── reset-password/ # AUTH-3 OTP verification
│           ├── change-password/ # AUTH-4 first-login gate
│           ├── profile/        # PO-2, PO-3
│           ├── users/          # PO-1
│           └── member-types/   # MEM-2, ADM-2
├── packages/
│   └── shared/                 # Shared TypeScript types
├── docs/                       # Architecture, PRD, auth docs, runbook
├── PROGRESS.md                 # Requirement status register
├── DECISIONS.md                # Approved architectural decisions
├── compose.yaml                # Docker Compose (Redis)
└── .env.example                # Environment variable template
```

---

## Engineering Principles

- **Mobile-first** — every UI decision tested against 320px viewport and 3G latency
- **Security by default** — zero-trust multi-tenant isolation; fail-closed RLS; no raw SQL CRUD
- **Privacy by design** — Kenya Data Protection Act 2019 compliance; minors' data minimized
- **Test business rules** — boundary cases, permission matrix, and tenant isolation are first-class test targets
- **No silent changes** — schema, stack, and scope changes require explicit approval and documentation
- **Environment-only secrets** — no secrets in source control, ever

---

## Decisions & Deferred Scope

| Decision | Detail |
|---|---|
| AUTH-4: manual provisioning only | CSV bulk import deferred to v1.5 |
| No public self-registration | All accounts provisioned by authorized staff |
| GUEST is anonymous | No JWT or session required for public catalogue search |
| Teacher/member renewal | Librarian/admin renewal only in v1.0 |
| No offline checkout in v1.0 | Architecture is offline-ready; feature deferred |
| CIR-9 and FIN-3 | Remain P1 unless product owner escalates |

Full decision log: [`DECISIONS.md`](DECISIONS.md)

---

## Roadmap

```
v1.0 MVP ─── Auth & Access ✅ ─── Catalogue 🔵 ─── Circulation 🔵 ─── Holds 🔵 ─── Fines 🔵 ─── Launch 🎯
v1.5     ─── CSV Bulk Import · Enhanced Notifications · Mobile Barcode Scanning
v2.0     ─── Offline Sync · Parent Portal · Reporting Dashboard
v4.0     ─── Parent-Child Account Linking
v6.0     ─── SSO / NEMIS Integration
```

---

## Contributing

This repository is in active pre-pilot development. Before contributing:

1. Read [`DECISIONS.md`](DECISIONS.md) — do not change approved scope without product-owner sign-off.
2. Run the full verification suite (`pnpm typecheck && pnpm lint && pnpm test && pnpm build`) before opening a PR.
3. All PRs must pass the CI and Security GitHub Actions workflows.
4. Do not add secrets or credentials to any committed file.

---

## License

Proprietary. All rights reserved. © 2026 Justolise.

---

<div align="center">

**Built with ❤️ for Kenya's learners · Powered by open-source technology**

[Project Board](https://github.com/users/justolise/projects/5) · [Progress Tracker](PROGRESS.md) · [Architecture Decisions](DECISIONS.md) · [Documentation](docs/)

</div>
