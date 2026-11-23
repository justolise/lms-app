# Multi-Tenant Isolation Architecture

## Isolation Primitives
1. **PostgreSQL Row-Level Security (RLS)**:
   - All tenant-owned tables have `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
   - Isolation policy definition:
     ```sql
     CREATE POLICY tenant_isolation ON public.<table>
       USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
       WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
     ```
2. **Transaction-Local Context**:
   - `DatabaseService.withTenant(tenantId, tx)` validates tenant UUID format and sets:
     ```sql
     SELECT set_config('app.tenant_id', $1, true);
     ```
   - The parameter `is_local = true` guarantees context exists only for the duration of the current transaction, preventing connection pool context bleed.
3. **Application Defense-in-Depth**:
   - Every Drizzle ORM query explicitly includes `eq(table.tenantId, tenantId)`.
4. **Redis Cache Scoping**:
   - Every cached entity includes the tenant ID in its key prefix (e.g., `cache:catalogue:${tenantId}`, `cache:member-types:${tenantId}`).
   - Cache invalidation on mutation affects only the specific tenant's keys.
5. **Cross-Tenant Account Discovery**:
   - The application database role (`lms_app`) has zero direct access to `user_identity_lookup`.
   - Access is mediated by `SECURITY DEFINER` functions in `identity_private` owned by `lms_identity_owner`, storing only HMAC-SHA-256 hashes.
6. **Platform Super Admin Domain Boundary**:
   - Platform Super Admin accounts (`platform_users`, `platform_sessions`, `platform_mfa`) exist outside tenant RLS tables.
   - Platform tokens (`lms_platform_access`, `lms_platform_refresh`) cannot be used to authenticate as a tenant user or inject cross-tenant bypass context.
   - Platform Super Admin actions (tenant creation, status toggles, admin credential resets) operate strictly on the platform metadata plane and are immutably logged.
