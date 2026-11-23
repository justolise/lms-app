# LMS Security Architecture Overview

## Mission & Principles
The Library Management System (LMS v1.0) is a multi-tenant library platform tailored for Kenyan and East African primary, secondary, and community libraries.

The security architecture is built on five core tenets:
1. **Zero-Trust Multi-Tenancy**: Every request is authenticated and strictly isolated at the database engine level via PostgreSQL Row-Level Security (RLS) with transaction-local context (`set_config('app.tenant_id', ...)`).
2. **Cryptographic Protection of PII & Identity**: National IDs and identification documents are encrypted at rest using AES-256-GCM and indexed solely via HMAC-SHA-256 blind indices, compliant with the Kenya Data Protection Act 2019 (KDPA).
3. **Privilege Separation & Least Privilege**: The application database role (`lms_app`) has append-only (`INSERT`, `SELECT`) permissions on audit records and has zero direct table access to global lookup tables (`user_identity_lookup`). Cross-tenant identity resolution is restricted to PostgreSQL `SECURITY DEFINER` functions in the `identity_private` schema owned by `lms_identity_owner`.
4. **Resilient Token & Session Management**: Dual-token HttpOnly cookie architecture with 15-minute access tokens and 7-day refresh tokens backed by database sessions with atomic rotation and instant replay detection. Platform Super Admins use dedicated cookies (`lms_platform_*`) with mandatory 6-digit TOTP MFA verification.
5. **Strict Concurrency & Inventory Integrity**: Database-level partial unique constraints and pessimistic locking (`FOR UPDATE`) guard physical book copies and borrow limits against race conditions.
6. **Platform Super Admin Boundary**: Super Admin capabilities operate on a dedicated plane outside tenant RLS, ensuring zero tenant privilege escalation or context bleed.

## Defense-in-Depth Layering
- **Client (Browser / Next.js 16)**: Strict Content-Security-Policy (CSP), Permissions-Policy, Referrer-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, zero token persistence in `localStorage`/`sessionStorage`.
- **API Boundary (NestJS)**: Helmet HTTP security headers, CORS origin whitelisting, body size limits (1MB), global validation pipe with automatic property whitelisting and forbidden unknown fields, centralized HttpExceptionFilter sanitizing internal errors, sliding-window Redis rate limiting.
- **Application Logic**: Role-based access control (RBAC) with server-side `AccessTokenGuard` and `RolesGuard`, object-level ownership checks (BOLA/IDOR prevention), FIFO queue ordering, optimistic and pessimistic concurrency control.
- **Database (PostgreSQL + RLS)**: Forced row-level security on all tenant-owned tables, isolated schemas, immutable append-only audit trail.
- **Cache & Rate Limiting (Redis)**: Tenant-prefixed cache keys, SHA-256 hashed IP rate limit keys, atomic Lua scripts for counter increments.
