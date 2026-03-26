import React, { useEffect, useMemo, useState } from 'react';
import { Database, Server, Sparkles, X, Zap } from 'lucide-react';
import { api, type HealthResponse, type Integration, type Project, type Report } from '../lib/api';

type RuntimeState = {
  error: string;
  health: HealthResponse | null;
  integrations: Integration[];
  isLoading: boolean;
  projects: Project[];
  reports: Report[];
};

type SystemCard = {
  accent: string;
  apiList: Array<{ desc: string; method: string; path: string }>;
  description: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  id: string;
  integrationType?: string;
  name: string;
  url: string;
};

type RequestRecord = {
  channel: string;
  id: string;
  label: string;
  meta: string;
  status: string;
  time: string;
};

const toTimestamp = (value: string | null) => {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const formatRecordTime = (value: string | null) => {
  if (!value) {
    return '未记录';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '未记录';
  }

  return date.toLocaleString('zh-CN', {
    hour12: false,
  });
};

const getStatusPillClass = (status: string) => {
  const normalizedStatus = status.trim().toLowerCase();

  if (
    normalizedStatus.includes('fail') ||
    normalizedStatus.includes('error') ||
    normalizedStatus.includes('offline')
  ) {
    return 'bg-rose-500/10 text-rose-600';
  }

  if (
    normalizedStatus.includes('pending') ||
    normalizedStatus.includes('wait') ||
    normalizedStatus.includes('draft')
  ) {
    return 'bg-amber-500/10 text-amber-600';
  }

  return 'bg-blue-500/10 text-blue-600';
};

const systemCards: SystemCard[] = [
  {
    accent: 'from-blue-600/15 via-cyan-500/10 to-transparent',
    apiList: [
      { desc: 'Web 端能耗统计分析', method: 'GET', path: '/api/energy/analysis' },
      { desc: '本地 queryReport 代理接口', method: 'POST', path: '/api/energy/query-report' },
      { desc: '写入能耗数据', method: 'POST', path: '/api/energy/metrics' },
    ],
    description: '承接能耗分析、趋势统计和报表查询。',
    detail: '前端能耗页与对话查询都会优先使用这里的 EMS 能力。',
    icon: Zap,
    id: 'ems',
    integrationType: 'ems',
    name: 'EMS 系统',
    url: 'https://odvrqlpffmnxmvtsajit.supabase.co',
  },
  {
    accent: 'from-violet-600/15 via-indigo-500/10 to-transparent',
    apiList: [
      { desc: '设备状态聚合', method: 'GET', path: '/api/integrations' },
      { desc: '系统接入信息读取', method: 'GET', path: '/api/projects' },
      { desc: '后端健康检查', method: 'GET', path: '/api/health' },
    ],
    description: '适合楼宇、设备与监控类系统的接入查看。',
    detail: '通过详情窗口集中查看接入记录、接口与状态信息。',
    icon: Server,
    id: 'ibms',
    integrationType: 'ibms',
    name: 'IBMS 系统',
    url: 'https://ibms.example.com',
  },
  {
    accent: 'from-emerald-600/15 via-teal-500/10 to-transparent',
    apiList: [
      { desc: '数据库连通性检查', method: 'GET', path: '/api/health' },
      { desc: '项目数据读取', method: 'GET', path: '/api/projects' },
      { desc: '报表数据读取', method: 'GET', path: '/api/reports' },
    ],
    description: '负责项目、报表、系统接入和能耗明细的持久化。',
    detail: '当前 API 已接入，Schema 是否可用取决于远端建表是否完成。',
    icon: Database,
    id: 'supabase',
    name: 'Supabase 数据层',
    url: 'https://odvrqlpffmnxmvtsajit.supabase.co',
  },
];

export const ConfigCenter = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    error: '',
    health: null,
    integrations: [],
    isLoading: false,
    projects: [],
    reports: [],
  });
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  const selectedSystem = useMemo(
    () => systemCards.find((system) => system.id === selectedSystemId) ?? null,
    [selectedSystemId],
  );

  useEffect(() => {
    if (!selectedSystem) {
      return;
    }

    let active = true;

    const loadRuntime = async () => {
      setRuntimeState((previous) => ({
        ...previous,
        error: '',
        isLoading: true,
      }));

      const [healthResult, integrationsResult, reportsResult, projectsResult] =
        await Promise.allSettled([
          api.getHealth(),
          api.getIntegrations(),
          api.getReports(),
          api.getProjects(),
        ]);

      if (!active) {
        return;
      }

      const errors: string[] = [];

      if (healthResult.status === 'rejected') {
        errors.push(
          healthResult.reason instanceof Error ? healthResult.reason.message : '健康检查读取失败',
        );
      }
      if (integrationsResult.status === 'rejected') {
        errors.push(
          integrationsResult.reason instanceof Error
            ? integrationsResult.reason.message
            : '接入状态读取失败',
        );
      }
      if (reportsResult.status === 'rejected') {
        errors.push(
          reportsResult.reason instanceof Error ? reportsResult.reason.message : '报表读取失败',
        );
      }
      if (projectsResult.status === 'rejected') {
        errors.push(
          projectsResult.reason instanceof Error ? projectsResult.reason.message : '项目读取失败',
        );
      }

      setRuntimeState({
        error: errors.join('；'),
        health: healthResult.status === 'fulfilled' ? healthResult.value : null,
        integrations:
          integrationsResult.status === 'fulfilled' ? integrationsResult.value.integrations : [],
        isLoading: false,
        projects: projectsResult.status === 'fulfilled' ? projectsResult.value.projects : [],
        reports: reportsResult.status === 'fulfilled' ? reportsResult.value.reports : [],
      });
    };

    void loadRuntime();

    return () => {
      active = false;
    };
  }, [selectedSystem]);

  const matchingIntegrations = useMemo(() => {
    if (!selectedSystem) {
      return [];
    }

    if (!selectedSystem.integrationType) {
      return runtimeState.integrations;
    }

    return runtimeState.integrations.filter(
      (integration) =>
        integration.system_type.toLowerCase() === selectedSystem.integrationType ||
        integration.name.toLowerCase().includes(selectedSystem.integrationType),
    );
  }, [runtimeState.integrations, selectedSystem]);

  const requestRecords = useMemo<RequestRecord[]>(() => {
    if (!selectedSystem) {
      return [];
    }

    if (selectedSystem.id === 'supabase') {
      return [...runtimeState.reports]
        .sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at))
        .slice(0, 6)
        .map((report) => ({
          channel: 'REPORT',
          id: report.id,
          label: report.title,
          meta: report.summary,
          status: report.status,
          time: formatRecordTime(report.created_at),
        }));
    }

    return [...matchingIntegrations]
      .sort(
        (left, right) =>
          toTimestamp(right.last_synced_at ?? right.created_at) -
          toTimestamp(left.last_synced_at ?? left.created_at),
      )
      .slice(0, 6)
      .map((integration) => ({
        channel: integration.auth_type ? integration.auth_type.toUpperCase() : 'SYNC',
        id: integration.id,
        label: integration.name,
        meta: integration.base_url,
        status: integration.status,
        time: formatRecordTime(integration.last_synced_at ?? integration.created_at),
      }));
  }, [matchingIntegrations, runtimeState.reports, selectedSystem]);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const textTertiary = isDarkMode ? 'text-slate-500' : 'text-slate-400';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const apiStatusText = runtimeState.isLoading
    ? '读取中'
    : runtimeState.health?.status ?? (runtimeState.error ? '异常' : '未知');
  const runtimeStatusText = runtimeState.isLoading
    ? '读取中'
    : selectedSystem?.id === 'supabase'
      ? runtimeState.health?.database.schemaReady === true
        ? '已初始化'
        : runtimeState.health
          ? '未初始化'
          : '未知'
      : matchingIntegrations.length > 0
        ? '已登记'
        : '待登记';
  const requestRecordCountText = runtimeState.isLoading
    ? '读取中'
    : `${selectedSystem?.id === 'supabase' ? runtimeState.reports.length : matchingIntegrations.length} 条`;

  return (
    <div className="flex h-full flex-col justify-start overflow-y-auto pr-1 xl:overflow-hidden xl:pr-0">
      <section className="grid gap-4 lg:grid-cols-3">
        {systemCards.map((system) => (
          <button
            key={system.id}
            onClick={() => setSelectedSystemId(system.id)}
            className={`group relative overflow-hidden rounded-[28px] border p-5 text-left shadow-sm transition hover:-translate-y-1 ${cardSurface}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${system.accent}`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                  <system.icon size={20} className="text-blue-600" />
                </div>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                  查看详情
                </span>
              </div>
              <h3 className={`mt-5 text-xl font-black ${textPrimary}`}>{system.name}</h3>
              <p className={`mt-3 text-sm leading-7 ${textSecondary}`}>{system.description}</p>
            </div>
          </button>
        ))}
      </section>

      {selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className={`max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[36px] border shadow-2xl ${cardSurface}`}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                  <selectedSystem.icon size={20} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <h2 className={`text-xl font-black ${textPrimary}`}>{selectedSystem.name}</h2>
                  <p className={`mt-1 max-w-2xl text-sm leading-6 ${textSecondary}`}>
                    {selectedSystem.detail}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSystemId(null)}
                className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(88vh-92px)] overflow-y-auto px-6 pb-6">
              <section className={`rounded-[28px] border p-5 ${cardSurface}`}>
                <h3 className={`text-sm font-black tracking-[0.22em] uppercase ${textSecondary}`}>
                  系统信息
                </h3>
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                  <DetailRow label="系统名称" value={selectedSystem.name} />
                  <DetailRow label="访问地址" value={selectedSystem.url} />
                  <DetailRow label="API 状态" value={apiStatusText} />
                  <DetailRow
                    label={selectedSystem.id === 'supabase' ? 'Schema 状态' : '接入状态'}
                    value={runtimeStatusText}
                  />
                  <DetailRow
                    label="项目数量"
                    value={runtimeState.isLoading ? '读取中' : String(runtimeState.projects.length)}
                  />
                  <DetailRow label="请求记录" value={requestRecordCountText} />
                </div>

                <div className="mt-5 rounded-[24px] border border-blue-500/10 bg-blue-500/5 p-4 text-sm leading-7 text-slate-500">
                  {runtimeState.error
                    ? `当前读取存在异常：${runtimeState.error}`
                    : '详情窗口当前仅展示系统信息、接口清单和请求记录。'}
                </div>
              </section>

              <section className={`mt-5 rounded-[28px] border p-5 ${cardSurface}`}>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-blue-600" />
                  <h3 className={`text-sm font-black tracking-[0.22em] uppercase ${textSecondary}`}>
                    接口清单
                  </h3>
                </div>
                <div className="mt-4 space-y-3">
                  {selectedSystem.apiList.map((apiItem) => (
                    <div
                      key={apiItem.path}
                      className={`grid gap-3 rounded-[22px] border p-4 md:grid-cols-[auto_minmax(0,1fr)] ${cardSurface}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            apiItem.method === 'GET'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}
                        >
                          {apiItem.method}
                        </span>
                        <div className="min-w-0">
                          <div className={`break-all font-semibold ${textPrimary}`}>{apiItem.path}</div>
                          <div className={`mt-1 text-xs leading-5 ${textSecondary}`}>{apiItem.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={`mt-5 rounded-[28px] border p-5 ${cardSurface}`}>
                <div className="flex items-center gap-2">
                  <Server size={16} className="text-violet-600" />
                  <h3 className={`text-sm font-black tracking-[0.22em] uppercase ${textSecondary}`}>
                    请求记录
                  </h3>
                </div>
                <div className="mt-4 space-y-3">
                  {requestRecords.length === 0 && !runtimeState.isLoading && (
                    <div className={`rounded-[22px] p-4 text-sm ${textSecondary} ${mutedSurface}`}>
                      当前还没有匹配到请求记录。
                    </div>
                  )}

                  {runtimeState.isLoading && (
                    <div className={`rounded-[22px] p-4 text-sm ${textSecondary} ${mutedSurface}`}>
                      正在读取请求记录...
                    </div>
                  )}

                  {requestRecords.map((record) => (
                    <div
                      key={record.id}
                      className={`rounded-[22px] border p-4 ${cardSurface}`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`font-semibold ${textPrimary}`}>{record.label}</div>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${mutedSurface} ${textSecondary}`}>
                              {record.channel}
                            </span>
                          </div>
                          <div className={`mt-2 break-all text-xs leading-5 ${textSecondary}`}>
                            {record.meta}
                          </div>
                          <div className={`mt-2 text-xs ${textTertiary}`}>
                            请求时间：{record.time}
                          </div>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusPillClass(record.status)}`}>
                          {record.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) => (
  <div className="rounded-[20px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/5">
    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div
      className={`mt-2 text-sm leading-6 text-slate-900 dark:text-slate-100 ${valueClassName || 'font-semibold break-words'}`}
    >
      {value}
    </div>
  </div>
);
