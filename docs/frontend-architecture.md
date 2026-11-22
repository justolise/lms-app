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
│   ├── error.tsx                        # Global runtime error boundary
│   ├── not-found.tsx                    # 404 Not Found page
│   ├── page.tsx                         # Landing / Portal entry
│   ├── catalogue/page.tsx               # Catalogue browser & inventory
│   ├── categories/page.tsx              # Categories classification
│   ├── circulation/page.tsx             # Issue, return, renewal desks
│   ├── member-types/page.tsx            # Borrower types & loan policies
│   ├── users/page.tsx                   # Staff & user directory
│   ├── profile/page.tsx                 # Self-service account profile
│   ├── login/page.tsx                   # User authentication
│   ├── forgot-password/page.tsx         # Password reset request
│   ├── reset-password/page.tsx          # Password reset with token
│   └── change-password/page.tsx         # Authenticated credential change
│
├── features/                            # Encapsulated domain feature modules
│   ├── auth/                            # Authentication & session recovery
│   │   ├── types/auth.types.ts
│   │   ├── services/auth.service.ts
│   │   └── components/                  # LoginForm, ResetPasswordForm, etc.
│   │
│   ├── catalogue/                       # Book catalog & copy inventory
│   │   ├── types/catalogue.types.ts
│   │   ├── services/catalogue.service.ts
│   │   └── components/                  # CatalogueTable, BookModal, CopiesModal, etc.
│   │
│   ├── categories/                      # Classification taxonomy
│   │   ├── types/categories.types.ts
│   │   ├── services/categories.service.ts
│   │   └── components/                  # CategoryTable, CategoryModal
│   │
│   ├── circulation/                     # Circulation desk & barcode scanning
│   │   ├── types/circulation.types.ts
│   │   ├── services/circulation.service.ts
│   │   └── components/                  # CheckoutDesk, ReturnDesk, RenewDesk, BarcodeScanner
│   │
│   ├── member-types/                    # Borrower classifications & loan policy matrix
│   │   ├── types/member-types.types.ts
│   │   ├── services/member-types.service.ts
│   │   └── components/                  # MemberTypeList, PolicyMatrixTable, PolicyModal
│   │
│   └── users/                           # User directory & self-service profile
│       ├── types/users.types.ts
│       ├── services/users.service.ts
│       └── components/                  # UserDirectoryTable, LibrarianModal, ProfileCard
│
├── components/                          # Shared cross-feature UI components
│   ├── auth/                            # RBAC visibility & guard components
│   │   ├── can.tsx                      # <Can permission="...">
│   │   └── require-permission.tsx       # <RequirePermission permission="...">
│   ├── feedback/                        # Alerts, toasts, error boundaries
│   │   ├── alert.tsx                    # <Alert variant="...">
│   │   ├── access-denied.tsx            # <AccessDenied />
│   │   ├── error-boundary.tsx           # <ErrorBoundary />
│   │   └── toast.tsx                    # ToastProvider & useToast()
│   ├── layout/                          # App shell, navigation, containers
│   │   ├── container.tsx                # <Container />
│   │   └── navbar.tsx                   # <Navbar /> (role-based nav links)
│   └── ui/                              # Base design system primitives
│       ├── badge.tsx                    # <Badge variant="...">
│       ├── button.tsx                   # <Button variant="..." isLoading="...">
│       ├── input.tsx                    # <Input />
│       ├── modal.tsx                    # <Modal isOpen="..." onClose="...">
│       ├── select.tsx                   # <Select options="...">
│       └── spinner.tsx                  # <Spinner size="...">
│
├── lib/                                 # Infrastructure, core clients, auth
│   ├── api/
│   │   ├── client.ts                    # Strongly-typed apiClient (credentials: 'include')
│   │   └── errors.ts                    # ApiError normalization
│   └── auth/
│       ├── permissions.ts               # Constant definitions of all system permissions
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
