import React from 'react';
import { AlertTriangle, ArrowRight, Cpu, Gauge, Zap } from 'lucide-react';

const appCards = [
  {
    badge: '热门',
    description: '统一查看电、水、燃气等分项数据，并生成图表与报告。',
    icon: Zap,
    id: 'energy',
    title: '能耗分析',
  },
  {
    badge: '设备',
    description: '聚合关键设备状态、在线率与风险提醒。',
    icon: Cpu,
    id: 'device',
    title: '设备监控',
  },
  {
    badge: '运维',
    description: '围绕告警、规则与巡检记录形成处置闭环。',
    icon: AlertTriangle,
    id: 'alert',
    title: '告警中心',
  },
  {
    badge: '驾驶舱',
    description: '适合在大屏或日常运营页中快速组合重点模块。',
    icon: Gauge,
    id: 'cockpit',
    title: '运营驾驶舱',
  },
];

export const AppsShowcase = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {appCards.map((app) => (
        <article
          key={app.id}
          className={`rounded-[30px] border p-6 shadow-sm transition hover:-translate-y-1 ${cardSurface}`}
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
          <p className={`mt-3 text-sm leading-7 ${textSecondary}`}>{app.description}</p>
          <button className={`mt-5 inline-flex items-center gap-2 text-sm font-bold ${textPrimary}`}>
            查看详情
            <ArrowRight size={16} />
          </button>
        </article>
      ))}
    </div>
  );
};
