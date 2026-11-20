# LMS Architecture and Product Decisions

This file records product-owner-approved decisions and material technical decisions. A proposed implementation detail is not an approved requirement. Changes to scope, stack, schema or approved business rules require product-owner approval.

## Approved product scope

- Build v1.0 MVP only (release theme: Core Circulation).
- Do not begin later releases until the v1.0 pilot has been completed and feedback reviewed.
- The first pilot targets a school library.
- AUTH-4 supports manual/single-member account creation only. CSV bulk import is deferred.
- No public self-registration; accounts are provisioned by authorised staff.
- CIR-9 and FIN-3 remain P1 unless the product owner explicitly changes their priority.
- Offline checkout/return transactions are not part of v1.0. Preserve architectural readiness only.

## Approved application architecture

- Use a pnpm workspaces monorepo.
- `apps/web`: Next.js App Router, React and Tailwind CSS.
- `apps/api`: NestJS TypeScript REST API.
- `packages/shared`: shared types and utilities.
- PostgreSQL with Drizzle ORM and SQL migrations.
- Redis is the local supporting service. BullMQ/background-job integration is planned but is not present in the inspected API package dependencies.
- PostgreSQL full-text search is the intended search approach; catalogue/search implementation remains pending.
- Use Docker Compose for local supporting services. Current `compose.yaml` starts Redis only; PostgreSQL is provisioned separately.

## Database and tenant isolation decisions

- Use UUID primary keys.
- Include `tenant_id` on every tenant-owned table from the beginning.
- The `tenants` table is the root tenant registry and does not itself require `tenant_id`.
- Use PostgreSQL Row-Level Security for tenant-owned tables.
- Tenant context must be set transaction-locally within the database transaction.
- Missing tenant context must fail closed.
- PostgreSQL 18.6 was approved for the existing local development database; production compatibility and hosting remain to be confirmed.
- Migration ownership is separate from runtime application access.
- Runtime audit records are append-only for the application role.

## Authentication and identity decisions

- Hash passwords with Argon2id.
- Use short-lived access tokens.
- Store refresh-token hashes, not plaintext refresh tokens.
- Enforce role-based permissions on the API.
- Login accepts email or phone plus password.
- Email and phone are unique within a tenant, not globally.
- Identity discovery can find accounts across libraries without requiring users to enter a library code.
- If multiple library memberships match, verify credentials before presenting library selection; use a short-lived selection token.
- Normalize email before hashing; validate and normalize phone numbers to E.164, using Kenya (`KE`) as the default region.
- Global identity lookup uses HMAC-SHA-256; raw email addresses and phone numbers are not stored in the global lookup table.
- A dedicated NOLOGIN database role, `lms_identity_owner`, owns restricted identity functions. The runtime role uses approved functions rather than direct lookup-table access.
- Persisted tenant roles are ADMIN, LIBRARIAN, TEACHER, MEMBER and PARENT.
- GUEST is anonymous: it has no user account, authenticated session or JWT. Public catalogue search and availability do not require authentication.
- Access tokens are issued and accepted only for the five persisted tenant roles.
- Authentication users and member-specific data are separate.
- `member_profiles` has a one-to-one relationship with `users`.
- A member may have at most one identification document recorded.
- Supported identification document types: NATIONAL_ID, ALIEN_ID, PASSPORT and OTHER.
- Identification document value has an encrypted-value field and a separate lookup hash.
- Admission number remains a separate optional field.
- Member profiles include optional group, photo and membership expiry fields.

## Approved permissions and privacy decisions

- Search catalogue and availability are public to all roles, including guests.
- Catalogue/copy management and circulation desk operations are restricted to ADMIN/LIBRARIAN.
- Teacher and MEMBER borrowing history is self-only.
- Parents have no access to a child's borrowing history in v1.0; parent-child linking is deferred to AUTH-7 (v4.0).
- Teachers and members cannot renew loans. ADMIN/LIBRARIAN can renew.
- Only ADMIN/LIBRARIAN can override checkout blocks, with a mandatory reason and audit record.
- ADMIN/LIBRARIAN can waive fines of any amount with a reason; waivers are audited.
- Only ADMIN changes user roles.
- Library profile and policy settings are ADMIN-only.
- Dashboard access is ADMIN/LIBRARIAN.
- Audit-sensitive operations include waivers, deletions, role changes and checkout overrides.

## Approved business-rule decisions

