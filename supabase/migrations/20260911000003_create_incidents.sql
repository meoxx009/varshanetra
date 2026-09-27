-- ==============================================================================
-- VarshaNetra Database Migration: 20260911000003_create_incidents.sql
-- Table: public.incidents and public.incident_audit_logs
-- Security: Row-Level Security (RLS) enabled for authenticated officers
-- ==============================================================================

-- 1. Create incidents table
create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  incident_number text unique not null,
  type text not null check (type in (
    'Flooding',
    'Urban Waterlogging',
    'Road Block',
    'Rescue Required',
    'Medical Emergency',
    'Infrastructure Damage',
    'Other'
  )),
  title text not null,
  description text not null,
  severity text not null check (severity in ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  latitude double precision not null check (latitude >= -90.0 and latitude <= 90.0),
  longitude double precision not null check (longitude >= -180.0 and longitude <= 180.0),
  location_name text not null,
  status text not null default 'OPEN' check (status in (
    'OPEN',
    'ACKNOWLEDGED',
    'RESPONDING',
    'RESOLVED',
    'CLOSED'
  )),
  created_by uuid references auth.users(id) on delete set null,
  reporter_name text default 'Citizen Distress / Field Observer',
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create incident audit logs table
create table if not exists public.incident_audit_logs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changer_name text default 'Command Officer',
  notes text,
  created_at timestamptz not null default now()
);

-- 3. Trigger for automatically updating updated_at timestamp on incidents
create or replace function public.handle_incidents_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_incidents_updated_at on public.incidents;
create trigger set_incidents_updated_at
  before update on public.incidents
  for each row
  execute function public.handle_incidents_updated_at();

-- 4. Indexes for rapid spatial and status lookups
create index if not exists idx_incidents_status on public.incidents (status);
create index if not exists idx_incidents_severity on public.incidents (severity);
create index if not exists idx_incidents_type on public.incidents (type);
create index if not exists idx_incidents_coords on public.incidents (latitude, longitude);
create index if not exists idx_incidents_created_at on public.incidents (created_at desc);
create index if not exists idx_incident_audit_logs_incident_id on public.incident_audit_logs (incident_id);

-- 5. Enable Row-Level Security (RLS)
alter table public.incidents enable row level security;
alter table public.incident_audit_logs enable row level security;

-- 6. RLS Policies: Authenticated access for incident dispatchers
create policy "Authenticated users can select incidents"
  on public.incidents
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert incidents"
  on public.incidents
  for insert
  to authenticated
  with check (auth.uid() = created_by or created_by is null);

create policy "Authenticated users can update incidents"
  on public.incidents
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete draft or open incidents"
  on public.incidents
  for delete
  to authenticated
  using (status = 'OPEN' and (auth.uid() = created_by or created_by is null));

create policy "Authenticated users can select incident audit logs"
  on public.incident_audit_logs
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert incident audit logs"
  on public.incident_audit_logs
  for insert
  to authenticated
  with check (true);

comment on table public.incidents is 'District emergency distress reports and municipal field incidents.';
comment on table public.incident_audit_logs is 'Audit trail of incident dispatch lifecycle transitions.';
