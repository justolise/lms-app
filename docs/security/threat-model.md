# Threat Model — LMS v1.0

## STRIDE Threat Assessment

| Category | Threat Description | Attack Vector | Mitigating Control in LMS |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates a legitimate patron or librarian | Credential stuffing, session hijacking, or client IP spoofing in rate limiter | Argon2id password hashing, HttpOnly secure cookies, rate limiting with trusted proxy IP extraction, replay-detecting session rotation |
| **Tampering** | Malicious actor modifies loans, holds, or borrowing limits | Concurrent checkout requests, mass-assignment attacks, parameter tampering | Drizzle ORM parameterized queries, pessimistic locking (`FOR UPDATE`), DTO whitelist validation, partial unique index `loans_tenant_copy_active_unique` |
| **Repudiation** | Staff denies checking out a copy, waiving a fee, or deactivating an account | Deleting or altering logs | Immutable, append-only `audit_logs` table where `UPDATE` and `DELETE` permissions are revoked from the application database role |
| **Information Disclosure** | Cross-tenant data leakage or patron document exposure | Direct SQL injection, IDOR on loan history, scraping unencrypted national IDs | PostgreSQL RLS (`ENABLE` & `FORCE ROW LEVEL SECURITY`), AES-256-GCM document encryption, HMAC-SHA-256 lookup digests, strict server-side `actorId` scoping |
| **Denial of Service** | Resource exhaustion via login brute-force or large payload injection | Flooding authentication endpoints, giant JSON bodies | 1MB body limit in Express, Redis sliding-window rate limiting on all auth routes, connection timeouts |
| **Elevation of Privilege** | Patron escalates role to LIBRARIAN or ADMIN | Tampering with user profile update DTO, self-promotion | `UpdateProfileDto` restricts updates to `fullName`, `email`, `phone`; `RolesGuard` strictly validates JWT role claim; `promoteLibrarian` forbids self-promotion and requires ADMIN role |

## Trust Boundaries
1. **Public Internet -> Next.js / Reverse Proxy**: Unauthenticated boundary. Public catalogue browsing (GUEST) and authentication entrypoints.
2. **Next.js Web Frontend -> NestJS API**: Authenticated via HttpOnly cookies. Cross-origin requests restricted by CORS origin check and SameSite cookie policies.
3. **NestJS Application -> PostgreSQL**: Database boundary with role separation (`lms_app` runtime user vs `lms_identity_owner` security definer owner).
4. **NestJS Application -> Redis**: In-memory cache and rate limiting isolated by tenant and IP hash.
