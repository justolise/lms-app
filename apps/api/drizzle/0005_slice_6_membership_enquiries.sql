-- Migration: MEM-ENQ public membership enquiry table
-- Unauthenticated patrons submit contact info; staff review and provision accounts.

CREATE TABLE IF NOT EXISTS membership_enquiries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  full_name       varchar(200) NOT NULL,
  email           varchar(254),
  phone           varchar(30) NOT NULL,
  id_number       varchar(50) NOT NULL,
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
  ON membership_enquiries (tenant_id, status, created_at);

-- RLS: staff can read/update; enquiries are inserted without a user context via service role.
ALTER TABLE membership_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_enquiries FORCE ROW LEVEL SECURITY;

-- Application role may insert new enquiries (no tenant context required at insert time —
-- tenant_id is set explicitly from the resolved libraryCode).
-- Staff read/update goes through the normal withTenant() path.
CREATE POLICY membership_enquiries_tenant_isolation ON membership_enquiries
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
