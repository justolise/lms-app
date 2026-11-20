CREATE TYPE "public"."identity_type" AS ENUM('EMAIL', 'PHONE');--> statement-breakpoint
CREATE TABLE "user_identity_lookup" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"identity_type" "identity_type" NOT NULL,
	"identity_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_identity_lookup" ADD CONSTRAINT "user_identity_lookup_tenant_user_fk" FOREIGN KEY ("tenant_id","user_id") REFERENCES "public"."users"("tenant_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_identity_lookup_tenant_identity_unique" ON "user_identity_lookup" USING btree ("tenant_id","identity_type","identity_hash");--> statement-breakpoint
CREATE INDEX "user_identity_lookup_discovery_idx" ON "user_identity_lookup" USING btree ("identity_type","identity_hash");

-- AUTH-1: Enforce the HMAC-SHA-256 hexadecimal representation.
ALTER TABLE public.user_identity_lookup
ADD CONSTRAINT user_identity_lookup_hash_format_check
CHECK (identity_hash ~ '^[0-9a-f]{64}$');

-- The application must never access the global lookup table directly.
REVOKE ALL ON TABLE public.user_identity_lookup FROM PUBLIC;
REVOKE ALL ON TABLE public.user_identity_lookup FROM lms_app;

-- Grant only the permissions required by the restricted function owner.
GRANT USAGE ON SCHEMA public TO lms_identity_owner;
GRANT USAGE ON TYPE public.identity_type TO lms_identity_owner;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.user_identity_lookup
TO lms_identity_owner;

-- Create functions and grant application schema access as the restricted owner.
SET ROLE lms_identity_owner;

-- The application may execute functions, but cannot create objects here.
GRANT USAGE ON SCHEMA identity_private TO lms_app;

-- AUTH-1: Find matching accounts across libraries.
CREATE FUNCTION identity_private.find_user_identity(
  p_identity_type public.identity_type,
  p_identity_hash varchar(64)
)
RETURNS TABLE (
  tenant_id uuid,
  user_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF p_identity_hash IS NULL
     OR p_identity_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid identity hash'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT lookup.tenant_id, lookup.user_id
  FROM public.user_identity_lookup AS lookup
  WHERE lookup.identity_type = p_identity_type
    AND lookup.identity_hash = p_identity_hash;
END;
$function$;

-- AUTH-1: Synchronize an account identity.
-- An identity already belonging to another account cannot be reassigned.
CREATE FUNCTION identity_private.sync_user_identity(
  p_tenant_id uuid,
  p_user_id uuid,
  p_identity_type public.identity_type,
  p_identity_hash varchar(64)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  -- AUTH-1: Require an active tenant context.
  IF NULLIF(current_setting('app.tenant_id', true), '')
       IS DISTINCT FROM p_tenant_id::text THEN
    RAISE EXCEPTION 'Tenant context mismatch'
      USING ERRCODE = '42501';
  END IF;

  IF p_identity_hash IS NULL
     OR p_identity_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invalid identity hash'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.user_identity_lookup (
    tenant_id,
    user_id,
    identity_type,
    identity_hash
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_identity_type,
    p_identity_hash
  )
  ON CONFLICT (tenant_id, identity_type, identity_hash)
  DO UPDATE
    SET user_id = EXCLUDED.user_id
    WHERE public.user_identity_lookup.user_id = EXCLUDED.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Identity already belongs to another account'
      USING ERRCODE = '23505';
  END IF;
END;
$function$;

-- AUTH-1: Remove an account identity, for example after an email change.
CREATE FUNCTION identity_private.delete_user_identity(
  p_tenant_id uuid,
  p_user_id uuid,
  p_identity_type public.identity_type
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  -- AUTH-1: A library can only delete its own identity records.
  IF NULLIF(current_setting('app.tenant_id', true), '')
       IS DISTINCT FROM p_tenant_id::text THEN
    RAISE EXCEPTION 'Tenant context mismatch'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.user_identity_lookup
  WHERE tenant_id = p_tenant_id
    AND user_id = p_user_id
    AND identity_type = p_identity_type;
END;
$function$;

-- Functions must not be executable by PUBLIC.
REVOKE ALL ON FUNCTION identity_private.find_user_identity(
  public.identity_type, varchar
) FROM PUBLIC;

REVOKE ALL ON FUNCTION identity_private.sync_user_identity(
  uuid, uuid, public.identity_type, varchar
) FROM PUBLIC;

REVOKE ALL ON FUNCTION identity_private.delete_user_identity(
  uuid, uuid, public.identity_type
) FROM PUBLIC;

-- Give the application only the ability to execute these functions.
GRANT EXECUTE ON FUNCTION identity_private.find_user_identity(
  public.identity_type, varchar
) TO lms_app;

GRANT USAGE ON TYPE public.identity_type TO lms_app;

GRANT EXECUTE ON FUNCTION identity_private.sync_user_identity(
  uuid, uuid, public.identity_type, varchar
) TO lms_app;

GRANT EXECUTE ON FUNCTION identity_private.delete_user_identity(
  uuid, uuid, public.identity_type
) TO lms_app;

RESET ROLE;
