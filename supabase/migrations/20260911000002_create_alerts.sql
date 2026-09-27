-- ==============================================================================
-- VarshaNetra Database Migration: 20260911000002_create_alerts.sql
-- Table: public.alerts and public.alert_audit_logs
-- Security: Row-Level Security (RLS) enabled for authenticated officers
-- ==============================================================================

-- 1. Create alerts table
create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null check (severity in ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  area_name text not null,
  description text not null,
  recommended_action text not null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'ISSUED', 'CANCELLED')),
  created_by uuid references auth.users(id) on delete set null,
  creator_name text default 'District EOC Officer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create alert audit logs table for tracking lifecycle transitions
create table if not exists public.alert_audit_logs (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changer_name text default 'District Authority',
  notes text,
  created_at timestamptz not null default now()
);

-- 3. Trigger for automatically updating updated_at timestamp on alerts
create or replace function public.handle_alerts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at
  before update on public.alerts
  for each row
  execute function public.handle_alerts_updated_at();

-- 4. Indexes for rapid filtering and queries
create index if not exists idx_alerts_status on public.alerts (status);
create index if not exists idx_alerts_severity on public.alerts (severity);
create index if not exists idx_alerts_area_name on public.alerts (area_name);
create index if not exists idx_alerts_created_at on public.alerts (created_at desc);
create index if not exists idx_alert_audit_logs_alert_id on public.alert_audit_logs (alert_id);

-- 5. Enable Row-Level Security (RLS)
alter table public.alerts enable row level security;
alter table public.alert_audit_logs enable row level security;

-- 6. RLS Policies: Authenticated access for prototype command officers
create policy "Authenticated users can select alerts"
  on public.alerts
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert alerts"
  on public.alerts
  for insert
  to authenticated
  with check (auth.uid() = created_by or created_by is null);

create policy "Authenticated users can update alerts"
  on public.alerts
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete draft alerts"
  on public.alerts
  for delete
  to authenticated
  using (status = 'DRAFT' and (auth.uid() = created_by or created_by is null));

create policy "Authenticated users can select audit logs"
  on public.alert_audit_logs
  for select
  to authenticated
  using (true);

create policy "Authenticated users can insert audit logs"
  on public.alert_audit_logs
  for insert
  to authenticated
  with check (true);

-- 7. Documenting compliance with Indian Emergency Command requirements
comment on table public.alerts is 'Statutory district early warning notifications for flood risk and emergency civil response.';
comment on table public.alert_audit_logs is 'Immutable audit log tracking all status changes and reviews of district alerts.';
