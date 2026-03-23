import { format } from 'date-fns';
import { getSupabase } from '../lib/supabase.js';

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  timezone: string | null;
};

type EnergyMetricRow = {
  carbon_kg: number | null;
  cost_amount: number | null;
  metric_at: string;
  source: string;
  usage_kwh: number | null;
};

type IntegrationInput = {
  authType?: string;
  baseUrl: string;
  metadata?: Record<string, unknown>;
  name: string;
  projectCode?: string;
  status?: string;
  systemType: string;
  username?: string;
};

type MetricInput = {
  carbonKg?: number;
  costAmount?: number;
  energyType: string;
  metadata?: Record<string, unknown>;
  metricAt: string;
  projectCode?: string;
  source: string;
  usageKwh: number;
};

type ReportInput = {
  fileUrl?: string;
  payload?: Record<string, unknown>;
  projectCode?: string;
  reportDate?: string;
  status?: string;
  summary?: string;
  title: string;
};

const sumBy = <T>(items: T[], selector: (item: T) => number | null | undefined) =>
  items.reduce((total, item) => total + (selector(item) ?? 0), 0);

const percentChange = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const startOfLocalDay = (date = new Date()) => {
  const local = new Date(date);
  local.setHours(0, 0, 0, 0);
  return local;
};

const startOfCurrentMonth = (date = new Date()) => {
  const local = new Date(date);
  local.setDate(1);
  local.setHours(0, 0, 0, 0);
  return local;
};

const startOfPreviousMonth = (date = new Date()) => {
  const local = startOfCurrentMonth(date);
  local.setMonth(local.getMonth() - 1);
  return local;
};

const endOfPreviousMonth = (date = new Date()) => {
  const local = startOfCurrentMonth(date);
  local.setMilliseconds(-1);
  return local;
};

export const listProjects = async () => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('projects')
    .select('id, code, name, location, timezone')
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const resolveProject = async (projectCode?: string) => {
  const supabase = getSupabase();
  const baseQuery = supabase
    .from('projects')
    .select('id, code, name, location, timezone')
    .limit(1);

  const { data, error } = projectCode
    ? await baseQuery.eq('code', projectCode).maybeSingle()
    : await baseQuery.order('created_at', { ascending: true }).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      'No project data found. Run `npm run db:setup` to initialize your Supabase tables and demo data.',
    );
  }

  return data as ProjectRow;
};

export const getEnergyAnalysis = async (projectCode?: string) => {
  const supabase = getSupabase();
  const project = await resolveProject(projectCode);

  const now = new Date();
  const todayStart = startOfLocalDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const currentMonthStart = startOfCurrentMonth(now);
  const previousMonthStart = startOfPreviousMonth(now);
  const previousMonthEnd = endOfPreviousMonth(now);

  const [todayResult, yesterdayResult, currentMonthResult, previousMonthResult] =
    await Promise.all([
      supabase
        .from('energy_metrics')
        .select('metric_at, source, usage_kwh, cost_amount, carbon_kg')
        .eq('project_id', project.id)
        .gte('metric_at', todayStart.toISOString())
        .order('metric_at', { ascending: true }),
      supabase
        .from('energy_metrics')
        .select('metric_at, source, usage_kwh, cost_amount, carbon_kg')
        .eq('project_id', project.id)
        .gte('metric_at', yesterdayStart.toISOString())
        .lt('metric_at', todayStart.toISOString())
        .order('metric_at', { ascending: true }),
      supabase
        .from('energy_metrics')
        .select('metric_at, source, usage_kwh, cost_amount, carbon_kg')
        .eq('project_id', project.id)
        .gte('metric_at', currentMonthStart.toISOString())
        .order('metric_at', { ascending: true }),
      supabase
        .from('energy_metrics')
        .select('metric_at, source, usage_kwh, cost_amount, carbon_kg')
        .eq('project_id', project.id)
        .gte('metric_at', previousMonthStart.toISOString())
        .lte('metric_at', previousMonthEnd.toISOString())
        .order('metric_at', { ascending: true }),
    ]);

  for (const result of [
    todayResult,
    yesterdayResult,
    currentMonthResult,
    previousMonthResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const todayMetrics = (todayResult.data ?? []) as EnergyMetricRow[];
  const yesterdayMetrics = (yesterdayResult.data ?? []) as EnergyMetricRow[];
  const currentMonthMetrics = (currentMonthResult.data ?? []) as EnergyMetricRow[];
  const previousMonthMetrics = (previousMonthResult.data ?? []) as EnergyMetricRow[];

  const todayUsage = sumBy(todayMetrics, (metric) => metric.usage_kwh);
  const yesterdayUsage = sumBy(yesterdayMetrics, (metric) => metric.usage_kwh);
  const monthUsage = sumBy(currentMonthMetrics, (metric) => metric.usage_kwh);
  const previousMonthUsage = sumBy(previousMonthMetrics, (metric) => metric.usage_kwh);
  const monthCost = sumBy(currentMonthMetrics, (metric) => metric.cost_amount);
  const previousMonthCost = sumBy(previousMonthMetrics, (metric) => metric.cost_amount);
  const monthCarbon = sumBy(currentMonthMetrics, (metric) => metric.carbon_kg);
  const previousMonthCarbon = sumBy(previousMonthMetrics, (metric) => metric.carbon_kg);

  const chartByTime = new Map<
    string,
    { hvac: number; lighting: number; other: number; plugs: number; time: string }
  >();

  todayMetrics.forEach((metric) => {
    const label = format(new Date(metric.metric_at), 'HH:mm');
    const bucket =
      chartByTime.get(label) ?? {
        hvac: 0,
        lighting: 0,
        other: 0,
        plugs: 0,
        time: label,
      };

    const usage = metric.usage_kwh ?? 0;

    if (metric.source === 'hvac') {
      bucket.hvac += usage;
    } else if (metric.source === 'lighting') {
      bucket.lighting += usage;
    } else if (metric.source === 'plugs') {
      bucket.plugs += usage;
    } else {
      bucket.other += usage;
    }

    chartByTime.set(label, bucket);
  });

  const breakdownBySource = new Map<string, number>();
  currentMonthMetrics.forEach((metric) => {
    breakdownBySource.set(
      metric.source,
      (breakdownBySource.get(metric.source) ?? 0) + (metric.usage_kwh ?? 0),
    );
  });

  return {
    breakdown: Array.from(breakdownBySource.entries()).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    })),
    chart: Array.from(chartByTime.values()),
    lastUpdatedAt: currentMonthMetrics.at(-1)?.metric_at ?? null,
    project,
    stats: {
      carbonKg: Number(monthCarbon.toFixed(2)),
      carbonTrendPercent: percentChange(monthCarbon, previousMonthCarbon),
      costTrendPercent: percentChange(monthCost, previousMonthCost),
      estimatedCostAmount: Number(monthCost.toFixed(2)),
      monthTrendPercent: percentChange(monthUsage, previousMonthUsage),
      monthUsageKwh: Number(monthUsage.toFixed(2)),
      todayTrendPercent: percentChange(todayUsage, yesterdayUsage),
      todayUsageKwh: Number(todayUsage.toFixed(2)),
    },
  };
};

