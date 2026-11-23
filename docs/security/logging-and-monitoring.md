# Logging, Auditing & Monitoring

## Distributed Request Tracing & Correlation IDs
- **Correlation ID Middleware**: Every incoming HTTP request is assigned a unique UUIDv4 `X-Correlation-ID` header if not already supplied by an upstream reverse proxy.
- **Log Propagation**: The correlation ID is automatically injected into all structured log messages across NestJS services and returned in the HTTP response headers for end-to-end incident triage.

## Health Probes & Telemetry
- **Liveness Probe (`/health/live`)**: Lightweight probe verifying that the NestJS HTTP process is responsive.
- **Readiness Probe (`/health/ready`)**: Performs active database query execution (`SELECT 1`) and Redis `PING` verification before allowing traffic ingress.
- **Platform Monitoring Service**: Real-time telemetry (`GET /api/platform/monitoring`) delivering system uptime, Node.js process RSS/heap memory, database latency, and tenant aggregation counts.

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
- `circulation.mark_lost_damaged`
- `HOLD_PLACED`
- `HOLD_CANCELLED`
- `HOLD_FULFILLED`
- `FINE_WAIVED`
- `PLATFORM_TENANT_CREATED`
- `PLATFORM_TENANT_STATUS_CHANGED`
- `PLATFORM_TENANT_ADMIN_PROVISIONED`
- `PLATFORM_TENANT_ADMIN_PASSWORD_RESET`
- `PLATFORM_SUPER_ADMIN_LOGIN`

## Data Sanitization in Logs
- Passwords, OTP codes, TOTP secrets, session tokens, and encrypted document values are strictly omitted from log statements and audit metadata.
- Rate limit violations are logged at `WARN` level with SHA-256 hashed IP identifiers.
- Stack traces from internal 500 errors are logged internally via NestJS `Logger` with correlation IDs and sanitized from client HTTP responses.
