-- Migration: 0013_library_profile.sql
-- ADM-1: Library profile (name, logo, opening hours, contact, address, rules summary)

ALTER TABLE "public"."tenants"
  ADD COLUMN IF NOT EXISTS "logo_url" text,
  ADD COLUMN IF NOT EXISTS "email" varchar(254),
  ADD COLUMN IF NOT EXISTS "phone" varchar(50),
  ADD COLUMN IF NOT EXISTS "address" text,
  ADD COLUMN IF NOT EXISTS "opening_hours" text,
  ADD COLUMN IF NOT EXISTS "website" varchar(255),
  ADD COLUMN IF NOT EXISTS "description" text,
  ADD COLUMN IF NOT EXISTS "borrowing_rules_summary" text;
