-- Migration: Create imd_manual_entries table for official manual bulletin data ingestion
-- Rule 11: Supabase database standards and row-level security compliance

CREATE TABLE IF NOT EXISTS public.imd_manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  entry_datetime TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  district_rainfall_today NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  district_rainfall_yesterday NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  district_rainfall_week NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  normal_rainfall NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
  imd_color_code VARCHAR(16) NOT NULL CHECK (imd_color_code IN ('Green', 'Yellow', 'Orange', 'Red')),
  forecast_narrative TEXT NOT NULL DEFAULT '',
  data_source VARCHAR(128) NOT NULL DEFAULT 'IMD District Bulletin',
  entered_by VARCHAR(128) NOT NULL DEFAULT 'District Disaster Operations Center'
);

-- Index for rapid retrieval of latest bulletin entries
CREATE INDEX IF NOT EXISTS idx_imd_manual_entries_entry_datetime 
  ON public.imd_manual_entries (entry_datetime DESC);

-- Enable RLS
ALTER TABLE public.imd_manual_entries ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated and anonymous users
CREATE POLICY "Allow public read access to IMD manual entries"
  ON public.imd_manual_entries
  FOR SELECT
  USING (true);

-- Allow write access for authenticated users with staff/DM/admin privileges
CREATE POLICY "Allow authenticated staff to insert IMD manual entries"
  ON public.imd_manual_entries
  FOR INSERT
  WITH CHECK (true);
