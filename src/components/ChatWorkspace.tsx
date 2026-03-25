import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import { api, type EnergyQuickProject } from '../lib/api';
import { buildEnergyQueryPayload, queryEnergyReport, type ChatQueryForm } from '../lib/energyQuery';

type QuickIntentId =
  | 'energy-compare'
  | 'energy-diagnostic'
  | 'energy-query'
  | 'energy-report';

type ChatMessage = {
  content: string;
  id: string;
  role: 'assistant' | 'user';
  showThinking?: boolean;
  thinking?: string;
};

type HistoryItem = {
  assistantReply: string;
  id: number;
  summary: string;
  time: string;
  title: string;
  userPrompt: string;
};

const fallbackProjectOptions: EnergyQuickProject[] = [
  {
    channel: 'C2',
    name: 'A区',
    orgId: 'L-SH00-SHZXM00.04',
  },
];

const quickIntents: Array<{
  description: string;
  id: QuickIntentId;
  label: string;
}> = [
  {
    description: '拉取当前筛选条件下的能耗数据，并生成查询说明。',
    id: 'energy-query',
    label: '能耗查询',
  },
  {
    description: '按项目、时间和能源类型输出对比结论。',
    id: 'energy-compare',
    label: '能耗对比',
  },
  {
    description: '生成日报、周报或专题报告提纲。',
    id: 'energy-report',
    label: '能源报表',
  },
  {
    description: '围绕异常波动、基线偏高和节能机会生成诊断建议。',
    id: 'energy-diagnostic',
    label: '能源诊断报告',
  },
];

const historyItems: HistoryItem[] = [
  {
    assistantReply:
      '今天 A 区的暖通空调仍是主要负荷来源，建议优先检查 13:00 之后的运行策略，并比对照明负荷是否同步上升。',
    id: 1,
    summary: '今日趋势与异常波动复盘',
    time: '10 分钟前',
    title: 'A 区今日能耗概览',
    userPrompt: '帮我总结今天 A 区的能耗重点。',
  },
  {
    assistantReply:
      '本周报告建议按总能耗、暖通负荷、异常时段、整改建议四个部分输出，方便管理层快速阅读。',
    id: 2,
    summary: '生成周报大纲并汇总关键变化',
    time: '2 小时前',
    title: '周报生成记录',
    userPrompt: '生成本周能耗周报提纲。',
  },
  {
    assistantReply:
      '照明插座在本月晚间波动更明显，暖通空调的峰值集中在工作时段，建议做时段对比后再细分设备层级。',
    id: 3,
    summary: '对比暖通与照明的成本差异',
    time: '昨天',
    title: '分项对比分析',
    userPrompt: '比较暖通空调和照明插座的能耗差异。',
  },
];

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const normalizeProjectLoadError = (error: unknown) => {
  const fallbackMessage = '项目列表同步失败，已暂时使用默认项目。';

  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  if (
    error.message.includes('HTML 页面') ||
    error.message.includes('<!doctype') ||
    error.message.includes('接口未返回 JSON')
  ) {
    return '当前站点未连接 Halo 后端接口，已暂时使用默认项目。';
  }

  return error.message || fallbackMessage;
};

