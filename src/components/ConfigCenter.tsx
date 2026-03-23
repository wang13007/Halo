import React, { useEffect, useMemo, useState } from 'react';
import { Database, Lock, Server, Sparkles, X, Zap } from 'lucide-react';
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

const systemCards: SystemCard[] = [
  {
    accent: 'from-blue-600/15 via-cyan-500/10 to-transparent',
    apiList: [
      { desc: 'Web 端能耗统计分析', method: 'GET', path: '/api/energy/analysis' },
      { desc: '本地 queryReport 代理接口', method: 'POST', path: '/api/energy/query-report' },
      { desc: '写入能耗数据', method: 'POST', path: '/api/energy/metrics' },
    ],
    description: '用于承接 Web 端的能耗分析、趋势统计与报表查询。',
    detail: '适合接入 EMS 类平台，当前前端能耗页和对话查询都会优先读取这里的能力。',
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
      { desc: '健康检查', method: 'GET', path: '/api/health' },
    ],
    description: '适合楼宇、设备、监控类系统的接入状态查看。',
    detail: '后端接入状态已经移到卡片详情窗口展示，配置页本身不再长期放置独立状态卡片。',
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
    description: '负责持久化项目、报表、系统接入和能耗明细。',
    detail: '当前项目已接入 Supabase API，但数据库 Schema 仍取决于远端建表是否完成。',
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
          healthResult.reason instanceof Error
            ? healthResult.reason.message
            : '健康检查读取失败',
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
          reportsResult.reason instanceof Error
            ? reportsResult.reason.message
            : '报表读取失败',
        );
      }
      if (projectsResult.status === 'rejected') {
        errors.push(
          projectsResult.reason instanceof Error
            ? projectsResult.reason.message
            : '项目读取失败',
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

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

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

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-3">
        {systemCards.map((system) => (
          <button
            key={system.id}
            onClick={() => setSelectedSystemId(system.id)}
            className={`group relative overflow-hidden rounded-[30px] border p-6 text-left shadow-sm transition hover:-translate-y-1 ${cardSurface}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${system.accent}`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                  <system.icon size={20} className="text-blue-600" />
                </div>
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                  点击查看
                </span>
              </div>
              <h3 className={`mt-5 text-xl font-black ${textPrimary}`}>{system.name}</h3>
              <p className={`mt-3 text-sm leading-7 ${textSecondary}`}>{system.description}</p>
            </div>
          </button>
        ))}
      </section>

      <section className={`rounded-[30px] border p-6 shadow-sm ${cardSurface}`}>
        <div className="flex items-start gap-4">
          <div className={`rounded-2xl p-3 ${mutedSurface}`}>
            <Lock size={20} className="text-amber-600" />
          </div>
          <div>
            <h3 className={`text-lg font-black ${textPrimary}`}>配置页已改为“卡片进入详情窗口”</h3>
            <p className={`mt-2 text-sm leading-7 ${textSecondary}`}>
              页面里已经移除了“新增系统接入”卡片。后端接入状态会在点击对应系统卡片后，以详情窗口的方式集中展示，页面主区域只保留系统入口，更整洁也更适合 Web 端。
            </p>
          </div>
        </div>
      </section>

      {selectedSystem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div
            className={`max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[36px] border shadow-2xl ${cardSurface}`}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <div className="flex items-center gap-3">
                <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                  <selectedSystem.icon size={20} className="text-blue-600" />
                </div>
                <div>
                  <h2 className={`text-xl font-black ${textPrimary}`}>{selectedSystem.name}</h2>
                  <p className={`mt-1 text-sm ${textSecondary}`}>{selectedSystem.detail}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSystemId(null)}
                className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[calc(88vh-88px)] overflow-y-auto px-6 pb-6">
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                <section className={`rounded-[28px] border p-5 ${cardSurface}`}>
                  <h3 className={`text-sm font-black tracking-[0.22em] uppercase ${textSecondary}`}>
                    后端接入状态
                  </h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-3">
                    <StatusCard
                      label="API 状态"
                      tone="blue"
                      value={runtimeState.isLoading ? '读取中' : runtimeState.health?.status ?? '未知'}
                    />
                    <StatusCard
                      label="Schema"
                      tone="emerald"
                      value={
                        runtimeState.isLoading
                          ? '读取中'
                          : runtimeState.health?.database.schemaReady
                            ? '已初始化'
                            : '未初始化'
                      }
                    />
                    <StatusCard
                      label="项目数量"
                      tone="amber"
                      value={runtimeState.isLoading ? '--' : String(runtimeState.projects.length)}
                    />
                  </div>

                  <div className="mt-5 rounded-[24px] bg-blue-500/5 p-4 text-sm leading-7 text-slate-500">
                    {runtimeState.error
                      ? `当前读取存在问题：${runtimeState.error}`
                      : '系统卡片点击后会在窗口中统一展示后端接入状态，不再占用配置页主区域。'}
                  </div>
                </section>

                <section className={`rounded-[28px] border p-5 ${cardSurface}`}>
                  <h3 className={`text-sm font-black tracking-[0.22em] uppercase ${textSecondary}`}>
                    系统信息
                  </h3>
                  <div className="mt-4 space-y-3 text-sm">
                    <DetailRow label="系统名称" value={selectedSystem.name} />
                    <DetailRow label="访问地址" value={selectedSystem.url} />
                    <DetailRow
                      label="接入记录"
                      value={
                        runtimeState.isLoading
                          ? '读取中'
                          : `${matchingIntegrations.length} 条${
                              matchingIntegrations.length > 0 ? '，已登记' : '，待同步'
                            }`
                      }
                    />
                    <DetailRow
                      label="报表记录"
                      value={runtimeState.isLoading ? '读取中' : `${runtimeState.reports.length} 条`}
                    />
                  </div>
                </section>
              </div>

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
                      className={`flex flex-col gap-2 rounded-[22px] border p-4 md:flex-row md:items-center md:justify-between ${cardSurface}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            apiItem.method === 'GET'
                              ? 'bg-blue-500/10 text-blue-600'
                              : 'bg-emerald-500/10 text-emerald-600'
                          }`}
                        >
                          {apiItem.method}
                        </span>
                        <div>
                          <div className={`font-semibold ${textPrimary}`}>{apiItem.path}</div>
                          <div className={`text-xs ${textSecondary}`}>{apiItem.desc}</div>
                        </div>
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

const StatusCard = ({
  label,
  tone,
  value,
}: {
  label: string;
  tone: 'amber' | 'blue' | 'emerald';
  value: string;
}) => {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-500/10 text-blue-600'
      : tone === 'emerald'
        ? 'bg-emerald-500/10 text-emerald-600'
        : 'bg-amber-500/10 text-amber-600';

  return (
    <div className="rounded-[22px] bg-slate-50/70 p-4 dark:bg-white/5">
      <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{label}</div>
      <div className={`mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${toneClass}`}>
        {value}
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 rounded-[20px] bg-slate-50/70 px-4 py-3 dark:bg-white/5">
    <span className="text-slate-500">{label}</span>
    <span className="text-right font-medium text-slate-900 dark:text-slate-100">{value}</span>
  </div>
);
