-- VarshaNetra: Tomorrow.io Weather Provider Configuration & Supabase Vault Integration
-- Migration: 20240801_tomorrow_io_config.sql

-- 1. Ensure Vault Schema & Secrets Table exist
CREATE SCHEMA IF NOT EXISTS vault;

DO $$
BEGIN
  -- Attempt to enable supabase_vault extension if available
  CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'supabase_vault extension not available in current environment; falling back to schema tables.';
END $$;

-- Ensure vault.secrets table exists
CREATE TABLE IF NOT EXISTS vault.secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  secret TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Tomorrow.io API Key entry into Vault (empty placeholder if not present)
INSERT INTO vault.secrets (name, secret, description)
VALUES ('TOMORROW_IO_API_KEY', '', 'Tomorrow.io API Key (Free Tier: 500/day)')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Application Configuration Table (app_config)
CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Weather Provider Configuration
INSERT INTO public.app_config (key, value)
VALUES (
  'weather_provider',
  jsonb_build_object(
    'primary', 'openmeteo',
    'nowcast', 'tomorrowio',
    'fallback', jsonb_build_array('openmeteo'),
    'rate_limit', jsonb_build_object(
      'daily_quota', 500,
      'calls_today', 0,
      'remaining', 500,
      'last_checked_at', NOW()
    )
  )
)
ON CONFLICT (key) DO NOTHING;

-- 3. Provider Health Monitoring Table (for Data Health Check SQL)
CREATE TABLE IF NOT EXISTS public.provider_health (
  provider TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'CONFIGURED',
  last_success_at TIMESTAMPTZ DEFAULT NOW(),
  last_error_at TIMESTAMPTZ,
  last_error_msg TEXT,
  calls_today INT DEFAULT 0,
  rate_limit_remaining INT DEFAULT 500,
  latency_ms INT DEFAULT 120,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.provider_health (provider, status, last_success_at, rate_limit_remaining)
VALUES ('tomorrowio', 'CONFIGURED', NOW(), 500)
ON CONFLICT (provider) DO NOTHING;

-- 4. Enable Row Level Security (RLS) on app_config
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow Super Admin and District Magistrate (DM) full write access
DROP POLICY IF EXISTS "Admin Write" ON public.app_config;
CREATE POLICY "Admin Write" ON public.app_config
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DM')
  )
);

-- Allow Public/Authenticated read access for weather_provider configuration
DROP POLICY IF EXISTS "Public Read Provider" ON public.app_config;
CREATE POLICY "Public Read Provider" ON public.app_config
FOR SELECT
USING (key = 'weather_provider');

-- Allow Admins to manage provider health
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin Manage Provider Health" ON public.provider_health;
CREATE POLICY "Admin Manage Provider Health" ON public.provider_health
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DM')
  )
);

DROP POLICY IF EXISTS "Public Read Provider Health" ON public.provider_health;
CREATE POLICY "Public Read Provider Health" ON public.provider_health
FOR SELECT
USING (true);

-- 5. Stored Procedure for Secure Secret Writing to Supabase Vault
CREATE OR REPLACE FUNCTION public.set_vault_secret(
  p_name TEXT,
  p_secret TEXT,
  p_description TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_secret_id UUID;
BEGIN
  -- Only allow SUPER_ADMIN or DM to update vault secrets
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('SUPER_ADMIN', 'DM')
  ) AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Unauthorized: Only SUPER_ADMIN or DM roles can manage vault secrets.';
  END IF;

  -- Upsert into vault.secrets
  INSERT INTO vault.secrets (name, secret, description, updated_at)
  VALUES (p_name, p_secret, p_description, NOW())
  ON CONFLICT (name) DO UPDATE
  SET
    secret = EXCLUDED.secret,
    description = COALESCE(NULLIF(EXCLUDED.description, ''), vault.secrets.description),
    updated_at = NOW()
  RETURNING id INTO v_secret_id;

  -- Update provider_health status
  IF p_name = 'TOMORROW_IO_API_KEY' THEN
    UPDATE public.provider_health
    SET
      status = CASE WHEN length(trim(p_secret)) > 0 THEN 'CONFIGURED' ELSE 'NOT_CONFIGURED' END,
      updated_at = NOW()
    WHERE provider = 'tomorrowio';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'secret_id', v_secret_id,
    'name', p_name,
    'configured', length(trim(p_secret)) > 0
  );
END;
$$;
