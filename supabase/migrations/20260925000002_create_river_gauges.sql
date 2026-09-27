-- VarshaNetra ROAD-002: CWC River Gauge Data Integration
-- Migration: 20260925000002_create_river_gauges
-- Creates river gauge station registry and time-series readings tables

-- ─────────────────────────────────────────────────────────────
-- TABLE 1: river_gauges (station configuration & current status)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS river_gauges (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_name      TEXT NOT NULL,
  station_code      TEXT,
  river_name        TEXT NOT NULL,
  district          TEXT NOT NULL,
  state             TEXT NOT NULL,
  latitude          DECIMAL(10, 6),
  longitude         DECIMAL(10, 6),

  -- CWC official benchmark levels (meters above sea level / gauge datum)
  danger_level_m    DECIMAL(8, 3),  -- Danger level as declared by CWC
  warning_level_m   DECIMAL(8, 3),  -- Warning level as declared by CWC
  normal_level_m    DECIMAL(8, 3),  -- Normal / low-flow level

  -- Observed current reading (updated with each manual bulletin entry)
  current_level_m   DECIMAL(8, 3),  -- Current observed water level
  level_trend       TEXT CHECK (level_trend IN ('RISING', 'FALLING', 'STEADY')),
  last_updated      TIMESTAMPTZ,

  -- Data governance
  data_source       TEXT NOT NULL DEFAULT 'CWC Manual Entry',
  entered_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cwc_station_url   TEXT,  -- Direct URL to CWC ffis.cwc.gov.in station page

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE 2: river_gauge_readings (time-series history for sparklines)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS river_gauge_readings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gauge_id          UUID NOT NULL REFERENCES river_gauges(id) ON DELETE CASCADE,
  reading_datetime  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  water_level_m     DECIMAL(8, 3) NOT NULL,
  discharge_cumecs  DECIMAL(12, 3),  -- Discharge in cubic meters per second (optional)
  trend             TEXT CHECK (trend IN ('RISING', 'FALLING', 'STEADY')),
  entered_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_river_gauges_district ON river_gauges(district);
CREATE INDEX IF NOT EXISTS idx_river_gauges_state ON river_gauges(state);
CREATE INDEX IF NOT EXISTS idx_river_gauge_readings_gauge_id ON river_gauge_readings(gauge_id);
CREATE INDEX IF NOT EXISTS idx_river_gauge_readings_datetime ON river_gauge_readings(reading_datetime DESC);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE river_gauges ENABLE ROW LEVEL SECURITY;
ALTER TABLE river_gauge_readings ENABLE ROW LEVEL SECURITY;

-- Read access: all authenticated users (operational read)
CREATE POLICY "river_gauges_read_all"
  ON river_gauges FOR SELECT
  USING (true);

CREATE POLICY "river_gauge_readings_read_all"
  ON river_gauge_readings FOR SELECT
  USING (true);

-- Write access: authenticated users only (INSERT new stations)
CREATE POLICY "river_gauges_insert_authenticated"
  ON river_gauges FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Update access: authenticated users only (update current level)
CREATE POLICY "river_gauges_update_authenticated"
  ON river_gauges FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Write readings: authenticated users only
CREATE POLICY "river_gauge_readings_insert_authenticated"
  ON river_gauge_readings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_river_gauges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_river_gauges_updated_at
  BEFORE UPDATE ON river_gauges
  FOR EACH ROW EXECUTE FUNCTION update_river_gauges_updated_at();
