# LMS Frontend Codebase Architecture Guide

## 1. Overview & Architectural Principles

The Library Management System (LMS) frontend is built on **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Tailwind CSS v4**. It follows a **modular, feature-based architecture** designed for high maintainability, explicit separation of concerns, and intuitive developer onboarding.

### Core Principles
1. **Feature-First Modularity**: All domain-specific business logic, API calls, types, and UI components live inside encapsulated feature directories under `features/<feature-name>/`.
2. **Thin Route Controllers**: Route pages under `app/` are thin wrappers that handle URL parameters, route protection, layout composition, and feature assembly.
3. **Reusable Design System Primitives**: General-purpose presentational components live in `components/ui/` and `components/feedback/`, completely decoupled from any single domain feature.
4. **Tailwind CSS v4 Design Tokens**: The visual appearance, themes, and colors are defined centrally as CSS variables under `@theme inline` in `app/globals.css`. Components consume semantic tokens (`--primary`, `--surface`, `--border`, `--muted`, `--danger`, etc.), enabling seamless theme changes without editing components.
5. **Declarative First-Class RBAC**: UI visibility and authorization are governed declaratively through `<Can>` and `<RequirePermission>` components backed by strongly typed permission constants.
6. **Robust Error Boundaries & User Feedback**: Built-in React Error Boundary, Next.js root `error.tsx`, `not-found.tsx`, and a global toast notification system (`useToast()`) ensure clear, human-friendly feedback across all user journeys.

---

## 2. Directory Structure

```text
apps/web/
├── app/                                 # Thin Next.js App Router routes & layouts
│   ├── globals.css                      # Tailwind v4 theme tokens & CSS variables
│   ├── layout.tsx                       # Root HTML shell & fonts
│   ├── providers.tsx                    # Root context providers (Auth + Toast)
│   ├── error.tsx                        # Global fallback runtime error boundary
│   ├── not-found.tsx                    # 404 Not Found page
│   │
│   ├── (platform)/                      # Dedicated Platform Super Admin workspace
│   │   ├── error.tsx                    # Platform bulkheading error boundary
│   │   └── platform/
│   │       ├── layout.tsx               # Super Admin shell with high-contrast amber badges
│   │       ├── login/page.tsx           # Two-step TOTP MFA authentication
│   │       ├── page.tsx                 # Operations overview & service status
│   │       ├── tenants/page.tsx         # Tenant lifecycle directory & onboarding
│   │       ├── tenants/[id]/page.tsx    # Tenant details & admin provisioning
│   │       ├── monitoring/page.tsx      # Real-time telemetry, memory & DB/Redis health
│   │       └── audit-logs/page.tsx      # Immutable platform audit trail explorer
│   │
│   ├── (public)/                        # Public library portals, legal center & info
│   │   ├── error.tsx                    # Public portal bulkheading error boundary
│   │   ├── layout.tsx                   # Public shell with 5-nav and 5-column footer
│   │   ├── page.tsx                     # Landing hero & catalogue search
│   │   ├── about/page.tsx               # Platform mission & East African context
│   │   ├── features/page.tsx            # Comprehensive feature catalog
│   │   ├── for-schools-libraries/page.tsx # Institutional onboarding & migration guide
│   │   ├── contact/page.tsx             # Support channels & enquiry form
│   │   ├── legal/                       # 9 KDPA-compliant legal policies (/legal/*)
│   │   │   ├── layout.tsx               # Legal center sidebar navigation
│   │   │   ├── page.tsx                 # Legal center directory & search index
│   │   │   ├── policies-data.ts         # Centralized policy metadata
│   │   │   └── [policy]/page.tsx        # Terms, Privacy, AUP, Cookies, Security, etc.
│   │   ├── libraries/[slug]/            # Tenant-scoped public portals
│   │   │   ├── page.tsx                 # Tenant library homepage
│   │   │   ├── login/page.tsx           # Tenant-specific staff & patron login
│   │   │   └── catalogue/               # Isolated tenant catalogue search & detail
│   │   └── request-membership/page.tsx  # Branch-aware membership request form
│   │
│   └── (workspace)/                     # Authenticated staff & member workspace
│       ├── error.tsx                    # Workspace bulkheading error boundary
│       ├── layout.tsx                   # Staff desk shell with sidebar & user menu
│       ├── dashboard/page.tsx           # Circulation overview (fault-tolerant)
│       ├── circulation/page.tsx         # Issue, return, renew, lost/damaged desk
│       ├── catalogue/page.tsx           # Bibliographic records & physical copies
│       ├── categories/page.tsx          # Subject classification tree
│       ├── holds/page.tsx               # Active queue & ready pickups
│       ├── fines/page.tsx               # Fines ledger, payments & waivers desk
│       ├── members/page.tsx             # Patron directory & enquiry review
│       ├── member-types/page.tsx        # Policy configuration matrix
│       ├── settings/page.tsx            # Library profile & tenant branding
│       └── profile/page.tsx             # Self-service settings, loans & holds
│
├── features/                            # Encapsulated domain feature modules
│   ├── auth/                            # Authentication & session recovery
│   ├── platform/                        # Super Admin services & components
│   ├── catalogue/                       # Book catalog & copy inventory
│   ├── categories/                      # Classification taxonomy
│   ├── circulation/                     # Circulation desk & barcode scanning
│   ├── holds/                           # Reservation queue management
│   ├── fines/                           # Ledger, payments & receipts
│   ├── members/                         # Patron management & profiles
│   ├── member-types/                    # Borrower classifications & loan policies
│   ├── reports/                         # Dashboard metrics & aggregations
│   └── users/                           # User directory & self-service profile
│
├── components/                          # Shared cross-feature UI components
│   ├── auth/                            # RBAC visibility & guard components (<Can>, <RequirePermission>)
│   ├── feedback/                        # Alerts, toasts, error boundaries
│   ├── layout/                          # App shell, navigation, public shell
│   └── ui/                              # Base design system primitives
│
├── lib/                                 # Infrastructure, core clients, auth
│   ├── api/
│   │   ├── endpoints.ts                 # STRICT SINGLE SOURCE OF TRUTH FOR ALL ENDPOINTS
│   │   ├── client.ts                    # Strongly-typed apiClient (credentials: 'include')
│   │   └── errors.ts                    # ApiError normalization
│   └── auth/
│       ├── permissions.ts               # Constant definitions of all system permissions
│       ├── role-permissions.ts          # Matrix mapping AuthRole -> Permission[]
│       ├── permission-helpers.ts        # hasPermission, hasAnyPermission, hasAllPermissions
│       └── auth-context.tsx             # AuthProvider & useAuth() hook
│
├── types/                               # Common and cross-cutting TypeScript types
│       ├── role-permissions.ts          # Matrix mapping AuthRole -> Permission[]
│       ├── permission-helpers.ts        # hasPermission, hasAnyPermission, hasAllPermissions
│       └── auth-context.tsx             # AuthProvider & useAuth() hook
│
├── types/                               # Common and cross-cutting TypeScript types
│   ├── common.ts                        # ApiResponse, PaginatedResult
│   └── roles.ts                         # AuthRole enum ('ADMIN' | 'LIBRARIAN' | ...)
│
├── utils/                               # Pure, tested helper functions
│   ├── classnames.ts                    # cn() helper for Tailwind class merging
│   ├── currency.ts                      # formatKes() for minor units to KES
│   └── date.ts                          # formatDate(), formatTime() (UTC+3 Nairobi aware)
│
└── tests/                               # Unit and integration test suites
    ├── rbac.test.ts                     # Permissions mapping & RBAC helper tests
    └── date-currency.test.ts            # Formatting utility tests
```

