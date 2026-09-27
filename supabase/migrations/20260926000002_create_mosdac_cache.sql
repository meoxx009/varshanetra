-- Migration: 20260926000002_create_mosdac_cache.sql
-- Description: Creates mosdac_cache table for ISRO MOSDAC INSAT-3D telemetry (LIVE-003)

CREATE TABLE IF NOT EXISTS public.mosdac_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  district TEXT NOT NULL,
  rainfall_rate_mmhr NUMERIC NOT NULL,
  three_hour_accum NUMERIC NOT NULL,
  six_hour_accum NUMERIC NOT NULL,
  cloud_temp_kelvin NUMERIC NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for speedy district & freshness lookups
CREATE INDEX IF NOT EXISTS idx_mosdac_cache_district ON public.mosdac_cache(district);
CREATE INDEX IF NOT EXISTS idx_mosdac_cache_fetched_at ON public.mosdac_cache(fetched_at DESC);

-- Enable RLS
ALTER TABLE public.mosdac_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anonymous users
CREATE POLICY "Allow public read access on mosdac_cache"
  ON public.mosdac_cache
  FOR SELECT
  USING (true);

-- Allow service role / authenticated insert
CREATE POLICY "Allow authenticated insert on mosdac_cache"
  ON public.mosdac_cache
  FOR INSERT
  WITH CHECK (true);
