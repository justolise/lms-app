-- Migration: 0011_slice_6_membership_enquiries.sql
-- MEM-ENQ public membership enquiry table
-- Unauthenticated patrons submit contact info; staff review and provision accounts.

CREATE TABLE IF NOT EXISTS public.membership_enquiries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  full_name       varchar(200) NOT NULL,
  email           varchar(254),
  phone           varchar(30) NOT NULL,
  id_number       varchar(50),
  member_type     varchar(50),
  organization    varchar(300),
  notes           text,
  status          varchar(20) NOT NULL DEFAULT 'PENDING',
  reviewed_at     timestamptz,
  reviewed_by     uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for staff review queue per tenant
CREATE INDEX IF NOT EXISTS membership_enquiries_tenant_status_idx
  ON public.membership_enquiries (tenant_id, status, created_at);

-- RLS: fail-closed row level security
ALTER TABLE public.membership_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_enquiries FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY membership_enquiries_tenant_isolation ON public.membership_enquiries
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grants for application role
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.membership_enquiries TO lms_app;
