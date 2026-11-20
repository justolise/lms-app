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

## Current controls evidenced

- RLS ENABLE and FORCE on seven tenant-owned tables.
- `DatabaseService.withTenant()` establishes tenant context transaction-locally.
- Restricted global identity lookup functions and separate database ownership.
- Append-only runtime permissions for audit records.
- Argon2id password service and token-signing/verification services.

These controls are foundations. They do not establish complete application access control, operational compliance or end-to-end privacy.

## Outstanding controls before pilot with real member data

- Complete server-side RBAC for every endpoint and role.
- Complete account lifecycle, password reset and session revocation.
- Implement member history access rules and verify them with role-based tests.
- Define and implement retention/deletion and correction procedures.
- Define child-data notices and consent/guardian procedures with the pilot institution.
- Define processor contracts and cross-border transfer assessment for hosting, email and SMS providers.
- Establish backup encryption, access controls, retention and tested restore.
- Ensure logs and notifications avoid passwords, OTPs, tokens and unnecessary borrowing details.
- Establish incident response, breach assessment and notification procedures.

## Data minimisation

Collect only fields required for library operations and approved member identification. Do not expose member borrowing history to unrelated members, teachers, parents or guests. Do not put raw identity values, credentials, OTPs or tokens in audit metadata or application logs.
