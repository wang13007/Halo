import React, { useMemo, useState, type CSSProperties } from 'react';
import {
  Activity,
  BarChart3,
  Bolt,
  GripVertical,
  LayoutTemplate,
  ListTodo,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
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
type WidgetTone = 'amber' | 'blue' | 'cyan' | 'emerald' | 'slate' | 'violet';

type WidgetPaletteDefinition = {
  chipLabel: string;
  icon: LucideIcon;
  tone: WidgetTone;
};

type WidgetPalette = WidgetPaletteDefinition & {
  barFillClass: string;
  dotClass: string;
  glowClass: string;
  iconWrapClass: string;
  itemIconClass: string;
  pillClass: string;
};

const sizeButtonOptions: WidgetSize[] = ['small', 'medium', 'large'];

const widgetHeightClassMap: Record<WidgetSize, string> = {
  large: 'min-h-[220px] md:aspect-[2.12/1] md:h-auto',
  medium: 'min-h-[204px] md:aspect-[2.12/1] md:h-auto',
  small: 'min-h-[204px] md:aspect-square md:h-auto',
};

const widgetTitleClassMap: Record<WidgetSize, string> = {
  large: 'text-[22px]',
  medium: 'text-[18px]',
  small: 'text-[16px]',
};

const widgetMetricClassMap: Record<WidgetSize, string> = {
  large: 'text-[36px]',
  medium: 'text-[30px]',
  small: 'text-[24px]',
};

const widgetItemLimitMap: Record<WidgetSize, number> = {
  large: 3,
  medium: 2,
  small: 1,
};

const widgetHelperLineClampMap: Record<WidgetSize, number> = {
  large: 2,
  medium: 2,
  small: 1,
};

const widgetDescriptionLineClampMap: Record<WidgetSize, number> = {
  large: 2,
  medium: 1,
  small: 0,
};

const sizeDescriptionMap: Record<WidgetSize, string> = {
  large: '整行展示，适合综合摘要、图表或诊断卡片',
  medium: '半行布局，适合重点提示与双列信息',
  small: '轻量指标卡，适合数字、状态和快速结论',
};

const widgetPaletteMap: Record<string, WidgetPaletteDefinition> = {
  'widget-energy': { chipLabel: '能耗脉冲', icon: Bolt, tone: 'cyan' },
  'widget-integration': { chipLabel: '链路健康', icon: ShieldCheck, tone: 'emerald' },
  'widget-focus': { chipLabel: '优先事项', icon: Target, tone: 'violet' },
  'widget-breakdown': { chipLabel: '结构分析', icon: BarChart3, tone: 'amber' },
  'widget-actions': { chipLabel: '执行清单', icon: ListTodo, tone: 'slate' },
  'widget-rhythm': { chipLabel: '运行节奏', icon: Activity, tone: 'blue' },
};

type WidgetVisualDefinition = {
  bars: number[];
  icons: LucideIcon[];
};

type DashboardWidgetCardProps = {
  highlight?: boolean;
  isDarkMode: boolean;
  mode: WidgetCardMode;
  onRemove?: () => void;
  widget: DashboardWidget;
};

const widgetVisualBarLimitMap: Record<WidgetSize, number> = {
  large: 6,
  medium: 5,
  small: 4,
};

const widgetVisualIconLimitMap: Record<WidgetSize, number> = {
  large: 3,
  medium: 3,
  small: 2,
};

const widgetVisualPaddingClassMap: Record<WidgetSize, string> = {
  large: 'p-3.5',
  medium: 'p-3',
  small: 'p-2.5',
};

const widgetVisualHeightClassMap: Record<WidgetSize, string> = {
  large: 'h-16',
  medium: 'h-14',
  small: 'h-12',
};

const widgetVisualBadgeClassMap: Record<WidgetSize, string> = {
  large: 'h-9 w-9 rounded-[16px]',
  medium: 'h-8 w-8 rounded-[14px]',
  small: 'h-7 w-7 rounded-[12px]',
};

const widgetVisualBarWidthClassMap: Record<WidgetSize, string> = {
  large: 'w-3',
  medium: 'w-3',
  small: 'w-2.5',
};

const widgetItemIconSizeMap: Record<WidgetSize, number> = {
  large: 14,
  medium: 13,
  small: 12,
};

const widgetVisualMap: Record<string, WidgetVisualDefinition> = {
  'widget-energy': {
    bars: [34, 56, 78, 62, 88, 70],
    icons: [Bolt, Activity, BarChart3],
  },
  'widget-integration': {
    bars: [80, 72, 86, 78, 90, 84],
    icons: [ShieldCheck, Sparkles, Activity],
  },
  'widget-focus': {
    bars: [68, 44, 76, 58, 40, 72],
    icons: [Target, Sparkles, ListTodo],
  },
  'widget-breakdown': {
    bars: [82, 64, 52, 74, 60, 48],
    icons: [BarChart3, Bolt, Activity],
  },
  'widget-actions': {
    bars: [40, 58, 72, 66, 80, 88],
    icons: [ListTodo, Target, Sparkles],
  },
  'widget-rhythm': {
    bars: [48, 62, 56, 74, 60, 70],
    icons: [Activity, BarChart3, Sparkles],
  },
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

const getWidgetPalette = (widget: DashboardWidget, isDarkMode: boolean): WidgetPalette => {
  const definition =
    widgetPaletteMap[widget.id] ??
    ({
      chipLabel: widget.category === 'custom' ? 'AI 定制' : '系统模块',
      icon: widget.category === 'custom' ? WandSparkles : Sparkles,
      tone: widget.category === 'custom' ? 'blue' : 'slate',
    } satisfies WidgetPaletteDefinition);

  switch (definition.tone) {
    case 'amber':
      return {
        ...definition,
        barFillClass: 'bg-amber-400/85',
        dotClass: 'bg-amber-400',
        glowClass: 'bg-amber-300/20',
        iconWrapClass: isDarkMode ? 'bg-amber-400/16 text-amber-200' : 'bg-amber-100 text-amber-700',
        itemIconClass: isDarkMode ? 'text-amber-200' : 'text-amber-700',
        pillClass: isDarkMode ? 'bg-amber-400/14 text-amber-100' : 'bg-amber-50 text-amber-700',
      };
    case 'blue':
      return {
        ...definition,
        barFillClass: 'bg-blue-400/85',
        dotClass: 'bg-blue-400',
        glowClass: 'bg-blue-400/18',
        iconWrapClass: isDarkMode ? 'bg-blue-400/16 text-blue-200' : 'bg-blue-100 text-blue-700',
        itemIconClass: isDarkMode ? 'text-blue-200' : 'text-blue-700',
        pillClass: isDarkMode ? 'bg-blue-400/14 text-blue-100' : 'bg-blue-50 text-blue-700',
      };
    case 'cyan':
      return {
        ...definition,
        barFillClass: 'bg-cyan-400/85',
        dotClass: 'bg-cyan-400',
        glowClass: 'bg-cyan-300/20',
        iconWrapClass: isDarkMode ? 'bg-cyan-400/16 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
        itemIconClass: isDarkMode ? 'text-cyan-200' : 'text-cyan-700',
        pillClass: isDarkMode ? 'bg-cyan-400/14 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
      };
    case 'emerald':
      return {
        ...definition,
        barFillClass: 'bg-emerald-400/85',
        dotClass: 'bg-emerald-400',
        glowClass: 'bg-emerald-300/20',
        iconWrapClass: isDarkMode ? 'bg-emerald-400/16 text-emerald-200' : 'bg-emerald-100 text-emerald-700',
        itemIconClass: isDarkMode ? 'text-emerald-200' : 'text-emerald-700',
        pillClass: isDarkMode ? 'bg-emerald-400/14 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
      };
    case 'violet':
      return {
        ...definition,
        barFillClass: 'bg-violet-400/85',
        dotClass: 'bg-violet-400',
        glowClass: 'bg-violet-300/20',
        iconWrapClass: isDarkMode ? 'bg-violet-400/16 text-violet-200' : 'bg-violet-100 text-violet-700',
        itemIconClass: isDarkMode ? 'text-violet-200' : 'text-violet-700',
        pillClass: isDarkMode ? 'bg-violet-400/14 text-violet-100' : 'bg-violet-50 text-violet-700',
      };
    case 'slate':
    default:
      return {
        ...definition,
        barFillClass: isDarkMode ? 'bg-slate-200/85' : 'bg-slate-500/85',
        dotClass: 'bg-slate-400',
        glowClass: 'bg-slate-400/14',
        iconWrapClass: isDarkMode ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700',
        itemIconClass: isDarkMode ? 'text-slate-100' : 'text-slate-700',
        pillClass: isDarkMode ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700',
      };
  }
};

const getWidgetVisual = (widget: DashboardWidget): WidgetVisualDefinition =>
  widgetVisualMap[widget.id] ?? {
    bars: [40, 58, 72, 60, 78, 66],
    icons: [Sparkles, BarChart3, Activity],
  };

const DashboardWidgetCard: React.FC<DashboardWidgetCardProps> = ({
  highlight = false,
  isDarkMode,
  mode,
  onRemove,
  widget,
}) => {
  const visibleItems = widget.items.slice(0, widgetItemLimitMap[widget.size]);
  const hiddenItemsCount = Math.max(widget.items.length - visibleItems.length, 0);
  const visual = getWidgetVisual(widget);
  const visibleVisualIcons = visual.icons.slice(0, widgetVisualIconLimitMap[widget.size]);
  const visibleVisualBars = visual.bars.slice(0, widgetVisualBarLimitMap[widget.size]);
  const palette = getWidgetPalette(widget, isDarkMode);
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-200/90' : 'text-slate-700';
  const textTertiary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const outerSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/50 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.92)]'
    : 'border-white/95 bg-white/78 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.28)]';
  const chromeSurface = isDarkMode
    ? 'border-white/10 bg-white/[0.08]'
    : 'border-white/80 bg-white/58';
  const itemSurface = isDarkMode
    ? 'border-white/10 bg-white/[0.08] text-slate-100'
    : 'border-white/85 bg-white/64 text-slate-700';
  const visualPanelSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/18'
    : 'border-white/80 bg-white/42';
  const chartTrackSurface = isDarkMode ? 'bg-white/[0.09]' : 'bg-white/55';
  const removeButtonSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/55 text-slate-100 hover:bg-slate-950/70'
    : 'border-white/80 bg-white/70 text-slate-700 hover:bg-white';
  const metricClassName = widgetMetricClassMap[widget.size];
  const descriptionLines = widgetDescriptionLineClampMap[widget.size];
  const showDescription = descriptionLines > 0;

  return (
    <article
      className={`${widgetSizeClassMap[widget.size]} ${widgetHeightClassMap[widget.size]} relative overflow-hidden rounded-[30px] border p-1 transition duration-300 ${
        mode === 'board' ? 'hover:-translate-y-1 hover:shadow-[0_28px_70px_-42px_rgba(15,23,42,0.34)]' : ''
      } ${highlight ? 'ring-2 ring-cyan-400/40' : ''} ${outerSurface}`}
    >
      <div className={`relative flex h-full flex-col overflow-hidden rounded-[26px] bg-gradient-to-br ${widget.accent} p-4`}>
        <div className={`pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full blur-3xl ${palette.glowClass}`} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_42%)] opacity-80" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className={`break-words font-semibold leading-tight ${widgetTitleClassMap[widget.size]} ${textPrimary}`}>
                {widget.title}
              </h2>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {mode === 'preview' && (
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[18px] border ${chromeSurface} ${textPrimary}`}>
                  <GripVertical size={16} />
                </div>
              )}
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-[18px] border ${chromeSurface} ${palette.itemIconClass}`}>
                <palette.icon size={18} />
              </div>
            </div>
          </div>

          <div className={`mt-4 rounded-[22px] border ${visualPanelSurface} ${widgetVisualPaddingClassMap[widget.size]}`}>
            <div className="flex items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                {visibleVisualIcons.map((Icon, index) => (
                  <span
                    key={`${widget.id}-visual-icon-${index}`}
                    className={`inline-flex items-center justify-center border ${chromeSurface} ${widgetVisualBadgeClassMap[widget.size]} ${palette.itemIconClass}`}
                  >
                    <Icon size={widget.size === 'large' ? 16 : 14} />
                  </span>
                ))}
              </div>
              <div className={`flex flex-1 items-end justify-end gap-1.5 ${widgetVisualHeightClassMap[widget.size]}`}>
                {visibleVisualBars.map((height, index) => (
                  <span
                    key={`${widget.id}-visual-bar-${index}`}
                    className={`relative overflow-hidden rounded-full ${widgetVisualBarWidthClassMap[widget.size]} ${chartTrackSurface}`}
                  >
                    <span
                      className={`absolute inset-x-0 bottom-0 rounded-full ${palette.barFillClass}`}
                      style={{ height: `${height}%` }}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-end justify-between gap-3">
              <div className={`min-w-0 font-black leading-none tracking-tight ${metricClassName} ${textPrimary}`}>
                {widget.value}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {mode === 'preview' && onRemove && (
                  <button
                    type="button"
                    onClick={onRemove}
                    className={`rounded-full border px-3 py-1 text-[11px] font-bold transition ${removeButtonSurface}`}
                  >
                    移出
                  </button>
                )}
              </div>
            </div>

            <p
              className={`mt-2 text-sm font-medium leading-5 ${textSecondary}`}
              style={clampTextStyle(widgetHelperLineClampMap[widget.size])}
            >
              {widget.helper}
            </p>

            {showDescription && (
              <p
                className={`mt-1.5 text-xs leading-5 ${textTertiary}`}
                style={clampTextStyle(descriptionLines)}
              >
                {widget.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {visibleItems.map((item, index) => {
                const ItemIcon = visibleVisualIcons[index % visibleVisualIcons.length] ?? palette.icon;

                return (
                  <span
                    key={`${widget.id}-${index}`}
                    className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${itemSurface}`}
                  >
                    <ItemIcon size={widgetItemIconSizeMap[widget.size]} className={`shrink-0 ${palette.itemIconClass}`} />
                    <span className="truncate">{item}</span>
                  </span>
                );
              })}
              {hiddenItemsCount > 0 && (
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${chromeSurface} ${textPrimary}`}>
                  +{hiddenItemsCount}
                </span>
              )}
            </div>
          </div>
        </div>
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
  const [aiForm, setAiForm] = useState({ goal: '', name: '', prompt: '', size: 'medium' as WidgetSize });
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
        accent: 'from-sky-500/28 via-indigo-400/12 to-transparent',
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
      setAiForm({ goal: '', name: '', prompt: '', size: 'medium' });
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
            <div className={`flex h-full min-h-[360px] items-center justify-center rounded-[28px] border border-dashed p-6 ${dashedSurface}`}>
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
            <div className="grid content-start items-start gap-4 md:grid-cols-6 xl:grid-cols-12">
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
                    管理看板标签、小组件尺寸与拖拽排序，右侧预览区会实时同步最终布局。
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
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>看板标签</h3>
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
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>小组件库</h3>
                  </div>
                  <p className={`mt-2 text-sm leading-6 ${textSecondary}`}>
                    点击加入看板，或直接拖到右侧预览区进行排序。尺寸切换会实时影响布局比例。
                  </p>

                  <div className="mt-4 space-y-3">
                    {dashboardState.widgets.map((widget) => {
                      const selected = activeTab.widgetIds.includes(widget.id);

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
                              <div className={`text-base font-black ${textPrimary}`}>{widget.title}</div>
                              <div className={`mt-1 text-sm leading-6 ${textSecondary}`}>{widget.description}</div>
                            </div>
                            <div className={`rounded-2xl p-2 ${mutedSurface}`}>
                              <GripVertical size={16} className="text-slate-400" />
                            </div>
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
                                {widgetSizeLabelMap[size]}尺寸
                              </button>
                            ))}
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className={`text-xs leading-5 ${textSecondary}`}>{sizeDescriptionMap[widget.size]}</div>
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
                      placeholder="业务目标，例如：跟踪办公区夜间基线负荷"
                    />
                    <textarea
                      value={aiForm.prompt}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, prompt: event.target.value }))
                      }
                      className={`min-h-[120px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 focus:outline-none ${inputSurface} ${textPrimary}`}
                      placeholder="描述你希望 AI Coding 生成什么样的小组件，例如数据结构、展示重点和摘要风格。"
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
                          {widgetSizeLabelMap[size]}尺寸
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
                    <div className="grid content-start items-start gap-4 md:grid-cols-6 xl:grid-cols-12">
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
