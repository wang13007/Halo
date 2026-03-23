import React, { useEffect, useState } from 'react';
import {
  Activity,
  Calendar,
  DollarSign,
  Download,
  Leaf,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api, type EnergyAnalysisResponse } from '../lib/api';

const fallbackData = [
  { time: '00:00', hvac: 400, lighting: 240, plugs: 240, other: 90 },
  { time: '04:00', hvac: 300, lighting: 139, plugs: 221, other: 72 },
  { time: '08:00', hvac: 200, lighting: 980, plugs: 229, other: 84 },
  { time: '12:00', hvac: 278, lighting: 390, plugs: 200, other: 88 },
  { time: '16:00', hvac: 189, lighting: 480, plugs: 218, other: 66 },
  { time: '20:00', hvac: 239, lighting: 380, plugs: 250, other: 59 },
  { time: '24:00', hvac: 349, lighting: 430, plugs: 210, other: 68 },
];

const fallbackPieData = [
  { name: '暖通空调', value: 400 },
  { name: '照明插座', value: 300 },
  { name: '动力设备', value: 300 },
  { name: '特殊用电', value: 200 },
];

const colors = ['#2563eb', '#7c3aed', '#059669', '#f59e0b'];

const formatTrend = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export const EnergyAnalysis = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [analysis, setAnalysis] = useState<EnergyAnalysisResponse | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await api.getEnergyAnalysis();
        if (active) {
          setAnalysis(response);
          setError('');
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : '加载失败');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const textColor = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const subTextColor = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const panelColor = isDarkMode
    ? 'border-white/10 bg-slate-900/65'
    : 'border-white/80 bg-white/85';
  const chartData = analysis?.chart.length ? analysis.chart : fallbackData;
  const pieData = analysis?.breakdown.length
    ? analysis.breakdown.map((item) => ({
        name:
          item.name === 'hvac'
            ? '暖通空调'
            : item.name === 'lighting'
              ? '照明插座'
              : item.name === 'plugs'
                ? '动力设备'
                : item.name === 'special'
                  ? '特殊用电'
                  : item.name,
        value: item.value,
      }))
    : fallbackPieData;
  const totalBreakdown = pieData.reduce((sum, item) => sum + item.value, 0);

  const stats = analysis
    ? [
        {
          icon: <Zap size={22} className="text-blue-600" />,
          title: '今日总能耗',
          trend: formatTrend(analysis.stats.todayTrendPercent),
          unit: 'kWh',
          value: analysis.stats.todayUsageKwh.toLocaleString(),
        },
        {
          icon: <Activity size={22} className="text-violet-600" />,
          title: '本月累计',
          trend: formatTrend(analysis.stats.monthTrendPercent),
          unit: 'kWh',
          value: analysis.stats.monthUsageKwh.toLocaleString(),
        },
        {
          icon: <DollarSign size={22} className="text-emerald-600" />,
          title: '预估费用',
          trend: formatTrend(analysis.stats.costTrendPercent),
          unit: '元',
          value: analysis.stats.estimatedCostAmount.toLocaleString(),
        },
        {
          icon: <Leaf size={22} className="text-amber-600" />,
          title: '碳排放量',
          trend: formatTrend(analysis.stats.carbonTrendPercent),
          unit: 'kg',
          value: analysis.stats.carbonKg.toLocaleString(),
        },
      ]
    : [
        {
          icon: <Zap size={22} className="text-blue-600" />,
          title: '今日总能耗',
          trend: '+5.2%',
          unit: 'kWh',
          value: '1,245',
        },
        {
          icon: <Activity size={22} className="text-violet-600" />,
          title: '本月累计',
          trend: '-2.1%',
          unit: 'kWh',
          value: '34,500',
        },
        {
          icon: <DollarSign size={22} className="text-emerald-600" />,
          title: '预估费用',
          trend: '+1.4%',
          unit: '元',
          value: '2,890',
        },
        {
          icon: <Leaf size={22} className="text-amber-600" />,
          title: '碳排放量',
          trend: '-5.0%',
          unit: 'kg',
          value: '856',
        },
      ];

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`text-2xl font-black tracking-tight ${textColor}`}>
            能耗分析 {analysis?.project?.name ? `· ${analysis.project.name}` : '· Web EMS'}
          </h2>
          <p className={`mt-2 text-sm ${subTextColor}`}>
            {isLoading
              ? '正在从后端加载实时分析数据...'
              : error
                ? `接口暂不可用，当前显示演示数据：${error}`
                : `数据已接入 Express 与 Supabase，最近更新时间 ${
                    analysis?.lastUpdatedAt
                      ? new Date(analysis.lastUpdatedAt).toLocaleString()
                      : '未知'
                  }`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${panelColor} ${textColor}`}
          >
            <Calendar size={16} />
            今日
          </button>
          <button className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100">
            <Download size={16} />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.title}
            className={`rounded-[28px] border p-5 shadow-sm ${panelColor}`}
          >
            <div className="mb-4 flex items-start justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                  isDarkMode ? 'bg-white/8' : 'bg-slate-50'
                }`}
              >
                {stat.icon}
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  stat.trend.startsWith('+')
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {stat.trend}
              </span>
            </div>
            <div className="text-sm text-slate-500">{stat.title}</div>
            <div className={`mt-2 text-3xl font-black tracking-tight ${textColor}`}>
              {stat.value}
              <span className="ml-1 text-sm font-medium text-slate-400">{stat.unit}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <article className={`rounded-[32px] border p-6 shadow-sm ${panelColor}`}>
          <h3 className={`mb-6 text-lg font-bold ${textColor}`}>24 小时用电趋势</h3>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={isDarkMode ? '#334155' : '#e2e8f0'}
                />
                <XAxis
                  axisLine={false}
                  dataKey="time"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Bar dataKey="hvac" fill="#2563eb" name="暖通空调" radius={[0, 0, 4, 4]} stackId="a" />
                <Bar dataKey="lighting" fill="#7c3aed" name="照明插座" stackId="a" />
                <Bar dataKey="plugs" fill="#059669" name="动力设备" stackId="a" />
                <Bar dataKey="other" fill="#f59e0b" name="特殊用电" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={`rounded-[32px] border p-6 shadow-sm ${panelColor}`}>
          <h3 className={`mb-6 text-lg font-bold ${textColor}`}>分项能耗占比</h3>
          <div className="relative flex h-[320px] items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  dataKey="value"
                  innerRadius={78}
                  outerRadius={108}
                  paddingAngle={4}
                  stroke="none"
                >
                  {pieData.map((item, index) => (
                    <Cell key={`${item.name}-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-black text-blue-600">{totalBreakdown.toFixed(0)}</div>
              <div className="text-xs font-medium text-slate-500">总计 (kWh)</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {pieData.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 text-sm text-slate-500">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className={textColor}>{item.name}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
};