export const ChatWorkspace = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const initialProjectOption = fallbackProjectOptions[0];
  const [chatForm, setChatForm] = useState<ChatQueryForm>({
    energyType: '电',
    interval: '1小时',
    orgId: initialProjectOption.orgId,
    pageNum: 1,
    pageSize: 20,
    project: initialProjectOption.name,
    queryName: '',
    timeRange: '今天',
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [projectOptions, setProjectOptions] = useState<EnergyQuickProject[]>(fallbackProjectOptions);
  const [projectLoadError, setProjectLoadError] = useState('');
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<QuickIntentId | null>(null);
  const [showIntentPanel, setShowIntentPanel] = useState(false);

  const activeRequestRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!selectedIntent || hasLoadedProjects) {
      return;
    }

    const requestController = new AbortController();
    let isMounted = true;

    const loadQuickProjects = async () => {
      setProjectsLoading(true);

      try {
        const response = await api.getEnergyQuickProjects(requestController.signal);

        if (!isMounted) {
          return;
        }

        const nextProjects = response.projects.filter(
          (project) => Boolean(project?.name?.trim()) && Boolean(project?.orgId?.trim()),
        );

        if (nextProjects.length === 0) {
          setHasLoadedProjects(true);
          setProjectLoadError('项目接口未返回 C2 项目，已暂时使用默认项目。');
          setProjectOptions(fallbackProjectOptions);
          return;
        }

        setProjectLoadError('');
        setProjectOptions(nextProjects);
        setHasLoadedProjects(true);
        setChatForm((previous) => {
          const matchedProject =
            nextProjects.find(
              (project) => project.orgId === previous.orgId || project.name === previous.project,
            ) ?? nextProjects[0];

          return {
            ...previous,
            orgId: matchedProject.orgId,
            project: matchedProject.name,
          };
        });
      } catch (error) {
        if (isMounted) {
          setHasLoadedProjects(true);
          setProjectLoadError(normalizeProjectLoadError(error));
          setProjectOptions(fallbackProjectOptions);
        }
      } finally {
        if (isMounted) {
          setProjectsLoading(false);
        }
      }
    };

    void loadQuickProjects();

    return () => {
      isMounted = false;
      requestController.abort();
    };
  }, [hasLoadedProjects, selectedIntent]);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  const selectedIntentMeta = useMemo(
    () => quickIntents.find((intent) => intent.id === selectedIntent) ?? null,
    [selectedIntent],
  );

  const appendMessage = (message: ChatMessage) => {
    setChatMessages((previous) => [...previous, message]);
  };

  const toggleThinking = (messageId: string) => {
    setChatMessages((previous) =>
      previous.map((message) =>
        message.id === messageId
          ? { ...message, showThinking: !message.showThinking }
          : message,
      ),
    );
  };

  const handleProjectChange = (orgId: string) => {
    const matchedProject = projectOptions.find((project) => project.orgId === orgId);

    if (!matchedProject) {
      return;
    }

    setChatForm((previous) => ({
      ...previous,
      orgId: matchedProject.orgId,
      project: matchedProject.name,
    }));
  };

  const handleSendChat = async () => {
    if (!input.trim() || isThinking) {
      return;
    }

    const message = input.trim();
    const activeIntent = selectedIntent;
    const requestController = new AbortController();
    activeRequestRef.current = requestController;

    appendMessage({
      content: message,
      id: createId(),
      role: 'user',
    });
    setInput('');
    setSelectedIntent(null);
    setIsThinking(true);

    try {
      let dataPreview: unknown = null;
      let requestPayload: Record<string, unknown> | null = null;
      let upstreamStatus: number | null = null;

      if (activeIntent) {
        requestPayload = buildEnergyQueryPayload(chatForm);
        const reportResponse = await queryEnergyReport(requestPayload, requestController.signal);
        dataPreview = reportResponse.data ?? null;
        upstreamStatus = reportResponse.upstreamStatus;
      }

      const response = await api.chatWithAi(
        {
          action: activeIntent ?? undefined,
          context: {
            energyType: chatForm.energyType,
            interval: chatForm.interval,
            project: chatForm.project,
            queryName: chatForm.queryName,
            timeRange: chatForm.timeRange,
          },
          dataPreview,
          message,
          requestPayload,
          upstreamStatus,
        },
        requestController.signal,
      );

      appendMessage({
        content: response.reply,
        id: createId(),
        role: 'assistant',
        showThinking: false,
        thinking: response.thinking,
      });
    } catch (error) {
      if (!requestController.signal.aborted) {
        appendMessage({
          content: error instanceof Error ? error.message : 'AI 对话请求失败。',
          id: createId(),
          role: 'assistant',
          showThinking: false,
          thinking: '已终止模型请求，建议检查后端环境变量或网络状态。',
        });
      }
    } finally {
      if (activeRequestRef.current === requestController) {
        activeRequestRef.current = null;
      }
      setIsThinking(false);
    }
  };

  const handleStopChat = () => {
    if (!isThinking) {
      return;
    }

    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setIsThinking(false);
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setChatMessages([
      { content: item.userPrompt, id: createId(), role: 'user' },
      { content: item.assistantReply, id: createId(), role: 'assistant', showThinking: false },
    ]);
    setSelectedIntent(null);
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendChat();
    }
  };

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className={`flex min-h-0 flex-col overflow-hidden rounded-[28px] border shadow-sm ${cardSurface}`}>
        <div className="flex shrink-0 items-center justify-between px-5 py-5">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textPrimary}`}>对话工作台</h2>
            <p className={`mt-1 text-sm leading-6 ${textSecondary}`}>
              默认空白起手，支持快捷意图、筛选条件和 AI 模型问答。
            </p>
          </div>
          <button
            onClick={() => setIsHistoryExpanded((previous) => !previous)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold ${cardSurface} ${textPrimary}`}
          >
            {isHistoryExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {isHistoryExpanded ? '收起历史' : '展开历史'}
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div className={`min-h-0 flex-1 overflow-y-auto rounded-[24px] ${mutedSurface} p-4`}>
            {chatMessages.length === 0 && !isThinking ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <h3 className={`text-2xl font-black tracking-tight ${textPrimary}`}>今天想聊什么?</h3>
                <p className={`mt-2 max-w-xl text-sm leading-6 ${textSecondary}`}>
                  输入问题后即可开始对话，点击输入框也会显示常用快捷意图。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : `${cardSurface} ${textPrimary}`
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>

                      {message.role === 'assistant' && message.thinking && (
                        <div className="mt-3 rounded-[18px] border border-slate-200/60 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                          <button
                            onClick={() => toggleThinking(message.id)}
                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600"
                          >
                            <Sparkles size={14} />
                            Thinking
                            <ChevronDown
                              size={14}
                              className={`transition ${message.showThinking ? 'rotate-180' : ''}`}
                            />
                          </button>

                          {message.showThinking && (
                            <div className={`mt-2 whitespace-pre-wrap text-xs leading-5 ${textSecondary}`}>
                              {message.thinking}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className={`rounded-[22px] px-4 py-3 shadow-sm ${cardSurface} ${textPrimary}`}>
                      AI 正在生成回答...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="mt-3 shrink-0 rounded-[24px] border p-4 shadow-sm">
            {selectedIntentMeta && (
              <div className="mb-3 rounded-[20px] border border-blue-500/20 bg-blue-500/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-blue-600">{selectedIntentMeta.label}</div>
                    <div className={`mt-1 text-xs leading-5 ${textSecondary}`}>
                      {selectedIntentMeta.description}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedIntent(null)}
                    className={`rounded-full px-3 py-1 text-xs font-bold ${mutedSurface} ${textPrimary}`}
                  >
                    清除
                  </button>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={chatForm.orgId}
                    onChange={(event) => handleProjectChange(event.target.value)}
                    disabled={projectsLoading && projectOptions.length === 0}
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    {projectOptions.map((project) => (
                      <option key={project.orgId} value={project.orgId}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={chatForm.energyType}
                    onChange={(event) =>
                      setChatForm((previous) => ({ ...previous, energyType: event.target.value }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    <option value="电">电</option>
                    <option value="水">水</option>
                    <option value="燃气">燃气</option>
                  </select>
                  <select
                    value={chatForm.timeRange}
                    onChange={(event) =>
                      setChatForm((previous) => ({ ...previous, timeRange: event.target.value }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    <option value="今天">今天</option>
                    <option value="本周">本周</option>
                    <option value="本月">本月</option>
                    <option value="本季">本季</option>
                    <option value="本年">本年</option>
                  </select>
                  <select
                    value={chatForm.interval}
                    onChange={(event) =>
                      setChatForm((previous) => ({ ...previous, interval: event.target.value }))
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    <option value="1小时">1小时</option>
                    <option value="1天">1天</option>
                  </select>
                </div>

                {projectsLoading && (
                  <div className={`mt-2 text-xs ${textSecondary}`}>项目列表同步中...</div>
                )}

                {projectLoadError && (
                  <div className="mt-2 text-xs text-rose-500">{projectLoadError}</div>
                )}
              </div>
            )}

            {showIntentPanel && (
              <div className="mb-3 flex flex-wrap gap-2">
                {quickIntents.map((intent) => (
                  <button
                    key={intent.id}
                    onClick={() => {
                      setSelectedIntent(intent.id);
                      composerRef.current?.focus();
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      selectedIntent === intent.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : `${cardSurface} ${textPrimary}`
                    }`}
                  >
                    {intent.label}
                  </button>
                ))}
              </div>
            )}

            <textarea
              ref={composerRef}
              value={input}
              onClick={() => setShowIntentPanel(true)}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="输入你的问题，例如：帮我诊断今天 A 区暖通空调的异常用能。"
              className={`h-24 w-full resize-none rounded-[20px] border px-4 py-3 text-sm leading-6 focus:outline-none ${cardSurface} ${textPrimary}`}
            />

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className={`text-sm ${textSecondary}`}>Enter 发送，Shift + Enter 换行。</div>
              <div className="flex gap-3">
                <button
                  onClick={handleStopChat}
                  className={`inline-flex items-center justify-center gap-2 rounded-[20px] border px-4 py-2.5 text-sm font-bold ${cardSurface} ${textPrimary}`}
                >
                  <Square size={15} />
                  停止
                </button>
                <button
                  onClick={() => void handleSendChat()}
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  <Send size={15} />
                  发送
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isHistoryExpanded && (
        <aside className={`flex min-h-0 flex-col overflow-hidden rounded-[28px] border p-5 shadow-sm ${cardSurface}`}>
          <div className="flex shrink-0 items-center justify-between">
            <div>
              <h3 className={`text-lg font-black ${textPrimary}`}>历史对话</h3>
              <p className={`mt-1 text-sm ${textSecondary}`}>保留最近常用的工作记录。</p>
            </div>
            <div className={`rounded-2xl p-3 ${mutedSurface}`}>
              <Clock3 size={18} className={isDarkMode ? 'text-slate-200' : 'text-slate-600'} />
            </div>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {historyItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 ${cardSurface}`}
              >
                <div className={`text-sm font-bold ${textPrimary}`}>{item.title}</div>
                <div className={`mt-1 text-xs leading-5 ${textSecondary}`}>{item.summary}</div>
                <div className="mt-3 text-xs text-slate-400">{item.time}</div>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
};
