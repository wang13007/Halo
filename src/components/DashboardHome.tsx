import React from 'react';
import { Bot, Database, Server, Sparkles } from 'lucide-react';
import { EnergyAnalysis } from './EnergyAnalysis';

export const DashboardHome = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  return (
    <div className="space-y-8">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
        <section
          className={`relative overflow-hidden rounded-[32px] border p-7 shadow-sm ${cardSurface}`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-cyan-500/5 to-transparent" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
              <Sparkles size={14} />
              Web 端总览
            </div>
            <h2 className={`mt-4 text-3xl font-black tracking-tight ${textPrimary}`}>
              Halo 已切换为更轻的 Web 管理界面
            </h2>
            <p className={`mt-3 max-w-2xl text-sm leading-7 ${textSecondary}`}>
              外层大圆角容器已经移除，页面留白、模块密度和顶部层级都重新梳理成更适合 Web 端长期使用的结构。
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                '顶部结构更轻',
                '历史对话按钮回到头部',
                '配置页统一走详情窗口',
              ].map((item) => (
                <span
                  key={item}
                  className={`rounded-full px-4 py-2 text-sm ${
                    isDarkMode ? 'bg-white/8 text-slate-200' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {[
            { icon: Bot, label: '智能对话', tone: 'text-violet-600', value: 'Web 工作台' },
            { icon: Database, label: '数据层', tone: 'text-emerald-600', value: 'Supabase' },
            { icon: Server, label: '接口中心', tone: 'text-blue-600', value: 'Express API' },
          ].map((item) => (
            <article
              key={item.label}
              className={`rounded-[28px] border p-5 shadow-sm ${cardSurface}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">{item.label}</div>
                  <div className={`mt-2 text-xl font-black ${textPrimary}`}>{item.value}</div>
                </div>
                <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                  <item.icon size={20} className={item.tone} />
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>

      <EnergyAnalysis isDarkMode={isDarkMode} />
    </div>
  );
};
