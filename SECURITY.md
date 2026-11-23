# Security Policy

## Project status

This repository is an early v1.0 implementation foundation and is not yet production-ready for real member data. Security controls listed below must not be interpreted as a complete security review or certification.

## Reporting a vulnerability

Do not disclose suspected vulnerabilities publicly or include member data, credentials, tokens, OTPs or database secrets in an issue.

Until a private repository security-reporting channel is configured, contact the project owner through the private channel already used for this project and provide:

- affected component and version/commit;
- concise impact description;
- reproduction steps that do not expose real personal data;
- suggested mitigation, if known.

A dedicated security contact and response SLA remain to be established before public production release.

## Implemented security controls evidenced in the current repository

- Argon2id password hashing and credential verification.
- JOSE JWT signing and verification services for access and library-selection tokens.
- Mandatory first-login password change enforcement via `AccessTokenGuard` (`must_change_password` flag).
- Server-side Role-Based Access Control (`RolesGuard` and `AccessTokenGuard`) enforcing 6 roles (`ADMIN`, `LIBRARIAN`, `TEACHER`, `MEMBER`, `PARENT`, `GUEST`). Missing tokens return 401 Unauthorized; insufficient roles return 403 Forbidden.
- Session lifecycle management: SHA-256 hashed refresh tokens, automatic rotation on refresh, and replay detection that revokes entire compromised session lineages.
- Password reset via single-use OTP (`OtpService`): 6-digit random codes, Argon2id hashing, 15m expiration, 5 attempt lockout, anti-enumeration responses, and complete session revocation on reset.
- Soft account deactivation (`DELETE /api/profile`) with transaction-locked last-admin and last-librarian invariant protections.
- Role promotion (`POST /api/users/:userId/promote`) restricted to Admin, allowing Librarian-to-Admin only, preventing self-promotion.
- HMAC-SHA-256 global identity lookup with blinded hashes in `identity_private`.
- Restricted identity database functions owned by dedicated NOLOGIN role `lms_identity_owner`.
- Member identification documents encrypted with AES-256-GCM and blinded with HMAC-SHA-256.
- PostgreSQL RLS ENABLE and FORCE on seven tenant-owned tables (`users`, `groups`, `member_types`, `member_profiles`, `sessions`, `otp_codes`, `audit_logs`).
- Transaction-local tenant context (`DatabaseService.withTenant()`) with fail-closed policy design.
- Append-only runtime permissions for audit records (`audit_logs`).
- Redis-backed distributed sliding-window rate limiting for login, OTP, and password operations (`RateLimitGuard`), with proxy-aware IP extraction (`x-forwarded-for`) and SHA-256 key blinding.
- Clean architectural decoupling: rate limiting guards and decorators housed under `src/common/guards/` and `src/common/decorators/`; `src/redis/` restricted strictly to Redis connectivity and caching services.
- Redis caching with tenant key isolation (`cache:<entity>:<tenantId>`), TTL support, and automated cache invalidation on entity mutations.
- HTTP security headers applied via Helmet (Content-Security-Policy, HSTS preload, frameguard action: deny, noSniff, referrerPolicy, ieNoOpen, dnsPrefetchControl, hidePoweredBy) across API and Next.js web application.
- Sensitive API cache suppression: Global `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`, `Pragma: no-cache`, `Expires: 0` headers on all `/api/*` endpoints to eliminate credential and patron data caching in intermediate proxies or browsers.
- Express body parser size limits (1MB) to protect against payload denial-of-service (DoS).
- CORS configuration with explicit origins, methods, headers, and credentials handling.
- Dedicated Platform Super Admin domain outside tenant RLS with mandatory two-step TOTP MFA (AES-256-GCM encrypted secrets) and isolated HttpOnly cookies (`lms_platform_access`, `lms_platform_refresh`).
- Full audit event logging for fine waivers, copy deletions, lost/damaged item reporting, checkout overrides, and platform administrative actions.
- Distributed request tracing via UUIDv4 `X-Correlation-ID` headers propagating across structured NestJS logs.
- Centralized API endpoints registry (`lib/api/endpoints.ts`) strictly governing all frontend client communications.
- Unprivileged non-root execution (`nodejs:nodejs` UID 1001) in Alpine production Docker containers.
- Comprehensive KDPA 2019 legal and operational policies published at `/legal/*`.
- `.env` is ignored by `.gitignore`.

## Known outstanding security work

- Audit workflows for fine waivers, copy deletions, and checkout overrides (in circulation/fines modules).
- Semgrep Community Edition static security scanning is configured; the Security workflow was verified green on commit `df40249`. Finding triage and remediation remain ongoing.
- Dependency vulnerability auditing is configured; the Security workflow was verified green on commit `82c9b1d`. Ongoing dependency audits and vulnerability remediation remain required.
- Secret scanning and first-commit review.
- Backup encryption, restore testing, monitoring and incident response.
- Privacy/consent, retention and data-subject request processes for pilot operations.

## Handling secrets and personal data

- Store secrets only in environment variables or an approved secret manager.
- Never commit `.env`, credentials, signing keys, OTPs, refresh tokens or personal member data.
- Do not log passwords, OTPs, tokens, raw identification documents or unnecessary borrowing history.
- Use synthetic data for tests and issue reproduction.