---

## 3. Tailwind CSS v4 Design Tokens

Tailwind CSS v4 introduces CSS-first configuration via `@theme inline` in `app/globals.css`. All components reference semantic CSS classes rather than hardcoded palette names.

### Theme Variables
- `--primary`: Main brand color (Deep Blue `#1e40af` light / Sky `#38bdf8` dark).
- `--surface`: Base card/panel background (`#ffffff` light / `#18181b` dark).
- `--surface-raised`: Slightly elevated page background (`#f4f4f5` light / `#09090b` dark).
- `--border`: Standard border separator (`#e4e4e7` light / `#27272a` dark).
- `--foreground`: High-contrast body text (`#09090b` light / `#fafafa` dark).
- `--muted-foreground`: Secondary descriptive text (`#71717a` light / `#a1a1aa` dark).
- `--success`: Positive state indicator (`#16a34a` light / `#4ade80` dark).
- `--danger`: Error/destructive state indicator (`#dc2626` light / `#f87171` dark).
- `--warning`: Attention/caution state indicator (`#d97706` light / `#fbbf24` dark).

---

## 4. API Client & Error Handling Patterns

### `apiClient`
All feature services consume the singleton `apiClient` (`lib/api/client.ts`).
- Automatically forwards `credentials: 'include'` on every request to preserve authentication cookies.
- Parses JSON responses safely.
- Normalizes server error bodies into typed `ApiError` instances containing HTTP status code, user-friendly message, and raw server details.

### Error Boundaries & User Notifications
- **Global Error Boundary (`app/error.tsx`)**: Intercepts unhandled React rendering errors, displaying a recovery card with a retry button and error digest reference.
- **Section Error Boundary (`components/feedback/error-boundary.tsx`)**: Wraps complex widgets (such as barcode scanners or data tables) so an isolated failure does not crash the entire view.
- **Toast Notifications (`components/feedback/toast.tsx`)**:
  ```tsx
  import { useToast } from '@/components/feedback/toast';

  const { toast } = useToast();
  toast.success('Book copy checked out successfully');
  toast.error('Member loan limit exceeded');
  ```
- **Accessible Alerts (`components/feedback/alert.tsx`)**: Inline informational banners (`info`, `success`, `warning`, `error`).
