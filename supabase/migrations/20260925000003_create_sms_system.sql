-- ====================================================================
-- VarshaNetra ROAD-004: SMS Alert Delivery & Recipient Management System
-- Schema Migration: alert_recipients & sms_delivery_log
-- ====================================================================

-- 1. Create alert_recipients table
CREATE TABLE IF NOT EXISTS public.alert_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL CHECK (phone ~ '^\+91[0-9]{10}$'),
  category TEXT NOT NULL CHECK (category IN ('OFFICER', 'PRADHAN', 'SCHOOL_PRINCIPAL', 'HOSPITAL_ADMIN', 'MEDIA', 'OTHER')),
  district TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for district and category lookups
CREATE INDEX IF NOT EXISTS idx_alert_recipients_district ON public.alert_recipients(district);
CREATE INDEX IF NOT EXISTS idx_alert_recipients_category ON public.alert_recipients(category);
CREATE INDEX IF NOT EXISTS idx_alert_recipients_active ON public.alert_recipients(is_active);

-- 2. Create sms_delivery_log table
CREATE TABLE IF NOT EXISTS public.sms_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id TEXT NOT NULL,
  recipient_number TEXT NOT NULL,
  message_sid TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'simulated_trial')),
  language TEXT DEFAULT 'en',
  message_text TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_alert_id ON public.sms_delivery_log(alert_id);
CREATE INDEX IF NOT EXISTS idx_sms_delivery_log_sent_at ON public.sms_delivery_log(sent_at DESC);

-- 3. Row Level Security Policies
ALTER TABLE public.alert_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_delivery_log ENABLE ROW LEVEL SECURITY;

-- Allow public read of active recipients for emergency dispatch
CREATE POLICY "Public read alert recipients"
  ON public.alert_recipients FOR SELECT
  USING (true);

-- Allow authenticated users to insert / update / delete recipients
CREATE POLICY "Authenticated manage alert recipients"
  ON public.alert_recipients FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public read of sms logs for EOC situational tracking
CREATE POLICY "Public read sms delivery logs"
  ON public.sms_delivery_log FOR SELECT
  USING (true);

-- Allow authenticated write of sms logs
CREATE POLICY "Authenticated insert sms delivery logs"
  ON public.sms_delivery_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Initial Seed Recipients for Demonstration & Testing
INSERT INTO public.alert_recipients (name, phone, category, district, is_active, added_by)
VALUES
  ('Dr. Rajesh Patil (Collector & DM)', '+919822012345', 'OFFICER', 'Pune District', true, 'System Admin'),
  ('Smt. Sunita Shinde (Addl Collector)', '+919822023456', 'OFFICER', 'Pune District', true, 'System Admin'),
  ('Shri Ganesh Deshmukh (SDM Haveli)', '+919822034567', 'OFFICER', 'Pune District', true, 'System Admin'),
  ('Rameshwar Jadhav (Gram Pradhan, Khadakwasla)', '+919823011122', 'PRADHAN', 'Pune District', true, 'System Admin'),
  ('Baburao Gaikwad (Gram Pradhan, Mulshi)', '+919823022233', 'PRADHAN', 'Pune District', true, 'System Admin'),
  ('Sister Maria Fernandez (Principal, St. Anne High School)', '+919824033344', 'SCHOOL_PRINCIPAL', 'Pune District', true, 'System Admin'),
  ('Prof. Arvind Joshi (Principal, ZP High School Sinhagad)', '+919824044455', 'SCHOOL_PRINCIPAL', 'Pune District', true, 'System Admin'),
  ('Dr. Sanjeev Kulkarni (Medical Superintendent, Sassoon Hospital)', '+919825055566', 'HOSPITAL_ADMIN', 'Pune District', true, 'System Admin'),
  ('Dr. Meera Rao (Administrator, Aundh District Hospital)', '+919825066677', 'HOSPITAL_ADMIN', 'Pune District', true, 'System Admin'),
  ('Bureau Chief, All India Radio Pune', '+919826077788', 'MEDIA', 'Pune District', true, 'System Admin'),
  ('District Correspondent, Doordarshan News', '+919826088899', 'MEDIA', 'Pune District', true, 'System Admin')
ON CONFLICT DO NOTHING;
