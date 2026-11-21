# Authorization & Role-Based Access Control (v1.0 MVP)

This document specifies the authorization architecture, permission matrix, route guards, ownership checks, and tenant isolation safeguards enforced across the LMS v1.0 platform.

---

## 1. Approved Role Matrix

The matrix below reflects the **final approved decisions** of the product owner for v1.0.

*Symbols*:
- `✓`: Allowed across tenant.
- `own`: Allowed only for the user's own records.
- `✗`: Forbidden (`403 Forbidden` or `401 Unauthorized`).

| Operation | Admin | Librarian | Teacher | Member | Parent | Guest | Enforcement Mechanism |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Public Catalog Search** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Unauthenticated / Public |
| **Authenticate (Login/Refresh/OTP)** | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | Public auth endpoints with credentials |
| **View Own Profile** | own | own | own | own | own | ✗ | `GET /api/profile` via `AccessTokenGuard` |
| **Update Own Profile** | own | own | own | own | own | ✗ | `PATCH /api/profile` (whitelisted fields) |
| **Change Own Password** | own | own | own | own | own | ✗ | `POST /api/auth/change-password` |
| **Deactivate Own Account** | own | own | own | own | own | ✗ | `DELETE /api/profile` (with last-active checks) |
| **View Staff User Directory** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | `GET /api/users` (`@Roles('ADMIN', 'LIBRARIAN')`) |
| **View Tenant User Details** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | `GET /api/users/:userId` (tenant-scoped) |
| **Create Member Account** | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | `POST /api/members` (`@Roles('ADMIN', 'LIBRARIAN')`) |
| **Create Librarian Account** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | `POST /api/users/librarians` (`@Roles('ADMIN')`) |
| **Promote Librarian to Admin** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | `POST /api/users/:userId/promote` (`@Roles('ADMIN')`) |
| **Arbitrary Role Modification** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Disallowed; only explicit promote endpoint |
| **Public Self-Registration** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Disallowed; staff-created accounts only |
| **Revoke Another User's Sessions**| ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Disallowed; own-session revocation only |
| **Cross-Tenant Data Access** | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | Hard-blocked by PostgreSQL RLS |

---

## 2. Guard Pipeline & Server-Side Enforcement

Authorization is enforced strictly on the server side in NestJS:

```
Incoming Request
      │
      ▼
1. RateLimitGuard (Redis-backed request limits)
      │
      ▼
2. AccessTokenGuard
   ├─ Extracts and verifies signed JWT from access_token HTTP-only cookie.
   ├─ Confirms session is active in database (revokedAt IS NULL and expiresAt > now()).
   ├─ Enforces first-login restriction: if payload.mustChangePassword == true,
   │  blocks non-password-change endpoints with 403 Forbidden.
   └─ Attaches verified payload to request.user (userId, tenantId, role, sessionId).
      │
      ▼
3. RolesGuard
   ├─ Reads @Roles(...) decorator metadata from handler or controller.
   └─ Confirms request.user.role matches allowed role set; otherwise throws 403 Forbidden.
      │
      ▼
4. Tenant Transaction Scope (DatabaseService.withTenant)
   ├─ Invokes set_config('app.tenant_id', tenantId, true).
   └─ PostgreSQL Row-Level Security filters all queries to caller's tenant.
```

---

## 3. Account Deactivation Protections (Section 4.5)

To prevent orphaned or unadministered libraries:

1. **Last Active Admin Safeguard**:
   When an administrator requests deactivation (`DELETE /api/profile`), the service counts active administrators in the tenant within a locked transaction:
   ```ts
   const activeAdmins = await tx
     .select({ id: users.id })
     .from(users)
     .where(and(eq(users.tenantId, tenantId), eq(users.role, 'ADMIN'), eq(users.status, 'ACTIVE')))
     .for('update');

   if (activeAdmins.length <= 1) {
     throw new BadRequestException('Cannot deactivate the last active administrator');
   }
   ```
2. **Last Active Librarian Safeguard**:
   When a librarian requests deactivation, the active librarians in the tenant are counted inside the transaction with row locks:
   ```ts
   const activeLibrarians = await tx
     .select({ id: users.id })
     .from(users)
     .where(and(eq(users.tenantId, tenantId), eq(users.role, 'LIBRARIAN'), eq(users.status, 'ACTIVE')))
     .for('update');

   if (activeLibrarians.length <= 1) {
     throw new BadRequestException('Cannot deactivate the last active librarian');
   }
   ```
3. **Concurrent Deactivation Safety**:
   The use of `FOR UPDATE` serializes concurrent deactivation attempts, preventing race conditions where two simultaneous requests could deactivate both remaining administrators.

---

## 4. Role Promotion Rules (Section 4.6)

Role elevation is permitted only via the dedicated endpoint `POST /api/users/:userId/promote`:

- **Actor Authorization**: Caller must hold role `ADMIN`.
- **Target Eligibility**:
  - Target user must belong to the caller's tenant (validated via `eq(users.tenantId, tenantId)`).
  - Target must currently hold role `LIBRARIAN`.
  - Target must have account status `ACTIVE`.
- **Self-Promotion Prohibited**: If `actorId === targetUserId`, request is rejected with `400 Bad Request`.
- **No Arbitrary Role Mutations**: No generic endpoint exists to update user roles to arbitrary values.
- **Audit Logging**: Successful promotion creates an audit log with action `ROLE_PROMOTED`, recording `oldRole: 'LIBRARIAN'` and `newRole: 'ADMIN'`.

---

## 5. Profile Ownership and Field Protection

When updating a user profile via `PATCH /api/profile`:

- The operation updates the caller's **own** user record only (`where: eq(users.id, userId)`).
- **Whitelisted fields**: `fullName`, `email`, `phone`.
- **Protected fields (immutable via profile endpoints)**:
  - `role`
  - `tenantId`
  - `status`
  - `passwordHash`
  - `mustChangePassword`
  - `emailVerifiedAt` / `phoneVerifiedAt`
  - `createdAt` / `updatedAt`
- Attempting to pass forbidden fields is blocked by class-validator (`forbidNonWhitelisted: true`) and service-level data mapping.
