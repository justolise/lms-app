# Incident Response & Breach Management (KDPA 2019)

## Statutory Mandate
Under Sections 43 & 44 of the Kenya Data Protection Act 2019, any unauthorized access, disclosure, or breach of personal data must be assessed, documented, and reported:
- **ODPC Notification**: The Office of the Data Protection Commissioner (ODPC) must be notified within **72 hours** of breach confirmation where the breach affects member rights and freedoms.
- **Data Subject Notification**: Affected members (or school guardians in the case of children) must be informed without undue delay.

## Triage & Escalation Procedures
1. **Identification**: Alert triggered via rate limiter spikes, audit anomalies, or unhandled exception alerts.
2. **Containment**:
   - Immediate session revocation via `SessionService.revokeAllUserSessions()`.
   - Account deactivation (`status = 'SUSPENDED'`) to sever active tokens.
   - Optional temporary IP block at reverse proxy boundary.
3. **Eradication**: Identify compromised credential or vector, apply fix, rotate affected token keys.
4. **Recovery & Post-Mortem**: Restore validated backups, verify RLS isolation, complete formal incident post-mortem report.
