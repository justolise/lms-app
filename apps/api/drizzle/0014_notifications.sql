-- Migration: 0014_notifications.sql
-- NOT-1 & NOT-2: Notifications table with deduplication, channel routing, and RLS isolation

DO $$ BEGIN
  CREATE TYPE public.notification_channel AS ENUM ('EMAIL', 'SMS');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_event_type AS ENUM ('HOLD_READY', 'DUE_SOON', 'OVERDUE', 'FINE_POSTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.notification_status AS ENUM ('PENDING', 'QUEUED_QUIET_HOURS', 'SENT', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel         public.notification_channel NOT NULL,
  event_type      public.notification_event_type NOT NULL,
  recipient       VARCHAR(255) NOT NULL,
  subject         VARCHAR(255),
  body            TEXT NOT NULL,
  dedupe_key      VARCHAR(255) NOT NULL,
  status          public.notification_status NOT NULL DEFAULT 'PENDING',
  scheduled_for   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  attempt_count   INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_tenant_dedupe_unique
  ON public.notifications (tenant_id, dedupe_key);

CREATE INDEX IF NOT EXISTS notifications_tenant_status_scheduled_idx
  ON public.notifications (tenant_id, status, scheduled_for);

CREATE INDEX IF NOT EXISTS notifications_tenant_user_idx
  ON public.notifications (tenant_id, user_id);

-- RLS: fail-closed row level security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY notifications_tenant_isolation ON public.notifications
    USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Application role permissions
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO lms_app;
