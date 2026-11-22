# Authentication & Session Security

## Credential Primitives
- **Password Hashing**: Argon2id via `argon2` v0.45.2.
- **Timing Defense**: Synthetic dummy password verification (`getDummyPasswordHash()`) executed when identity lookup yields zero candidates to eliminate timing side-channel enumeration.
- **Account Discovery**: Normalization of email (lowercased, trimmed) and Kenyan phone numbers (E.164 `+254...`).
- **Temporary Credentials**: Generated using cryptographically secure random bytes (`randomBytes(24).toString('base64url')`), requiring mandatory first-login password change (`mustChangePassword = true`).

## Token Architecture
- **Access JWT**: 15-minute lifespan, signed via JOSE `HS256` using 32-byte Base64 key. Contains `userId`, `tenantId`, `role`, `sessionId`, and `mustChangePassword`.
- **Refresh Token**: 7-day lifespan, cryptographically random, stored as SHA-256 hash in `sessions` table.
- **Cookie Security**:
  - `access_token`: `HttpOnly`, `SameSite: 'lax'`, `Secure: production`, `path: '/'`.
  - `refresh_token`: `HttpOnly`, `SameSite: 'lax'`, `Secure: production`, `path: '/api/auth'`.
  - `library_selection_token`: `HttpOnly`, `SameSite: 'lax'`, `Secure: production`, `path: '/api/auth/select-membership'`.

## Session Lifecycle & Replay Detection
1. **Refresh Rotation**: Every call to `POST /api/auth/refresh` atomically revokes the existing refresh token, links `replacedBySessionId`, and issues a new session.
2. **Replay Detection**: If a previously rotated refresh token is presented again (indicating token compromise or network interception), all active sessions for that user are immediately revoked.
3. **Session Revocation**: Password reset, account deactivation, or manual logout instantly revokes sessions in PostgreSQL. `AccessTokenGuard` validates `isSessionActive` and verifies user status is `ACTIVE` on every request.
