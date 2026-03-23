import React, { useMemo, useState } from 'react';
import {
  AppWindow,
  ArrowRight,
  Cpu,
  Gauge,
  ShieldCheck,
  Star,
  Store,
  Zap,
} from 'lucide-react';

type AppTab = 'favorites' | 'market' | 'mine';

type AppCard = {
  actionLabel: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  id: string;
  title: string;
};

const tabs: Array<{ id: AppTab; label: string }> = [
  { id: 'favorites', label: '收藏应用' },
  { id: 'mine', label: '我的应用' },
  { id: 'market', label: '应用商场' },
];

const appLibrary: Record<AppTab, AppCard[]> = {
  favorites: [
    {
      actionLabel: '打开应用',
      badge: '高频',
      description: '用于查看项目分项能耗、趋势和分析摘要。',
      icon: Zap,
      id: 'energy',
      title: '能耗分析',
    },
    {
      actionLabel: '打开应用',
      badge: '收藏',
      description: '将关键指标和告警统一整理到单页驾驶舱。',
      icon: Gauge,
      id: 'cockpit',
      title: '运营驾驶舱',
    },
    {
      actionLabel: '打开应用',
      badge: '收藏',
      description: '汇总设备告警、处理进度和巡检反馈。',
      icon: ShieldCheck,
      id: 'alert',
      title: '告警中心',
    },
  ],
  mine: [
    {
      actionLabel: '编辑应用',
      badge: '我的',
      description: '面向管理层的楼宇运行日报摘要页。',
      icon: AppWindow,
      id: 'daily-brief',
      title: '日报摘要',
    },
    {
      actionLabel: '编辑应用',
      badge: '我的',
      description: '按系统查看暖通巡检记录和异常回访。',
      icon: Cpu,
      id: 'hvac-check',
      title: '暖通巡检',
    },
  ],
  market: [
    {
      actionLabel: '安装应用',
      badge: '推荐',
      description: '适合做设备全生命周期的可视化管理。',
      icon: Store,
      id: 'digital-twin',
      title: '设备孪生',
    },
    {
      actionLabel: '安装应用',
      badge: '推荐',
      description: '结合项目历史数据做能耗与碳排对标。',
      icon: Star,
      id: 'carbon-benchmark',
      title: '碳排对标',
    },
    {
      actionLabel: '安装应用',
      badge: '新品',
      description: '把告警、工单和对话分析串成闭环。',
      icon: ShieldCheck,
      id: 'workorder',
      title: '工单助手',
    },
  ],
};

export const AppsShowcase = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('favorites');

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  const currentApps = useMemo(() => appLibrary[activeTab], [activeTab]);

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : `${cardSurface} ${textPrimary}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className={`text-sm ${textSecondary}`}>当前共 {currentApps.length} 个应用</div>
      </div>

      <div className="grid flex-1 auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
        {currentApps.map((app) => (
          <article
            key={app.id}
            className={`flex flex-col rounded-[28px] border p-5 shadow-sm transition hover:-translate-y-1 ${cardSurface}`}
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                <app.icon size={20} className="text-blue-600" />
              </div>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                {app.badge}
              </span>
            </div>

            <h3 className={`mt-5 text-xl font-black ${textPrimary}`}>{app.title}</h3>
            <p className={`mt-3 flex-1 text-sm leading-6 ${textSecondary}`}>{app.description}</p>

            <button className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${textPrimary}`}>
              {app.actionLabel}
              <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </div>
  );
};
