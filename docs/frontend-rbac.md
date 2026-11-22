# Role-Based UI Visibility & Access Control (RBAC) Guide

## 1. Overview & Security Boundary Principle

Role-Based Access Control (RBAC) in the LMS frontend is treated as a **first-class architectural system**.

> [!IMPORTANT]
> **Backend Authorization is the Actual Security Boundary**
> Frontend visibility controls and route guards improve user experience by preventing unauthorized actions from being attempted and tailoring the UI to the user's role. All operations remain strictly guarded on the NestJS backend via `@Roles(...)` and PostgreSQL Row-Level Security (RLS).

---

## 2. Supported Roles

The system supports exactly six roles:
1. `ADMIN`: Full administrative control over library configuration, staff promotions, policies, catalogue, and circulation.
2. `LIBRARIAN`: Circulation operations (checkout, checkin, renewals), catalogue cataloging, copy accession, inventory management.
3. `TEACHER`: Extended borrowing privileges, student reading list views, own loan management.
4. `MEMBER`: General borrower (student or community member), catalogue discovery, personal loans and renewals, profile management.
5. `PARENT`: Guardian access, viewing dependent student loans and fines.
6. `GUEST`: Public visitor, read-only catalogue search and category browsing.

---

## 3. Architecture & File Layout

```text
apps/web/
├── lib/
│   └── auth/
│       ├── permissions.ts         # Central typed dictionary of permission constants
│       ├── role-permissions.ts     # Authoritative mapping of AuthRole -> Permission[]
│       ├── permission-helpers.ts   # Pure functions: hasPermission, hasAnyPermission, hasAllPermissions
│       └── auth-context.tsx        # React context exposing current user, role, and auth methods
│
└── components/
    └── auth/
        ├── can.tsx                # <Can permission="..."> conditional rendering component
        └── require-permission.tsx # <RequirePermission permission="..."> route/section guard
```

---

## 4. Permission Definitions

Permissions are defined in `apps/web/lib/auth/permissions.ts` as strongly-typed string constants:

```typescript
export const PERMISSIONS = {
  // Catalogue & Categories
  CATALOGUE_READ: 'catalogue:read',
  CATALOGUE_CREATE: 'catalogue:create',
  CATALOGUE_EDIT: 'catalogue:edit',
  CATALOGUE_ARCHIVE: 'catalogue:archive',
  COPIES_MANAGE: 'copies:manage',
  COPIES_WITHDRAW: 'copies:withdraw',
  CATEGORIES_READ: 'categories:read',
  CATEGORIES_MANAGE: 'categories:manage',
  CATEGORIES_DELETE: 'categories:delete',

  // Circulation
  CIRCULATION_CHECKOUT: 'circulation:checkout',
  CIRCULATION_RETURN: 'circulation:return',
  CIRCULATION_RENEW: 'circulation:renew',
  CIRCULATION_OVERRIDE: 'circulation:override',
  LOANS_READ_OWN: 'loans:read_own',
  LOANS_READ_ALL: 'loans:read_all',

  // Members & Loan Policies
  MEMBERS_READ: 'members:read',
  MEMBERS_CREATE: 'members:create',
  MEMBER_TYPES_READ: 'member_types:read',
  MEMBER_TYPES_MANAGE: 'member_types:manage',
  LOAN_POLICIES_MANAGE: 'loan_policies:manage',

  // Staff User Directory & Administration
  USERS_DIRECTORY_READ: 'users:directory_read',
  USERS_INVITE_LIBRARIAN: 'users:invite_librarian',
  USERS_PROMOTE: 'users:promote',
  USERS_TOGGLE_STATUS: 'users:toggle_status',

  // Profile & Self-Service
  PROFILE_MANAGE_OWN: 'profile:manage_own',
} as const;
```

---

## 5. UI Guidelines: Hide vs Disable

To ensure an intuitive experience:
1. **Hide if Unauthorized**: If the current user's role does not grant the underlying capability, completely omit the element from the DOM using `<Can>`:
   ```tsx
   <Can permission={PERMISSIONS.CATALOGUE_CREATE}>
     <Button onClick={() => setShowAddModal(true)}>+ Add Title</Button>
   </Can>
   ```
2. **Disable with Explanation if Permitted but Ineligible**: If the user has permission to perform an action, but the specific business entity or state prevents it (e.g. max renewals reached or copy already returned), display the control in a disabled state with a descriptive tooltip or inline error message.

---

## 6. Route-Level Protection

Every protected route wraps its main layout inside `<RequirePermission>`:

```tsx
export default function CirculationPage() {
  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <Navbar />

      <RequirePermission permission={PERMISSIONS.CIRCULATION_CHECKOUT}>
        <main className="flex-1 py-8">
          <Container>
            {/* Circulation desks */}
          </Container>
        </main>
      </RequirePermission>
    </div>
  );
}
```

If a user with insufficient permissions navigates to the URL directly, `<RequirePermission>` intercepts the render and displays `<AccessDenied />`, informing them of their current role and offering a button to return to authorized areas.
