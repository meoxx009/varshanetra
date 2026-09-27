-- Migration: 20260912000005_create_resources_and_shelters.sql
-- Description: Create resources, shelters, and resource_transactions tables (VARSHANETRA-17)

-- 1. Create resources table
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Boat', 'Ambulance', 'Rescue Vehicle', 'Medical Kit', 'Food Packet', 'Water', 'Generator', 'Life Jacket', 'Other')),
  total_quantity integer not null check (total_quantity >= 0),
  available_quantity integer not null check (available_quantity >= 0),
  deployed_quantity integer not null check (deployed_quantity >= 0),
  location text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_resource_quantities check (available_quantity + deployed_quantity = total_quantity)
);

-- 2. Create shelters table
create table if not exists public.shelters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null check (latitude >= 6.0 and latitude <= 38.0),
  longitude double precision not null check (longitude >= 68.0 and longitude <= 98.0),
  capacity integer not null check (capacity > 0),
  current_occupancy integer not null default 0 check (current_occupancy >= 0),
  water_available boolean not null default true,
  food_available boolean not null default true,
  medical_support boolean not null default false,
  electricity boolean not null default true,
  contact_information text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'FULL', 'STANDBY', 'CLOSED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create resource_transactions table
create table if not exists public.resource_transactions (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  action text not null check (action in ('DEPLOY', 'RETURN', 'ADJUST_TOTAL')),
  quantity integer not null check (quantity > 0),
  destination text,
  incident_id uuid references public.incidents(id) on delete set null,
  transacted_by text,
  notes text,
  created_at timestamptz not null default now()
);

-- 4. Indexes for rapid lookups
create index if not exists idx_resources_type on public.resources(type);
create index if not exists idx_resources_location on public.resources(location);
create index if not exists idx_shelters_status on public.shelters(status);
create index if not exists idx_resource_transactions_resource on public.resource_transactions(resource_id);

-- 5. Automatic updated_at triggers
create or replace trigger set_resources_updated_at
before update on public.resources
for each row
execute function public.set_updated_at();

create or replace trigger set_shelters_updated_at
before update on public.shelters
for each row
execute function public.set_updated_at();

-- 6. Row Level Security (RLS)
alter table public.resources enable row level security;
alter table public.shelters enable row level security;
alter table public.resource_transactions enable row level security;

create policy "Allow read resources to all authenticated users"
  on public.resources for select
  to authenticated
  using (true);

create policy "Allow insert resources to authenticated users"
  on public.resources for insert
  to authenticated
  with check (true);

create policy "Allow update resources to authenticated users"
  on public.resources for update
  to authenticated
  using (true);

create policy "Allow delete resources to authenticated users"
  on public.resources for delete
  to authenticated
  using (true);

create policy "Allow read shelters to all authenticated users"
  on public.shelters for select
  to authenticated
  using (true);

create policy "Allow insert shelters to authenticated users"
  on public.shelters for insert
  to authenticated
  with check (true);

create policy "Allow update shelters to authenticated users"
  on public.shelters for update
  to authenticated
  using (true);

create policy "Allow delete shelters to authenticated users"
  on public.shelters for delete
  to authenticated
  using (true);

create policy "Allow read resource_transactions to all authenticated users"
  on public.resource_transactions for select
  to authenticated
  using (true);

create policy "Allow insert resource_transactions to authenticated users"
  on public.resource_transactions for insert
  to authenticated
  with check (true);
