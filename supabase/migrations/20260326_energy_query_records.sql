create table if not exists public.energy_query_records (
  id bigserial primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  project_code text not null,
  project_name text not null,
  org_id text not null,
  organization_path text not null,
  energy_path text not null,
  meter_name text not null,
  meter_number text not null,
  sample_date date not null,
  granularity text not null default 'day',
  meter_type text not null default 'electricity',
  usage_kwh numeric(14, 2) not null,
  source_file text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (project_id, meter_number, sample_date, granularity, meter_type)
);

create index if not exists energy_query_records_project_sample_idx
  on public.energy_query_records (project_id, sample_date desc);

create index if not exists energy_query_records_org_sample_idx
  on public.energy_query_records (org_id, sample_date desc);

create or replace view public.energy_query_projects as
select
  project_id,
  project_code,
  project_name,
  org_id,
  organization_path,
  count(*) as record_count,
  min(sample_date) as first_sample_date,
  max(sample_date) as last_sample_date
from public.energy_query_records
group by
  project_id,
  project_code,
  project_name,
  org_id,
  organization_path;

alter table public.energy_query_records enable row level security;
