-- ==============================================================================
-- VarshaNetra Production Database Setup & Schema Migration Bundle
-- Script: VARSHANETRA_PRODUCTION_SETUP.sql
-- Description: Complete, idempotent schema creating all 10 core application tables,
--              schema versioning ledger, audit trails, triggers, performance indexes,
--              Row-Level Security (RLS) policies, and storage bucket configuration.
--
-- TARGET SUPABASE PROJECT:
-- Project Host: vxyfdnvxjynwgmzsrylk.supabase.co
--
-- SINGLE MANUAL ACTION REQUIRED:
-- 1. Open your Supabase Dashboard:
--    https://supabase.com/dashboard/project/vxyfdnvxjynwgmzsrylk/sql/new
-- 2. In the SQL Editor, copy and paste the ENTIRE contents of this file.
-- 3. Click "Run" (or press Ctrl+Enter / Cmd+Enter).
-- 4. Return to VarshaNetra at /data-sources and click "Test Source" on Supabase.
--    The status will immediately verify and flip to ONLINE!
-- ==============================================================================

-- ==============================================================================
-- 0. Extensions & Shared Functions
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic timestamp maintenance function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aliases for trigger backward compatibility
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_incidents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. Schema Versioning Ledger (Phase 15)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.schema_migrations (version, name)
VALUES ('20260913000000', 'varshanetra_core_schema')
ON CONFLICT (version) DO NOTHING;

ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read schema_migrations to authenticated and anon" ON public.schema_migrations;
CREATE POLICY "Allow read schema_migrations to authenticated and anon"
  ON public.schema_migrations FOR SELECT
  TO authenticated, anon
  USING (true);

COMMENT ON TABLE public.schema_migrations IS 'Tracks applied schema migration versions for VarshaNetra health checks.';

-- ==============================================================================
-- 2. User Profiles (Phase 3)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  government_id TEXT UNIQUE NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'OFFICER',
  designation TEXT,
  department TEXT,
  state TEXT DEFAULT 'Maharashtra',
  district TEXT DEFAULT 'Pune',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_government_id ON public.profiles (government_id);

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

COMMENT ON TABLE public.profiles IS 'Officer user profiles for VarshaNetra district emergency command. Government ID is an unverified account identifier.';

