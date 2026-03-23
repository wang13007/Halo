insert into public.projects (code, name, location, timezone, metadata)
values (
  'demo-campus',
  'Halo Demo Campus',
  'Shanghai',
  'Asia/Shanghai',
  '{"owner":"Halo","mode":"demo"}'::jsonb
)
on conflict (code) do update
set
  name = excluded.name,
  location = excluded.location,
  timezone = excluded.timezone,
  metadata = excluded.metadata;

with demo_project as (
  select id from public.projects where code = 'demo-campus'
)
insert into public.system_integrations (
  project_id,
  name,
  system_type,
  base_url,
  username,
  auth_type,
  status,
  metadata,
  last_synced_at
)
select
  demo_project.id,
  item.name,
  item.system_type,
  item.base_url,
  item.username,
  item.auth_type,
  item.status,
  item.metadata,
  timezone('utc', now())
from demo_project
cross join (
  values
    (
      'EMS System',
      'ems',
      'https://ems.example.com',
      'admin_ems',
      'token',
      'connected',
      '{"scope":"energy"}'::jsonb
    ),
    (
      'IBMS System',
      'ibms',
      'https://ibms.example.com',
      'admin_ibms',
      'token',
      'connected',
      '{"scope":"devices"}'::jsonb
    )
) as item(name, system_type, base_url, username, auth_type, status, metadata)
where not exists (
  select 1
  from public.system_integrations existing
  where existing.project_id = demo_project.id
    and existing.name = item.name
);

with demo_project as (
  select id from public.projects where code = 'demo-campus'
),
series as (
  select generate_series(
    date_trunc('hour', timezone('utc', now()) - interval '6 days'),
    date_trunc('hour', timezone('utc', now())),
    interval '4 hours'
  ) as metric_at
),
sources as (
  select *
  from (
    values
      ('electricity', 'hvac', 320.0, 0.92, 0.79),
      ('electricity', 'lighting', 210.0, 0.92, 0.79),
      ('electricity', 'plugs', 185.0, 0.92, 0.79),
      ('electricity', 'special', 95.0, 0.92, 0.79)
  ) as source_map(energy_type, source, base_usage, unit_cost, unit_carbon)
)
insert into public.energy_metrics (
  project_id,
  metric_at,
  energy_type,
  source,
  usage_kwh,
  cost_amount,
  carbon_kg,
  metadata
)
select
  demo_project.id,
  series.metric_at,
  sources.energy_type,
  sources.source,
  round(
    (
      sources.base_usage
      + ((extract(hour from series.metric_at)::numeric / 24.0) * 45.0)
      + ((extract(dow from series.metric_at)::numeric + 1) * 5.0)
    )::numeric,
    2
  ),
  round(
    (
      (
        sources.base_usage
        + ((extract(hour from series.metric_at)::numeric / 24.0) * 45.0)
        + ((extract(dow from series.metric_at)::numeric + 1) * 5.0)
      ) * sources.unit_cost
    )::numeric,
    2
  ),
  round(
    (
      (
        sources.base_usage
        + ((extract(hour from series.metric_at)::numeric / 24.0) * 45.0)
        + ((extract(dow from series.metric_at)::numeric + 1) * 5.0)
      ) * sources.unit_carbon
    )::numeric,
    2
  ),
  jsonb_build_object('seeded', true)
from demo_project
cross join series
cross join sources
on conflict (project_id, metric_at, energy_type, source) do update
set
  usage_kwh = excluded.usage_kwh,
  cost_amount = excluded.cost_amount,
  carbon_kg = excluded.carbon_kg,
  metadata = excluded.metadata;

with demo_project as (
  select id from public.projects where code = 'demo-campus'
)
insert into public.analysis_reports (
  project_id,
  title,
  summary,
  report_date,
  status,
  file_url,
  payload
)
select
  demo_project.id,
  item.title,
  item.summary,
  item.report_date,
  item.status,
  item.file_url,
  item.payload
from demo_project
cross join (
  values
    (
      'Weekly Energy Analysis',
      'The HVAC load remains the main contributor. Nighttime usage improved by 8.5% week over week.',
      current_date,
      'generated',
      null,
      '{"type":"weekly"}'::jsonb
    ),
    (
      'Monthly Cost Review',
      'Electricity costs are trending slightly down after lighting optimization.',
      current_date - 3,
      'generated',
      null,
      '{"type":"monthly"}'::jsonb
    )
) as item(title, summary, report_date, status, file_url, payload)
where not exists (
  select 1
  from public.analysis_reports existing
  where existing.project_id = demo_project.id
    and existing.title = item.title
    and existing.report_date = item.report_date
);
