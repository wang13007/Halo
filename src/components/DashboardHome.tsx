import React from 'react';
import {
  Activity,
  AppWindow,
  Bot,
  Database,
  Radar,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

const summaryWidgets = [
  { helper: '较昨日 +5.2%', icon: Zap, tone: 'text-blue-600', value: '1,245 kWh', label: '今日能耗' },
  { helper: '3 个系统在线', icon: Database, tone: 'text-emerald-600', value: '稳定', label: '数据接入' },
  { helper: '2 项待处理', icon: ShieldCheck, tone: 'text-amber-600', value: '4 条', label: '待办提醒' },
  { helper: '默认展示', icon: AppWindow, tone: 'text-violet-600', value: '6 个', label: '收藏应用' },
];

const focusItems = [
  '暖通空调在 13:00 后负荷继续抬升，建议优先复核运行策略。',
  'IBMS 与 EMS 已在线，Supabase Schema 仍待继续初始化。',
  '应用中心默认切到收藏应用，便于高频能力快速进入。',
];

const energyDistribution = [
  { label: '暖通空调', progress: 74 },
  { label: '照明插座', progress: 56 },
  { label: '动力设备', progress: 43 },
];

const recentActions = [
  '补全高级版的自定义小组件和自定义应用能力',
  '完成 Supabase 远端建表后同步刷新配置状态',
  '将高频应用固定到收藏应用标签顶部',
];

export const DashboardHome = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  return (
    <div className="grid h-full auto-rows-fr gap-4 overflow-y-auto pr-1 xl:grid-cols-12 xl:overflow-hidden xl:pr-0">
      {summaryWidgets.map((widget) => (
        <article
          key={widget.label}
          className={`rounded-[26px] border p-4 shadow-sm xl:col-span-3 ${cardSurface}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{widget.label}</div>
              <div className={`mt-2 text-2xl font-black tracking-tight ${textPrimary}`}>
                {widget.value}
              </div>
            </div>
            <div className={`rounded-2xl p-3 ${mutedSurface}`}>
              <widget.icon size={18} className={widget.tone} />
            </div>
          </div>
          <div className={`mt-4 text-sm ${textSecondary}`}>{widget.helper}</div>
        </article>
      ))}

      <section className={`rounded-[26px] border p-4 shadow-sm xl:col-span-5 ${cardSurface}`}>
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-blue-600" />
          <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            今日焦点
          </h2>
        </div>
        <div className="mt-4 grid gap-3">
          {focusItems.map((item) => (
            <div
              key={item}
              className={`rounded-[20px] p-3 text-sm leading-6 ${
                isDarkMode ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-[26px] border p-4 shadow-sm xl:col-span-3 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            运行节奏
          </h2>
          <div className={`rounded-2xl p-2.5 ${mutedSurface}`}>
            <Activity size={16} className="text-emerald-600" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {[
            { label: '今日对话', value: '12 次' },
            { label: '生成报告', value: '4 份' },
            { label: '待处理告警', value: '2 条' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className={textSecondary}>{item.label}</span>
              <span className={`font-bold ${textPrimary}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-[26px] border p-4 shadow-sm xl:col-span-4 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            本周能耗分布
          </h2>
          <div className={`rounded-2xl p-2.5 ${mutedSurface}`}>
            <Zap size={16} className="text-amber-500" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {energyDistribution.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between text-sm">
                <span className={textPrimary}>{item.label}</span>
                <span className={textSecondary}>{item.progress}%</span>
              </div>
              <div className={`mt-2 h-2 overflow-hidden rounded-full ${mutedSurface}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-400"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-[26px] border p-4 shadow-sm xl:col-span-4 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            接入概览
          </h2>
          <div className={`rounded-2xl p-2.5 ${mutedSurface}`}>
            <Radar size={16} className="text-blue-600" />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          {[
            { label: 'EMS 系统', value: '已联通' },
            { label: 'IBMS 系统', value: '已登记' },
            { label: 'Supabase', value: '待建表' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <span className={textSecondary}>{item.label}</span>
              <span className={`font-bold ${textPrimary}`}>{item.value}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`rounded-[26px] border p-4 shadow-sm xl:col-span-4 ${cardSurface}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-xs font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            最近动作
          </h2>
          <div className={`rounded-2xl p-2.5 ${mutedSurface}`}>
            <Bot size={16} className="text-violet-600" />
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {recentActions.map((item) => (
            <div
              key={item}
              className={`rounded-[18px] p-3 text-sm leading-6 ${
                isDarkMode ? 'bg-white/5 text-slate-200' : 'bg-slate-50 text-slate-700'
              }`}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
