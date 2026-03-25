import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
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
  dotClass: string;
  glowClass: string;
  iconWrapClass: string;
  pillClass: string;
};

const sizeButtonOptions: WidgetSize[] = ['small', 'medium', 'large'];

const widgetHeightClassMap: Record<WidgetSize, string> = {
  large: 'min-h-[330px]',
  medium: 'min-h-[290px]',
  small: 'min-h-[250px]',
};

const widgetTitleClassMap: Record<WidgetSize, string> = {
  large: 'text-[30px]',
  medium: 'text-[24px]',
  small: 'text-[22px]',
};

const widgetValueClassMap: Record<WidgetSize, string> = {
  large: 'text-sm',
  medium: 'text-sm',
  small: 'text-xs',
};

const widgetItemLimitMap: Record<WidgetSize, number> = {
  large: 4,
  medium: 3,
  small: 3,
};

const sizeDescriptionMap: Record<WidgetSize, string> = {
  large: '整行展示，适合综合摘要、图表或诊断卡片',
  medium: '半行布局，适合重点提示与双列信息',
  small: '轻量指标卡，适合数字、状态和快速结论',
};

const widgetCategoryLabelMap: Record<DashboardWidget['category'], string> = {
  custom: '自定义',
  system: '系统',
};

const widgetPaletteMap: Record<string, WidgetPaletteDefinition> = {
  'widget-energy': { chipLabel: '能耗脉冲', icon: Bolt, tone: 'cyan' },
  'widget-integration': { chipLabel: '链路健康', icon: ShieldCheck, tone: 'emerald' },
  'widget-focus': { chipLabel: '优先事项', icon: Target, tone: 'violet' },
  'widget-breakdown': { chipLabel: '结构分析', icon: BarChart3, tone: 'amber' },
  'widget-actions': { chipLabel: '执行清单', icon: ListTodo, tone: 'slate' },
  'widget-rhythm': { chipLabel: '运行节奏', icon: Activity, tone: 'blue' },
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
        dotClass: 'bg-amber-400',
        glowClass: 'bg-amber-300/20',
        iconWrapClass: isDarkMode ? 'bg-amber-400/16 text-amber-200' : 'bg-amber-100 text-amber-700',
        pillClass: isDarkMode ? 'bg-amber-400/14 text-amber-100' : 'bg-amber-50 text-amber-700',
      };
    case 'blue':
      return {
        ...definition,
        dotClass: 'bg-blue-400',
        glowClass: 'bg-blue-400/18',
        iconWrapClass: isDarkMode ? 'bg-blue-400/16 text-blue-200' : 'bg-blue-100 text-blue-700',
        pillClass: isDarkMode ? 'bg-blue-400/14 text-blue-100' : 'bg-blue-50 text-blue-700',
      };
    case 'cyan':
      return {
        ...definition,
        dotClass: 'bg-cyan-400',
        glowClass: 'bg-cyan-300/20',
        iconWrapClass: isDarkMode ? 'bg-cyan-400/16 text-cyan-200' : 'bg-cyan-100 text-cyan-700',
        pillClass: isDarkMode ? 'bg-cyan-400/14 text-cyan-100' : 'bg-cyan-50 text-cyan-700',
      };
    case 'emerald':
      return {
        ...definition,
        dotClass: 'bg-emerald-400',
        glowClass: 'bg-emerald-300/20',
        iconWrapClass: isDarkMode ? 'bg-emerald-400/16 text-emerald-200' : 'bg-emerald-100 text-emerald-700',
        pillClass: isDarkMode ? 'bg-emerald-400/14 text-emerald-100' : 'bg-emerald-50 text-emerald-700',
      };
    case 'violet':
      return {
        ...definition,
        dotClass: 'bg-violet-400',
        glowClass: 'bg-violet-300/20',
        iconWrapClass: isDarkMode ? 'bg-violet-400/16 text-violet-200' : 'bg-violet-100 text-violet-700',
        pillClass: isDarkMode ? 'bg-violet-400/14 text-violet-100' : 'bg-violet-50 text-violet-700',
      };
    case 'slate':
    default:
      return {
        ...definition,
        dotClass: 'bg-slate-400',
        glowClass: 'bg-slate-400/14',
        iconWrapClass: isDarkMode ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700',
        pillClass: isDarkMode ? 'bg-white/10 text-slate-100' : 'bg-slate-100 text-slate-700',
      };
  }
};

