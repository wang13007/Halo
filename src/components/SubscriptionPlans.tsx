import React, { useState } from 'react';
import { UserRound, Wallet } from 'lucide-react';

type BillingCycle = 'monthly' | 'quarterly' | 'yearly';

type Plan = {
  badge: string;
  cta: string;
  description: string;
  features: string[];
  id: 'basic' | 'premium';
  name: string;
  priceByCycle: Record<BillingCycle, string>;
  seats: string;
};

const plans: Plan[] = [
  {
    badge: '基础版',
    cta: '当前默认版本',
    description: '适合单人试用和轻量化日常管理。',
    features: [
      '1 个用户席位',
      '看板、对话和配置页基础能力',
      '收藏应用与固定系统卡片查看',
      '有限次数的对话生成与基础报表导出',
      '标准项目、报表和告警浏览能力',
    ],
    id: 'basic',
    name: '基础版',
    priceByCycle: {
      monthly: '免费',
      quarterly: '免费',
      yearly: '免费',
    },
    seats: '1 个用户',
  },
  {
    badge: '高级版',
    cta: '升级高级版',
    description: '适合团队协作、个性化配置和高频内容生成。',
    features: [
      '100 个用户席位',
      '支持自定义小组件与自定义应用',
      '无限次对话生成',
      '支持自定义系统接口',
      '支持更灵活的业务编排和团队协同',
    ],
    id: 'premium',
    name: '高级版',
    priceByCycle: {
      monthly: '¥399 / 月',
      quarterly: '¥900 / 季',
      yearly: '¥3000 / 年',
    },
    seats: '100 个用户',
  },
];

const billingCycleOptions: Array<{ id: BillingCycle; label: string }> = [
  { id: 'monthly', label: '按月' },
  { id: 'quarterly', label: '按季' },
  { id: 'yearly', label: '按年' },
];

export const SubscriptionPlans = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto pr-1 xl:overflow-hidden xl:pr-0">
      <div className="flex shrink-0 flex-wrap gap-2">
        {billingCycleOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => setBillingCycle(option.id)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              billingCycle === option.id
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : `${cardSurface} ${textPrimary}`
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        {plans.map((plan) => (
          <article
            key={plan.id}
            className={`rounded-[28px] border p-5 shadow-sm ${cardSurface} ${
              plan.id === 'premium' ? 'ring-1 ring-blue-500/20' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                  {plan.badge}
                </div>
                <h2 className={`mt-3 text-2xl font-black tracking-tight ${textPrimary}`}>
                  {plan.name}
                </h2>
                <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>{plan.description}</p>
              </div>
              <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                {plan.id === 'premium' ? (
                  <Wallet size={20} className="text-blue-600" />
                ) : (
                  <UserRound size={20} className="text-emerald-600" />
                )}
              </div>
            </div>

            <div className={`mt-5 text-3xl font-black tracking-tight ${textPrimary}`}>
              {plan.priceByCycle[billingCycle]}
            </div>
            <div className="mt-2 text-sm text-slate-500">{plan.seats}</div>

            <div className="mt-5 space-y-2.5">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-emerald-500" />
                  <span className={`text-sm leading-6 ${textPrimary}`}>{feature}</span>
                </div>
              ))}
            </div>

            <button
              className={`mt-5 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
                plan.id === 'premium'
                  ? 'bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100'
                  : `${cardSurface} ${textPrimary}`
              }`}
            >
              {plan.cta}
            </button>
          </article>
        ))}

        <section className={`rounded-[28px] border p-5 shadow-sm ${cardSurface}`}>
          <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
            核心差异
          </h3>
          <div className="mt-4 grid gap-4">
            <div className={`rounded-[22px] p-4 ${mutedSurface}`}>
              <div className="text-sm font-bold text-slate-500">基础版</div>
              <div className={`mt-2 text-base font-bold ${textPrimary}`}>免费，适合轻量试用</div>
              <p className={`mt-3 text-sm leading-6 ${textSecondary}`}>
                默认提供标准看板、基础对话和固定系统查看能力，仅支持 1 个用户。
              </p>
            </div>
            <div className={`rounded-[22px] p-4 ${mutedSurface}`}>
              <div className="text-sm font-bold text-slate-500">高级版</div>
              <div className={`mt-2 text-base font-bold ${textPrimary}`}>适合团队化与定制化使用</div>
              <p className={`mt-3 text-sm leading-6 ${textSecondary}`}>
                支持自定义小组件、自定义应用、无限次对话生成和自定义系统接口，并扩展到 100 个用户。
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
