-- Migration: 0012_fine_ledger.sql
-- FIN-1 & FIN-2: Append-only fine ledger, charge posting, payment recording, and waiver audit

DO $$ BEGIN
  CREATE TYPE fine_entry_type AS ENUM ('CHARGE', 'PAYMENT', 'WAIVER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fine_payment_method AS ENUM ('CASH', 'MPESA', 'CARD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.fine_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id             UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  loan_id             UUID REFERENCES public.loans(id) ON DELETE SET NULL,
  entry_type          fine_entry_type NOT NULL,
  amount_minor_units  INTEGER NOT NULL,
  payment_method      fine_payment_method,
  payment_reference   VARCHAR(128),
  receipt_number      VARCHAR(64),
  waiver_reason       TEXT,
  actor_id            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT fine_entries_amount_positive CHECK (amount_minor_units > 0),
  CONSTRAINT fine_entries_waiver_reason_check CHECK (
    entry_type != 'WAIVER' OR (waiver_reason IS NOT NULL AND length(trim(waiver_reason)) >= 3)
  ),
  CONSTRAINT fine_entries_payment_method_check CHECK (
    entry_type != 'PAYMENT' OR payment_method IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS fine_entries_tenant_user_idx
  ON public.fine_entries (tenant_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS fine_entries_tenant_loan_idx
  ON public.fine_entries (tenant_id, loan_id);

CREATE INDEX IF NOT EXISTS fine_entries_tenant_type_idx
  ON public.fine_entries (tenant_id, entry_type, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS fine_entries_tenant_receipt_unique
  ON public.fine_entries (tenant_id, receipt_number)
  WHERE receipt_number IS NOT NULL;

-- Append-only enforcement: prevent UPDATE and DELETE by trigger
CREATE OR REPLACE FUNCTION public.prevent_fine_entries_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'fine_entries ledger is append-only and cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fine_entries_immutable ON public.fine_entries;
CREATE TRIGGER trg_fine_entries_immutable
  BEFORE UPDATE OR DELETE ON public.fine_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_fine_entries_mutation();

-- RLS: fail-closed row level security
ALTER TABLE public.fine_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fine_entries FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY fine_entries_tenant_isolation ON public.fine_entries
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Grants for application role
GRANT SELECT, INSERT ON TABLE public.fine_entries TO lms_app;
