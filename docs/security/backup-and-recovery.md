# Backup, Recovery & Disaster Resilience

## Backup Architecture
- **PostgreSQL**: Logical backups via `pg_dump` with transaction consistency. Backups are encrypted at rest with AES-256 prior to off-site replication.
- **Redis**: RDB snapshotting and AOF (`appendonly yes`) ensuring near-zero loss of rate-limit and transient session state.

## Restore & Verification Playbook
1. Regular restore drills executed in an isolated sandbox environment.
2. Verification script confirms RLS policies, schemas, and table ownership (`lms_identity_owner`, `lms_app`) are correctly re-established following database recovery.
3. Database migrations (`0000` through `0010`) verify schema version consistency.
