# Logging, Auditing & Monitoring

## Immutable Audit Trail
The `audit_logs` table records all security-sensitive events:
- `MEMBER_CREATED`
- `LIBRARIAN_CREATED`
- `ROLE_PROMOTED`
- `ACCOUNT_DEACTIVATED`
- `PASSWORD_CHANGED`
- `PASSWORD_RESET_COMPLETED`
- `circulation.renew`
- `circulation.checkout`
- `circulation.return`
- `HOLD_PLACED`
- `HOLD_CANCELLED`
- `HOLD_FULFILLED`

## Data Sanitization in Logs
- Passwords, OTP codes, session tokens, and encrypted document values are strictly omitted from log statements and audit metadata.
- Rate limit violations are logged at `WARN` level with SHA-256 hashed IP identifiers.
- Stack traces from internal 500 errors are logged internally via NestJS `Logger` and never forwarded to client HTTP responses.
