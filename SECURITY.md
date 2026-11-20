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

## Implemented foundations evidenced in the current repository

- Argon2id password hashing service.
- JWT signing and verification services.
- HMAC-SHA-256 global identity lookup.
- Restricted identity database functions owned by a dedicated NOLOGIN role.
- PostgreSQL RLS ENABLE and FORCE on seven tenant-owned tables.
- Transaction-local tenant context with fail-closed policy design.
- Append-only runtime permissions for audit records.
- `.env` is ignored by the current `.gitignore`.

## Known outstanding security work

- Login/session endpoints, refresh rotation, logout and revocation.
- OTP generation, delivery, verification, expiry and attempt lockout.
- Server-side RBAC across every endpoint.
- Rate limiting and abuse controls.
- Audit workflows for waivers, deletions, role changes and checkout overrides.
- Security headers/CORS review for deployed environments.
- Semgrep Community Edition static security scanning is configured; first GitHub execution and finding triage are pending.
- Dependency vulnerability auditing is configured; GitHub execution has not yet been verified.
- Secret scanning and first-commit review.
- Backup encryption, restore testing, monitoring and incident response.
- Privacy/consent, retention and data-subject request processes for pilot operations.

## Handling secrets and personal data

- Store secrets only in environment variables or an approved secret manager.
- Never commit `.env`, credentials, signing keys, OTPs, refresh tokens or personal member data.
- Do not log passwords, OTPs, tokens, raw identification documents or unnecessary borrowing history.
- Use synthetic data for tests and issue reproduction.