-- ==============================================================================
-- 3. Alerts & Warnings + Audit Trail (Phase 4)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  area_name TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'ISSUED', 'CANCELLED')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT DEFAULT 'District EOC Officer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changer_name TEXT DEFAULT 'District Authority',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_alerts_updated_at ON public.alerts;
CREATE TRIGGER set_alerts_updated_at
  BEFORE UPDATE ON public.alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts (status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON public.alerts (severity);
CREATE INDEX IF NOT EXISTS idx_alerts_area_name ON public.alerts (area_name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_audit_logs_alert_id ON public.alert_audit_logs (alert_id);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select alerts" ON public.alerts;
CREATE POLICY "Authenticated users can select alerts"
  ON public.alerts FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.alerts;
CREATE POLICY "Authenticated users can insert alerts"
  ON public.alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.alerts;
CREATE POLICY "Authenticated users can update alerts"
  ON public.alerts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete draft alerts" ON public.alerts;
CREATE POLICY "Authenticated users can delete draft alerts"
  ON public.alerts FOR DELETE
  TO authenticated
  USING (status = 'DRAFT' AND (auth.uid() = created_by OR created_by IS NULL));

DROP POLICY IF EXISTS "Authenticated users can select alert audit logs" ON public.alert_audit_logs;
CREATE POLICY "Authenticated users can select alert audit logs"
  ON public.alert_audit_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert alert audit logs" ON public.alert_audit_logs;
CREATE POLICY "Authenticated users can insert alert audit logs"
  ON public.alert_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.alerts IS 'Statutory district early warning notifications for flood risk and emergency civil response.';
COMMENT ON TABLE public.alert_audit_logs IS 'Immutable audit log tracking all status changes and reviews of district alerts.';

-- ==============================================================================
-- 4. Distress Incidents & Incident Audit Trail (Phase 5)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'Flooding',
    'Urban Waterlogging',
    'Road Block',
    'Rescue Required',
    'Medical Emergency',
    'Infrastructure Damage',
    'Other'
  )),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  location_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN (
    'OPEN',
    'ACKNOWLEDGED',
    'RESPONDING',
    'RESOLVED',
    'CLOSED'
  )),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name TEXT DEFAULT 'Citizen Distress / Field Observer',
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incident_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changer_name TEXT DEFAULT 'Command Officer',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_incidents_updated_at ON public.incidents;
CREATE TRIGGER set_incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents (status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON public.incidents (severity);
CREATE INDEX IF NOT EXISTS idx_incidents_type ON public.incidents (type);
CREATE INDEX IF NOT EXISTS idx_incidents_coords ON public.incidents (latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON public.incidents (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_audit_logs_incident_id ON public.incident_audit_logs (incident_id);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select incidents" ON public.incidents;
CREATE POLICY "Authenticated users can select incidents"
  ON public.incidents FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert incidents" ON public.incidents;
CREATE POLICY "Authenticated users can insert incidents"
  ON public.incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Authenticated users can update incidents" ON public.incidents;
CREATE POLICY "Authenticated users can update incidents"
  ON public.incidents FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete draft or open incidents" ON public.incidents;
CREATE POLICY "Authenticated users can delete draft or open incidents"
  ON public.incidents FOR DELETE
  TO authenticated
  USING (status = 'OPEN' AND (auth.uid() = created_by OR created_by IS NULL));

DROP POLICY IF EXISTS "Authenticated users can select incident audit logs" ON public.incident_audit_logs;
CREATE POLICY "Authenticated users can select incident audit logs"
  ON public.incident_audit_logs FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert incident audit logs" ON public.incident_audit_logs;
CREATE POLICY "Authenticated users can insert incident audit logs"
  ON public.incident_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.incidents IS 'District emergency distress reports and municipal field incidents.';
COMMENT ON TABLE public.incident_audit_logs IS 'Audit trail of incident dispatch lifecycle transitions.';

-- ==============================================================================
-- 5. Response Teams & Incident Tasking (Phase 6)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.response_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agency TEXT NOT NULL,
  personnel_count INTEGER NOT NULL CHECK (personnel_count > 0),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'UNAVAILABLE')),
  latitude DOUBLE PRECISION CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
  longitude DOUBLE PRECISION CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0)),
  location_name TEXT,
  contact_number TEXT,
  equipment TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incident_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.response_teams(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_status TEXT NOT NULL DEFAULT 'ASSIGNED' CHECK (assignment_status IN ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'STAND_DOWN', 'COMPLETED')),
  notes TEXT,
  assigned_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_response_teams_status ON public.response_teams(status);
CREATE INDEX IF NOT EXISTS idx_response_teams_agency ON public.response_teams(agency);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_incident ON public.incident_assignments(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_team ON public.incident_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_incident_assignments_status ON public.incident_assignments(assignment_status);

DROP TRIGGER IF EXISTS set_response_teams_updated_at ON public.response_teams;
CREATE TRIGGER set_response_teams_updated_at
  BEFORE UPDATE ON public.response_teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_incident_assignments_updated_at ON public.incident_assignments;
CREATE TRIGGER set_incident_assignments_updated_at
  BEFORE UPDATE ON public.incident_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.response_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read response_teams to all authenticated users" ON public.response_teams;
CREATE POLICY "Allow read response_teams to all authenticated users"
  ON public.response_teams FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert/update response_teams to authenticated users" ON public.response_teams;
CREATE POLICY "Allow insert/update response_teams to authenticated users"
  ON public.response_teams FOR ALL
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow read incident_assignments to all authenticated users" ON public.incident_assignments;
CREATE POLICY "Allow read incident_assignments to all authenticated users"
  ON public.incident_assignments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert/update incident_assignments to authenticated users" ON public.incident_assignments;
CREATE POLICY "Allow insert/update incident_assignments to authenticated users"
  ON public.incident_assignments FOR ALL
  TO authenticated
  USING (true);

-- ==============================================================================
-- 6. Emergency Resources & Shelters (Phase 7)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Boat', 'Ambulance', 'Rescue Vehicle', 'Medical Kit', 'Food Packet', 'Water', 'Generator', 'Life Jacket', 'Other')),
  total_quantity INTEGER NOT NULL CHECK (total_quantity >= 0),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  deployed_quantity INTEGER NOT NULL CHECK (deployed_quantity >= 0),
  location TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_resource_quantities CHECK (available_quantity + deployed_quantity = total_quantity)
);

