import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BatteryCharging,
  Bolt,
  Gauge,
  GripVertical,
  LayoutTemplate,
  Leaf,
  ListTodo,
  Plus,
  Sparkles,
  SunMedium,
  Trash2,
  WandSparkles,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import {
  createLocalId,
  type DashboardState,
  type DashboardWidget,
  type WidgetSize,
  widgetSizeClassMap,
  widgetSizeLabelMap,
} from '../lib/dashboard';

type DragPayload =
  | { type: 'library'; widgetId: string }
  | { type: 'canvas'; widgetId: string };

type WidgetCardMode = 'board' | 'preview';

type DashboardTheme = {
  boardSurface: string;
  canvasSurface: string;
  cardSurface: string;
  chipSurface: string;
  inputSurface: string;
  panelSurface: string;
  panelSurfaceStrong: string;
  subtleSurface: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
};

type WidgetBodyProps = {
  isDarkMode: boolean;
  theme: DashboardTheme;
  widget: DashboardWidget;
};

const sizeButtonOptions: WidgetSize[] = ['1:1', '2:1', '2:2'];

const dashboardGridClassName =
  'grid grid-cols-1 gap-5 md:grid-flow-row-dense md:auto-rows-[minmax(168px,_auto)] md:grid-cols-6 xl:auto-rows-[minmax(176px,_auto)] xl:grid-cols-12';

const widgetMobileHeightClassMap: Record<WidgetSize, string> = {
  '1:1': 'min-h-[340px] md:min-h-0',
  '2:1': 'min-h-[380px] md:min-h-0',
  '2:2': 'min-h-[720px] md:min-h-0',
};

const sizeDescriptionMap: Record<WidgetSize, string> = {
  '1:1': '适合占比、状态和紧凑摘要卡片',
  '2:1': '适合主指标、趋势概览和操作建议',
  '2:2': '适合图表分析、预测和多段信息',
};

const energySparkBars = [36, 48, 66, 84, 96, 72, 58];
const powerCompositionData = [
  { color: '#1399b5', label: '租户用电', value: 60 },
  { color: '#8aa7bd', label: '公共区域', value: 40 },
];
const systemRankingData = [
  { label: '空调系统', value: 45 },
  { label: '照明系统', value: 22 },
  { label: '动力系统', value: 18 },
  { label: '办公插座', value: 15 },
];
const multiEnergySeries = [
  { electric: 74, gas: 12, time: '00:00', water: 24 },
  { electric: 68, gas: 12, time: '04:00', water: 30 },
  { electric: 86, gas: 6, time: '08:00', water: 18 },
  { electric: 60, gas: 18, time: '12:00', water: 30 },
  { electric: 80, gas: 12, time: '16:00', water: 18 },
  { electric: 92, gas: 6, time: '20:00', water: 12 },
];
const forecastSeries = [
  { load: 56, time: '06:00' },
  { load: 64, time: '09:00' },
  { load: 72, time: '12:00' },
  { load: 88, time: '15:00' },
  { load: 96, time: '18:00' },
  { load: 90, time: '21:00' },
  { load: 68, time: '24:00' },
];
const storageTimeline = [
  { label: '充电准备', meta: '13:00 - 16:00', value: 72 },
  { label: '削峰放电', meta: '18:00 - 21:00', value: 100 },
  { label: '备用余量', meta: '预计可支撑 2.6h', value: 64 },
];
const alertSummary = [
  { label: '待处理告警', value: '3 条' },
  { label: '5 分钟响应率', value: '87%' },
  { label: '严重级别', value: '0 条' },
];
const savingsSummary = [
  { label: '空调联动优化', value: 'P1' },
  { label: '照明时段联控', value: '本周可落地' },
  { label: '储能协同削峰', value: '预计 4.8 万/月' },
];
const multiEnergyLegend = [
  { color: '#0f7a8d', key: 'electric', label: '电能' },
  { color: '#18b7d4', key: 'water', label: '水能' },
  { color: '#f4a340', key: 'gas', label: '燃气' },
] as const;

const widgetIconMap: Record<string, LucideIcon> = {
  'widget-actions': ListTodo,
  'widget-alerts': AlertTriangle,
  'widget-breakdown': BarChart3,
  'widget-energy': Bolt,
  'widget-forecast': Activity,
  'widget-focus': Gauge,
  'widget-integration': SunMedium,
  'widget-rhythm': Leaf,
  'widget-savings': Sparkles,
  'widget-storage': BatteryCharging,
};

const isDragPayload = (value: unknown): value is DragPayload => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DragPayload>;
  return (
    (candidate.type === 'library' || candidate.type === 'canvas') &&
    typeof candidate.widgetId === 'string'
  );
};

const parseDragPayload = (rawValue: string): DragPayload | null => {
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    return isDragPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  if (fromIndex < 0 || fromIndex >= items.length || fromIndex === toIndex) return items;
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  const normalizedIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
  const clampedIndex = Math.max(0, Math.min(normalizedIndex, nextItems.length));
  nextItems.splice(clampedIndex, 0, movedItem);
  return nextItems;
};

const upsertWidgetId = (widgetIds: string[], widgetId: string, targetIndex: number) => {
  const currentIndex = widgetIds.indexOf(widgetId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, widgetIds.length));
  if (currentIndex === -1) {
    const nextIds = [...widgetIds];
    nextIds.splice(clampedTargetIndex, 0, widgetId);
    return nextIds;
  }
  return moveItem(widgetIds, currentIndex, clampedTargetIndex);
};

