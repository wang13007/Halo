create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  timezone text not null default 'Asia/Shanghai',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.system_integrations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  system_type text not null,
  base_url text not null,
  username text,
  auth_type text not null default 'token',
  status text not null default 'connected',
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.energy_metrics (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  metric_at timestamptz not null,
  energy_type text not null default 'electricity',
  source text not null,
  usage_kwh numeric(12, 2) not null,
  cost_amount numeric(12, 2) not null default 0,
  carbon_kg numeric(12, 2) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, metric_at, energy_type, source)
);

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  summary text not null default '',
  report_date date not null default current_date,
  status text not null default 'generated',
  file_url text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace view public.energy_daily_summary as
select
  project_id,
  date_trunc('day', metric_at) as metric_day,
  sum(usage_kwh) as total_usage_kwh,
  sum(cost_amount) as total_cost_amount,
  sum(carbon_kg) as total_carbon_kg
from public.energy_metrics
group by project_id, date_trunc('day', metric_at);

create or replace view public.energy_source_breakdown as
select
  project_id,
  source,
  sum(usage_kwh) as total_usage_kwh,
  sum(cost_amount) as total_cost_amount,
  sum(carbon_kg) as total_carbon_kg
from public.energy_metrics
group by project_id, source;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists system_integrations_set_updated_at on public.system_integrations;
create trigger system_integrations_set_updated_at
before update on public.system_integrations
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;
alter table public.system_integrations enable row level security;
alter table public.energy_metrics enable row level security;
alter table public.analysis_reports enable row level security;
