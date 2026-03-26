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

const apiHtmlFallbackMessage =
  '当前站点返回了 HTML 页面而不是接口 JSON，说明 /api 后端未接通。请启动本地服务端，或为部署环境配置 VITE_API_BASE_URL。';

const looksLikeHtmlDocument = (value: string) =>
  /^\s*<!doctype html/i.test(value) || /^\s*<html/i.test(value);

const isJsonContentType = (contentType: string) =>
  contentType.includes('application/json') || contentType.includes('+json');

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

export const readApiBody = async <T>(response: Response) => {
  const rawText = await response.text();
  const contentType = response.headers.get('content-type') ?? '';

  if (!rawText) {
    return null as T | null;
  }

  if (looksLikeHtmlDocument(rawText)) {
    throw new Error(apiHtmlFallbackMessage);
  }

  if (isJsonContentType(contentType)) {
    try {
      return JSON.parse(rawText) as T;
    } catch {
      throw new Error('接口返回的 JSON 格式无效，请检查后端返回内容。');
    }
  }

  try {
    return JSON.parse(rawText) as T;
  } catch {
    return rawText as T;
  }
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  const payload = (await readApiBody<unknown>(response).catch((error) => {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('接口返回内容无法解析。');
  })) as { error?: string } | string | null;

  if (!response.ok) {
    if (payload && typeof payload === 'object' && 'error' in payload && payload.error) {
      throw new Error(String(payload.error));
    }

    if (typeof payload === 'string' && payload.trim()) {
      throw new Error(payload);
    }

    throw new Error(`Request failed: ${response.status}`);
  }

  if (payload === null) {
    throw new Error('接口返回了空响应。');
  }

  if (typeof payload === 'string') {
    throw new Error('接口未返回 JSON 数据，请检查后端接口。');
  }

  return payload as T;
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

export type AiChatPayload = {
  action?: string;
  context?: Record<string, unknown>;
  dataPreview?: unknown;
  message: string;
  requestPayload?: Record<string, unknown> | null;
  upstreamStatus?: number | null;
};

export type AiChatResponse = {
  model: string;
  reply: string;
  thinking: string;
  usedFallback: boolean;
};

export type ChatSessionMessage = {
  content: string;
  createdAt?: string;
  id: string;
  role: 'assistant' | 'user';
  thinking?: string;
};

export type ChatSession = {
  created_at: string;
  id: string;
  last_message_at: string;
  metadata: Record<string, unknown>;
  messages: ChatSessionMessage[];
  status: string;
  summary: string;
  title: string;
  updated_at: string;
};

export type ChatSessionSummary = Omit<ChatSession, 'messages'>;

export type UpsertChatSessionPayload = {
  messages: ChatSessionMessage[];
  metadata?: Record<string, unknown>;
  status?: string;
  summary?: string;
  title?: string;
};

export type GenerateArtifactPayload = {
  artifactType: 'app' | 'widget';
  goal?: string;
  name: string;
  prompt: string;
  size?: string;
};

export type GenerateArtifactResponse = {
  badge: string;
  description: string;
  items: string[];
  model: string;
  summary: string;
  title: string;
  usedFallback: boolean;
};

export type EnergyQuickProject = {
  channel: string;
  name: string;
  orgId: string;
};

export const api = {
  chatWithAi: (payload: AiChatPayload, signal?: AbortSignal) =>
    request<AiChatResponse>('/api/ai/chat', {
      body: JSON.stringify(payload),
      method: 'POST',
      signal,
    }),
  createChatSession: (payload: UpsertChatSessionPayload, signal?: AbortSignal) =>
    request<{ session: ChatSession }>('/api/chat/sessions', {
      body: JSON.stringify(payload),
      method: 'POST',
      signal,
    }),
  createIntegration: (payload: CreateIntegrationPayload) =>
    request<{ integration: Integration }>('/api/integrations', {
      body: JSON.stringify(payload),
      method: 'POST',
    }),
  generateArtifact: (payload: GenerateArtifactPayload, signal?: AbortSignal) =>
    request<GenerateArtifactResponse>('/api/ai/coding', {
      body: JSON.stringify(payload),
      method: 'POST',
      signal,
    }),
  getEnergyAnalysis: (projectCode?: string) =>
    request<EnergyAnalysisResponse>(
      `/api/energy/analysis${
        projectCode ? `?projectCode=${encodeURIComponent(projectCode)}` : ''
      }`,
    ),
  getEnergyQuickProjects: (signal?: AbortSignal) =>
    request<{ projects: EnergyQuickProject[] }>('/api/energy/quick-projects', { signal }),
  getHealth: () => request<HealthResponse>('/api/health'),
  getChatSession: (sessionId: string, signal?: AbortSignal) =>
    request<{ session: ChatSession }>(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}`,
      { signal },
    ),
  getChatSessions: (signal?: AbortSignal) =>
    request<{ sessions: ChatSessionSummary[] }>('/api/chat/sessions', { signal }),
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
  updateChatSession: (
    sessionId: string,
    payload: UpsertChatSessionPayload,
    signal?: AbortSignal,
  ) =>
    request<{ session: ChatSession }>(
      `/api/chat/sessions/${encodeURIComponent(sessionId)}`,
      {
        body: JSON.stringify(payload),
        method: 'PATCH',
        signal,
      },
    ),
};
