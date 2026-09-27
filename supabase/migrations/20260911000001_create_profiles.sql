-- ==============================================================================
-- VarshaNetra Database Migration: 20260911000001_create_profiles.sql
-- Table: public.profiles linked to auth.users
-- Security: Row-Level Security (RLS) enabled
-- ==============================================================================

-- 1. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  government_id text unique not null,
  phone text,
  role text not null default 'OFFICER',
  designation text,
  department text,
  state text default 'Maharashtra',
  district text default 'Pune',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast Government ID normalized lookups
create index if not exists idx_profiles_government_id on public.profiles (government_id);

-- 2. Trigger for updating updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- 3. Enable Row-Level Security (RLS)
alter table public.profiles enable row level security;

-- 4. RLS Policies: strict user isolation
-- Users can read only their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Users can update only their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

-- Users can insert their own profile during registration
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- 5. Comments documenting compliance
comment on table public.profiles is 'Officer user profiles for VarshaNetra district emergency command. Government ID is an unverified account identifier.';
comment on column public.profiles.government_id is 'Normalized self-declared Government ID. Unique per account. Unverified by default.';
