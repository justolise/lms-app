-- Migration: 0015_platform_saas_core.sql
-- Platform Super Admin, Multi-Tenant SaaS Lifecycle, Platform Sessions, and Platform Audit Logs

DO $$ BEGIN
  CREATE TYPE public.platform_user_status AS ENUM ('ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. Platform Super Admin Identity Table (Global / Non-RLS)
CREATE TABLE IF NOT EXISTS public.platform_users (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                   VARCHAR(254) NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  full_name               VARCHAR(150) NOT NULL,
  status                  public.platform_user_status NOT NULL DEFAULT 'ACTIVE',
  mfa_secret_encrypted    TEXT,
  mfa_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_recovery_codes_hash JSONB,
  last_login_at           TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_users_email_idx
  ON public.platform_users (email);

-- 2. Platform Sessions Table (Global / Non-RLS)
CREATE TABLE IF NOT EXISTS public.platform_sessions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_user_id        UUID NOT NULL REFERENCES public.platform_users(id) ON DELETE CASCADE,
  refresh_token_hash      TEXT NOT NULL,
  ip_address              VARCHAR(45),
  user_agent              TEXT,
  expires_at              TIMESTAMPTZ NOT NULL,
  revoked_at              TIMESTAMPTZ,
  replaced_by_session_id  UUID,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_sessions_user_idx
  ON public.platform_sessions (platform_user_id, expires_at);

-- 3. Platform Audit Logs Table (Global / Append-Only / Non-RLS)
CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id                UUID REFERENCES public.platform_users(id) ON DELETE SET NULL,
  action                  VARCHAR(100) NOT NULL,
  entity_type             VARCHAR(100) NOT NULL,
  entity_id               VARCHAR(100),
  ip_address              VARCHAR(45),
  user_agent              TEXT,
  metadata                JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS platform_audit_logs_actor_idx
  ON public.platform_audit_logs (actor_id, created_at);

CREATE INDEX IF NOT EXISTS platform_audit_logs_entity_idx
  ON public.platform_audit_logs (entity_type, entity_id);

-- 4. Tenants Table Enhancements for Path-Based Routing & Lifecycle
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Backfill existing library codes to lowercase slugs if null
UPDATE public.tenants
  SET slug = LOWER(REGEXP_REPLACE(library_code, '[^a-zA-Z0-9-]', '-', 'g'))
  WHERE slug IS NULL;

ALTER TABLE public.tenants ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_unique
  ON public.tenants (slug);

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT tenants_slug_format_check
    CHECK (slug ~ '^[a-z0-9-]+$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS onboarding_notes TEXT;

-- 5. Application Role Grants
GRANT USAGE ON TYPE public.platform_user_status TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_users TO lms_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.platform_sessions TO lms_app;
GRANT SELECT, INSERT ON TABLE public.platform_audit_logs TO lms_app;
GRANT SELECT, INSERT, UPDATE ON TABLE public.tenants TO lms_app;
