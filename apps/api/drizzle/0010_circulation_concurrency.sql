-- Circulation concurrency: prevent multiple active loans on the same physical copy
CREATE UNIQUE INDEX IF NOT EXISTS "loans_tenant_copy_active_unique"
  ON "public"."loans" ("tenant_id", "copy_id")
  WHERE status = 'ACTIVE';
