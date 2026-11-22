# Database Security & RLS Policies

## Database Roles & Privilege Separation
The system establishes three distinct PostgreSQL security roles:
1. **`postgres` / superuser**: Migration and database initialization only.
2. **`lms_identity_owner`**: Owner of the restricted `identity_private` schema and the `user_identity_lookup` global discovery table. Executes `find_user_identity` and `sync_user_identity` as `SECURITY DEFINER`.
3. **`lms_app`**: Runtime application role.
   - Has `SELECT, INSERT, UPDATE, DELETE` on operational tenant-owned tables.
   - Has append-only `SELECT, INSERT` on `audit_logs` (all `UPDATE` and `DELETE` privileges explicitly revoked).
   - Has zero direct table access to `user_identity_lookup`.

## Row-Level Security Matrix
Every tenant-owned table is configured with:
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.<table> FORCE ROW LEVEL SECURITY;
```
Forcing RLS ensures table owners cannot inadvertently bypass tenant isolation rules during runtime queries.
Missing or empty `app.tenant_id` context fails closed, matching zero rows.