- Timezone: `Africa/Nairobi`; timestamps stored in UTC.
- Loan due date: checkout date plus policy loan days; due at the end of the local due date. Overdue starts at 00:00 the following local day.
- `membership_expires_at = NULL` means no expiry. A date earlier than the current Africa/Nairobi calendar date is expired.
- CIR-5 checkout blocks for suspended/archived status, expired membership and fine balance above the configured threshold. ADMIN/LIBRARIAN may override these member-status, membership-expiry and fine-threshold blocks with a mandatory reason and audit record. Copy status and max-item limit blocks are not overridable.
- Missing loan policy blocks checkout; do not silently apply a default.
- Checkout and return use idempotency protection.
- Fine default: KES 10 per overdue calendar day. The rate is a database-backed library setting editable by authorised staff through the application. Existing fines retain the amount calculated when issued.
- Fine days count whole Africa/Nairobi calendar days after due date, less configured grace days; weekends and closed days count. Apply configured cap.
- Fine ledger is append-only; charges, payments and waivers are separate entries. Partial payments are allowed. Waivers require a reason and audit record.
- Fine charges are posted at return or when an item is marked lost, not by a nightly accrual job.
- Holds are FIFO by creation time. A member may have one active hold per title and cannot hold a title they currently have on loan.
- A hold is allowed only when no copy is available.
- Hold-ready expiry default: 72 hours, configurable.
- Due-soon notification target: two days before due. Overdue notifications start the next day and repeat every seven days.
- SMS quiet hours: 20:00–07:00 Africa/Nairobi; queue messages during quiet hours.
- Notification events must be deduplicated and delivery status recorded.
- Notification content must not expose unnecessary borrowing details.

## Deferred scope

- CSV bulk import: v1.5.
- Parent-child account linking: AUTH-7, v4.0.
- Member card printing: v1.5.
- Multi-branch support: not part of v1.0.
- Platform Super Admin functions are separate from tenant roles and are not being added to the v1.0 tenant role enum.
- Full offline checkout/return and synchronization: later release, not v1.0.
- Parent/guardian notifications and parent borrowing-history access: deferred.
- Membership renewal workflow: deferred; v1.0 includes the expiry field and CIR-5 enforcement only.
- Standalone audit-log viewing UI: deferred; required security audit events remain in v1.0.
- Fine payment receipts: P1 (FIN-3).

## Implementation record — foundation slices

The following records describe completed foundation work, not completed functional LMS requirements.

### Slice 1 — Tenant/member identity schema

- Added tenant registry, tenant-scoped users/roles, groups, member types, member profiles and member identification document fields.
- Migration: `0000_slice_1_tenant_member_identity.sql`.

### Slice 2 — Authentication security schema

- Added tenant-scoped `sessions` and `otp_codes` tables.
- Session records support refresh-token hashes, expiry, revocation, device information, last-used timestamps and replacement-session references.
- OTP records support password-reset purpose, EMAIL/SMS channel, code hashes, expiry, consumption and verification attempts.
- Migration: `0001_slice_2_auth_security.sql`.
- OTP application workflows and delivery remain outstanding.

### Slice 3 — PostgreSQL tenant isolation

- Applied ENABLE and FORCE RLS to `users`, `groups`, `member_types`, `member_profiles`, `sessions` and `otp_codes`.
- `tenants` remains outside RLS for pre-authentication tenant discovery.
- `DatabaseService.withTenant()` validates tenant UUID and establishes transaction-local tenant context.
- Migration: `0002_slice_3_tenant_isolation.sql`.

### Slice 4 — Audit log foundation

- Added tenant-scoped `audit_logs` with actor, action, entity, optional reason/metadata and timestamp.
- RLS ENABLE and FORCE; missing tenant context fails closed.
- Runtime role has SELECT and INSERT only; UPDATE/DELETE/TRUNCATE are not granted.
- Migration: `0003_slice_4_audit_logs.sql`.
- Application audit workflows and ADMIN-only audit viewing remain outstanding.

### Slice 5 — Global identity lookup

- Added `user_identity_lookup` for tenant-scoped identity discovery across libraries.
- Email is normalized before HMAC-SHA-256 hashing; phone is normalized to E.164 with Kenya as default region.
- Raw email/phone are not stored in the global lookup table.
- Added restricted identity lookup, synchronization and deletion functions owned by `lms_identity_owner`.
- Runtime `lms_app` cannot directly access the lookup table.
- Migration: `0004_slice_5_identity_lookup.sql`.

### Authentication service foundation

- Identity normalization and lookup services exist.
- Argon2id password hashing and credential verification exist.
- Access and library-selection token signing/verification services exist.
- Login endpoints, SessionService, refresh-token rotation, logout, password-reset delivery/verification and application RBAC remain outstanding.

## Open decisions / operational confirmations

1. Confirm production hosting, PostgreSQL version, backup/restore arrangements and cross-border data-transfer implications before production use with real member data.
2. Confirm a concrete retention/deletion schedule and minors' consent/guardian operational process before pilot onboarding.
3. Confirm the production email/SMS provider credentials, sender identity, delivery monitoring and cost controls before enabling notifications.
