-- ==============================================================================
-- VarshaNetra Database Migration: 20260912000009_security_hardening.sql
-- Purpose: Security Hardening, Audit Trail Integrity & Profile Isolation
-- Directives:
--   1. Enforce strict profile isolation (Users can only update their own profile).
--   2. Revoke anonymous access on public.audit_logs (restrict to authenticated and service role).
--   3. Reaffirm zero UPDATE and zero DELETE policies on public.audit_logs (immutable ledger).
--   4. Strengthen storage policies for field report evidence uploads.
-- ==============================================================================

-- 1. Profiles Table Hardening
-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop and recreate profile update policy to strictly bind to auth.uid()
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Audit Logs Table Hardening
-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop legacy policies that may have permitted 'anon' access
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;

-- Strict Select Policy: Only authenticated command officers can view audit history
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Strict Insert Policy: Only authenticated officers & system processes can log entries
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Explicit Immutability Guarantee:
-- Explicitly revoke UPDATE and DELETE privileges from authenticated and anon roles
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;

-- 3. Field Reports & Storage Objects Hardening
ALTER TABLE IF EXISTS public.field_reports ENABLE ROW LEVEL SECURITY;

-- Ensure storage bucket permissions enforce authentication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Authenticated upload to field-reports bucket" ON storage.objects;
    CREATE POLICY "Authenticated upload to field-reports bucket"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'field-reports');
  END IF;
END $$;

COMMENT ON TABLE public.audit_logs IS 'Immutable application audit log tracking operational, security, and lifecycle actions. Hardened against unauthorized client manipulation.';