CREATE TABLE IF NOT EXISTS public.shelters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= 6.0 AND latitude <= 38.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= 68.0 AND longitude <= 98.0),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  current_occupancy INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
  water_available BOOLEAN NOT NULL DEFAULT TRUE,
  food_available BOOLEAN NOT NULL DEFAULT TRUE,
  medical_support BOOLEAN NOT NULL DEFAULT FALSE,
  electricity BOOLEAN NOT NULL DEFAULT TRUE,
  contact_information TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FULL', 'STANDBY', 'CLOSED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resource_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('DEPLOY', 'RETURN', 'ADJUST_TOTAL')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  destination TEXT,
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  transacted_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_type ON public.resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_location ON public.resources(location);
CREATE INDEX IF NOT EXISTS idx_shelters_status ON public.shelters(status);
CREATE INDEX IF NOT EXISTS idx_resource_transactions_resource ON public.resource_transactions(resource_id);

DROP TRIGGER IF EXISTS set_resources_updated_at ON public.resources;
CREATE TRIGGER set_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_shelters_updated_at ON public.shelters;
CREATE TRIGGER set_shelters_updated_at
  BEFORE UPDATE ON public.shelters
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read resources to all authenticated users" ON public.resources;
CREATE POLICY "Allow read resources to all authenticated users"
  ON public.resources FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert resources to authenticated users" ON public.resources;
CREATE POLICY "Allow insert resources to authenticated users"
  ON public.resources FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update resources to authenticated users" ON public.resources;
CREATE POLICY "Allow update resources to authenticated users"
  ON public.resources FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow delete resources to authenticated users" ON public.resources;
CREATE POLICY "Allow delete resources to authenticated users"
  ON public.resources FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow read shelters to all authenticated users" ON public.shelters;
CREATE POLICY "Allow read shelters to all authenticated users"
  ON public.shelters FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert shelters to authenticated users" ON public.shelters;
CREATE POLICY "Allow insert shelters to authenticated users"
  ON public.shelters FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update shelters to authenticated users" ON public.shelters;
CREATE POLICY "Allow update shelters to authenticated users"
  ON public.shelters FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow delete shelters to authenticated users" ON public.shelters;
CREATE POLICY "Allow delete shelters to authenticated users"
  ON public.shelters FOR DELETE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow read resource_transactions to all authenticated users" ON public.resource_transactions;
CREATE POLICY "Allow read resource_transactions to all authenticated users"
  ON public.resource_transactions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert resource_transactions to authenticated users" ON public.resource_transactions;
CREATE POLICY "Allow insert resource_transactions to authenticated users"
  ON public.resource_transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ==============================================================================