export const createEnergyMetric = async (input: MetricInput) => {
  const supabase = getSupabase();
  const project = await resolveProject(input.projectCode);

  const { data, error } = await supabase
    .from('energy_metrics')
    .insert({
      carbon_kg: input.carbonKg ?? null,
      cost_amount: input.costAmount ?? null,
      energy_type: input.energyType,
      metadata: input.metadata ?? {},
      metric_at: input.metricAt,
      project_id: project.id,
      source: input.source,
      usage_kwh: input.usageKwh,
    })
    .select('id, metric_at, energy_type, source, usage_kwh, cost_amount, carbon_kg')
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listIntegrations = async (projectCode?: string) => {
  const supabase = getSupabase();
  const project = projectCode ? await resolveProject(projectCode) : null;

  let query = supabase
    .from('system_integrations')
    .select(
      'id, name, system_type, base_url, username, auth_type, status, last_synced_at, metadata, created_at',
    )
    .order('created_at', { ascending: true });

  if (project) {
    query = query.eq('project_id', project.id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const createIntegration = async (input: IntegrationInput) => {
  const supabase = getSupabase();
  const project = await resolveProject(input.projectCode);

  const { data, error } = await supabase
    .from('system_integrations')
    .insert({
      auth_type: input.authType ?? 'token',
      base_url: input.baseUrl,
      metadata: input.metadata ?? {},
      name: input.name,
      project_id: project.id,
      status: input.status ?? 'connected',
      system_type: input.systemType,
      username: input.username ?? null,
    })
    .select(
      'id, name, system_type, base_url, username, auth_type, status, last_synced_at, metadata, created_at',
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const listReports = async (projectCode?: string) => {
  const supabase = getSupabase();
  const project = await resolveProject(projectCode);

  const { data, error } = await supabase
    .from('analysis_reports')
    .select('id, title, summary, report_date, status, file_url, created_at')
    .eq('project_id', project.id)
    .order('report_date', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const createReport = async (input: ReportInput) => {
  const supabase = getSupabase();
  const project = await resolveProject(input.projectCode);

  const { data, error } = await supabase
    .from('analysis_reports')
    .insert({
      file_url: input.fileUrl ?? null,
      payload: input.payload ?? {},
      project_id: project.id,
      report_date: input.reportDate ?? format(new Date(), 'yyyy-MM-dd'),
      status: input.status ?? 'generated',
      summary: input.summary ?? '',
      title: input.title,
    })
    .select('id, title, summary, report_date, status, file_url, created_at')
    .single();

  if (error) {
    throw error;
  }

  return data;
};
