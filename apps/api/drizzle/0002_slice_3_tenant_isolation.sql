
-- AUTH-1, AUTH-2, AUTH-3, AUTH-5, MEM-1, MEM-2
-- Slice 3: enforce tenant isolation at the database level.

-- USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.users
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- GROUPS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.groups FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.groups
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- MEMBER TYPES
ALTER TABLE public.member_types ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.member_types FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.member_types
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- MEMBER PROFILES
ALTER TABLE public.member_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.member_profiles FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.member_profiles
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- SESSIONS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.sessions FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.sessions
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
--> statement-breakpoint

-- OTP CODES
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.otp_codes FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation ON public.otp_codes
  USING (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
