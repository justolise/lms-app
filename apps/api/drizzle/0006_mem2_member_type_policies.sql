
-- MEM-2, ADM-2: Member type policy configuration
-- Adds description and soft-delete flag to member_types.
-- Creates loan_policies table keyed by (member_type, item_format).

-- Step 1: Extend member_types with description and active flag.
ALTER TABLE "member_types"
  ADD COLUMN "description" text,
  ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint

-- Step 2: Create the loan_policies table.
CREATE TABLE "loan_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "member_type_id" uuid NOT NULL,
  "item_format" varchar(50) DEFAULT 'BOOK' NOT NULL,
  "loan_duration_days" integer DEFAULT 14 NOT NULL,
  "max_concurrent_loans" integer DEFAULT 5 NOT NULL,
  "max_renewals" integer DEFAULT 2 NOT NULL,
  "grace_period_days" integer DEFAULT 0 NOT NULL,
  "daily_fine_minor_units" integer DEFAULT 0 NOT NULL,
  "max_fine_minor_units" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- Tenant FK
ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

-- Composite FK: member type must belong to the same tenant.
ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_tenant_member_type_fk"
  FOREIGN KEY ("tenant_id", "member_type_id")
  REFERENCES "public"."member_types"("tenant_id", "id")
  ON DELETE no action ON UPDATE no action;
--> statement-breakpoint

-- Unique: one policy per (tenant, member_type, item_format).
CREATE UNIQUE INDEX "loan_policies_tenant_type_format_unique"
  ON "loan_policies" USING btree ("tenant_id", "member_type_id", "item_format");
--> statement-breakpoint

-- Composite PK-style lookup index.
CREATE UNIQUE INDEX "loan_policies_tenant_id_id_unique"
  ON "loan_policies" USING btree ("tenant_id", "id");
--> statement-breakpoint

-- Step 3: Check constraints for sensible policy values.
ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_duration_positive"
  CHECK ("loan_duration_days" > 0);
--> statement-breakpoint

ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_max_loans_positive"
  CHECK ("max_concurrent_loans" > 0);
--> statement-breakpoint

ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_renewals_nonnegative"
  CHECK ("max_renewals" >= 0);
--> statement-breakpoint

ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_grace_nonnegative"
  CHECK ("grace_period_days" >= 0);
--> statement-breakpoint

ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_fine_nonnegative"
  CHECK ("daily_fine_minor_units" >= 0);
--> statement-breakpoint

ALTER TABLE "loan_policies"
  ADD CONSTRAINT "loan_policies_max_fine_nonnegative"
  CHECK ("max_fine_minor_units" >= 0);
--> statement-breakpoint

-- Step 4: Tenant isolation via RLS.
ALTER TABLE public.loan_policies ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

ALTER TABLE public.loan_policies FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY tenant_isolation ON public.loan_policies
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.loan_policies TO lms_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.member_types TO lms_app;

