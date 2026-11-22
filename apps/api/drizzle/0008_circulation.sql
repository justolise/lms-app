-- ─── 0008_circulation.sql ────────────────────────────────────────────────────
-- CIR-1 through CIR-5: Loans table + RLS

-- 1. Create loan_status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('ACTIVE','RETURNED','OVERDUE','LOST','DAMAGED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Loans table
CREATE TABLE IF NOT EXISTS public.loans (
  id                     UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id              UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id                UUID          NOT NULL,
  copy_id                UUID          NOT NULL,
  catalogue_item_id      UUID          NOT NULL,

  -- Policy snapshot (CIR-4)
  loan_duration_days     INTEGER       NOT NULL,
  max_renewals           INTEGER       NOT NULL,
  grace_period_days      INTEGER       NOT NULL DEFAULT 0,
  daily_fine_minor_units INTEGER       NOT NULL DEFAULT 0,
  max_fine_minor_units   INTEGER       NOT NULL DEFAULT 0,

  -- Timestamps (UTC, Africa/Nairobi logical)
  checked_out_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  due_at                 TIMESTAMPTZ   NOT NULL,
  returned_at            TIMESTAMPTZ,
  status                 loan_status   NOT NULL DEFAULT 'ACTIVE',
  renewal_count          INTEGER       NOT NULL DEFAULT 0,

  -- Fine computed at return/lost marking
  fine_minor_units       INTEGER,

  -- CIR-5 override audit
  override_reason        TEXT,
  override_actor_id      UUID,

  -- Idempotency
  idempotency_key        VARCHAR(128),

  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS loans_tenant_id_id_unique
  ON public.loans (tenant_id, id);

-- Idempotency only enforced when key is non-null
CREATE UNIQUE INDEX IF NOT EXISTS loans_idempotency_unique
  ON public.loans (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. Supporting indexes
CREATE INDEX IF NOT EXISTS loans_tenant_user_status_idx
  ON public.loans (tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS loans_tenant_copy_idx
  ON public.loans (tenant_id, copy_id);

CREATE INDEX IF NOT EXISTS loans_tenant_catalogue_item_idx
  ON public.loans (tenant_id, catalogue_item_id);

-- 5. Foreign key constraints
ALTER TABLE public.loans
  ADD CONSTRAINT loans_tenant_user_fk
    FOREIGN KEY (tenant_id, user_id)
    REFERENCES public.users (tenant_id, id)
    ON DELETE RESTRICT;

ALTER TABLE public.loans
  ADD CONSTRAINT loans_tenant_copy_fk
    FOREIGN KEY (tenant_id, copy_id)
    REFERENCES public.copies (tenant_id, id)
    ON DELETE RESTRICT;

-- 6. Row-Level Security (fail-closed like all tenant tables)
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans FORCE ROW LEVEL SECURITY;

CREATE POLICY loans_tenant_isolation
  ON public.loans
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 7. Grants (no DELETE — loans are immutable records)
GRANT SELECT, INSERT, UPDATE ON TABLE public.loans TO lms_app;