-- 7. Ground Field Reports & Storage Evidence Bucket (Phases 8 & 13)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.field_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_number TEXT UNIQUE NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('Waterlogging', 'River Breach', 'Road Block', 'Bridge Submergence', 'Landslide', 'Structure Damage', 'Rescue Needed', 'Other')),
  severity TEXT NOT NULL CHECK (severity IN ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude >= 6.0 AND latitude <= 38.0),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude >= 68.0 AND longitude <= 98.0),
  location_name TEXT NOT NULL,
  observed_water_depth_cm INTEGER CHECK (observed_water_depth_cm IS NULL OR observed_water_depth_cm >= 0),
  people_requiring_assistance INTEGER DEFAULT 0 CHECK (people_requiring_assistance >= 0),
  road_status TEXT NOT NULL DEFAULT 'CLEAR' CHECK (road_status IN ('CLEAR', 'PARTIALLY_BLOCKED', 'SUBMERGED_PASSABLE', 'IMPASSABLE_CLOSED')),
  description TEXT NOT NULL,
  photo_url TEXT,
  photo_thumbnail_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  observer_name TEXT NOT NULL,
  observer_role TEXT,
  observer_contact TEXT,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_reports_status ON public.field_reports(verification_status);
CREATE INDEX IF NOT EXISTS idx_field_reports_severity ON public.field_reports(severity);
CREATE INDEX IF NOT EXISTS idx_field_reports_type ON public.field_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_field_reports_created_at ON public.field_reports(created_at DESC);

DROP TRIGGER IF EXISTS set_field_reports_updated_at ON public.field_reports;
CREATE TRIGGER set_field_reports_updated_at
  BEFORE UPDATE ON public.field_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.field_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read field_reports to all authenticated users" ON public.field_reports;
CREATE POLICY "Allow read field_reports to all authenticated users"
  ON public.field_reports FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert field_reports to authenticated users" ON public.field_reports;
CREATE POLICY "Allow insert field_reports to authenticated users"
  ON public.field_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update field_reports to authenticated users" ON public.field_reports;
CREATE POLICY "Allow update field_reports to authenticated users"
  ON public.field_reports FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow delete unverified field_reports to authenticated users" ON public.field_reports;
CREATE POLICY "Allow delete unverified field_reports to authenticated users"
  ON public.field_reports FOR DELETE
  TO authenticated
  USING (verification_status = 'UNVERIFIED');

-- Supabase Storage Bucket Setup (field-reports)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('field-reports', 'field-reports', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN
    DROP POLICY IF EXISTS "Public read field-reports bucket" ON storage.objects;
    CREATE POLICY "Public read field-reports bucket"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'field-reports');

    DROP POLICY IF EXISTS "Authenticated upload to field-reports bucket" ON storage.objects;
    CREATE POLICY "Authenticated upload to field-reports bucket"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'field-reports');
  END IF;
END $$;

-- ==============================================================================
-- 8. Operational Notifications (Phase 9)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('ALERT_ISSUED', 'INCIDENT_ASSIGNED', 'RESPONSE_TEAM_ASSIGNMENT', 'NEW_FIELD_REPORT', 'CRITICAL_DATA_SOURCE_FAILURE')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'NORMAL' CHECK (severity IN ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  deep_link TEXT NOT NULL,
  related_id TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON public.notifications(event_type);

DROP TRIGGER IF EXISTS set_notifications_updated_at ON public.notifications;
CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read notifications to all authenticated users" ON public.notifications;
CREATE POLICY "Allow read notifications to all authenticated users"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow insert notifications to authenticated users" ON public.notifications;
CREATE POLICY "Allow insert notifications to authenticated users"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update notifications to authenticated users" ON public.notifications;
CREATE POLICY "Allow update notifications to authenticated users"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow delete notifications to authenticated users" ON public.notifications;
CREATE POLICY "Allow delete notifications to authenticated users"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (true);

-- ==============================================================================
-- 9. Centralized Immutable Audit Logs (Phase 9 & 12)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  actor_name TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs (entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- IMMUTABILITY GUARANTEE: Revoke UPDATE and DELETE on audit_logs
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon, public;

COMMENT ON TABLE public.audit_logs IS 'Immutable application audit log tracking operational, security, and lifecycle actions. Hardened against unauthorized client manipulation.';
