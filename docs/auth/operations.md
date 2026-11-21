# Authentication Operations & Troubleshooting Runbook

This guide is intended for DevOps, SREs, and tier-2/tier-3 support engineers managing the LMS Authentication and Access Control subsystem in production and staging environments.

---

## 1. Common Incident Runbooks

### 1.1 User Cannot Log In ("Invalid credentials")
1. **Determine Identity Format**:
   - For email, ensure it has been typed without trailing spaces and in valid format.
   - For phone numbers, ensure Kenyan phone numbers are entered with leading 0 or international `+254` (the system normalizes `0712345678` to `+254712345678`).
2. **Check Account Status**:
   - Query the database to inspect whether the account is `ACTIVE`, `PENDING_VERIFICATION`, or `SUSPENDED`.
   ```sql
   SELECT id, tenant_id, role, status, must_change_password
   FROM users
   WHERE id = '<USER_UUID>';
   ```
   - Suspended accounts cannot log in and will receive `Invalid credentials` or `Account is suspended`.
3. **Check Identity Blinded Lookup**:
   - Verify that an entry exists in `identity_lookup_view` or via the private function:
   ```sql
   SELECT * FROM identity_private.find_user_identity('EMAIL', 'blinded_hmac_hash_here');
   ```

### 1.2 User Locked in "Password change required on first login"
- **Cause**: Accounts created by staff (Librarians/Admins) have `must_change_password = true`.
- **Resolution**:
  - Direct the user to `/change-password` or call `POST /api/auth/change-password` with their temporary password and a new secure password.
  - If the temporary password was lost, a staff member can issue a password reset or the user can use `/forgot-password`.

### 1.3 OTP Delivery Failures
- **Email OTP Issues**:
  1. Check logs for `[OtpService] Email provider not configured` or SMTP network timeouts.
  2. Test outbound connectivity to `SMTP_HOST` on port 587:
     ```bash
     nc -zv $SMTP_HOST 587
     ```
  3. Verify SMTP credentials and sender reputation.
- **SMS OTP Issues (Africa's Talking)**:
  1. Check account balance on Africa's Talking portal.
  2. Check SMS delivery reports (DLR) for the recipient phone number.
  3. Verify that phone number is normalized to E.164 (`+254...`).
  4. Inspect API logs for HTTP 401 (Invalid API key) or 402 (Insufficient balance).

### 1.4 Rate Limiting Lockouts
- **Symptoms**: User receives HTTP `429 Too Many Requests`.
- **Diagnostic**:
  - Connect to Redis CLI:
    ```bash
    redis-cli
    ```
  - Check active rate-limiting keys:
    ```bash
    KEYS "rl:*"
    ```
  - Inspect TTL of the rate limiting key:
    ```bash
    TTL "rl:auth:login:<ip_or_tenant>"
    ```
  - Reset a specific lockout key if verified legitimate:
    ```bash
    DEL "rl:auth:login:<key>"
    ```

---

## 2. Security & Emergency Operations

### 2.1 Emergency Revocation of All User Sessions
To immediately terminate all active sessions for a compromised account:
```sql
UPDATE sessions
SET revoked_at = NOW()
WHERE tenant_id = '<TENANT_ID>'
  AND user_id = '<USER_ID>'
  AND revoked_at IS NULL;
```
Or via the API (when signed in as staff or user):
`POST /api/auth/sessions/:sessionId/revoke` or password reset.

### 2.2 Replay Attack Alert on Refresh Token
- If a client attempts to use an already-rotated refresh token, the server logs a security warning:
  `Detected refresh token reuse for session <sessionId>`
- The server **automatically revokes the entire session lineage** upon reuse detection.
- **Action**: Alert the user to change their password immediately as credentials or tokens may be intercepted.

### 2.3 Resolving "Cannot deactivate last active administrator"
- If an admin needs to step down or leave the organization, an existing librarian must first be promoted:
  ```http
  POST /api/users/<LIBRARIAN_ID>/promote
  ```
  Once the new admin is active, the former admin may proceed with soft deactivation.

---

## 3. Audit Log Inspection

Authentication actions are recorded immutably in the `audit_logs` table.

### Query Recent Auth Events for a User
```sql
SELECT action, entity_type, entity_id, created_at
FROM audit_logs
WHERE tenant_id = '<TENANT_ID>'
  AND actor_id = '<USER_ID>'
ORDER BY created_at DESC
LIMIT 50;
```

### Key Auth Action Identifiers
- `USER_LOGIN_SUCCESS`: Authenticated successfully.
- `USER_LOGOUT`: Terminated session.
- `PASSWORD_RESET_REQUESTED`: OTP generated and dispatched.
- `PASSWORD_RESET_COMPLETED`: Password reset via valid OTP.
- `PASSWORD_CHANGED`: Authenticated user password update.
- `USER_DEACTIVATED`: Soft deactivation of own account.
- `USER_PROMOTED`: Librarian promoted to Admin.
