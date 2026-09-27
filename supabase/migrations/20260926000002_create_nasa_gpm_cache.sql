-- Create cache table for NASA GPM Satellite Data
CREATE TABLE IF NOT EXISTS nasa_gpm_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  district TEXT NOT NULL,
  fetch_date DATE NOT NULL,
  today_rainfall_mm DECIMAL(10, 2),
  yesterday_rainfall_mm DECIMAL(10, 2),
  two_day_total_mm DECIMAL(10, 2),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'NASA_POWER_GPM',
  CONSTRAINT unique_district_fetch_date UNIQUE (district, fetch_date)
);

-- Index for fast cached queries
CREATE INDEX IF NOT EXISTS idx_nasa_gpm_cache_district_date 
ON nasa_gpm_cache (district, fetch_date);

-- Enable Row Level Security (RLS)
ALTER TABLE nasa_gpm_cache ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT, INSERT, UPDATE
CREATE POLICY "Allow authenticated read access" 
ON nasa_gpm_cache FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated insert access" 
ON nasa_gpm_cache FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated update access" 
ON nasa_gpm_cache FOR UPDATE 
TO authenticated 
USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" 
ON nasa_gpm_cache FOR ALL 
TO service_role 
USING (true);

-- Allow public read access for emergency dashboard
CREATE POLICY "Allow anon read access" 
ON nasa_gpm_cache FOR SELECT 
TO anon 
USING (true);
