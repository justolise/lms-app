CREATE INDEX IF NOT EXISTS "copies_tenant_item_status_idx" ON "copies" ("tenant_id", "catalogue_item_id", "status");
