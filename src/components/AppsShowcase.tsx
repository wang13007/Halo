import React, { useMemo, useState } from 'react';
import {
  AppWindow,
  Copy,
  Cpu,
  Gauge,
  Heart,
  PencilLine,
  Play,
  Plus,
  ShieldCheck,
  Star,
  Store,
  Trash2,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  createAppId,
  type AppCenterState,
  type AppIconKey,
  type AppItem,
  type AppTab,
} from '../lib/apps';

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'favorites', label: '收藏应用' },
  { id: 'mine', label: '我的应用' },
  { id: 'market', label: '应用商场' },
];

const iconMap: Record<AppIconKey, React.ComponentType<{ className?: string; size?: number }>> = {
  appWindow: AppWindow,
  chart: Gauge,
  cpu: Cpu,
  energy: Zap,
  shield: ShieldCheck,
  star: Star,
  store: Store,
};

type AiAppForm = {
  goal: string;
  name: string;
  prompt: string;
};

const recentUpdateLabel = '最近更新: 2h前';

export const AppsShowcase = ({
  appCenterState,
  isDarkMode,
  onChange,
}: {
  appCenterState: AppCenterState;
  isDarkMode: boolean;
  onChange: React.Dispatch<React.SetStateAction<AppCenterState>>;
}) => {
  const [editingApp, setEditingApp] = useState<AppItem | null>(null);
  const [editingDraft, setEditingDraft] = useState({ description: '', title: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [aiForm, setAiForm] = useState<AiAppForm>({
    goal: '',
    name: '',
    prompt: '',
  });

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const tileSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/75'
    : 'border-slate-200/70 bg-white/90';
  const tabRailSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-100/80';
  const actionPrimaryClass =
    'inline-flex items-center justify-center gap-1.5 rounded-[14px] bg-blue-600 px-3 py-2 text-[11px] font-bold text-white shadow-lg shadow-blue-500/20';
  const actionSecondaryClass = `inline-flex items-center justify-center gap-1.5 rounded-[14px] border px-3 py-2 text-[11px] font-bold ${tileSurface} ${textPrimary}`;
  const actionDangerClass =
    'inline-flex items-center justify-center gap-1.5 rounded-[14px] border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-500';

  const visibleApps = useMemo(() => {
    if (appCenterState.activeTab === 'favorites') {
      return appCenterState.apps.filter((app) => app.favorite);
    }

    if (appCenterState.activeTab === 'mine') {
      return appCenterState.apps.filter((app) => app.installed);
    }

    return appCenterState.apps.filter((app) => app.origin === 'market');
  }, [appCenterState]);

  const updateApp = (appId: string, updater: (app: AppItem) => AppItem) => {
    onChange((previous) => ({
      ...previous,
      apps: previous.apps.map((app) => (app.id === appId ? updater(app) : app)),
    }));
  };

  const removeApp = (appId: string) => {
    onChange((previous) => ({
      ...previous,
      apps: previous.apps.flatMap((app) => {
        if (app.id !== appId) {
          return [app];
        }

        if (app.origin === 'custom') {
          return [];
        }

        return [{ ...app, favorite: false, installed: false }];
      }),
    }));
  };

  const handleUninstall = (app: AppItem) => {
    removeApp(app.id);
    setStatusMessage(`已卸载应用：${app.title}`);
  };

  const handleToggleFavorite = (appId: string) => {
    updateApp(appId, (app) => ({ ...app, favorite: !app.favorite }));
  };

  const handleInstall = (appId: string) => {
    updateApp(appId, (app) => ({ ...app, installed: true }));
  };

  const handleRun = (app: AppItem) => {
    setStatusMessage(`已运行应用：${app.title}`);
  };

  const handleCopy = (app: AppItem) => {
    const copyApp: AppItem = {
      ...app,
      badge: '复制',
      favorite: false,
      id: createAppId(),
      installed: true,
      origin: 'custom',
      title: `${app.title} 副本`,
    };

    onChange((previous) => ({
      ...previous,
      activeTab: 'mine',
      apps: [copyApp, ...previous.apps],
    }));

    setStatusMessage(`已复制应用：${copyApp.title}`);
  };

  const openEditModal = (app: AppItem) => {
    setEditingApp(app);
    setEditingDraft({
      description: app.description,
      title: app.title,
    });
  };

  const handleSaveEdit = () => {
    if (!editingApp) {
      return;
    }

    updateApp(editingApp.id, (app) => ({
      ...app,
      description: editingDraft.description.trim() || app.description,
      title: editingDraft.title.trim() || app.title,
    }));

    setEditingApp(null);
    setStatusMessage('应用信息已更新');
  };

  const handleCreateApp = async () => {
    if (!aiForm.name.trim() || !aiForm.prompt.trim()) {
      return;
    }

    setIsGeneratingApp(true);

    try {
      const artifact = await api.generateArtifact({
        artifactType: 'app',
        goal: aiForm.goal.trim(),
        name: aiForm.name.trim(),
        prompt: aiForm.prompt.trim(),
      });

      const nextApp: AppItem = {
        badge: 'AI Coding',
        description: artifact.description,
        favorite: false,
        icon: 'appWindow',
        id: createAppId(),
        installed: true,
        origin: 'custom',
        title: artifact.title,
      };

      onChange((previous) => ({
        ...previous,
        activeTab: 'mine',
        apps: [nextApp, ...previous.apps],
      }));

      setAiForm({ goal: '', name: '', prompt: '' });
      setShowCreateModal(false);
      setStatusMessage(`已创建应用：${nextApp.title}`);
    } finally {
      setIsGeneratingApp(false);
    }
  };

  const renderCardActions = (app: AppItem) => {
    const isMineView = appCenterState.activeTab === 'mine';
    const isMarketView = appCenterState.activeTab === 'market';

    if (isMineView) {
      return (
        <div className="mt-3 grid gap-1.5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRun(app)}
              className={actionPrimaryClass}
            >
              <Play size={13} />
              运行
            </button>
            <button
              onClick={() => openEditModal(app)}
              className={actionSecondaryClass}
            >
              <PencilLine size={13} />
              编辑
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCopy(app)}
              className={actionSecondaryClass}
            >
              <Copy size={13} />
              复制
            </button>
            <button
              onClick={() => handleUninstall(app)}
              className={actionDangerClass}
            >
              <Trash2 size={13} />
              卸载
            </button>
          </div>
        </div>
      );
    }

    if (isMarketView) {
      if (app.installed) {
        return (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => handleRun(app)}
              className={actionPrimaryClass}
            >
              <Play size={13} />
              运行
            </button>
            <button
              onClick={() => handleUninstall(app)}
              className={actionDangerClass}
            >
              <Trash2 size={13} />
              卸载
            </button>
          </div>
        );
      }

      return (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => handleInstall(app.id)}
            className={`${actionPrimaryClass} flex-1 disabled:opacity-60`}
            disabled={app.installed}
          >
            {app.installed ? '已安装' : '安装'}
          </button>
        </div>
      );
    }

    return (
      <div className="mt-3 flex gap-2">
        {app.installed ? (
          <>
            <button
              onClick={() => handleRun(app)}
              className={`${actionPrimaryClass} flex-1`}
            >
              <Play size={13} />
              运行
            </button>
            <button
              onClick={() => handleUninstall(app)}
              className={actionDangerClass}
            >
              <Trash2 size={13} />
              卸载
            </button>
          </>
        ) : (
          <button
            onClick={() => handleInstall(app.id)}
            className={`${actionPrimaryClass} flex-1`}
          >
            安装
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className={`flex flex-wrap gap-2 rounded-[22px] p-1 ${tabRailSurface}`}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                onChange((previous) => ({
                  ...previous,
                  activeTab: tab.id,
                }))
              }
              className={`rounded-[18px] px-4 py-2 text-sm font-bold transition ${
                appCenterState.activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm shadow-slate-900/8 dark:bg-white dark:text-slate-900'
                  : `bg-transparent ${textSecondary}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {statusMessage && <div className={`text-sm ${textSecondary}`}>{statusMessage}</div>}
          {appCenterState.activeTab === 'mine' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-[18px] bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
            >
              <Plus size={15} />
              创建应用
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(196px,220px))] content-start justify-start gap-3 pb-1">
          {visibleApps.map((app) => {
            const Icon = iconMap[app.icon];

            return (
              <article
                key={app.id}
                className={`flex min-h-[198px] flex-col rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.55)] ${tileSurface}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[18px] border shadow-sm ${
                      isDarkMode
                        ? 'border-white/10 bg-white/5'
                        : 'border-slate-200/70 bg-white'
                    }`}
                  >
                    <Icon size={20} className="text-blue-600" />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleFavorite(app.id)}
                      className={`rounded-full p-1.5 ${
                        app.favorite
                          ? 'bg-rose-500/10 text-rose-500'
                          : `${mutedSurface} ${textPrimary}`
                      }`}
                      title={app.favorite ? '取消收藏' : '加入收藏'}
                    >
                      <Heart size={14} className={app.favorite ? 'fill-current' : ''} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex-1">
                  <h3 className={`text-[16px] font-black tracking-tight ${textPrimary}`}>
                    {app.title}
                  </h3>
                  <p className={`mt-1.5 h-10 overflow-hidden text-[13px] leading-5 ${textSecondary}`}>
                    {app.description}
                  </p>
                  <div className={`mt-2 text-[11px] font-semibold ${textSecondary}`}>
                    {recentUpdateLabel}
                  </div>
                </div>

                {renderCardActions(app)}
              </article>
            );
          })}

          {appCenterState.activeTab === 'mine' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className={`flex min-h-[198px] flex-col items-center justify-center rounded-[24px] border border-dashed px-4 py-4 text-center transition ${
                isDarkMode
                  ? 'border-white/12 bg-white/[0.03] hover:bg-white/[0.05]'
                  : 'border-slate-200 bg-white/35 hover:bg-white/60'
              }`}
            >
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-full ${
                  isDarkMode ? 'bg-white/8 text-slate-300' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Plus size={24} />
              </div>
              <div className={`mt-4 text-[16px] font-black tracking-tight ${textPrimary}`}>
                创建新应用
              </div>
              <div className={`mt-2 max-w-[170px] text-[13px] leading-5 ${textSecondary}`}>
                用 AI Coding 或自定义流程快速补充你的业务应用。
              </div>
            </button>
          )}

          {visibleApps.length === 0 && (
            <div
              className={`col-span-full flex min-h-[220px] items-center justify-center rounded-[24px] border border-dashed px-6 text-sm ${textSecondary}`}
            >
              当前标签还没有应用，试试创建应用或点击卡片右上角的收藏图标。
            </div>
          )}
        </div>
      </div>

      {editingApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-xl rounded-[30px] border p-6 shadow-2xl ${cardSurface}`}>
            <h2 className={`text-xl font-black ${textPrimary}`}>编辑应用</h2>
            <div className="mt-4 space-y-3">
              <input
                value={editingDraft.title}
                onChange={(event) =>
                  setEditingDraft((previous) => ({ ...previous, title: event.target.value }))
                }
                className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                placeholder="应用名称"
              />
              <textarea
                value={editingDraft.description}
                onChange={(event) =>
                  setEditingDraft((previous) => ({
                    ...previous,
                    description: event.target.value,
                  }))
                }
                className={`min-h-[120px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 focus:outline-none ${cardSurface} ${textPrimary}`}
                placeholder="应用说明"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setEditingApp(null)}
                className={`rounded-2xl border px-4 py-2 text-sm font-bold ${cardSurface} ${textPrimary}`}
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-[30px] border p-6 shadow-2xl ${cardSurface}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>AI Coding 创建应用</h2>
                <p className={`mt-1 text-sm leading-6 ${textSecondary}`}>
                  描述应用目标、场景和功能，生成后会直接进入“我的应用”。
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={aiForm.name}
                onChange={(event) =>
                  setAiForm((previous) => ({ ...previous, name: event.target.value }))
                }
                className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                placeholder="应用名称"
              />
              <input
                value={aiForm.goal}
                onChange={(event) =>
                  setAiForm((previous) => ({ ...previous, goal: event.target.value }))
                }
                className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                placeholder="业务目标，例如：搭建租户能耗日报应用"
              />
              <textarea
                value={aiForm.prompt}
                onChange={(event) =>
                  setAiForm((previous) => ({ ...previous, prompt: event.target.value }))
                }
                className={`min-h-[160px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 focus:outline-none ${cardSurface} ${textPrimary}`}
                placeholder="描述页面结构、关键功能、主要交互和需要展示的数据。"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className={`rounded-2xl border px-4 py-2 text-sm font-bold ${cardSurface} ${textPrimary}`}
              >
                取消
              </button>
              <button
                onClick={() => void handleCreateApp()}
                disabled={isGeneratingApp}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                <WandSparkles size={15} />
                {isGeneratingApp ? '生成中...' : '生成应用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
