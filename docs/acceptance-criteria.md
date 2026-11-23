# Acceptance criteria (v1.0): APPROVED & VERIFIED (v1.0 MVP)

Given/When/Then per requirement. Each line is backed by automated tests named with its ID or verified in production build suites. Business detail lives in `business-rules.md`; roles in `permissions.md`.

## Authentication and access (AUTH)

- **AUTH-1** Given valid credentials, when a user logs in with email or phone, then they get a session. Given a wrong password, then login fails with a generic message. Given a duplicate email or phone in the same tenant, then registration is rejected.
- **AUTH-2** Given any protected endpoint, when called by a role not allowed in the permission matrix, then it returns 403. A user can never read or change data of another tenant.
- **AUTH-3** Given a registered email, when a reset is requested, then a one-time code that expires is sent and the response is identical for unknown addresses. A code works once, and is locked after repeated wrong attempts.
- **AUTH-4** Given a librarian, when they add a member, then an account exists with the chosen member type and a temporary credential the member must change at first login. (Single-add only.)
- **AUTH-5** Given a logged-in user, when they log out a device, then that session's refresh token stops working. Given repeated failed logins, then further attempts are rate limited.

## Catalog (CAT) and search (SRC)

- **CAT-1** Given a librarian, when they create or edit a title with the listed fields, then it is saved and searchable. Archived titles disappear from search and cannot get new loans, but history is kept.
- **CAT-2** Given an ISBN, when lookup runs, then title, authors, publisher, year and cover are pre-filled from Open Library, falling back to Google Books. If both fail, the form still opens for manual entry within one step.
- **CAT-3** Given a title, when a copy is added, then it has a barcode unique within the tenant, a location, a condition and a status. A duplicate barcode is rejected.
- **CAT-4** Given a copy, then its status is one of the seven allowed values, and illegal transitions (for example `lost` to `on_loan`) are rejected.
- **CAT-5** Given categories, subjects, shelf locations and call numbers, then titles and copies can be assigned and filtered by them.
- **SRC-1** Given a query, when searching by title, author, subject, ISBN or keyword, then relevant titles are returned in under 500 ms (p95) on a catalogue of 10,000 titles.
- **SRC-2** Given results, when filters for availability, category, language, format or year are applied, then only matching titles remain, and filters combine.

## Circulation (CIR)

- **CIR-1** Given a valid member number and an available copy barcode, when checkout is submitted, then a loan with the correct due date exists and the copy is `on_loan`. Response under 1 s on a simulated 3G profile. Same idempotency key twice creates one loan.
- **CIR-2** Given an on-loan copy, when it is returned, then the loan closes, any fine is computed per FIN-1, and the copy becomes `available` or `on_hold` according to the hold queue.
- **CIR-3** Given a loan, when a renewal is requested, then it succeeds only within `max_renewals` and with no waiting hold; otherwise it is refused with the reason.
- **CIR-4** Given policies per member type and item format, when checking out, then the matching loan period and limits apply; a missing policy blocks checkout with a clear message.
- **CIR-5** Given a suspended or expired member, or fines above the threshold, when checkout is attempted, then it is blocked. A librarian can override with a reason, which is recorded in the audit log.
- **CIR-6** Given a phone camera, when a barcode or QR is scanned, then the code fills the checkout field. A manual-entry fallback is always available.
- **CIR-9 (P1)** Given a loan, when marked lost or damaged, then the copy status changes with a reason and a replacement charge is posted.

## Holds (HLD)

- **HLD-1** Given a title with no available copy, when a member places a hold, then it joins the queue in FIFO order. A hold on a title with an available copy is refused.
- **HLD-2** Given a returned copy and a waiting hold, then the first hold becomes ready, the member is notified, and the hold expires after the configured window, passing to the next member.
- **HLD-3** Given a hold, when the member or a librarian cancels it, then the queue closes up and a ready copy passes to the next member.

## Fines (FIN)

- **FIN-1** Given a fine rule with per-day amount, grace days and cap, when an overdue item is returned, then the fine equals the rule's result; boundary cases (exactly grace days, exactly the cap) are tested.
- **FIN-2** Given a member's ledger, when a payment or a waiver with reason is recorded, then the balance updates, entries cannot be edited or deleted, and each waiver is audit-logged.
- **FIN-3 (P1)** Given a payment, then a receipt number is generated and viewable.

## Members (MEM)

- **MEM-1** Given a librarian, when they save a member profile, then name, admission or ID number, class or group, contact and photo are stored. Admission numbers are unique per tenant.
- **MEM-2** Given member types, then each has its own borrowing policy (CIR-4) and assigning a type changes the limits applied at checkout.
- **MEM-4** Given a member, then their current loans and past borrowing are visible to them and to authorised staff only. Any other role gets 403.

## Notifications (NOT)

- **NOT-1** Given the triggers in `business-rules.md`, then an email is queued once per event (no duplicates) and its delivery status is recorded.
- **NOT-2** Given a member with a phone number, then the same events produce an SMS via Africa's Talking, held outside the allowed hours, with retries on failure.

## Inventory, reporting, administration

- **INV-2** Given a copy marked lost, damaged or withdrawn, then a reason is required and stored, and the copy is excluded from availability.
- **RPT-1** Given a librarian, then the dashboard shows active loans, overdue loans, popular titles and new members, loading in under 2 s on the pilot data set.
- **ADM-1** Given an admin, when the library profile (name, logo, hours, contacts) is saved, then it shows on the site and in notifications.
- **ADM-2** Given an admin, when policies (loans, fines, holds, member types) are changed, then new transactions use them; existing loans keep the terms they were issued with.

## Platform Administration (PLAT) & Legal Framework (PLAT-POL)

- **PLAT-1** Given a Super Admin, when logging in at `/platform/login`, then email/password verification issues a temporary token requiring MFA, and invalid credentials fail with a generic message.
- **PLAT-2** Given a pending MFA challenge, when a valid 6-digit TOTP code is provided, then platform session cookies (`lms_platform_access`, `lms_platform_refresh`) are issued. Invalid or expired codes are rejected.
- **PLAT-3** Given a Super Admin, when creating a tenant library, then tenant name, unique code, slug, and contact email are validated and saved. Duplicate slugs or codes are rejected with a 409 Conflict.
- **PLAT-4** Given a Super Admin, when viewing a tenant, then they can provision the initial library administrator account or trigger an emergency password reset with a server-generated temporary password and `mustChangePassword=true`.
- **PLAT-5** Given the platform monitoring dashboard (`/platform/monitoring`) and health endpoints (`/health/live`, `/health/ready`), then live process uptime, memory RSS, and PostgreSQL/Redis connection health are returned within 500 ms.
- **PLAT-6** Given any tenant creation, status change, or admin credential reset, then an immutable record is inserted into `audit_logs` with actor, tenant, IP address, and metadata.
- **PLAT-POL** Given any user or visitor, when navigating to `/legal/*`, then 9 Kenya Data Protection Act 2019 compliant policies (Terms, Privacy, AUP, Cookies, Account Access, Security, Retention, Minor Protection, SLA) are rendered with responsive navigation and search.
