-- Migration: 20260911000004_create_response_teams.sql
-- Description: Create response_teams and incident_assignments tables for tactical team coordination (VARSHANETRA-16)

-- 1. Create response_teams table
create table if not exists public.response_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  agency text not null,
  personnel_count integer not null check (personnel_count > 0),
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE', 'ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'UNAVAILABLE')),
  latitude double precision check (latitude is null or (latitude >= -90.0 and latitude <= 90.0)),
  longitude double precision check (longitude is null or (longitude >= -180.0 and longitude <= 180.0)),
  location_name text,
  contact_number text,
  equipment text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create incident_assignments table
create table if not exists public.incident_assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  team_id uuid not null references public.response_teams(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assignment_status text not null default 'ASSIGNED' check (assignment_status in ('ASSIGNED', 'EN_ROUTE', 'ON_SITE', 'STAND_DOWN', 'COMPLETED')),
  notes text,
  assigned_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes for fast lookups
create index if not exists idx_response_teams_status on public.response_teams(status);
create index if not exists idx_response_teams_agency on public.response_teams(agency);
create index if not exists idx_incident_assignments_incident on public.incident_assignments(incident_id);
create index if not exists idx_incident_assignments_team on public.incident_assignments(team_id);
create index if not exists idx_incident_assignments_status on public.incident_assignments(assignment_status);

-- 4. Automatically maintain updated_at timestamps
create or replace trigger set_response_teams_updated_at
before update on public.response_teams
for each row
execute function public.set_updated_at();

create or replace trigger set_incident_assignments_updated_at
before update on public.incident_assignments
for each row
execute function public.set_updated_at();

-- 5. Row Level Security (RLS)
alter table public.response_teams enable row level security;
alter table public.incident_assignments enable row level security;

create policy "Allow read response_teams to all authenticated users"
  on public.response_teams for select
  to authenticated
  using (true);

create policy "Allow insert/update response_teams to authenticated users"
  on public.response_teams for all
  to authenticated
  using (true);

create policy "Allow read incident_assignments to all authenticated users"
  on public.incident_assignments for select
  to authenticated
  using (true);

create policy "Allow insert/update incident_assignments to authenticated users"
  on public.incident_assignments for all
  to authenticated
  using (true);
