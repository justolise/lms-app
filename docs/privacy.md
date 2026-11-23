# Privacy and Data Protection — v1.0

This document records approved privacy requirements and current implementation evidence. It is not a legal compliance certification or a substitute for a Data Protection Impact Assessment or legal advice.

## Applicable product principles

The LMS is intended for schools and community libraries in Kenya and East Africa. Design and operation must account for the Kenya Data Protection Act 2019, especially children's personal data, purpose limitation, data minimisation, access control and secure handling.

Before onboarding real members, the operator must establish the lawful basis, notices, consent/guardian process where required, retention schedule, data-subject request process, processor agreements and cross-border transfer assessment.

## Approved access rules

- Borrowing history is visible to the member concerned and authorised staff.
- Teacher and MEMBER history access is self-only.
- Parents have no access to a child's borrowing history in v1.0.
- Parent-child linking is deferred to AUTH-7 (v4.0).
- Guest access is anonymous.
- Staff permissions are enforced server-side; UI hiding alone is insufficient.
- Only ADMIN changes roles.
- Fine waivers, deletions, role changes and checkout overrides require audit evidence; waivers and overrides require reasons.

## Data architecture decisions

- Tenant-owned records include `tenant_id`.
- PostgreSQL RLS provides database-level tenant isolation.
- Tenant context is transaction-local and missing context fails closed.
- Email and phone are unique within a tenant.
- Global identity discovery stores HMAC-SHA-256 hashes, not raw email addresses or phone numbers.
- One optional member identification document is supported; schema separates encrypted value from lookup hash.
- Passwords use Argon2id hashes. The session schema is designed to store refresh-token hashes, not plaintext; refresh-token handling is not yet implemented.
- Secrets belong in environment variables and must never be logged or committed.

## Current controls evidenced & implemented

- **Row-Level Security (RLS)**: `ENABLE` and `FORCE` on all tenant-owned tables; transaction-local context via `DatabaseService.withTenant()`.
- **Restricted Identity Lookup**: Global identity hashes (`user_identity_lookup`) owned by `lms_identity_owner` and queried solely via restricted PostgreSQL functions.
- **Append-Only Auditing**: Tamper-proof audit logging (`audit_logs`) tracking authentication, waivers, overrides, and administrative actions without exposing raw PII or credentials.
- **Argon2id & AES-256-GCM**: Argon2id for all user passwords; AES-256-GCM for national ID documents and TOTP MFA secrets.
- **Server-Side RBAC**: Comprehensive enforcement across all 6 tenant roles (`ADMIN`, `LIBRARIAN`, `TEACHER`, `MEMBER`, `PARENT`, `GUEST`) and isolated Platform Super Admin domain.
- **Self-Only Borrowing History**: Borrowing records are visible only to the borrower and authorized library staff (`MembersService.getMemberLoans`).
- **Privacy-Safe Notifications**: Email and SMS templates strictly omit unnecessary bibliographic details and sensitive patron credentials; SMS delivery strictly adheres to Africa/Nairobi quiet hours (20:00–07:00 EAT).
- **Public Legal Policy Center**: 9 comprehensive KDPA-compliant policies accessible to all users at `/legal/*`:
  1. Terms of Service (`/legal/terms-of-service`)
  2. Privacy Policy (`/legal/privacy-policy`) — lawful basis, rights under KDPA Section 26, DPO contact
  3. Acceptable Use Policy (`/legal/acceptable-use`)
  4. Cookie & Local Storage Policy (`/legal/cookies`)
  5. Account & Access Policy (`/legal/account-access`)
  6. Information Security Policy (`/legal/security`)
  7. Data Retention & Disposal Policy (`/legal/data-retention`) — retention schedules and secure destruction
  8. Minor & Student Protection Policy (`/legal/minor-protection`) — parental consent and student data protections
  9. Service Level & Support Policy (`/legal/sla`)

## Operational readiness before live pilot

1. Register Data Controller and Data Processor designation with the Office of the Data Protection Commissioner (ODPC) Kenya.
2. Confirm written data processor agreements with production cloud hosting, SMS gateway, and SMTP relay providers.
3. Appoint and publish the contact details for the designated Data Protection Officer (DPO) at `dpo@commonplace.ke`.

## Data minimisation

Collect only fields required for library operations and approved member identification. Do not expose member borrowing history to unrelated members, teachers, parents or guests. Do not put raw identity values, credentials, OTPs or tokens in audit metadata or application logs.
