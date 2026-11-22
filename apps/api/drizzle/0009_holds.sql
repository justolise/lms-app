-- ─── 0009_holds.sql ────────────────────────────────────────────────────────
-- HLD-1 through HLD-3: Holds & Reservations table + RLS

-- 1. Create hold_status enum (idempotent)
DO $$ BEGIN
  CREATE TYPE hold_status AS ENUM ('PENDING', 'READY', 'FULFILLED', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Holds table
CREATE TABLE IF NOT EXISTS public.holds (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id            UUID          NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id              UUID          NOT NULL,
  catalogue_item_id    UUID          NOT NULL,
  copy_id              UUID,

  status               hold_status   NOT NULL DEFAULT 'PENDING',
  pickup_window_hours  INTEGER       NOT NULL DEFAULT 72,

  placed_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  ready_at             TIMESTAMPTZ,
  expires_at           TIMESTAMPTZ,
  fulfilled_at         TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,
  cancellation_reason  VARCHAR(255),
  cancelled_by_user_id UUID,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- 3. Unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS holds_tenant_id_id_unique
  ON public.holds (tenant_id, id);

-- Single active hold per user per title
CREATE UNIQUE INDEX IF NOT EXISTS holds_tenant_user_title_active_unique
  ON public.holds (tenant_id, user_id, catalogue_item_id)
  WHERE status IN ('PENDING', 'READY');

-- 4. Supporting indexes
CREATE INDEX IF NOT EXISTS holds_queue_fifo_idx
  ON public.holds (tenant_id, catalogue_item_id, status, placed_at ASC);

CREATE INDEX IF NOT EXISTS holds_tenant_user_status_idx
  ON public.holds (tenant_id, user_id, status);

CREATE INDEX IF NOT EXISTS holds_tenant_copy_status_idx
  ON public.holds (tenant_id, copy_id, status);

-- 5. Foreign key constraints
ALTER TABLE public.holds
  ADD CONSTRAINT holds_tenant_user_fk
    FOREIGN KEY (tenant_id, user_id)
    REFERENCES public.users (tenant_id, id)
    ON DELETE RESTRICT;

ALTER TABLE public.holds
  ADD CONSTRAINT holds_tenant_catalogue_item_fk
    FOREIGN KEY (tenant_id, catalogue_item_id)
    REFERENCES public.catalogue_items (tenant_id, id)
    ON DELETE RESTRICT;

ALTER TABLE public.holds
  ADD CONSTRAINT holds_tenant_copy_fk
    FOREIGN KEY (tenant_id, copy_id)
    REFERENCES public.copies (tenant_id, id)
    ON DELETE SET NULL;

-- 6. Row-Level Security (fail-closed like all tenant tables)
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holds FORCE ROW LEVEL SECURITY;

CREATE POLICY holds_tenant_isolation
  ON public.holds
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- 7. Grants (SELECT, INSERT, UPDATE, DELETE for queue management)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.holds TO lms_app;
