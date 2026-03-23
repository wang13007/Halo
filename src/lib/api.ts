const trimTrailingSlash = (value: string) => value.replace(/\/$/, '');

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = trimTrailingSlash(
    String(import.meta.env.VITE_API_BASE_URL ?? '').trim(),
  );

  if (!configuredBaseUrl) {
    return '';
  }

  if (typeof window === 'undefined') {
    return configuredBaseUrl;
  }

  const currentHost = window.location.hostname;
  const isLocalPage = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const isLoopbackApi =
    configuredBaseUrl === 'http://localhost:8787' ||
    configuredBaseUrl === 'http://127.0.0.1:8787';

  // Avoid baking localhost API into production bundles or file:// previews.
  if (isLoopbackApi && !import.meta.env.DEV) {
    return '';
  }

  if (isLoopbackApi && !isLocalPage) {
    return '';
  }

  return configuredBaseUrl;
};

const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path: string) => {
  if (typeof window !== 'undefined') {
    const isFileProtocol = window.location.protocol === 'file:';
    if (isFileProtocol && !API_BASE_URL) {
      throw new Error(
        'Halo API is unavailable in file preview mode. Start the backend or configure VITE_API_BASE_URL.',
      );
    }
  }

  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export type HealthResponse = {
  database: {
    configured: boolean;
    projectCount?: number;
    reachable: boolean;
    schemaReady?: boolean;
  };
  error?: string;
  serverTime: string;
  status: 'degraded' | 'error' | 'ok';
};

export type Project = {
  code: string;
  id: string;
  location: string | null;
  name: string;
  timezone: string | null;
};

export type Integration = {
  auth_type: string;
  base_url: string;
  created_at: string;
  id: string;
  last_synced_at: string | null;
  metadata: Record<string, unknown>;
  name: string;
  status: string;
  system_type: string;
  username: string | null;
};

export type EnergyAnalysisResponse = {
  breakdown: Array<{ name: string; value: number }>;
  chart: Array<{
    hvac: number;
    lighting: number;
    other: number;
    plugs: number;
    time: string;
  }>;
  lastUpdatedAt: string | null;
  project: Project;
  stats: {
    carbonKg: number;
    carbonTrendPercent: number;
    costTrendPercent: number;
    estimatedCostAmount: number;
    monthTrendPercent: number;
    monthUsageKwh: number;
    todayTrendPercent: number;
    todayUsageKwh: number;
  };
};

export type Report = {
  created_at: string;
  file_url: string | null;
  id: string;
  report_date: string;
  status: string;
  summary: string;
  title: string;
};

export type CreateIntegrationPayload = {
  authType?: string;
  baseUrl: string;
  metadata?: Record<string, unknown>;
  name: string;
  projectCode?: string;
  status?: string;
  systemType: string;
  username?: string;
};

export const api = {
  createIntegration: (payload: CreateIntegrationPayload) =>
    request<{ integration: Integration }>('/api/integrations', {
      body: JSON.stringify(payload),
      method: 'POST',
    }),
  getEnergyAnalysis: (projectCode?: string) =>
    request<EnergyAnalysisResponse>(
      `/api/energy/analysis${
        projectCode ? `?projectCode=${encodeURIComponent(projectCode)}` : ''
      }`,
    ),
  getHealth: () => request<HealthResponse>('/api/health'),
  getIntegrations: (projectCode?: string) =>
    request<{ integrations: Integration[] }>(
      `/api/integrations${
        projectCode ? `?projectCode=${encodeURIComponent(projectCode)}` : ''
      }`,
    ),
  getProjects: () => request<{ projects: Project[] }>('/api/projects'),
  getReports: (projectCode?: string) =>
    request<{ reports: Report[] }>(
      `/api/reports${
        projectCode ? `?projectCode=${encodeURIComponent(projectCode)}` : ''
      }`,
    ),
};
