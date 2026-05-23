-- ============================================================
-- CrowdIQ – Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES (linked to auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  org         text,
  role        text default 'viewer',
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, org, role)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'org',
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. INCIDENTS
create table if not exists public.incidents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  zone        text,
  type        text,
  severity    text default 'medium',
  status      text default 'open',
  description text,
  reported_by uuid references auth.users(id),
  created_at  timestamptz default now(),
  resolved_at timestamptz
);

alter table public.incidents enable row level security;

create policy "Authenticated users can read incidents"
  on public.incidents for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert incidents"
  on public.incidents for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update incidents"
  on public.incidents for update using (auth.role() = 'authenticated');

-- 3. ALERTS
create table if not exists public.alerts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  zone        text,
  type        text default 'warning',
  description text,
  resolved    boolean default false,
  created_at  timestamptz default now()
);

alter table public.alerts enable row level security;

create policy "Authenticated users can read alerts"
  on public.alerts for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert alerts"
  on public.alerts for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update alerts"
  on public.alerts for update using (auth.role() = 'authenticated');

-- 4. STAFF
create table if not exists public.staff (
  id          text primary key,
  name        text not null,
  role        text,
  zone        text,
  status      text default 'active',
  phone       text,
  avatar      text,
  created_at  timestamptz default now()
);

alter table public.staff enable row level security;

create policy "Authenticated users can read staff"
  on public.staff for select using (auth.role() = 'authenticated');

-- 5. DISPATCH LOG
create table if not exists public.dispatch_log (
  id          uuid primary key default gen_random_uuid(),
  staff_id    text references public.staff(id),
  message     text,
  sent_by     uuid references auth.users(id),
  created_at  timestamptz default now()
);

alter table public.dispatch_log enable row level security;

create policy "Authenticated users can read dispatch log"
  on public.dispatch_log for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert dispatch"
  on public.dispatch_log for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- Sample Data – Optional seed
-- ============================================================
insert into public.alerts (title, zone, type, description) values
  ('Overcrowding Detected', 'Main Stage', 'critical', 'Density exceeds 90% capacity'),
  ('Exit Bottleneck', 'Gate A', 'warning', 'Slow crowd movement detected'),
  ('Medical Standby', 'Food Court', 'info', 'Preventive measure active')
on conflict do nothing;
