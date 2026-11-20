CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"actor_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_actor_fk" FOREIGN KEY ("tenant_id","actor_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_created_idx" ON "audit_logs" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_actor_created_idx" ON "audit_logs" USING btree ("tenant_id","actor_id","created_at");


--> statement-breakpoint

-- AUTH-2, FIN-2: Enforce tenant isolation on audit records.
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY tenant_isolation ON public.audit_logs
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- Audit records are append-only for the runtime application role.
-- Remove permissions inherited from default privileges.
REVOKE ALL PRIVILEGES ON TABLE public.audit_logs FROM lms_app;
--> statement-breakpoint

-- The application may read and insert audit records only.
GRANT SELECT, INSERT ON TABLE public.audit_logs TO lms_app;
