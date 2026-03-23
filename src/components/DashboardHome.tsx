import React, { useMemo, useState } from 'react';
import {
  GripVertical,
  LayoutTemplate,
  Plus,
  Sparkles,
  Trash2,
  WandSparkles,
  X,
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

const sizeButtonOptions: WidgetSize[] = ['small', 'medium', 'large'];

const widgetHeightClassMap: Record<WidgetSize, string> = {
  large: 'min-h-[220px]',
  medium: 'min-h-[210px]',
  small: 'min-h-[180px]',
};

const sizeDescriptionMap: Record<WidgetSize, string> = {
  large: '整行大组件，适合图表与复杂摘要',
  medium: '半行中组件，适合多列信息块',
  small: '四分之一小组件，适合指标卡',
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
  const nextItems = [...items];
  const [movedItem] = nextItems.splice(fromIndex, 1);
  nextItems.splice(toIndex, 0, movedItem);
  return nextItems;
};

const upsertWidgetId = (widgetIds: string[], widgetId: string, targetIndex: number) => {
  const currentIndex = widgetIds.indexOf(widgetId);

  if (currentIndex === -1) {
    const nextIds = [...widgetIds];
    nextIds.splice(targetIndex, 0, widgetId);
    return nextIds;
  }

  return moveItem(widgetIds, currentIndex, targetIndex);
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
  const [aiForm, setAiForm] = useState({
    goal: '',
    name: '',
    prompt: '',
    size: 'medium' as WidgetSize,
  });
  const [isGeneratingWidget, setIsGeneratingWidget] = useState(false);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  const activeTab = useMemo(
    () =>
      dashboardState.tabs.find((tab) => tab.id === dashboardState.activeTabId) ??
      dashboardState.tabs[0],
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
      tabs: previous.tabs.map((tab) =>
        tab.id === activeTab.id ? { ...tab, widgetIds } : tab,
      ),
    }));
  };

  const updateWidget = (widgetId: string, updater: (widget: DashboardWidget) => DashboardWidget) => {
    onChange((previous) => ({
      ...previous,
      widgets: previous.widgets.map((widget) =>
        widget.id === widgetId ? updater(widget) : widget,
      ),
    }));
  };

  const handleDropWidget = (payload: DragPayload, targetIndex?: number) => {
    const insertAt = targetIndex ?? activeTab.widgetIds.length;
    const nextIds = upsertWidgetId(activeTab.widgetIds, payload.widgetId, insertAt);
    reorderWidgets(nextIds);
    setDragOverWidgetId(null);
  };

  const handleCanvasDrop = (
    event: React.DragEvent<HTMLDivElement>,
    targetWidgetId?: string,
  ) => {
    event.preventDefault();

    const payload = parseDragPayload(event.dataTransfer.getData('application/json'));
    if (!payload) {
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
      tabs: previous.tabs.map((tab) =>
        tab.id === activeTab.id ? { ...tab, name: name || '未命名看板' } : tab,
      ),
    }));
  };

  const handleCreateTab = () => {
    const name = newTabName.trim() || `看板 ${dashboardState.tabs.length + 1}`;
    const nextTabId = createLocalId('dashboard-tab');

    onChange((previous) => ({
      ...previous,
      activeTabId: nextTabId,
      tabs: [
        ...previous.tabs,
        {
          id: nextTabId,
          name,
          widgetIds: [],
        },
      ],
    }));

    setNewTabName('');
  };

  const handleDeleteCurrentTab = () => {
    if (dashboardState.tabs.length <= 1) {
      return;
    }

    const nextTabs = dashboardState.tabs.filter((tab) => tab.id !== activeTab.id);
    onChange((previous) => ({
      ...previous,
      activeTabId: nextTabs[0].id,
      tabs: nextTabs,
    }));
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
        accent: 'from-sky-600/20 to-indigo-400/10',
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
          tab.id === activeTab.id
            ? { ...tab, widgetIds: [...tab.widgetIds, widgetId] }
            : tab,
        ),
        widgets: [...previous.widgets, nextWidget],
      }));

      setAiForm({
        goal: '',
        name: '',
        prompt: '',
        size: 'medium',
      });
    } finally {
      setIsGeneratingWidget(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {dashboardState.tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                onChange((previous) => ({
                  ...previous,
                  activeTabId: tab.id,
                }))
              }
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                tab.id === activeTab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : `${cardSurface} ${textPrimary}`
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
        <div className={`text-sm ${textSecondary}`}>
          当前看板显示 {activeWidgets.length} 个小组件
        </div>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-fr gap-4 overflow-y-auto pr-1 xl:grid-cols-12 xl:overflow-hidden xl:pr-0">
        {activeWidgets.map((widget) => (
          <article
            key={widget.id}
            className={`${widgetSizeClassMap[widget.size]} ${widgetHeightClassMap[widget.size]} rounded-[26px] border p-5 shadow-sm ${cardSurface}`}
          >
            <div
              className={`h-full rounded-[22px] bg-gradient-to-br ${widget.accent} p-4`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                      {widgetSizeLabelMap[widget.size]}组件
                    </div>
                    <h2 className={`mt-2 text-xl font-black tracking-tight ${textPrimary}`}>
                      {widget.title}
                    </h2>
                  </div>
                  <div className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                    {widget.value}
                  </div>
                </div>

                <p className={`mt-3 text-sm leading-6 ${textSecondary}`}>{widget.description}</p>
                <div className={`mt-4 text-sm font-semibold ${textPrimary}`}>{widget.helper}</div>

                <div className="mt-4 grid gap-2">
                  {widget.items.map((item) => (
                    <div
                      key={item}
                      className={`rounded-[18px] px-3 py-2 text-sm ${
                        isDarkMode ? 'bg-white/8 text-slate-200' : 'bg-white/70 text-slate-700'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div
            className={`flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-[34px] border shadow-2xl ${cardSurface}`}
          >
            <div className="flex items-center justify-between border-b border-slate-200/10 px-6 py-5">
              <div>
                <h2 className={`text-xl font-black ${textPrimary}`}>看板编辑器</h2>
                <p className={`mt-1 text-sm ${textSecondary}`}>
                  管理看板标签、小组件尺寸和拖拽布局，右侧预览区会自动对齐。
                </p>
              </div>
              <button
                onClick={onCloseEditor}
                className={`rounded-2xl p-2 ${mutedSurface} ${textPrimary}`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-r border-slate-200/10 px-5 py-5">
                <section className={`rounded-[24px] border p-4 ${cardSurface}`}>
                  <div className="flex items-center gap-2">
                    <LayoutTemplate size={16} className="text-blue-600" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      看板标签
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {dashboardState.tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() =>
                          onChange((previous) => ({
                            ...previous,
                            activeTabId: tab.id,
                          }))
                        }
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          tab.id === activeTab.id
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
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
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                      placeholder="当前看板名称"
                    />
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <input
                        value={newTabName}
                        onChange={(event) => setNewTabName(event.target.value)}
                        className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                        placeholder="新增看板名称"
                      />
                      <button
                        onClick={handleCreateTab}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-900"
                      >
                        <Plus size={15} />
                        新增
                      </button>
                      <button
                        onClick={handleDeleteCurrentTab}
                        className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold ${cardSurface} ${textPrimary}`}
                      >
                        <Trash2 size={15} />
                        删除
                      </button>
                    </div>
                  </div>
                </section>

                <section className={`mt-4 rounded-[24px] border p-4 ${cardSurface}`}>
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-violet-600" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      小组件库
                    </h3>
                  </div>

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
                          className={`rounded-[22px] border p-4 ${selected ? 'border-blue-500/40' : ''} ${cardSurface}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`font-semibold ${textPrimary}`}>{widget.title}</div>
                              <div className={`mt-1 text-xs leading-5 ${textSecondary}`}>
                                {widget.description}
                              </div>
                            </div>
                            <GripVertical size={16} className="text-slate-400" />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {sizeButtonOptions.map((size) => (
                              <button
                                key={size}
                                onClick={() =>
                                  updateWidget(widget.id, (previous) => ({ ...previous, size }))
                                }
                                className={`rounded-full px-3 py-1 text-xs font-bold ${
                                  widget.size === size
                                    ? 'bg-blue-500/15 text-blue-600'
                                    : `${mutedSurface} ${textPrimary}`
                                }`}
                              >
                                {widgetSizeLabelMap[size]}
                              </button>
                            ))}
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className={`text-xs ${textSecondary}`}>
                              {sizeDescriptionMap[widget.size]}
                            </div>
                            <button
                              onClick={() => handleLibraryToggle(widget.id)}
                              className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white dark:bg-white dark:text-slate-900"
                            >
                              {selected ? '移出看板' : '加入看板'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                <section className={`mt-4 rounded-[24px] border p-4 ${cardSurface}`}>
                  <div className="flex items-center gap-2">
                    <WandSparkles size={16} className="text-blue-600" />
                    <h3 className={`text-sm font-black uppercase tracking-[0.22em] ${textSecondary}`}>
                      AI Coding 创建小组件
                    </h3>
                  </div>

                  <div className="mt-4 space-y-3">
                    <input
                      value={aiForm.name}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, name: event.target.value }))
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                      placeholder="小组件名称"
                    />
                    <input
                      value={aiForm.goal}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, goal: event.target.value }))
                      }
                      className={`w-full rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                      placeholder="业务目标，例如：监控办公区晚间基线"
                    />
                    <textarea
                      value={aiForm.prompt}
                      onChange={(event) =>
                        setAiForm((previous) => ({ ...previous, prompt: event.target.value }))
                      }
                      className={`min-h-[110px] w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-6 focus:outline-none ${cardSurface} ${textPrimary}`}
                      placeholder="描述你想让 AI Coding 生成什么类型的小组件。"
                    />
                    <div className="flex flex-wrap gap-2">
                      {sizeButtonOptions.map((size) => (
                        <button
                          key={size}
                          onClick={() => setAiForm((previous) => ({ ...previous, size }))}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                            aiForm.size === size
                              ? 'bg-blue-500/15 text-blue-600'
                              : `${mutedSurface} ${textPrimary}`
                          }`}
                        >
                          {widgetSizeLabelMap[size]}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => void handleGenerateWidget()}
                      disabled={isGeneratingWidget}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900"
                    >
                      <WandSparkles size={15} />
                      {isGeneratingWidget ? '生成中...' : '生成并加入当前看板'}
                    </button>
                  </div>
                </section>
              </aside>

              <section className="min-h-0 overflow-y-auto px-5 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className={`text-lg font-black ${textPrimary}`}>看板预览区</h3>
                    <p className={`mt-1 text-sm ${textSecondary}`}>
                      将左侧小组件拖拽到这里，系统会按小 / 中 / 大比例自动对齐。
                    </p>
                  </div>
                  <div className={`text-sm ${textSecondary}`}>{activeTab.name}</div>
                </div>

                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleCanvasDrop(event)}
                  className="mt-5 rounded-[26px] border border-dashed border-slate-300/40 p-4"
                >
                  {activeWidgets.length === 0 ? (
                    <div className="flex min-h-[420px] items-center justify-center rounded-[22px] bg-slate-50/60 text-sm text-slate-500 dark:bg-white/5 dark:text-slate-300">
                      把小组件拖到这里，开始搭建当前看板。
                    </div>
                  ) : (
                    <div className="grid auto-rows-fr gap-4 xl:grid-cols-12">
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
                          onDrop={(event) => handleCanvasDrop(event, widget.id)}
                          className={`${widgetSizeClassMap[widget.size]} ${
                            dragOverWidgetId === widget.id ? 'ring-2 ring-blue-500/40' : ''
                          } ${widgetHeightClassMap[widget.size]} rounded-[24px] border p-4 shadow-sm ${cardSurface}`}
                        >
                          <div className="flex h-full flex-col">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                  {widgetSizeLabelMap[widget.size]}组件
                                </div>
                                <div className={`mt-2 text-lg font-black ${textPrimary}`}>
                                  {widget.title}
                                </div>
                              </div>
                              <GripVertical size={16} className="text-slate-400" />
                            </div>

                            <div className={`mt-3 text-sm leading-6 ${textSecondary}`}>
                              {widget.description}
                            </div>

                            <div className="mt-4 grid gap-2">
                              {widget.items.slice(0, widget.size === 'small' ? 2 : 3).map((item) => (
                                <div
                                  key={item}
                                  className={`rounded-[16px] px-3 py-2 text-sm ${
                                    isDarkMode
                                      ? 'bg-white/8 text-slate-200'
                                      : 'bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {item}
                                </div>
                              ))}
                            </div>

                            <div className="mt-auto flex items-center justify-between pt-4">
                              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600">
                                {widget.value}
                              </span>
                              <button
                                onClick={() => handleLibraryToggle(widget.id)}
                                className={`rounded-full px-3 py-1 text-xs font-bold ${mutedSurface} ${textPrimary}`}
                              >
                                移除
                              </button>
                            </div>
                          </div>
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
