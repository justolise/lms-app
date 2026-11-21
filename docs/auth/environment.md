# Authentication Environment Configuration

This document specifies all environment variables utilized across the LMS authentication and access control subsystem.

---

## 1. Variable Catalog

| Variable | Required | Default / Placeholder | Description | Consumer Service |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Optional | `development` | Node execution environment (`development`, `test`, `production`). Enforces secure cookie attributes. | Global / Express Cookie |
| `PORT` | Optional | `3000` | HTTP listening port for the NestJS API application. | `apps/api/src/main.ts` |
| `API_URL` | Optional | `http://127.0.0.1:3000` | Backend API URL used by the Next.js rewrite reverse proxy. | `apps/web/next.config.ts` |
| `DATABASE_URL` | **Required** | `postgresql://lms_app:...@127.0.0.1:5432/lms` | Runtime PostgreSQL connection string (least-privileged `lms_app` user). | `DatabaseService` |
| `MIGRATION_DATABASE_URL` | **Required** (Migrate) | `postgresql://lms_migrator:...@127.0.0.1:5432/lms` | DDL migration PostgreSQL connection string (elevated `lms_migrator` user). | Drizzle Kit / Migrations |
| `REDIS_URL` | **Required** | `redis://127.0.0.1:6379` | Redis connection URL for distributed rate limiting and token cache. | `RedisService` |
| `IDENTITY_LOOKUP_HMAC_KEY` | **Required** | Base64-encoded 32-byte key | Secret HMAC key for blinded email and phone lookup hashes in `identity_private`. | `IdentityService` |
| `ACCESS_TOKEN_SECRET` | **Required** | Base64-encoded 32-byte key | HS256 secret key for signing short-lived access JWTs (15 min). | `TokenService` |
| `LIBRARY_SELECTION_TOKEN_SECRET` | **Required** | Base64-encoded 32-byte key | HS256 secret key for signing multi-tenant selection JWTs (5 min). | `TokenService` |
| `MEMBER_IDENTIFIER_ENCRYPTION_KEY` | **Required** | Base64-encoded 32-byte key | AES-256-GCM encryption key for sensitive government identification documents. | `MemberIdentifierService` |
| `MEMBER_IDENTIFIER_HMAC_KEY` | **Required** | Base64-encoded 32-byte key | HMAC-SHA-256 key for deterministic search blinding of member identity documents. | `MemberIdentifierService` |
| `SMTP_HOST` | Conditional | `smtp.mailgun.org` | Hostname for SMTP email provider. If unset in dev/test, OTP is logged to debug console. | `OtpService` |
| `SMTP_PORT` | Optional | `587` | SMTP port (e.g. 587 for STARTTLS, 465 for SSL). | `OtpService` |
| `SMTP_USER` | Conditional | `postmaster@lms.local` | SMTP username/identity. | `OtpService` |
| `SMTP_PASS` | Conditional | *(Secret)* | SMTP account password / API credential. | `OtpService` |
| `SMTP_FROM` | Optional | `LMS Support <noreply@lms.local>` | Default RFC 5322 From address for outgoing transactional emails. | `OtpService` |
| `AFRICASTALKING_USERNAME` | Conditional | `sandbox` | Africa's Talking API username for Kenyan/East African SMS delivery. | `OtpService` |
| `AFRICASTALKING_API_KEY` | Conditional | *(Secret)* | Africa's Talking REST API key. | `OtpService` |
| `AFRICASTALKING_FROM` | Optional | `LMS` | Approved SMS Alphanumeric Sender ID registered with CAK / telcos. | `OtpService` |

---

## 2. Cryptographic Secret Generation

All secret keys in LMS must be cryptographically high-entropy 256-bit (32-byte) keys, base64 encoded.

To generate production secrets, execute the following OpenSSL commands:

```bash
# IDENTITY_LOOKUP_HMAC_KEY
openssl rand -base64 32

# ACCESS_TOKEN_SECRET
openssl rand -base64 32

# LIBRARY_SELECTION_TOKEN_SECRET
openssl rand -base64 32

# MEMBER_IDENTIFIER_ENCRYPTION_KEY
openssl rand -base64 32

# MEMBER_IDENTIFIER_HMAC_KEY
openssl rand -base64 32
```

> [!CAUTION]
> Never commit secrets or `.env` files into version control. Ensure keys are injected through KMS, AWS Secrets Manager, HashiCorp Vault, or deployment secret injectors.

---

## 3. Failure Modes

### Missing `IDENTITY_LOOKUP_HMAC_KEY`
- **Symptom**: User login (`POST /api/auth/login`) or member registration throws a `500 Internal Server Error`.
- **Log**: `Missing required environment variable: IDENTITY_LOOKUP_HMAC_KEY` or `Invalid key length`.
- **Remedy**: Generate a valid 32-byte base64 key and restart the API service.

### Missing `ACCESS_TOKEN_SECRET` or `LIBRARY_SELECTION_TOKEN_SECRET`
- **Symptom**: `TokenService` throws `InternalServerErrorException` on service startup or first token signing attempt.
- **Log**: `Missing required environment variable: ACCESS_TOKEN_SECRET`.
- **Remedy**: Configure 32-byte base64 strings for both token secrets.

### Missing `REDIS_URL`
- **Symptom**: Rate limiter guards fail open or closed, logs report connection refused on `127.0.0.1:6379`.
- **Remedy**: Verify Redis container or managed cluster status and update `REDIS_URL`.

### Missing SMS / SMTP Credentials
- **Symptom in Development/Test**: OTP codes are printed to the debug log (`[DEV/TEST OTP EMAIL to ...]: 123456`), requests return 200 OK.
- **Symptom in Production**: `OtpService` throws `ServiceUnavailableException: Notification delivery provider is not configured`.
- **Remedy**: Set `SMTP_HOST` or `AFRICASTALKING_API_KEY` in production environment configuration.
