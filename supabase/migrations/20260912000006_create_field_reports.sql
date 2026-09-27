-- Migration: 20260912000006_create_field_reports.sql
-- Description: Create field_reports table and storage bucket for ground field observations (VARSHANETRA-18)

-- 1. Create field_reports table
create table if not exists public.field_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique not null,
  report_type text not null check (report_type in ('Waterlogging', 'River Breach', 'Road Block', 'Bridge Submergence', 'Landslide', 'Structure Damage', 'Rescue Needed', 'Other')),
  severity text not null check (severity in ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  latitude double precision not null check (latitude >= 6.0 and latitude <= 38.0),
  longitude double precision not null check (longitude >= 68.0 and longitude <= 98.0),
  location_name text not null,
  observed_water_depth_cm integer check (observed_water_depth_cm is null or observed_water_depth_cm >= 0),
  people_requiring_assistance integer default 0 check (people_requiring_assistance >= 0),
  road_status text not null default 'CLEAR' check (road_status in ('CLEAR', 'PARTIALLY_BLOCKED', 'SUBMERGED_PASSABLE', 'IMPASSABLE_CLOSED')),
  description text not null,
  photo_url text,
  photo_thumbnail_url text,
  verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED', 'VERIFIED', 'REJECTED')),
  observer_name text not null,
  observer_role text,
  observer_contact text,
  verified_by text,
  verified_at timestamptz,
  verification_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for rapid querying
create index if not exists idx_field_reports_status on public.field_reports(verification_status);
create index if not exists idx_field_reports_severity on public.field_reports(severity);
create index if not exists idx_field_reports_type on public.field_reports(report_type);
create index if not exists idx_field_reports_created_at on public.field_reports(created_at desc);

-- 3. Automatic updated_at trigger
create or replace trigger set_field_reports_updated_at
before update on public.field_reports
for each row
execute function public.set_updated_at();

-- 4. Row Level Security (RLS)
alter table public.field_reports enable row level security;

create policy "Allow read field_reports to all authenticated users"
  on public.field_reports for select
  to authenticated
  using (true);

create policy "Allow insert field_reports to authenticated users"
  on public.field_reports for insert
  to authenticated
  with check (true);

create policy "Allow update field_reports to authenticated users"
  on public.field_reports for update
  to authenticated
  using (true);

create policy "Allow delete unverified field_reports to authenticated users"
  on public.field_reports for delete
  to authenticated
  using (verification_status = 'UNVERIFIED');

-- 5. Supabase Storage Bucket Setup (field-reports)
-- Insert bucket record if storage schema is available
insert into storage.buckets (id, name, public)
values ('field-reports', 'field-reports', true)
on conflict (id) do nothing;

create policy "Public read field-reports bucket"
  on storage.objects for select
  using (bucket_id = 'field-reports');

create policy "Authenticated upload to field-reports bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'field-reports');