const getWidgetIcon = (widget: DashboardWidget) =>
  widgetIconMap[widget.id] ?? (widget.category === 'custom' ? WandSparkles : Sparkles);

const getDashboardTheme = (isDarkMode: boolean): DashboardTheme => ({
  boardSurface: isDarkMode ? 'border-white/10 bg-slate-950/50' : 'border-slate-200/70 bg-white/70',
  canvasSurface: isDarkMode ? 'border-white/10 bg-slate-950/58' : 'border-slate-200/70 bg-white/82',
  cardSurface: isDarkMode
    ? 'border-white/10 bg-slate-900/88 shadow-[var(--dashboard-shadow-dark)]'
    : 'border-white/95 bg-white/96 shadow-[var(--dashboard-shadow-light)]',
  chipSurface: isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200/75 bg-[#f7fafd]',
  inputSurface: isDarkMode ? 'border-white/10 bg-slate-950/55' : 'border-slate-200/80 bg-white',
  panelSurface: isDarkMode ? 'border-white/8 bg-white/[0.05]' : 'border-slate-200/80 bg-[#f5f8fc]',
  panelSurfaceStrong: isDarkMode ? 'border-cyan-400/18 bg-[#0c1727]' : 'border-[#d8e5f2] bg-[#f8fbff]',
  subtleSurface: isDarkMode ? 'bg-white/[0.06]' : 'bg-slate-100/90',
  textPrimary: isDarkMode ? 'text-slate-50' : 'text-slate-900',
  textSecondary: isDarkMode ? 'text-slate-300' : 'text-slate-700',
  textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
});

const chartAxisColor = (isDarkMode: boolean) => (isDarkMode ? '#94a3b8' : '#708399');
const chartGridColor = (isDarkMode: boolean) => (isDarkMode ? 'rgba(148,163,184,0.18)' : '#dbe6f0');

const RatioPreview = ({ isDarkMode, size }: { isDarkMode: boolean; size: WidgetSize }) => {
  const blockClassName = size === '1:1' ? 'h-9 w-9' : size === '2:1' ? 'h-8 w-14' : 'h-12 w-14';
  return (
    <div
      className={`inline-flex h-14 w-20 items-center justify-center rounded-[18px] border ${
        isDarkMode ? 'border-white/10 bg-slate-950/70' : 'border-slate-200 bg-white'
      }`}
    >
      <div className={`rounded-[12px] bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-300 ${blockClassName}`} />
    </div>
  );
};

const DashboardPill = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase ${className}`}>
    {children}
  </span>
);

const MetricTile = ({ label, theme, value }: { label: string; theme: DashboardTheme; value: string }) => (
  <div className={`rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurface}`}>
    <div className={`dashboard-meta ${theme.textMuted}`}>{label}</div>
    <div className={`mt-2 text-base font-semibold ${theme.textPrimary}`}>{value}</div>
  </div>
);

const WidgetHeader = ({
  icon: Icon,
  status,
  subtitle,
  theme,
  title,
}: {
  icon: LucideIcon;
  status?: React.ReactNode;
  subtitle?: string;
  theme: DashboardTheme;
  title: string;
}) => (
  <div className="dashboard-card-header flex items-start justify-between gap-3">
    <div className="flex min-w-0 items-start gap-3">
      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border ${theme.panelSurfaceStrong} ${theme.textPrimary}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className={`dashboard-title break-words ${theme.textPrimary}`}>{title}</div>
        {subtitle ? <div className={`dashboard-meta mt-1 ${theme.textMuted}`}>{subtitle}</div> : null}
      </div>
    </div>
    {status ? <div className="shrink-0">{status}</div> : null}
  </div>
);

const WidgetToolbar = ({ isDarkMode, onRemove }: { isDarkMode: boolean; onRemove?: () => void }) => (
  <div className="absolute right-5 top-5 z-20 flex items-center gap-2">
    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[18px] border ${
      isDarkMode ? 'border-white/10 bg-slate-950/75 text-slate-200' : 'border-slate-200 bg-white text-slate-500'
    }`}>
      <GripVertical size={16} />
    </span>
    {onRemove ? (
      <button
        aria-label="移出看板"
        type="button"
        onClick={onRemove}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-[18px] border transition ${
          isDarkMode
            ? 'border-white/10 bg-slate-950/75 text-slate-200 hover:text-rose-300'
            : 'border-slate-200 bg-white text-slate-500 hover:text-rose-500'
        }`}
      >
        <X size={16} />
      </button>
    ) : null}
  </div>
);

const DonutGauge = ({ isDarkMode, label, percentage }: { isDarkMode: boolean; label: string; percentage: number }) => {
  const angle = percentage * 3.6;
  const ringStyle = {
    background: `conic-gradient(#1399b5 0deg ${angle}deg, ${
      isDarkMode ? 'rgba(148,163,184,0.18)' : '#dfe7ef'
    } ${angle}deg 360deg)`,
  };
  return (
    <div className="relative mx-auto h-36 w-36">
      <div className="absolute inset-0 rounded-full" style={ringStyle} />
      <div className="absolute inset-[16px] rounded-full" style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={isDarkMode ? 'dashboard-value-sm text-slate-50' : 'dashboard-value-sm text-slate-900'}>{percentage}%</div>
        <div className={`mt-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
      </div>
    </div>
  );
};

