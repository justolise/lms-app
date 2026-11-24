-- Additional composite and query-path indexes for users, member_profiles, loans, audit_logs, and platform_audit_logs
CREATE INDEX IF NOT EXISTS "users_tenant_status_idx" ON "users" ("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "users_tenant_role_status_idx" ON "users" ("tenant_id", "role", "status");

CREATE INDEX IF NOT EXISTS "member_profiles_tenant_member_type_idx" ON "member_profiles" ("tenant_id", "member_type_id");
CREATE INDEX IF NOT EXISTS "member_profiles_tenant_expires_at_idx" ON "member_profiles" ("tenant_id", "membership_expires_at");

CREATE INDEX IF NOT EXISTS "loans_tenant_status_due_at_idx" ON "loans" ("tenant_id", "status", "due_at");

CREATE INDEX IF NOT EXISTS "audit_logs_created_idx" ON "audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "platform_audit_logs_created_idx" ON "platform_audit_logs" ("created_at");
