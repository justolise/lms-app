# Security Architecture & Cryptographic Controls (v1.0 MVP)

This document describes the security engineering principles, cryptographic primitives, tenant isolation controls, and defense-in-depth measures implemented in the LMS authentication subsystem.

---

## 1. Password & Credential Hashing

- **Algorithm**: **Argon2id** (via `argon2` v0.45.2).
- **Usage**:
  - User login passwords.
  - Temporary passwords generated on onboarding.
  - One-time password (OTP) verification digests.
- **Plaintext Policy**: Plaintext passwords, temporary credentials, and raw OTP codes are **never** persisted to the database and are omitted from application logs and audit records.
- **Timing Defense**: If an identity lookup yields zero matching accounts, a dummy Argon2id verification is computed against a cached synthetic hash (`getDummyPasswordHash()`) to protect against user enumeration via response timing discrepancies.

---

## 2. Token Architecture & Cookie Controls

The application uses a dual-token cookie architecture:

| Token | Type | Lifespan | Cookie Name | Path | HttpOnly | SameSite | Secure | Storage |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| **Access Token** | Signed JWT (JOSE) | 15 minutes | `access_token` | `/` | Yes | `Lax` | Production only | In-Memory (HTTP-only cookie) |
| **Refresh Token** | Cryptographic random | 7 days | `refresh_token` | `/auth` | Yes | `Lax` | Production only | SHA-256 hash in `sessions` table |
| **Selection Token** | Signed JWT (JOSE) | 5 minutes | `library_selection_token`| `/auth/select-membership` | Yes | `Lax` | Production only | In-Memory (HTTP-only cookie) |

- **No Browser LocalStorage**: Access and refresh tokens are strictly transported as `HttpOnly` cookies and are never exposed to browser `localStorage` or `sessionStorage`, mitigating token theft via Cross-Site Scripting (XSS).
- **CSRF Mitigation**: Cookies are configured with `SameSite: 'lax'`, preventing cross-site request forgery on mutating requests from third-party domains. State-changing operations (`POST`, `PATCH`, `DELETE`) require JSON payloads with `Content-Type: application/json`.
- **Refresh Token Rotation & Replay Detection**:
  - Every `/api/auth/refresh` invocation atomically invalidates the submitted refresh token, links it to its replacement session via `replaced_by_session_id`, and issues a new token pair.
  - If a previously rotated refresh token is presented again (indicating token compromise or network replay), the service revokes the entire replacement chain and suspends all sessions belonging to the compromised user account.

---

## 3. Database Isolation & Row-Level Security (RLS)

- **Tenant Isolation Mechanism**:
  Every tenant query is wrapped in `DatabaseService.withTenant(tenantId, tx)`. The helper validates the tenant UUID and executes:
  ```sql
  SELECT set_config('app.tenant_id', $1, true);
  ```
  The third parameter `true` scopes the session configuration strictly to the local transaction, ensuring no cross-request leakage occurs in connection pooling.
- **PostgreSQL RLS Policies**:
  RLS is enabled and forced (`ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY`) across all seven tenant-owned tables:
  1. `users`
  2. `groups`
  3. `member_types`
  4. `member_profiles`
  5. `sessions`
  6. `otp_codes`
  7. `audit_logs`
- **Identity Lookup Function Security**:
  Cross-library lookup uses PostgreSQL functions in the `identity_private` schema (`find_user_identity`, `sync_user_identity`, `delete_user_identity`) configured with `SECURITY DEFINER` and owned by `lms_identity_owner`. The runtime database role `lms_app` has `EXECUTE` privileges on these functions but has **zero direct table access** to `user_identity_lookup`.

---

## 4. Protected Member Documents (MEM-1)

- Identification documents (National ID, Passport, Alien ID) are protected at rest.
- **Encryption**: Encrypted with AES-256-GCM using `MEMBER_IDENTIFIER_ENCRYPTION_KEY`.
- **Searchable Digest**: A deterministic HMAC-SHA-256 hash is computed using `MEMBER_IDENTIFIER_HMAC_KEY` to enforce intra-tenant uniqueness without exposing plaintext document numbers in database indices.

---

## 5. Rate Limiting (AUTH-5)

Rate limiting is enforced at the application boundary via Redis (`ioredis` atomic Lua script):

| Route / Purpose | Rate Limit | Key Prefix |
| :--- | :--- | :--- |
| `POST /api/auth/login` | 5 attempts / 60s | `auth-login` |
| `POST /api/auth/select-membership` | 10 attempts / 60s | `auth-select-membership` |
| `POST /api/auth/refresh` | 20 requests / 60s | `auth-refresh` |
| `POST /api/auth/forgot-password` | 3 requests / 60s | `auth-forgot-password` |
| `POST /api/auth/reset-password` | 5 attempts / 60s | `auth-reset-password` |
| `POST /api/auth/change-password` | 5 attempts / 60s | `auth-change-password` |

---

## 6. Audit Trail & Data Minimization

- All security-sensitive actions (`MEMBER_CREATED`, `LIBRARIAN_CREATED`, `ROLE_PROMOTED`, `ACCOUNT_DEACTIVATED`, `PASSWORD_CHANGED`, `PASSWORD_RESET_COMPLETED`) are appended to `audit_logs`.
- **Sanitization Policy**:
  - Plaintext passwords, temporary passwords, OTP codes, session tokens, and encrypted document values are **strictly omitted** from audit metadata.
  - The runtime application role cannot execute `UPDATE` or `DELETE` on `audit_logs` (append-only ledger).

---

## 7. Compliance Note: Kenya Data Protection Act 2019

The technical controls documented here (encryption at rest, tenant isolation, pseudonymized global identity lookup, minimal data collection, audit trails) establish technical readiness for compliance with the Kenya Data Protection Act 2019. However, technical controls alone do not constitute legal compliance. Remaining organizational compliance tasks include formal data protection impact assessments (DPIA), localized consent notices, data retention and disposal schedules, and data-subject access request (DSAR) workflows.
