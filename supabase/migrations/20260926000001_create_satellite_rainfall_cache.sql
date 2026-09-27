-- Migration: 20260926000001_create_satellite_rainfall_cache.sql
-- Description: Creates satellite_rainfall_cache table for NASA GPM IMERG telemetry (LIVE-002)

CREATE TABLE IF NOT EXISTS public.satellite_rainfall_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  district TEXT NOT NULL,
  total_mm NUMERIC NOT NULL,
  max_mm NUMERIC NOT NULL,
  grid_data JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'NASA_GPM_IMERG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for speedy district & freshness lookups
CREATE INDEX IF NOT EXISTS idx_satellite_rainfall_district ON public.satellite_rainfall_cache(district);
CREATE INDEX IF NOT EXISTS idx_satellite_rainfall_fetched_at ON public.satellite_rainfall_cache(fetched_at DESC);

-- Enable RLS
ALTER TABLE public.satellite_rainfall_cache ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated and anonymous users
CREATE POLICY "Allow public read access on satellite_rainfall_cache"
  ON public.satellite_rainfall_cache
  FOR SELECT
  USING (true);

-- Allow service role / authenticated insert
CREATE POLICY "Allow authenticated insert on satellite_rainfall_cache"
  ON public.satellite_rainfall_cache
  FOR INSERT
  WITH CHECK (true);
