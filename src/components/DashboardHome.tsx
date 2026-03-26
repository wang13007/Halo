import React, { useMemo, useState, type CSSProperties } from 'react';
import {
  BarChart3,
  Bolt,
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

type WidgetTheme = {
  cardSurface: string;
  chipSurface: string;
  line: string;
  panelSurface: string;
  textMuted: string;
  textPrimary: string;
  textSecondary: string;
  toolbarSurface: string;
  trackSurface: string;
};

type WidgetBodyProps = {
  isDarkMode: boolean;
  theme: WidgetTheme;
  widget: DashboardWidget;
};

type WidgetScale = {
  bodyGapClassName: string;
  chipPaddingClassName: string;
  chipTextClassName: string;
  donutInsetClassName: string;
  donutLabelClassName: string;
  donutValueClassName: string;
  donutWrapClassName: string;
  eyebrowClassName: string;
  iconBoxClassName: string;
  iconSize: number;
  majorMetricClassName: string;
  mediumMetricClassName: string;
  minorMetricClassName: string;
  panelPaddingClassName: string;
  sectionGapClassName: string;
  titleClassName: string;
  unitClassName: string;
};

const sizeButtonOptions: WidgetSize[] = ['1:1', '2:1', '2:2'];

const dashboardGridClassName =
  'grid grid-cols-1 gap-5 md:auto-rows-[220px] md:grid-cols-6 xl:grid-cols-12';

const widgetScaleMap: Record<WidgetSize, WidgetScale> = {
  '1:1': {
    bodyGapClassName: 'gap-5',
    chipPaddingClassName: 'px-3.5 py-3',
    chipTextClassName: 'text-[13px] leading-5',
    donutInsetClassName: 'inset-[14px]',
    donutLabelClassName: 'text-[11px]',
    donutValueClassName: 'text-[20px]',
    donutWrapClassName: 'h-32 w-32',
    eyebrowClassName: 'text-[10px] tracking-[0.14em]',
    iconBoxClassName: 'h-9 w-9 rounded-[18px]',
    iconSize: 17,
    majorMetricClassName: 'text-[34px] sm:text-[38px]',
    mediumMetricClassName: 'text-[28px] sm:text-[32px]',
    minorMetricClassName: 'text-[18px]',
    panelPaddingClassName: 'p-4',
    sectionGapClassName: 'mt-5',
    titleClassName: 'text-[14px] leading-5',
    unitClassName: 'pb-1 text-sm',
  },
  '2:1': {
    bodyGapClassName: 'gap-6',
    chipPaddingClassName: 'px-4 py-3',
    chipTextClassName: 'text-sm leading-6',
    donutInsetClassName: 'inset-[16px]',
    donutLabelClassName: 'text-xs',
    donutValueClassName: 'text-[22px]',
    donutWrapClassName: 'h-36 w-36',
    eyebrowClassName: 'text-[11px] tracking-[0.16em]',
    iconBoxClassName: 'h-10 w-10 rounded-[20px]',
    iconSize: 18,
    majorMetricClassName: 'text-[42px] sm:text-[50px] lg:text-[56px]',
    mediumMetricClassName: 'text-[34px] sm:text-[40px]',
    minorMetricClassName: 'text-[20px]',
    panelPaddingClassName: 'p-5',
    sectionGapClassName: 'mt-6',
    titleClassName: 'text-[15px] leading-5',
    unitClassName: 'pb-1.5 text-base sm:text-lg',
  },
  '2:2': {
    bodyGapClassName: 'gap-7',
    chipPaddingClassName: 'px-4 py-3.5',
    chipTextClassName: 'text-sm leading-6',
    donutInsetClassName: 'inset-[18px]',
    donutLabelClassName: 'text-sm',
    donutValueClassName: 'text-[24px]',
    donutWrapClassName: 'h-40 w-40',
    eyebrowClassName: 'text-[11px] tracking-[0.18em]',
    iconBoxClassName: 'h-11 w-11 rounded-[20px]',
    iconSize: 20,
    majorMetricClassName: 'text-[48px] sm:text-[56px] lg:text-[64px]',
    mediumMetricClassName: 'text-[36px] sm:text-[42px]',
    minorMetricClassName: 'text-[22px]',
    panelPaddingClassName: 'p-6',
    sectionGapClassName: 'mt-8',
    titleClassName: 'text-[16px] leading-6',
    unitClassName: 'pb-2 text-lg sm:text-xl',
  },
};

const widgetMobileHeightClassMap: Record<WidgetSize, string> = {
  '1:1': 'min-h-[320px]',
  '2:1': 'min-h-[280px]',
  '2:2': 'min-h-[520px]',
};

const sizeDescriptionMap: Record<WidgetSize, string> = {
  '1:1': '方形卡片，适合占比、排行和状态监控。',
  '2:1': '横向卡片，适合总览指标、趋势和综合摘要。',
  '2:2': '双高卡片，适合复杂图表、诊断或多段信息。',
};

const energySparkBars = [28, 42, 58, 86, 100, 76, 52];

const powerCompositionData = [
  { color: '#18b7d4', label: '商户租户', value: 60 },
  { color: '#d8e1ea', label: '公共区域', value: 40 },
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

const multiEnergyLegend = [
  { color: '#0f7a8d', key: 'electric', label: '电能' },
  { color: '#18b7d4', key: 'water', label: '水能' },
  { color: '#f4a340', key: 'gas', label: '燃气' },
] as const;

const widgetIconMap: Record<string, LucideIcon> = {
  'widget-actions': ListTodo,
  'widget-breakdown': BarChart3,
  'widget-energy': Bolt,
  'widget-focus': BarChart3,
  'widget-integration': SunMedium,
  'widget-rhythm': Leaf,
};

const clampTextStyle = (lines: number): CSSProperties =>
  lines <= 0
    ? {}
    : {
        WebkitBoxOrient: 'vertical',
        WebkitLineClamp: lines,
        display: '-webkit-box',
        overflow: 'hidden',
      };

const getWidgetScale = (size: WidgetSize) => widgetScaleMap[size];

const isDragPayload = (value: unknown): value is DragPayload => {
  if (!value || typeof value !== 'object') {
    return false;
  }

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
  if (fromIndex < 0 || fromIndex >= items.length || fromIndex === toIndex) {
    return items;
  }

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

const getWidgetTheme = (isDarkMode: boolean): WidgetTheme => ({
  cardSurface: isDarkMode
    ? 'border-white/10 bg-slate-900/88 shadow-[0_34px_90px_-54px_rgba(2,6,23,0.96)]'
    : 'border-white/90 bg-white shadow-[0_34px_90px_-54px_rgba(15,23,42,0.28)]',
  chipSurface: isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-slate-200/80 bg-[#f5f8fc]',
  line: isDarkMode ? 'border-white/10' : 'border-slate-200',
  panelSurface: isDarkMode ? 'bg-white/[0.05]' : 'bg-[#f4f7fb]',
  textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
  textPrimary: isDarkMode ? 'text-slate-100' : 'text-[#1b1f24]',
  textSecondary: isDarkMode ? 'text-slate-300' : 'text-slate-600',
  toolbarSurface: isDarkMode
    ? 'border-white/10 bg-slate-950/78 text-slate-100'
    : 'border-white/90 bg-white/92 text-slate-600',
  trackSurface: isDarkMode ? 'bg-white/[0.08]' : 'bg-[#dbe5ee]',
});

const RatioPreview = ({ isDarkMode, size }: { isDarkMode: boolean; size: WidgetSize }) => {
  const blockClassName =
    size === '1:1' ? 'h-10 w-10' : size === '2:1' ? 'h-8 w-14' : 'h-12 w-14';

  return (
    <div
      className={`inline-flex h-14 w-20 items-center justify-center rounded-[18px] border ${
        isDarkMode ? 'border-white/10 bg-slate-950/55' : 'border-slate-200 bg-white'
      }`}
    >
      <div className={`rounded-[12px] bg-gradient-to-r from-cyan-500 to-sky-400 ${blockClassName}`} />
    </div>
  );
};

const WidgetHeader = ({
  icon: Icon,
  iconSurfaceClassName,
  size,
  subtitle,
  theme,
  title,
  trailing,
}: {
  icon: LucideIcon;
  iconSurfaceClassName: string;
  size: WidgetSize;
  subtitle?: string;
  theme: WidgetTheme;
  title: string;
  trailing?: React.ReactNode;
}) => {
  const scale = getWidgetScale(size);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`inline-flex shrink-0 items-center justify-center ${scale.iconBoxClassName} ${iconSurfaceClassName}`}
        >
          <Icon size={scale.iconSize} />
        </span>

        <div className="min-w-0">
          <div
            className={`${scale.titleClassName} font-semibold ${theme.textSecondary}`}
            style={clampTextStyle(size === '1:1' ? 2 : 1)}
          >
            {title}
          </div>

          {subtitle && (
            <div
              className={`mt-1 font-semibold uppercase ${scale.eyebrowClassName} ${theme.textMuted}`}
              style={clampTextStyle(1)}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
};

const DonutGauge = ({
  isDarkMode,
  label,
  percentage,
  size,
}: {
  isDarkMode: boolean;
  label: string;
  percentage: number;
  size?: WidgetSize;
}) => {
  const scale = getWidgetScale(size ?? '2:1');
  const angle = percentage * 3.6;
  const ringStyle: CSSProperties = {
    background: `conic-gradient(#18b7d4 0deg ${angle}deg, ${
      isDarkMode ? 'rgba(148,163,184,0.22)' : '#e2e8f0'
    } ${angle}deg 360deg)`,
  };

  return (
    <div className={`relative mx-auto ${scale.donutWrapClassName}`}>
      <div className="absolute inset-0 rounded-full" style={ringStyle} />
      <div
        className={`absolute ${scale.donutInsetClassName} rounded-full`}
        style={{ backgroundColor: isDarkMode ? '#0f172a' : '#ffffff' }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div
          className={`${scale.donutValueClassName} font-black leading-none ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}
        >
          {percentage}%
        </div>
        <div className={`mt-1 ${scale.donutLabelClassName} ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          {label}
        </div>
      </div>
    </div>
  );
};

const WidgetToolbar = ({ theme, onRemove }: { theme: WidgetTheme; onRemove?: () => void }) => (
  <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
    <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${theme.toolbarSurface}`}>
      <GripVertical size={16} />
    </div>
    {onRemove && (
      <button
        aria-label="移出看板"
        type="button"
        onClick={onRemove}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border transition hover:text-rose-500 ${theme.toolbarSurface}`}
      >
        <X size={16} />
      </button>
    )}
  </div>
);

const EnergyOverviewCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => {
  const isSquare = widget.size === '1:1';
  const scale = getWidgetScale(widget.size);
  const sparkBarClassName =
    widget.size === '1:1' ? 'h-14 w-2' : widget.size === '2:2' ? 'h-20 w-3' : 'h-16 w-2.5';

  return (
    <div className="flex h-full flex-col">
      <div className={`flex ${isSquare ? 'flex-col items-start gap-4' : 'items-start justify-between gap-4'}`}>
        <div className="min-w-0 flex-1">
          <WidgetHeader
            icon={Bolt}
            iconSurfaceClassName={isDarkMode ? 'bg-cyan-500/12 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}
            size={widget.size}
            theme={theme}
            title={widget.title}
          />
        </div>

        <div
          className={`relative w-full overflow-hidden rounded-[26px] border pr-8 ${theme.line} ${scale.panelPaddingClassName} ${
            isSquare ? '' : 'sm:min-w-[168px] sm:max-w-[220px]'
          }`}
        >
          <div className="absolute -right-4 -top-3 h-24 w-24 rounded-[28px] bg-cyan-300/20" />
          <div className={`relative text-sm ${theme.textMuted}`}>峰值负荷</div>
          <div className={`relative mt-2 font-black text-cyan-600 ${scale.minorMetricClassName}`}>
            5,240
            <span className={`ml-1 text-sm font-semibold ${theme.textSecondary}`}>kW</span>
          </div>
        </div>
      </div>

      <div className={`${scale.sectionGapClassName} flex flex-1 flex-col justify-between ${scale.bodyGapClassName}`}>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <div className={`font-black leading-none tracking-[-0.06em] ${scale.majorMetricClassName} ${theme.textPrimary}`}>
            42,850.4
          </div>
          <div className={`${scale.unitClassName} ${theme.textMuted}`}>kWh</div>
        </div>

        <div
          className={`grid gap-4 border-t pt-5 ${theme.line} ${
            isSquare ? '' : 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'
          }`}
        >
          <div>
            <div className={`text-sm ${theme.textMuted}`}>昨日同期对比</div>
            <div className="mt-2 text-[15px] font-bold text-rose-500">+3.2%</div>
          </div>

          <div>
            <div className={`text-sm ${theme.textMuted}`}>平均小时能耗</div>
            <div className={`mt-2 text-[15px] font-bold ${theme.textPrimary}`}>3,570 kWh</div>
          </div>

          <div className={`flex items-end gap-1.5 ${isSquare ? 'justify-start' : 'justify-end'}`}>
            {energySparkBars.map((height, index) => (
              <span
                key={`energy-bar-${index}`}
                className={`relative flex items-end overflow-hidden rounded-full ${sparkBarClassName} ${theme.trackSurface}`}
              >
                <span
                  className={`w-full rounded-full ${
                    index === 4 ? 'bg-cyan-500' : isDarkMode ? 'bg-slate-500/70' : 'bg-slate-300'
                  }`}
                  style={{ height: `${height}%` }}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PowerCompositionCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => {
  const isSquare = widget.size === '1:1';
  const scale = getWidgetScale(widget.size);

  return (
    <div className="flex h-full flex-col">
      <WidgetHeader
        icon={BarChart3}
        iconSurfaceClassName={isDarkMode ? 'bg-cyan-500/12 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}
        size={widget.size}
        theme={theme}
        title={widget.title}
      />
      <div className={`${scale.sectionGapClassName} flex flex-1 flex-col ${isSquare ? '' : 'justify-center'}`}>
        <DonutGauge isDarkMode={isDarkMode} label="租户用电" percentage={60} size={widget.size} />

        <div className={`${widget.size === '1:1' ? 'mt-5' : 'mt-6'} space-y-3`}>
          {powerCompositionData.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className={`${scale.titleClassName} ${theme.textSecondary}`}>{item.label}</span>
              </div>
              <span className={`${scale.titleClassName} font-semibold ${theme.textPrimary}`}>{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SolarPowerCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col">
    <div className="absolute inset-x-0 top-0 h-1.5 bg-cyan-500" />

    <WidgetHeader
      icon={SunMedium}
      iconSurfaceClassName={isDarkMode ? 'bg-cyan-500/12 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}
      size={widget.size}
      theme={theme}
      title={widget.title}
      trailing={
        <span
          className={`rounded-xl font-bold uppercase ${
            widget.size === '1:1' ? 'px-2.5 py-1 text-[10px] tracking-[0.14em]' : 'px-3 py-1 text-xs tracking-[0.08em]'
          } ${isDarkMode ? 'bg-cyan-500/14 text-cyan-100' : 'bg-cyan-50 text-cyan-700'}`}
        >
          ACTIVE
        </span>
      }
    />

    <div className={`mt-8 text-sm ${theme.textMuted}`}>当前实时功率</div>
    <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
      <div
        className={`font-black leading-none tracking-[-0.05em] ${theme.textPrimary} ${
          widget.size === '1:1'
            ? 'text-[28px] sm:text-[32px]'
            : widget.size === '2:2'
              ? 'text-[36px] sm:text-[42px]'
              : 'text-[34px] sm:text-[40px]'
        }`}
      >
        1,248.5
      </div>
      <div
        className={`${
          widget.size === '1:1' ? 'pb-1 text-sm' : widget.size === '2:2' ? 'pb-2 text-lg sm:text-xl' : 'pb-1.5 text-base'
        } ${theme.textMuted}`}
      >
        kW
      </div>
    </div>

    <div
      className={`mt-auto rounded-[24px] ${
        widget.size === '1:1' ? 'p-4' : widget.size === '2:2' ? 'p-6' : 'p-5'
      } ${theme.panelSurface}`}
    >
      <div className={`text-sm ${theme.textMuted}`}>今日累计发电</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div
          className={`font-black text-cyan-500 ${
            widget.size === '1:1' ? 'text-[18px]' : widget.size === '2:2' ? 'text-[22px]' : 'text-[20px]'
          }`}
        >
          8,450 kWh
        </div>
        <SunMedium size={widget.size === '1:1' ? 22 : widget.size === '2:2' ? 28 : 24} className="shrink-0 text-cyan-300" />
      </div>
    </div>
  </div>
);

const SystemRankingCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col">
    <WidgetHeader
      icon={ListTodo}
      iconSurfaceClassName={isDarkMode ? 'bg-cyan-500/12 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}
      size={widget.size}
      theme={theme}
      title={widget.title}
    />

    <div className={`${widget.size === '1:1' ? 'mt-5 space-y-4' : widget.size === '2:2' ? 'mt-8 space-y-6' : 'mt-6 space-y-5'}`}>
      {systemRankingData.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between gap-3">
            <span
              className={`min-w-0 ${
                widget.size === '1:1' ? 'text-[14px]' : widget.size === '2:2' ? 'text-base' : 'text-[15px]'
              } ${theme.textPrimary}`}
            >
              {item.label}
            </span>
            <span
              className={`shrink-0 font-semibold ${
                widget.size === '1:1' ? 'text-[14px]' : widget.size === '2:2' ? 'text-base' : 'text-[15px]'
              } ${theme.textSecondary}`}
            >
              {item.value}%
            </span>
          </div>
          <div className={`mt-3 h-2.5 rounded-full ${theme.trackSurface}`}>
            <div className="h-full rounded-full bg-cyan-500" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MultiEnergyCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => {
  const chartHeightClass =
    widget.size === '1:1' ? 'h-32' : widget.size === '2:2' ? 'h-56' : 'h-40';
  const barWidthClassName = widget.size === '2:2' ? 'w-4 sm:w-5' : 'w-3 sm:w-4';

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <WidgetHeader
            icon={BarChart3}
            iconSurfaceClassName={isDarkMode ? 'bg-cyan-500/12 text-cyan-200' : 'bg-cyan-50 text-cyan-700'}
            size={widget.size}
            theme={theme}
            title={widget.title}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {multiEnergyLegend.map((legend) => (
            <div key={legend.key} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: legend.color }} />
              <span className={`${widget.size === '1:1' ? 'text-[12px]' : 'text-sm'} ${theme.textSecondary}`}>
                {legend.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`${
          widget.size === '1:1' ? 'mt-5' : widget.size === '2:2' ? 'mt-8' : 'mt-6'
        } flex flex-1 items-end gap-3 border-b pb-4 ${theme.line} ${chartHeightClass}`}
      >
        {multiEnergySeries.map((item) => (
          <div key={item.time} className="flex flex-1 flex-col items-center justify-end gap-2.5">
            <div className="flex h-full items-end gap-1.5">
              {multiEnergyLegend.map((legend) => (
                <div
                  key={`${item.time}-${legend.key}`}
                  className={`${barWidthClassName} rounded-t-[4px]`}
                  style={{
                    backgroundColor: legend.color,
                    height: `${item[legend.key]}%`,
                  }}
                />
              ))}
            </div>
            <div className={`text-xs font-medium ${theme.textMuted}`}>{item.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CarbonMonitorCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => (
  <div className="flex h-full flex-col">
    <WidgetHeader
      icon={Leaf}
      iconSurfaceClassName={isDarkMode ? 'bg-emerald-500/12 text-emerald-200' : 'bg-emerald-50 text-emerald-700'}
      size={widget.size}
      theme={theme}
      title={widget.title}
    />

    <div className={`mt-8 text-sm ${theme.textMuted}`}>今日碳减排量</div>
    <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
      <div
        className={`font-black leading-none tracking-[-0.05em] ${theme.textPrimary} ${
          widget.size === '1:1'
            ? 'text-[30px] sm:text-[34px]'
            : widget.size === '2:2'
              ? 'text-[38px] sm:text-[44px]'
              : 'text-[34px] sm:text-[40px]'
        }`}
      >
        24.8
      </div>
      <div
        className={`${
          widget.size === '1:1' ? 'pb-1 text-sm' : widget.size === '2:2' ? 'pb-2 text-lg sm:text-xl' : 'pb-1.5 text-base'
        } ${theme.textMuted}`}
      >
        tCO2e
      </div>
    </div>

    <div
      className={`mt-auto rounded-[24px] ${
        widget.size === '1:1' ? 'p-4' : widget.size === '2:2' ? 'p-6' : 'p-5'
      } ${theme.panelSurface}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`text-sm ${theme.textMuted}`}>本月目标进度</div>
        <div className="text-sm font-bold text-cyan-600">68%</div>
      </div>
      <div className={`mt-4 h-2.5 rounded-full ${theme.trackSurface}`}>
        <div className="h-full rounded-full bg-[#0f7a8d]" style={{ width: '68%' }} />
      </div>
      <div className={`mt-5 text-sm leading-6 ${theme.textSecondary}`}>
        已抵消约 1,240 棵成年树木年度碳吸收量
      </div>
    </div>
  </div>
);

const GenericInsightCard = ({ isDarkMode, theme, widget }: WidgetBodyProps) => {
  const Icon = getWidgetIcon(widget);
  const scale = getWidgetScale(widget.size);
  const visibleItems = widget.items.slice(0, widget.size === '1:1' ? 3 : 4);

  return (
    <div className="relative flex h-full flex-col">
      <div className={`absolute inset-x-0 top-0 h-1.5 rounded-t-[28px] bg-gradient-to-r ${widget.accent}`} />

      <WidgetHeader
        icon={Icon}
        iconSurfaceClassName={isDarkMode ? 'bg-blue-500/12 text-blue-200' : 'bg-blue-50 text-blue-700'}
        size={widget.size}
        subtitle={widget.category === 'custom' ? 'AI 瀹氬埗' : '绯荤粺鍗＄墖'}
        theme={theme}
        title={widget.title}
      />
      {/*
          <span
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${
              isDarkMode ? 'bg-blue-500/12 text-blue-200' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Icon size={20} />
          </span>
          <div>
            <div className={`text-[15px] font-semibold ${theme.textSecondary}`}>{widget.title}</div>
            <div className={`mt-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.textMuted}`}>
              {widget.category === 'custom' ? 'AI 定制' : '系统卡片'}
            </div>
          </div>
        </div>
      </div>

      */}
      <div className={`${scale.sectionGapClassName} ${scale.mediumMetricClassName} font-black leading-none tracking-[-0.05em] ${theme.textPrimary}`}>
        {widget.value}
      </div>

      <p
        className={`mt-4 ${widget.size === '1:1' ? 'text-[13px] leading-5' : 'text-sm leading-6'} ${theme.textSecondary}`}
        style={clampTextStyle(widget.size === '1:1' ? 2 : 3)}
      >
        {widget.helper}
      </p>

      <p
        className={`mt-3 ${widget.size === '1:1' ? 'text-[13px] leading-5' : 'text-sm leading-6'} ${theme.textMuted}`}
        style={clampTextStyle(widget.size === '1:1' ? 3 : 4)}
      >
        {widget.description}
      </p>

      <div className={`mt-auto ${widget.size === '1:1' ? 'space-y-2.5' : 'space-y-3'} pt-6`}>
        {visibleItems.map((item) => (
          <div
            key={item}
            className={`flex items-start gap-3 rounded-[18px] border ${scale.chipPaddingClassName} ${theme.chipSurface}`}
          >
            <span
              className={`mt-1 shrink-0 rounded-full bg-cyan-500 ${
                widget.size === '1:1' ? 'h-2 w-2' : 'h-2.5 w-2.5'
              }`}
            />
            <span className={`${scale.chipTextClassName} ${theme.textSecondary}`}>{item}</span>
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
  const theme = getWidgetTheme(isDarkMode);
  const framePaddingClassName =
    widget.size === '1:1' ? 'p-5 sm:p-6' : widget.size === '2:2' ? 'p-6 sm:p-7' : 'p-5 sm:p-6';

  return (
    <article
      className={`${widgetSizeClassMap[widget.size]} ${widgetMobileHeightClassMap[widget.size]} relative min-w-0 overflow-hidden rounded-[30px] border transition duration-300 md:h-full md:min-h-0 ${
        mode === 'board' ? 'hover:-translate-y-1 hover:shadow-[0_36px_90px_-56px_rgba(15,23,42,0.34)]' : ''
      } ${highlight ? 'ring-2 ring-cyan-400/55' : ''} ${theme.cardSurface}`}
    >
      {mode === 'preview' && <WidgetToolbar theme={theme} onRemove={onRemove} />}
      <div
        className={`relative flex h-full min-w-0 flex-col ${framePaddingClassName} ${
          mode === 'preview' ? 'pr-20 sm:pr-24' : ''
        }`}
      >
        {renderWidgetBody({ isDarkMode, theme, widget })}
      </div>
    </article>
  );
};

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

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode ? 'border-white/10 bg-slate-900/70' : 'border-white/80 bg-white/84';
  const sectionSurface = isDarkMode ? 'border-white/10 bg-white/[0.04]' : 'border-slate-200/70 bg-white/76';
  const inputSurface = isDarkMode ? 'border-white/10 bg-slate-950/45' : 'border-slate-200/70 bg-white';
  const mutedSurface = isDarkMode ? 'bg-white/7' : 'bg-slate-100';
  const dashedSurface = isDarkMode ? 'border-white/12 bg-slate-950/40' : 'border-slate-200/70 bg-white/65';

  const activeTab = useMemo(
    () => dashboardState.tabs.find((tab) => tab.id === dashboardState.activeTabId) ?? dashboardState.tabs[0],
    [dashboardState.activeTabId, dashboardState.tabs],
  );

  const activeWidgets = useMemo(() => {
    const widgetMap = new Map(dashboardState.widgets.map((widget) => [widget.id, widget]));
    return activeTab.widgetIds
      .map((widgetId) => widgetMap.get(widgetId))
      .filter((widget): widget is DashboardWidget => Boolean(widget));
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

  const handleDropWidget = (payload: DragPayload, targetIndex?: number) => {
    const insertAt = targetIndex ?? activeTab.widgetIds.length;
    const nextIds = upsertWidgetId(activeTab.widgetIds, payload.widgetId, insertAt);
    reorderWidgets(nextIds);
    setDragOverWidgetId(null);
  };

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>, targetWidgetId?: string) => {
    event.preventDefault();
    const payload = parseDragPayload(event.dataTransfer.getData('application/json'));

    if (!payload) {
      setDragOverWidgetId(null);
      return;
    }

    if (targetWidgetId) {
      const targetIndex = activeTab.widgetIds.indexOf(targetWidgetId);
      handleDropWidget(payload, targetIndex === -1 ? activeTab.widgetIds.length : targetIndex);
      return;
    }

    handleDropWidget(payload);
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
    if (dashboardState.tabs.length <= 1) {
      return;
    }

    const nextTabs = dashboardState.tabs.filter((tab) => tab.id !== activeTab.id);
    onChange((previous) => ({ ...previous, activeTabId: nextTabs[0].id, tabs: nextTabs }));
  };

  const handleGenerateWidget = async () => {
    if (!aiForm.name.trim() || !aiForm.prompt.trim()) {
      return;
    }

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
        tabs: previous.tabs.map((tab) =>
          tab.id === activeTab.id ? { ...tab, widgetIds: [...tab.widgetIds, widgetId] } : tab,
        ),
        widgets: [...previous.widgets, nextWidget],
      }));

      setAiForm({ goal: '', name: '', prompt: '', size: '2:1' });
    } finally {
      setIsGeneratingWidget(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {dashboardState.tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                onChange((previous) => ({
                  ...previous,
                  activeTabId: tab.id,
                }))
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                tab.id === activeTab.id
                  ? isDarkMode
                    ? 'bg-white text-slate-900'
                    : 'bg-slate-900 text-white'
                  : `${sectionSurface} ${textPrimary}`
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${mutedSurface} ${textSecondary}`}
        >
          <Sparkles size={15} className="text-cyan-500" />
          当前看板展示 {activeWidgets.length} 个小组件
        </div>
      </div>

      <section
        className={`relative overflow-hidden rounded-[32px] border p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] ${cardSurface}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_42%)]" />

        <div className="relative flex flex-col">
          {activeWidgets.length === 0 ? (
            <div
              className={`flex h-full min-h-[360px] items-center justify-center rounded-[28px] border border-dashed p-6 ${dashedSurface}`}
            >
              <div className="max-w-md text-center">
                <div
                  className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] ${
                    isDarkMode ? 'bg-white/8 text-white' : 'bg-slate-900 text-white'
                  }`}
                >
                  <LayoutTemplate size={26} />
                </div>
                <div className={`mt-4 text-xl font-black ${textPrimary}`}>当前看板还没有卡片</div>
                <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                  打开“编辑看板”，从左侧组件库拖入卡片，或者直接使用 AI Coding 生成新的看板模块。
                </p>
              </div>
            </div>
          ) : (
            <div className={dashboardGridClassName}>
              {activeWidgets.map((widget) => (
                <DashboardWidgetCard
                  key={widget.id}
                  isDarkMode={isDarkMode}
                  mode="board"
                  widget={widget}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
          <div
            className={`flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-[36px] border shadow-[0_42px_110px_-46px_rgba(15,23,42,0.7)] ${cardSurface}`}
          >
            <div className="border-b border-slate-200/10 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${
                      isDarkMode
                        ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                        : 'border-cyan-200 bg-cyan-50 text-cyan-700'
                    }`}
                  >
                    <Sparkles size={14} />
                    编辑模式
                  </div>
                  <h2 className={`mt-3 text-2xl font-black ${textPrimary}`}>看板编辑器</h2>
                  <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                    管理看板标签、小组件比例与拖拽排序，右侧预览区会实时同步最终布局。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onCloseEditor}
                  className={`rounded-2xl p-2.5 transition ${mutedSurface} ${textPrimary}`}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[380px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200/10 px-5 py-5">
                <section className={`rounded-[26px] border p-4 shadow-sm ${sectionSurface}`}>
                  <div className="flex items-center gap-2">
                    <LayoutTemplate size={16} className="text-cyan-500" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      看板标签
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {dashboardState.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          onChange((previous) => ({
                            ...previous,
                            activeTabId: tab.id,
                          }))
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          tab.id === activeTab.id
                            ? isDarkMode
                              ? 'bg-white text-slate-900'
                              : 'bg-slate-900 text-white'
                            : `${mutedSurface} ${textPrimary}`
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
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${inputSurface} ${textPrimary}`}
                      placeholder="当前看板名称"
                    />

                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input
                        value={newTabName}
                        onChange={(event) => setNewTabName(event.target.value)}
                        className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${inputSurface} ${textPrimary}`}
                        placeholder="新增看板名称"
                      />
                      <button
                        type="button"
                        onClick={handleCreateTab}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                          isDarkMode
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-slate-900 text-white hover:bg-slate-700'
                        }`}
                      >
                        <Plus size={15} />
                        新增
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteCurrentTab}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${inputSurface} ${textPrimary}`}
                      >
                        <Trash2 size={15} />
                        删除
                      </button>
                    </div>
                  </div>
                </section>

                <section className={`mt-4 rounded-[26px] border p-4 shadow-sm ${sectionSurface}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-500" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      小组件库
                    </h3>
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                    点击加入看板，或直接拖到右侧预览区进行排序。比例切换会实时影响布局。
                  </p>

                  <div className="mt-4 space-y-3">
                    {dashboardState.widgets.map((widget) => {
                      const selected = activeTab.widgetIds.includes(widget.id);
                      const Icon = getWidgetIcon(widget);

                      return (
                        <div
                          key={widget.id}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ type: 'library', widgetId: widget.id } satisfies DragPayload),
                            )
                          }
                          onDragEnd={() => setDragOverWidgetId(null)}
                          className={`cursor-grab rounded-[24px] border p-4 transition ${
                            selected
                              ? isDarkMode
                                ? 'border-cyan-400/40 bg-cyan-400/8'
                                : 'border-cyan-300 bg-cyan-50/80'
                              : sectionSurface
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                                    isDarkMode ? 'bg-white/8 text-cyan-200' : 'bg-cyan-50 text-cyan-700'
                                  }`}
                                >
                                  <Icon size={18} />
                                </span>
                                <div className={`text-base font-black ${textPrimary}`}>{widget.title}</div>
                              </div>
                              <div className={`mt-3 text-sm leading-6 ${textSecondary}`}>{widget.description}</div>
                            </div>
                            <div className={`rounded-2xl p-2 ${mutedSurface}`}>
                              <GripVertical size={16} className="text-slate-400" />
                            </div>
                          </div>

                          <div
                            className={`mt-4 flex items-center justify-between gap-4 rounded-[22px] border p-3 ${inputSurface}`}
                          >
                            <div>
                              <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${textSecondary}`}>
                                布局比例
                              </div>
                              <div className={`mt-1 text-sm font-semibold ${textPrimary}`}>
                                {widgetSizeLabelMap[widget.size]}
                              </div>
                              <div className={`mt-2 text-xs leading-5 ${textSecondary}`}>
                                {sizeDescriptionMap[widget.size]}
                              </div>
                            </div>
                            <RatioPreview isDarkMode={isDarkMode} size={widget.size} />
                          </div>

                          <div className="mt-4 flex flex-wrap items-center gap-2">
                            {sizeButtonOptions.map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => updateWidget(widget.id, (previous) => ({ ...previous, size }))}
                                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                                  widget.size === size
                                    ? isDarkMode
                                      ? 'bg-white text-slate-900'
                                      : 'bg-slate-900 text-white'
                                    : `${mutedSurface} ${textPrimary}`
                                }`}
                              >
                                {widgetSizeLabelMap[size]}
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className={`text-xs leading-5 ${textSecondary}`}>{widget.helper}</div>
                            <button
                              type="button"
                              onClick={() => handleLibraryToggle(widget.id)}
                              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                                selected
                                  ? isDarkMode
                                    ? 'bg-white text-slate-900'
                                    : 'bg-slate-900 text-white'
                                  : `${inputSurface} ${textPrimary}`
                              }`}
                            >
                              {selected ? '移出看板' : '加入看板'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={`mt-4 rounded-[26px] border p-4 shadow-sm ${sectionSurface}`}>
                  <div className="flex items-center gap-2">
                    <WandSparkles size={16} className="text-blue-500" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      AI Coding 创建小组件
                    </h3>
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                    为当前看板生成新的卡片结构，生成后会自动加入右侧预览区。
                  </p>

                  <div className="mt-4 space-y-3">
                    <input
                      value={aiForm.name}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, name: event.target.value }))
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${inputSurface} ${textPrimary}`}
                      placeholder="小组件名称"
                    />
                    <input
                      value={aiForm.goal}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, goal: event.target.value }))
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${inputSurface} ${textPrimary}`}
                      placeholder="业务目标，例如：监控夜间负荷异常"
                    />
                    <textarea
                      value={aiForm.prompt}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, prompt: event.target.value }))
                      }
                      className={`min-h-[120px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 focus:outline-none ${inputSurface} ${textPrimary}`}
                      placeholder="描述你希望 AI Coding 生成什么样的小组件，例如展示指标、分析重点和摘要风格。"
                    />

                    <div className="flex flex-wrap gap-2">
                      {sizeButtonOptions.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setAiForm((previous) => ({ ...previous, size }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                            aiForm.size === size
                              ? isDarkMode
                                ? 'bg-white text-slate-900'
                                : 'bg-slate-900 text-white'
                              : `${mutedSurface} ${textPrimary}`
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
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDarkMode
                          ? 'bg-white text-slate-900 hover:bg-slate-100'
                          : 'bg-slate-900 text-white hover:bg-slate-700'
                      }`}
                    >
                      <WandSparkles size={15} />
                      {isGeneratingWidget ? '生成中...' : '生成并加入当前看板'}
                    </button>
                  </div>
                </section>
              </aside>

              <section className="min-h-0 overflow-y-auto px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>看板预览区</h3>
                    <p className={`mt-1 text-sm leading-6 ${textSecondary}`}>
                      从左侧拖拽卡片到这里即可加入看板；拖动卡片本身则可以重新排序。
                    </p>
                  </div>
                  <div className={`text-sm font-semibold ${textSecondary}`}>{activeTab.name}</div>
                </div>

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleCanvasDrop(event)}
                  className={`mt-5 rounded-[28px] border border-dashed p-4 ${dashedSurface}`}
                >
                  {activeWidgets.length === 0 ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[24px]">
                      <div className="max-w-sm text-center">
                        <div
                          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] ${
                            isDarkMode ? 'bg-white/8 text-white' : 'bg-slate-900 text-white'
                          }`}
                        >
                          <LayoutTemplate size={26} />
                        </div>
                        <div className={`mt-4 text-xl font-black ${textPrimary}`}>拖入卡片开始搭建</div>
                        <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                          这里会实时预览当前看板，新增、排序和移除操作都会即时生效。
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className={dashboardGridClassName}>
                      {activeWidgets.map((widget) => (
                        <div
                          key={widget.id}
                          draggable
                          onDragStart={(event) =>
                            event.dataTransfer.setData(
                              'application/json',
                              JSON.stringify({ type: 'canvas', widgetId: widget.id } satisfies DragPayload),
                            )
                          }
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragOverWidgetId(widget.id);
                          }}
                          onDragLeave={() => {
                            if (dragOverWidgetId === widget.id) {
                              setDragOverWidgetId(null);
                            }
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
      )}
    </div>
  );
};
