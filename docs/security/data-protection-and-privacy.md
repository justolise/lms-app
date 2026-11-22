# Data Protection & Privacy (Kenya Data Protection Act 2019)

## Statutory Alignment
The Library Management System is architected in compliance with the **Kenya Data Protection Act 2019 (KDPA)**:

1. **Principles of Data Protection (Section 25)**:
   - **Lawfulness & Transparency**: Member accounts are provisioned by authorized educational institutions or community libraries with clear notices.
   - **Purpose Limitation**: Data collected is strictly utilized for educational borrowing, inventory tracking, and overdue notification.
   - **Data Minimization**: Only essential bibliographic and patron identification fields are stored. Identification documents (National ID, Alien ID, Passport) are never stored as plaintext.
   - **Storage Limitation**: Soft account deactivation (`SUSPENDED`) immediately revokes all authentication tokens and sessions.

2. **Children's Personal Data (Section 34)**:
   - Primary and secondary school students (`MEMBER` role) receive heightened privacy protections.
   - Student borrowing histories are strictly restricted to the student and authorized school librarians.
   - Cross-patron browsing history disclosure is strictly prohibited.
   - Unauthenticated access to member lists is impossible.

3. **Security Safeguards (Section 41)**:
   - Passwords and verification tokens hashed via Argon2id.
   - Member identity documents encrypted via AES-256-GCM.
   - Blind indexing with HMAC-SHA-256 prevents plaintext exposure in index pages.
   - Append-only audit logs track all patron creation, role escalation, profile modification, and account suspension events.
