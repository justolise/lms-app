# Commonplace Web — Next.js 16 Application

The frontend web application for **Commonplace Library Management System**, built with Next.js 16 (App Router, Turbopack, Partial Prerendering), React 19, and Tailwind CSS v4.

---

## Architecture Overview

The web workspace is organized into three segregated route groups with dedicated bulkheading error boundaries:

- **`(platform)`**: Dedicated Platform Super Admin workspace (`/platform`) with two-step TOTP MFA, tenant management, monitoring telemetry, and audit logs.
- **`(public)`**: Public portals, legal center (`/legal/*` with 9 KDPA-compliant policies), and tenant-scoped public library pages (`/libraries/[slug]`).
- **`(workspace)`**: Authenticated tenant staff and member desks (Circulation, Catalogue, Categories, Holds, Fines, Members, Member Types, Profile, Settings).

### Key Architectural Guidelines

1. **Centralized API Endpoints Registry**:
   All API requests must use `ENDPOINTS` from `lib/api/endpoints.ts`. Direct, hardcoded `/api/...` strings are prohibited across the web codebase.
2. **Resilience & Fault Tolerance**:
   Each route group defines its own `error.tsx` boundary. Secondary failures (such as telemetry, analytics, or background stats) degrade gracefully with non-blocking alerts without interrupting core circulation desk workflows.
3. **Design System & Semantic Tokens**:
   Styled with Tailwind CSS v4 using CSS variable design tokens defined under `@theme inline` in `app/globals.css`.
4. **Declarative RBAC**:
   Governed declaratively via `<Can>` and `<RequirePermission>` components backed by `lib/auth/permissions.ts`.

---

## Development

```bash
# Start development server on port 3001
pnpm dev

# Type check
pnpm typecheck

# Lint with Biome
pnpm lint

# Production build
pnpm build
```