const DashboardWidgetCard = ({
  highlight = false,
  isDarkMode,
  mode,
  onRemove,
  widget,
}: {
  highlight?: boolean;
  isDarkMode: boolean;
  mode: WidgetCardMode;
  onRemove?: () => void;
  widget: DashboardWidget;
}) => {
  const visibleItems = widget.items.slice(0, widgetItemLimitMap[widget.size]);
  const hiddenItemsCount = Math.max(widget.items.length - visibleItems.length, 0);
  const palette = getWidgetPalette(widget, isDarkMode);
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-300' : 'text-slate-600';
  const textTertiary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const outerSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/45 shadow-[0_30px_70px_-42px_rgba(15,23,42,0.95)]'
    : 'border-white/90 bg-white/80 shadow-[0_28px_70px_-42px_rgba(15,23,42,0.35)]';
  const innerSurface = isDarkMode ? 'border-white/10 bg-white/[0.05]' : 'border-white/80 bg-white/72';
  const metaSurface = isDarkMode
    ? 'border-white/10 bg-slate-950/45 text-slate-300'
    : 'border-slate-200/70 bg-white/76 text-slate-600';
  const removeButtonSurface = isDarkMode
    ? 'bg-white/8 text-slate-100 hover:bg-white/12'
    : 'bg-slate-900 text-white hover:bg-slate-700';
  const footerText =
    hiddenItemsCount > 0
      ? `还有 ${hiddenItemsCount} 项摘要待展开`
      : mode === 'preview'
        ? '拖拽卡片可调整当前顺序'
        : '当前卡片内容已完整展示';

  return (
    <article
      className={`${widgetSizeClassMap[widget.size]} ${widgetHeightClassMap[widget.size]} relative overflow-hidden rounded-[30px] border p-1 transition duration-300 ${
        mode === 'board' ? 'hover:-translate-y-1 hover:shadow-[0_34px_74px_-44px_rgba(15,23,42,0.45)]' : ''
      } ${highlight ? 'ring-2 ring-cyan-400/40' : ''} ${outerSurface}`}
    >
      <div className={`relative flex h-full flex-col overflow-hidden rounded-[26px] bg-gradient-to-br ${widget.accent} p-5`}>
        <div className={`pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full blur-3xl ${palette.glowClass}`} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.32),transparent_42%)] opacity-80" />
        <div className="relative flex h-full flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black tracking-[0.18em] ${palette.pillClass}`}>
                  <palette.icon size={13} />
                  {palette.chipLabel}
                </span>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold tracking-[0.16em] ${metaSurface}`}>
                  {widgetCategoryLabelMap[widget.category]} · {widgetSizeLabelMap[widget.size]}尺寸
                </span>
              </div>
              <h2 className={`mt-4 break-words font-black leading-[1.05] tracking-tight ${widgetTitleClassMap[widget.size]} ${textPrimary}`}>
                {widget.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {mode === 'preview' && (
                <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${metaSurface}`}>
                  <GripVertical size={16} />
                </div>
              )}
              <div className={`rounded-full px-3.5 py-2 font-bold ${widgetValueClassMap[widget.size]} ${palette.pillClass}`}>{widget.value}</div>
            </div>
          </div>
          <p className={`mt-4 text-sm leading-6 ${textSecondary}`}>{widget.description}</p>
          <div className={`mt-4 flex items-center gap-3 rounded-[20px] border p-4 ${innerSurface}`}>
            <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${palette.iconWrapClass}`}>
              <palette.icon size={18} />
            </div>
            <div className="min-w-0">
              <div className={`text-xs font-bold uppercase tracking-[0.18em] ${textTertiary}`}>辅助提示</div>
              <div className={`mt-1 text-sm font-semibold leading-6 ${textPrimary}`}>{widget.helper}</div>
            </div>
            {mode === 'board' && <ArrowUpRight size={16} className={textTertiary} />}
          </div>
          <div className="mt-4 grid gap-2.5">
            {visibleItems.map((item, index) => (
              <div key={`${widget.id}-${index}`} className={`flex items-start gap-3 rounded-[18px] border p-3.5 ${innerSurface}`}>
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${palette.dotClass}`} />
                <span className={`text-sm leading-6 ${textPrimary}`}>{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className={`text-xs font-medium ${textTertiary}`}>{footerText}</div>
            {mode === 'preview' ? (
              <button type="button" onClick={onRemove} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${removeButtonSurface}`}>
                移出
              </button>
            ) : (
              <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${metaSurface}`}>
                {sizeDescriptionMap[widget.size]}
              </span>
            )}
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

  const sizeCounts = useMemo(
    () =>
      activeWidgets.reduce<Record<WidgetSize, number>>(
        (counts, widget) => ({ ...counts, [widget.size]: counts[widget.size] + 1 }),
        { large: 0, medium: 0, small: 0 },
      ),
    [activeWidgets],
  );

  const dominantSize = useMemo(() => {
    const entries = Object.entries(sizeCounts) as Array<[WidgetSize, number]>;
    return entries.sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'small';
  }, [sizeCounts]);

  const systemWidgetCount = activeWidgets.filter((widget) => widget.category === 'system').length;
  const customWidgetCount = activeWidgets.length - systemWidgetCount;

  const overviewStats = [
    { label: '组件数量', value: String(activeWidgets.length).padStart(2, '0'), helper: activeWidgets.length > 0 ? '当前画布已装配的组件数量' : '可以从左侧组件库开始搭建' },
    { label: '自定义', value: String(customWidgetCount).padStart(2, '0'), helper: customWidgetCount > 0 ? 'AI 定制卡片已经加入布局' : '暂未加入自定义组件' },
    {
      label: '布局节奏',
      value: activeWidgets.length > 0 ? `${widgetSizeLabelMap[dominantSize]}尺寸` : '待配置',
      helper: activeWidgets.length > 0 ? `${sizeCounts[dominantSize]} 张 ${widgetSizeLabelMap[dominantSize]}尺寸卡片主导当前布局` : '从尺寸切换开始搭配信息节奏',
    },
  ];

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
    <div className="flex h-full min-h-0 flex-col gap-4">
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
        className={`relative overflow-hidden rounded-[32px] border px-6 py-5 shadow-[0_30px_80px_-48px_rgba(15,23,42,0.4)] ${cardSurface}`}
      >
        <div className="pointer-events-none absolute -left-14 top-0 h-44 w-44 rounded-full bg-cyan-400/10 blur-[72px]" />
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-violet-400/12 blur-[88px]" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black tracking-[0.18em] ${
                isDarkMode
                  ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
                  : 'border-cyan-200 bg-cyan-50 text-cyan-700'
              }`}
            >
              <LayoutTemplate size={14} />
              当前看板
            </div>

            <h2 className={`mt-4 text-3xl font-black tracking-tight ${textPrimary}`}>{activeTab.name}</h2>
            <p className={`mt-3 max-w-2xl text-sm leading-6 ${textSecondary}`}>
              小组件现在会按照更清晰的视觉层级呈现，保留拖拽与尺寸切换能力，同时让数字、提示和摘要更容易一眼读懂。
            </p>

            <div className={`mt-4 text-sm font-semibold ${textSecondary}`}>
              系统组件 {systemWidgetCount} 个，自定义组件 {customWidgetCount} 个
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {overviewStats.map((stat) => (
              <div key={stat.label} className={`rounded-[22px] border p-4 ${sectionSurface}`}>
                <div className={`text-xs font-bold uppercase tracking-[0.18em] ${textSecondary}`}>{stat.label}</div>
                <div className={`mt-2 text-2xl font-black tracking-tight ${textPrimary}`}>{stat.value}</div>
                <div className={`mt-2 text-xs leading-5 ${textSecondary}`}>{stat.helper}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`relative min-h-0 flex-1 overflow-hidden rounded-[32px] border p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.35)] ${cardSurface}`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_42%)]" />

        <div className="relative flex h-full min-h-0 flex-col">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className={`text-lg font-black ${textPrimary}`}>看板画布</h3>
              <p className={`mt-1 text-sm ${textSecondary}`}>
                小、中、大组件会按 3 / 6 / 12 栅格自动对齐，滚动区域也统一收敛，不会再出现卡片显示挤压。
              </p>
            </div>
            <div className={`text-sm font-medium ${textSecondary}`}>布局主节奏：{widgetSizeLabelMap[dominantSize]}尺寸</div>
          </div>

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
            <div className="grid min-h-0 flex-1 content-start auto-rows-fr gap-4 overflow-y-auto pr-1 md:grid-cols-6 xl:grid-cols-12">
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
                    <div className="grid auto-rows-fr gap-4 md:grid-cols-6 xl:grid-cols-12">
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
