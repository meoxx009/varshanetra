-- Migration: 20260912000007_create_notifications.sql
-- Description: Create notifications table for in-app operational dispatch & telemetry events (VARSHANETRA-21)

-- 1. Create notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('ALERT_ISSUED', 'INCIDENT_ASSIGNED', 'RESPONSE_TEAM_ASSIGNMENT', 'NEW_FIELD_REPORT', 'CRITICAL_DATA_SOURCE_FAILURE')),
  title text not null,
  message text not null,
  severity text not null default 'NORMAL' check (severity in ('NORMAL', 'ADVISORY', 'ALERT', 'CRITICAL')),
  deep_link text not null,
  related_id text,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes for efficient querying & filtering
create index if not exists idx_notifications_read on public.notifications(read);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_event_type on public.notifications(event_type);

-- 3. Automatic updated_at trigger
create or replace trigger set_notifications_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

-- 4. Row Level Security (RLS)
alter table public.notifications enable row level security;

create policy "Allow read notifications to all authenticated users"
  on public.notifications for select
  to authenticated
  using (true);

create policy "Allow insert notifications to authenticated users"
  on public.notifications for insert
  to authenticated
  with check (true);

create policy "Allow update notifications to authenticated users"
  on public.notifications for update
  to authenticated
  using (true);

create policy "Allow delete notifications to authenticated users"
  on public.notifications for delete
  to authenticated
  using (true);