const ChartTooltip = ({
  active,
  isDarkMode,
  label,
  payload,
}: {
  active?: boolean;
  isDarkMode: boolean;
  label?: string;
  payload?: Array<{ color?: string; dataKey?: string; value?: number }>;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className={`rounded-[18px] border px-3 py-2 shadow-xl ${
      isDarkMode ? 'border-white/10 bg-slate-950/95 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
    }`}>
      <div className="text-xs font-semibold">{label}</div>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? '#1399b5' }} />
            <span>{item.dataKey}</span>
            <span className="ml-auto font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const EnergyOverviewCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <WidgetHeader icon={Bolt} subtitle="集团今日总览" theme={theme} title={widget.title} />
      </div>
      <div className={`rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurfaceStrong}`}>
        <div className={`dashboard-meta ${theme.textMuted}`}>实时峰值负荷</div>
        <div className="mt-2 text-[28px] font-bold tracking-[-0.04em] text-cyan-600">5,240</div>
        <div className={`mt-1 text-sm font-medium ${theme.textSecondary}`}>kW，峰值时段 13:00 - 15:00</div>
      </div>
    </div>

    <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="flex min-h-0 flex-1 flex-col gap-5">
        <div>
          <div className={`dashboard-kicker ${theme.textMuted}`}>今日累计电量</div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <div className={`dashboard-value-lg ${theme.textPrimary}`}>42,850.4</div>
            <div className={`dashboard-unit ${theme.textMuted}`}>kWh</div>
          </div>
          <div className={`mt-3 max-w-2xl text-sm leading-6 ${theme.textSecondary}`}>主指标与辅助信息统一左对齐，减少无效留白并强化阅读节奏。</div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MetricTile label="较昨日同期" theme={theme} value="+3.2%" />
          <MetricTile label="小时平均负荷" theme={theme} value="3,570 kWh" />
        </div>
      </div>

      <div className={`flex flex-col rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurface}`}>
        <div className={`dashboard-meta ${theme.textMuted}`}>7 时段负荷节奏</div>
        <div className="mt-4 flex flex-1 items-end gap-2">
          {energySparkBars.map((height, index) => (
            <div key={`energy-spark-${index}`} className="flex h-full flex-1 items-end">
              <div
                className={`w-full rounded-full ${
                  index === 4 ? 'bg-cyan-500' : isDarkMode ? 'bg-slate-500/75' : 'bg-slate-300'
                }`}
                style={{ height: `${height}%` }}
              />
            </div>
          ))}
        </div>
        <div className={`mt-3 flex items-center justify-between text-xs ${theme.textMuted}`}>
          <span>凌晨</span>
          <span>午间</span>
          <span>晚高峰</span>
        </div>
      </div>
    </div>
  </div>
);

const PowerCompositionCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader icon={BarChart3} subtitle="实时结构占比" theme={theme} title={widget.title} />
    <div className="flex flex-1 flex-col gap-4">
      <DonutGauge isDarkMode={isDarkMode} label="租户用电占比" percentage={60} />
      <div className="space-y-3">
        {powerCompositionData.map((item) => (
          <div key={item.label} className={`flex items-center justify-between rounded-[18px] border px-3.5 py-3 ${theme.chipSurface}`}>
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className={`text-sm font-medium ${theme.textSecondary}`}>{item.label}</span>
            </div>
            <span className={`text-sm font-semibold ${theme.textPrimary}`}>{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SolarPowerCard = ({ theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader
      icon={SunMedium}
      status={<DashboardPill className="bg-cyan-50 text-cyan-700">运行中</DashboardPill>}
      subtitle="实时监控"
      theme={theme}
      title={widget.title}
    />
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className={`dashboard-kicker ${theme.textMuted}`}>实时功率</div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className={`dashboard-value-md ${theme.textPrimary}`}>1,248.5</div>
          <div className={`dashboard-unit ${theme.textMuted}`}>kW</div>
        </div>
      </div>
      <div className={`rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurfaceStrong}`}>
        <div className={`dashboard-meta ${theme.textMuted}`}>今日累计发电</div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-bold tracking-[-0.03em] text-cyan-600">8,450 kWh</div>
            <div className={`mt-1 text-sm ${theme.textSecondary}`}>逆变效率 98.1%，运行状态稳定</div>
          </div>
          <SunMedium size={24} className="shrink-0 text-cyan-400" />
        </div>
      </div>
    </div>
  </div>
);

const SystemRankingCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader icon={ListTodo} subtitle="按系统维度" theme={theme} title={widget.title} />
    <div className="flex flex-1 flex-col gap-4">
      {systemRankingData.map((item, index) => (
        <div key={item.label}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isDarkMode ? 'bg-white/8 text-slate-100' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {index + 1}
              </span>
              <span className={`text-sm font-medium ${theme.textSecondary}`}>{item.label}</span>
            </div>
            <span className={`text-sm font-semibold ${theme.textPrimary}`}>{item.value}%</span>
          </div>
          <div className={`h-2.5 rounded-full ${isDarkMode ? 'bg-white/8' : 'bg-slate-100'}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-400"
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MultiEnergyCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-5">
    <WidgetHeader
      icon={Gauge}
      status={<DashboardPill className="bg-slate-100 text-slate-700">电 / 水 / 气</DashboardPill>}
      subtitle="中部主图表"
      theme={theme}
      title={widget.title}
    />
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricTile label="电能峰值" theme={theme} value="92 kWh" />
      <MetricTile label="水能午后回落" theme={theme} value="18 -> 12" />
      <MetricTile label="燃气总体稳定" theme={theme} value="6 - 18" />
    </div>

    <div className={`flex min-h-0 flex-1 flex-col rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurface}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className={`dashboard-meta ${theme.textMuted}`}>分时曲线</div>
        <div className="flex flex-wrap items-center gap-3">
          {multiEnergyLegend.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className={`text-xs font-medium ${theme.textSecondary}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-chart mt-4 min-h-[260px] flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={multiEnergySeries} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
            <defs>
              <linearGradient id="electricFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0f7a8d" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#0f7a8d" stopOpacity={0.03} />
              </linearGradient>
              <linearGradient id="waterFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#18b7d4" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#18b7d4" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gasFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f4a340" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#f4a340" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={chartGridColor(isDarkMode)} strokeDasharray="4 4" vertical={false} />
            <XAxis axisLine={false} dataKey="time" tick={{ fill: chartAxisColor(isDarkMode), fontSize: 12 }} tickLine={false} />
            <YAxis axisLine={false} tick={{ fill: chartAxisColor(isDarkMode), fontSize: 12 }} tickLine={false} width={32} />
            <Tooltip content={<ChartTooltip isDarkMode={isDarkMode} />} />
            <Area dataKey="electric" fill="url(#electricFill)" name="电能" stroke="#0f7a8d" strokeWidth={2.4} type="monotone" />
            <Area dataKey="water" fill="url(#waterFill)" name="水能" stroke="#18b7d4" strokeWidth={2.2} type="monotone" />
            <Area dataKey="gas" fill="url(#gasFill)" name="燃气" stroke="#f4a340" strokeWidth={2.2} type="monotone" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

const CarbonMonitorCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader icon={Leaf} subtitle="双碳监测" theme={theme} title={widget.title} />
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className={`dashboard-kicker ${theme.textMuted}`}>今日碳减排量</div>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className={`dashboard-value-md ${theme.textPrimary}`}>24.8</div>
          <div className={`dashboard-unit ${theme.textMuted}`}>tCO2e</div>
        </div>
      </div>

      <div className={`rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurface}`}>
        <div className="flex items-center justify-between gap-3">
          <div className={`dashboard-meta ${theme.textMuted}`}>月度目标进度</div>
          <div className={`text-sm font-semibold ${theme.textPrimary}`}>68%</div>
        </div>
        <div className={`mt-3 h-2.5 rounded-full ${isDarkMode ? 'bg-white/8' : 'bg-slate-100'}`}>
          <div className="h-full w-[68%] rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" />
        </div>
        <div className={`mt-4 text-sm leading-6 ${theme.textSecondary}`}>已抵消约 1,240 棵成年树木年吸收量，减排表现稳定。</div>
      </div>
    </div>
  </div>
);

const ForecastCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-5">
    <WidgetHeader
      icon={Activity}
      status={<DashboardPill className="bg-cyan-50 text-cyan-700">未来 24h</DashboardPill>}
      subtitle="预测与调度建议"
      theme={theme}
      title={widget.title}
    />
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div className={`flex min-h-0 flex-col rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurface}`}>
        <div className={`dashboard-meta ${theme.textMuted}`}>预测负荷曲线</div>
        <div className="dashboard-chart mt-4 min-h-[220px] flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastSeries} margin={{ bottom: 0, left: -12, right: 4, top: 8 }}>
              <defs>
                <linearGradient id="forecastFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={chartGridColor(isDarkMode)} strokeDasharray="4 4" vertical={false} />
              <XAxis axisLine={false} dataKey="time" tick={{ fill: chartAxisColor(isDarkMode), fontSize: 12 }} tickLine={false} />
              <YAxis axisLine={false} tick={{ fill: chartAxisColor(isDarkMode), fontSize: 12 }} tickLine={false} width={32} />
              <Tooltip content={<ChartTooltip isDarkMode={isDarkMode} />} />
              <Area dataKey="load" fill="url(#forecastFill)" name="负荷" stroke="#14b8a6" strokeWidth={2.4} type="monotone" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4">
        <MetricTile label="预测峰值窗口" theme={theme} value="18:00 - 21:00" />
        <MetricTile label="预计波动幅度" theme={theme} value="+6.4%" />
        <MetricTile label="建议动作" theme={theme} value="17:00 前启动预冷" />
      </div>
    </div>
  </div>
);

const StorageCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-5">
    <WidgetHeader icon={BatteryCharging} subtitle="储能调度" theme={theme} title={widget.title} />
    <div className="grid flex-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className={`rounded-[var(--dashboard-radius-panel)] border p-4 ${theme.panelSurfaceStrong}`}>
        <div className={`dashboard-kicker ${theme.textMuted}`}>可用容量</div>
        <div className={`mt-3 dashboard-value-md ${theme.textPrimary}`}>72%</div>
        <div className={`mt-2 text-sm leading-6 ${theme.textSecondary}`}>晚高峰前完成准备，预计可削峰 480 kW。</div>
      </div>

      <div className="grid gap-3">
        {storageTimeline.map((item) => (
          <div key={item.label} className={`rounded-[var(--dashboard-radius-panel)] border px-4 py-3 ${theme.panelSurface}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className={`text-sm font-semibold ${theme.textPrimary}`}>{item.label}</div>
                <div className={`mt-1 text-xs ${theme.textMuted}`}>{item.meta}</div>
              </div>
              <div className={`text-sm font-semibold ${theme.textPrimary}`}>{item.value}%</div>
            </div>
            <div className={`mt-3 h-2 rounded-full ${isDarkMode ? 'bg-white/8' : 'bg-slate-100'}`}>
              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400" style={{ width: `${item.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AlertClosureCard = ({ theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader icon={AlertTriangle} subtitle="处理闭环" theme={theme} title={widget.title} />
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className={`dashboard-kicker ${theme.textMuted}`}>5 分钟响应率</div>
        <div className={`mt-3 dashboard-value-md ${theme.textPrimary}`}>87%</div>
      </div>
      <div className="space-y-3">
        {alertSummary.map((item) => (
          <div key={item.label} className={`flex items-center justify-between rounded-[18px] border px-3.5 py-3 ${theme.chipSurface}`}>
            <span className={`text-sm font-medium ${theme.textSecondary}`}>{item.label}</span>
            <span className={`text-sm font-semibold ${theme.textPrimary}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const SavingsPoolCard = ({ theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col gap-4">
    <WidgetHeader icon={Sparkles} subtitle="节能机会池" theme={theme} title={widget.title} />
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <div className={`dashboard-kicker ${theme.textMuted}`}>预计月度收益</div>
        <div className={`mt-3 dashboard-value-md ${theme.textPrimary}`}>¥12.6 万</div>
      </div>
      <div className="space-y-3">
        {savingsSummary.map((item) => (
          <div key={item.label} className={`flex items-center justify-between rounded-[18px] border px-3.5 py-3 ${theme.chipSurface}`}>
            <span className={`text-sm font-medium ${theme.textSecondary}`}>{item.label}</span>
            <span className={`text-xs font-semibold ${theme.textPrimary}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const GenericInsightCard = ({ theme, widget }: WidgetBodyProps) => {
  const Icon = getWidgetIcon(widget);
  return (
    <div className="flex h-full flex-col gap-4">
      <WidgetHeader
        icon={Icon}
        status={<DashboardPill className={widget.category === 'custom' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-700'}>{widget.category === 'custom' ? 'AI 定制' : '系统卡片'}</DashboardPill>}
        subtitle={widget.description}
        theme={theme}
        title={widget.title}
      />
      <div className={`dashboard-value-md ${theme.textPrimary}`}>{widget.value}</div>
      <div className={`text-sm leading-6 ${theme.textSecondary}`}>{widget.helper}</div>
      <div className="space-y-3 pt-2">
        {widget.items.slice(0, widget.size === '1:1' ? 3 : 4).map((item) => (
          <div key={item} className={`flex items-start gap-3 rounded-[18px] border px-3.5 py-3 ${theme.chipSurface}`}>
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500" />
            <span className={`text-sm leading-6 ${theme.textSecondary}`}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const renderWidgetBody = (props: WidgetBodyProps) => {
  switch (props.widget.id) {
    case 'widget-energy':
      return <EnergyOverviewCard {...props} />;
    case 'widget-breakdown':
      return <PowerCompositionCard {...props} />;
    case 'widget-integration':
      return <SolarPowerCard {...props} />;
    case 'widget-actions':
      return <SystemRankingCard {...props} />;
    case 'widget-focus':
      return <MultiEnergyCard {...props} />;
    case 'widget-rhythm':
      return <CarbonMonitorCard {...props} />;
    case 'widget-forecast':
      return <ForecastCard {...props} />;
    case 'widget-storage':
      return <StorageCard {...props} />;
    case 'widget-alerts':
      return <AlertClosureCard {...props} />;
    case 'widget-savings':
      return <SavingsPoolCard {...props} />;
    default:
      return <GenericInsightCard {...props} />;
  }
};

type DashboardWidgetCardProps = {
  highlight?: boolean;
  isDarkMode: boolean;
  mode: WidgetCardMode;
  onRemove?: () => void;
  widget: DashboardWidget;
};

const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  highlight = false,
  isDarkMode,
  mode,
  onRemove,
  widget,
}) => {
  const theme = getDashboardTheme(isDarkMode);
  const cardInsetSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/88'
    : 'border-white/95 bg-white/96';
  const cardShadowClass = isDarkMode
    ? 'shadow-[var(--dashboard-shadow-dark)]'
    : 'shadow-[var(--dashboard-shadow-light)]';
  const cardHaloOpacityClass = isDarkMode ? 'opacity-30' : 'opacity-20';

  return (
    <article
      className={`${widgetSizeClassMap[widget.size]} ${widgetMobileHeightClassMap[widget.size]} relative min-w-0 overflow-hidden rounded-[var(--dashboard-radius-card)] transition duration-300 md:min-h-0 ${
        mode === 'board' ? 'hover:-translate-y-0.5' : ''
      } ${highlight ? 'ring-2 ring-cyan-400/55' : ''} ${cardShadowClass}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${widget.accent} ${cardHaloOpacityClass}`}
      />
      <div
        className={`pointer-events-none absolute inset-px rounded-[calc(var(--dashboard-radius-card)-1px)] border ${cardInsetSurface}`}
      />
      <div className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${widget.accent}`} />
      <div
        className={`pointer-events-none absolute inset-0 rounded-[var(--dashboard-radius-card)] ring-1 ring-inset ${
          isDarkMode ? 'ring-white/10' : 'ring-slate-900/6'
        }`}
      />
      {mode === 'preview' ? <WidgetToolbar isDarkMode={isDarkMode} onRemove={onRemove} /> : null}
      <div className={`relative flex min-h-full flex-col p-[var(--dashboard-card-padding)] ${mode === 'preview' ? 'pr-[88px]' : ''}`}>
        {renderWidgetBody({ isDarkMode, theme, widget })}
      </div>
    </article>
  );
};

const EditorSection = ({
  children,
  theme,
  title,
}: {
  children: React.ReactNode;
  theme: DashboardTheme;
  title: string;
}) => (
  <section className={`rounded-[var(--dashboard-radius-card)] border p-4 ${theme.canvasSurface}`}>
    <div className={`text-sm font-semibold ${theme.textPrimary}`}>{title}</div>
    <div className="mt-4">{children}</div>
  </section>
);

export const DashboardHome = ({
  dashboardState,
  editorOpen,
  isDarkMode,
  onChange,
  onCloseEditor,
}: {
  dashboardState: DashboardState;
  editorOpen: boolean;
  isDarkMode: boolean;
  onChange: React.Dispatch<React.SetStateAction<DashboardState>>;
  onCloseEditor: () => void;
}) => {
  const [newTabName, setNewTabName] = useState('');
  const [dragOverWidgetId, setDragOverWidgetId] = useState<string | null>(null);
  const [aiForm, setAiForm] = useState({ goal: '', name: '', prompt: '', size: '2:1' as WidgetSize });
  const [isGeneratingWidget, setIsGeneratingWidget] = useState(false);
  const theme = getDashboardTheme(isDarkMode);

  const activeTab = useMemo(
    () => dashboardState.tabs.find((tab) => tab.id === dashboardState.activeTabId) ?? dashboardState.tabs[0],
    [dashboardState.activeTabId, dashboardState.tabs],
  );

  const activeWidgets = useMemo(() => {
    const widgetMap = new Map(dashboardState.widgets.map((widget) => [widget.id, widget]));
    return activeTab.widgetIds.map((widgetId) => widgetMap.get(widgetId)).filter((widget): widget is DashboardWidget => Boolean(widget));
  }, [activeTab.widgetIds, dashboardState.widgets]);

  const reorderWidgets = (widgetIds: string[]) => {
    onChange((previous) => ({
      ...previous,
      tabs: previous.tabs.map((tab) => (tab.id === activeTab.id ? { ...tab, widgetIds } : tab)),
    }));
  };

  const updateWidget = (widgetId: string, updater: (widget: DashboardWidget) => DashboardWidget) => {
    onChange((previous) => ({
      ...previous,
      widgets: previous.widgets.map((widget) => (widget.id === widgetId ? updater(widget) : widget)),
    }));
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>, targetWidgetId?: string) => {
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData('application/json'));
    if (!payload) {
      setDragOverWidgetId(null);
      return;
    }
    const targetIndex = targetWidgetId ? activeTab.widgetIds.indexOf(targetWidgetId) : activeTab.widgetIds.length;
    reorderWidgets(upsertWidgetId(activeTab.widgetIds, payload.widgetId, targetIndex === -1 ? activeTab.widgetIds.length : targetIndex));
    setDragOverWidgetId(null);
  };

  const handleLibraryToggle = (widgetId: string) => {
    if (activeTab.widgetIds.includes(widgetId)) {
      reorderWidgets(activeTab.widgetIds.filter((id) => id !== widgetId));
      return;
    }
    reorderWidgets([...activeTab.widgetIds, widgetId]);
  };

  const handleTabNameChange = (name: string) => {
    onChange((previous) => ({
      ...previous,
      tabs: previous.tabs.map((tab) => (tab.id === activeTab.id ? { ...tab, name: name || '未命名看板' } : tab)),
    }));
  };

  const handleCreateTab = () => {
    const name = newTabName.trim() || `看板 ${dashboardState.tabs.length + 1}`;
    const nextTabId = createLocalId('dashboard-tab');
    onChange((previous) => ({
      ...previous,
      activeTabId: nextTabId,
      tabs: [...previous.tabs, { id: nextTabId, name, widgetIds: [] }],
    }));
    setNewTabName('');
  };

  const handleDeleteCurrentTab = () => {
    if (dashboardState.tabs.length <= 1) return;
    const nextTabs = dashboardState.tabs.filter((tab) => tab.id !== activeTab.id);
    onChange((previous) => ({ ...previous, activeTabId: nextTabs[0].id, tabs: nextTabs }));
  };

  const handleGenerateWidget = async () => {
    if (!aiForm.name.trim() || !aiForm.prompt.trim()) return;
    setIsGeneratingWidget(true);
    try {
      const artifact = await api.generateArtifact({
        artifactType: 'widget',
        goal: aiForm.goal.trim(),
        name: aiForm.name.trim(),
        prompt: aiForm.prompt.trim(),
        size: aiForm.size,
      });
      const widgetId = createLocalId('widget');
      const nextWidget: DashboardWidget = {
        accent: 'from-sky-500 via-indigo-400 to-transparent',
        category: 'custom',
        description: artifact.description,
        helper: artifact.summary,
        id: widgetId,
        items: artifact.items,
        size: aiForm.size,
        title: artifact.title,
        value: artifact.badge,
      };
      onChange((previous) => ({
        ...previous,
        tabs: previous.tabs.map((tab) => (tab.id === activeTab.id ? { ...tab, widgetIds: [...tab.widgetIds, widgetId] } : tab)),
        widgets: [...previous.widgets, nextWidget],
      }));
      setAiForm({ goal: '', name: '', prompt: '', size: '2:1' });
    } finally {
      setIsGeneratingWidget(false);
    }
  };

  return (
    <div className="dashboard-page flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <section className={`rounded-[var(--dashboard-radius-card)] border p-4 ${theme.boardSurface}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className={`dashboard-kicker ${theme.textMuted}`}>运行看板</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {dashboardState.tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChange((previous) => ({ ...previous, activeTabId: tab.id }))}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    tab.id === activeTab.id
                      ? isDarkMode
                        ? 'bg-white text-slate-900'
                        : 'bg-slate-900 text-white'
                      : `${theme.subtleSurface} ${theme.textSecondary}`
                  }`}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      <section className={`relative overflow-hidden rounded-[var(--dashboard-radius-card)] border p-5 ${theme.canvasSurface}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.10),transparent_40%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-cyan-500/60 via-sky-400/50 to-transparent" />

        {activeWidgets.length === 0 ? (
          <div className={`flex min-h-[420px] items-center justify-center rounded-[var(--dashboard-radius-panel)] border border-dashed ${theme.inputSurface}`}>
            <div className="max-w-md text-center">
              <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] ${isDarkMode ? 'bg-white/8 text-white' : 'bg-slate-900 text-white'}`}>
                <LayoutTemplate size={26} />
              </div>
              <div className={`mt-4 text-xl font-semibold ${theme.textPrimary}`}>当前看板还没有组件</div>
              <p className={`mt-2 text-sm leading-6 ${theme.textSecondary}`}>打开“编辑看板”，从左侧组件库拖入卡片，或直接生成新的定制组件。</p>
            </div>
          </div>
        ) : (
          <div className={dashboardGridClassName}>
            {activeWidgets.map((widget) => (
              <DashboardWidgetCard key={widget.id} isDarkMode={isDarkMode} mode="board" widget={widget} />
            ))}
          </div>
        )}
      </section>

      {editorOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-md">
          <div className={`flex h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-[36px] border ${theme.cardSurface}`}>
            <div className="border-b border-slate-200/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <DashboardPill className="bg-cyan-50 text-cyan-700">编辑模式</DashboardPill>
                  <h2 className={`mt-3 text-2xl font-semibold tracking-tight ${theme.textPrimary}`}>看板编辑器</h2>
                  <p className={`mt-2 text-sm leading-6 ${theme.textSecondary}`}>统一调整看板标签、组件比例与排序，右侧预览实时同步最终布局。</p>
                </div>
                <button type="button" onClick={onCloseEditor} className={`rounded-[18px] p-2.5 transition ${theme.subtleSurface} ${theme.textPrimary}`}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200/10 px-5 py-5">
                <div className="space-y-4">
                  <EditorSection theme={theme} title="看板标签">
                    <div className="flex flex-wrap gap-2">
                      {dashboardState.tabs.map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => onChange((previous) => ({ ...previous, activeTabId: tab.id }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            tab.id === activeTab.id
                              ? isDarkMode
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-900 text-white'
                              : `${theme.subtleSurface} ${theme.textSecondary}`
                          }`}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 space-y-3">
                      <input
                        value={activeTab.name}
                        onChange={(event) => handleTabNameChange(event.target.value)}
                        className={`w-full rounded-[18px] border px-4 py-3 text-sm focus:outline-none ${theme.inputSurface} ${theme.textPrimary}`}
                        placeholder="当前看板名称"
                      />
                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <input
                          value={newTabName}
                          onChange={(event) => setNewTabName(event.target.value)}
                          className={`rounded-[18px] border px-4 py-3 text-sm focus:outline-none ${theme.inputSurface} ${theme.textPrimary}`}
                          placeholder="新增看板名称"
                        />
                        <button type="button" onClick={handleCreateTab} className={`inline-flex items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-700'}`}>
                          <Plus size={15} />
                          新增
                        </button>
                        <button type="button" onClick={handleDeleteCurrentTab} className={`inline-flex items-center justify-center gap-2 rounded-[18px] border px-4 py-3 text-sm font-semibold ${theme.inputSurface} ${theme.textPrimary}`}>
                          <Trash2 size={15} />
                          删除
                        </button>
                      </div>
                    </div>
                  </EditorSection>

                  <EditorSection theme={theme} title="组件库">
                    <p className={`text-sm leading-6 ${theme.textSecondary}`}>点击加入看板，或直接拖到右侧预览区进行排序。比例切换会实时影响布局节奏。</p>
                    <div className="mt-4 space-y-3">
                      {dashboardState.widgets.map((widget) => {
                        const selected = activeTab.widgetIds.includes(widget.id);
                        const Icon = getWidgetIcon(widget);
                        return (
                          <div
                            key={widget.id}
                            draggable
                            onDragStart={(event) => event.dataTransfer.setData('application/json', JSON.stringify({ type: 'library', widgetId: widget.id } satisfies DragPayload))}
                            onDragEnd={() => setDragOverWidgetId(null)}
                            className={`cursor-grab rounded-[var(--dashboard-radius-panel)] border p-4 transition ${
                              selected
                                ? isDarkMode
                                  ? 'border-cyan-400/35 bg-cyan-400/8'
                                  : 'border-cyan-300 bg-cyan-50/85'
                                : theme.canvasSurface
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                  <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] border ${theme.panelSurfaceStrong}`}>
                                    <Icon size={18} className={theme.textPrimary} />
                                  </span>
                                  <div className="min-w-0">
                                    <div className={`truncate text-sm font-semibold ${theme.textPrimary}`}>{widget.title}</div>
                                    <div className={`mt-1 text-xs ${theme.textMuted}`}>{widget.helper}</div>
                                  </div>
                                </div>
                                <div className={`mt-3 text-sm leading-6 ${theme.textSecondary}`}>{widget.description}</div>
                              </div>
                              <span className={`rounded-[16px] p-2 ${theme.subtleSurface}`}>
                                <GripVertical size={16} className="text-slate-400" />
                              </span>
                            </div>

                            <div className={`mt-4 flex items-center justify-between gap-4 rounded-[18px] border p-3 ${theme.inputSurface}`}>
                              <div>
                                <div className={`dashboard-meta ${theme.textMuted}`}>布局比例</div>
                                <div className={`mt-1 text-sm font-semibold ${theme.textPrimary}`}>{widgetSizeLabelMap[widget.size]}</div>
                                <div className={`mt-1 text-xs leading-5 ${theme.textSecondary}`}>{sizeDescriptionMap[widget.size]}</div>
                              </div>
                              <RatioPreview isDarkMode={isDarkMode} size={widget.size} />
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              {sizeButtonOptions.map((size) => (
                                <button
                                  key={size}
                                  type="button"
                                  onClick={() => updateWidget(widget.id, (previous) => ({ ...previous, size }))}
                                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                    widget.size === size
                                      ? isDarkMode
                                        ? 'bg-white text-slate-900'
                                        : 'bg-slate-900 text-white'
                                      : `${theme.subtleSurface} ${theme.textSecondary}`
                                  }`}
                                >
                                  {widgetSizeLabelMap[size]}
                                </button>
                              ))}
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3">
                              <div className={`text-xs leading-5 ${theme.textMuted}`}>{widget.value}</div>
                              <button
                                type="button"
                                onClick={() => handleLibraryToggle(widget.id)}
                                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                                  selected
                                    ? isDarkMode
                                      ? 'bg-white text-slate-900'
                                      : 'bg-slate-900 text-white'
                                    : `${theme.inputSurface} ${theme.textPrimary}`
                                }`}
                              >
                                {selected ? '移出看板' : '加入看板'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </EditorSection>

                  <EditorSection theme={theme} title="AI 创建组件">
                    <p className={`text-sm leading-6 ${theme.textSecondary}`}>为当前看板生成新的组件结构，生成后会自动加入右侧预览区。</p>
                    <div className="mt-4 space-y-3">
                      <input
                        value={aiForm.name}
                        onChange={(event) => setAiForm((previous) => ({ ...previous, name: event.target.value }))}
                        className={`w-full rounded-[18px] border px-4 py-3 text-sm focus:outline-none ${theme.inputSurface} ${theme.textPrimary}`}
                        placeholder="组件名称"
                      />
                      <input
                        value={aiForm.goal}
                        onChange={(event) => setAiForm((previous) => ({ ...previous, goal: event.target.value }))}
                        className={`w-full rounded-[18px] border px-4 py-3 text-sm focus:outline-none ${theme.inputSurface} ${theme.textPrimary}`}
                        placeholder="业务目标，例如：监控夜间负荷异常"
                      />
                      <textarea
                        value={aiForm.prompt}
                        onChange={(event) => setAiForm((previous) => ({ ...previous, prompt: event.target.value }))}
                        className={`min-h-[120px] w-full resize-none rounded-[18px] border px-4 py-3 text-sm leading-6 focus:outline-none ${theme.inputSurface} ${theme.textPrimary}`}
                        placeholder="描述希望生成的组件内容，例如展示指标、分析重点和信息密度。"
                      />
                      <div className="flex flex-wrap gap-2">
                        {sizeButtonOptions.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => setAiForm((previous) => ({ ...previous, size }))}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              aiForm.size === size
                                ? isDarkMode
                                  ? 'bg-white text-slate-900'
                                  : 'bg-slate-900 text-white'
                                : `${theme.subtleSurface} ${theme.textSecondary}`
                            }`}
                          >
                            {widgetSizeLabelMap[size]}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleGenerateWidget()}
                        disabled={isGeneratingWidget}
                        className={`inline-flex w-full items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-700'}`}
                      >
                        <WandSparkles size={15} />
                        {isGeneratingWidget ? '生成中...' : '生成并加入当前看板'}
                      </button>
                    </div>
                  </EditorSection>
                </div>
              </aside>

              <section className="min-h-0 overflow-y-auto px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-lg font-semibold ${theme.textPrimary}`}>看板预览区</h3>
                    <p className={`mt-1 text-sm leading-6 ${theme.textSecondary}`}>从左侧拖入卡片即可加入看板，拖动已有卡片可以直接重排顺序。</p>
                  </div>
                  <div className={`text-sm font-medium ${theme.textSecondary}`}>{activeTab.name}</div>
                </div>

                <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleCanvasDrop(event)} className={`mt-5 rounded-[var(--dashboard-radius-card)] border border-dashed p-4 ${theme.inputSurface}`}>
                  {activeWidgets.length === 0 ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[var(--dashboard-radius-panel)]">
                      <div className="max-w-sm text-center">
                        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] ${isDarkMode ? 'bg-white/8 text-white' : 'bg-slate-900 text-white'}`}>
                          <LayoutTemplate size={26} />
                        </div>
                        <div className={`mt-4 text-xl font-semibold ${theme.textPrimary}`}>拖入卡片开始搭建</div>
                        <p className={`mt-2 text-sm leading-6 ${theme.textSecondary}`}>这里会实时预览当前看板，新增、排序和移除都会立即生效。</p>
                      </div>
                    </div>
                  ) : (
                    <div className={dashboardGridClassName}>
                      {activeWidgets.map((widget) => (
                        <div
                          key={widget.id}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData('application/json', JSON.stringify({ type: 'canvas', widgetId: widget.id } satisfies DragPayload))}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverWidgetId(widget.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverWidgetId === widget.id) setDragOverWidgetId(null);
                          }}
                          onDragEnd={() => setDragOverWidgetId(null)}
                          onDrop={(event) => handleCanvasDrop(event, widget.id)}
                          className="contents"
                        >
                          <DashboardWidgetCard
                            highlight={dragOverWidgetId === widget.id}
                            isDarkMode={isDarkMode}
                            mode="preview"
                            onRemove={() => handleLibraryToggle(widget.id)}
                            widget={widget}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
