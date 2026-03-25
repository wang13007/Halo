import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Send,
  Sparkles,
  Square,
} from 'lucide-react';
import { api, type EnergyQuickProject, type Project } from '../lib/api';
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

const emptyProjectOptions: EnergyQuickProject[] = [];

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

const createHistoryItems = (projectName: string): HistoryItem[] => [
  {
    assistantReply: `今天 ${projectName} 的暖通空调仍是主要负荷来源，建议优先检查 13:00 之后的运行策略，并比对照明负荷是否同步上升。`,
    id: 1,
    summary: '今日趋势与异常波动复盘',
    time: '10 分钟前',
    title: `${projectName}今日能耗概览`,
    userPrompt: `帮我总结今天 ${projectName} 的能耗重点。`,
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

const normalizeQuickProjects = (projects: Array<Partial<EnergyQuickProject>>) => {
  const dedupedProjects = new Map<string, EnergyQuickProject>();

  projects.forEach((project) => {
    const name = typeof project.name === 'string' ? project.name.trim() : '';
    const orgId = typeof project.orgId === 'string' ? project.orgId.trim() : '';
    const channel = typeof project.channel === 'string' ? project.channel.trim() : 'LONGFOR';

    if (!name || !orgId) {
      return;
    }

    dedupedProjects.set(`${orgId}::${name}`, { channel: channel || 'LONGFOR', name, orgId });
  });

  return [...dedupedProjects.values()].sort((left, right) =>
    left.name.localeCompare(right.name, 'zh-CN'),
  );
};

const mapProjectsToQuickOptions = (projects: Project[]) =>
  normalizeQuickProjects(
    projects.map((project) => ({
      channel: 'LOCAL',
      name: project.name,
      orgId: project.code || project.id,
    })),
  );

const normalizeProjectLoadError = (error: unknown, hasFallbackProjects = false) => {
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

const getProjectLoadErrorMessage = (error: unknown, hasFallbackProjects = false) => {
  const fallbackMessage = '项目列表同步失败。';

  if (!(error instanceof Error)) {
    return hasFallbackProjects ? `${fallbackMessage} 已回退到本地项目列表。` : fallbackMessage;
  }

  const message = error.message || '';

  if (message.includes('<!doctype') || message.includes('<html') || message.includes('HTML') || message.includes('JSON')) {
    return hasFallbackProjects
      ? '当前站点未连接 Halo 后端接口，已回退到本地项目列表。'
      : '当前站点未连接 Halo 后端接口。';
  }

  if (
    message.includes('TLS handshake failed') ||
    message.includes('ECONNRESET') ||
    message.includes('fetch failed')
  ) {
    return hasFallbackProjects
      ? '龙湖项目接口握手失败，当前环境可能未接入内网或 VPN，已回退到本地项目列表。'
      : '龙湖项目接口握手失败，当前环境可能未接入内网或 VPN。';
  }

  const nextMessage = message || fallbackMessage;
  return hasFallbackProjects ? `${nextMessage} 已回退到本地项目列表。` : nextMessage;
};

const layoutSpringTransition = {
  damping: 28,
  mass: 0.9,
  stiffness: 280,
  type: 'spring' as const,
};

export const ChatWorkspace = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [chatForm, setChatForm] = useState<ChatQueryForm>({
    energyType: '电',
    interval: '1小时',
    orgId: '',
    pageNum: 1,
    pageSize: 20,
    project: '',
    queryName: '',
    timeRange: '今天',
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [hasLoadedProjects, setHasLoadedProjects] = useState(false);
  const [projectOptions, setProjectOptions] = useState<EnergyQuickProject[]>(emptyProjectOptions);
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

  const syncProjectSelection = (projects: EnergyQuickProject[]) => {
    setProjectOptions(projects);
    setChatForm((previous) => {
      if (projects.length === 0) {
        return {
          ...previous,
          orgId: '',
          project: '',
        };
      }

      const matchedProject =
        projects.find(
          (project) => project.orgId === previous.orgId || project.name === previous.project,
        ) ?? projects[0];

      return {
        ...previous,
        orgId: matchedProject.orgId,
        project: matchedProject.name,
      };
    });
  };

  useEffect(() => {
    if (hasLoadedProjects) {
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

        const nextProjects = normalizeQuickProjects(response.projects);

        if (nextProjects.length > 0) {
          setHasLoadedProjects(true);
          syncProjectSelection(nextProjects);
          setProjectLoadError('');
          return;
        }

        throw new Error('项目接口已响应，但未返回可用项目。');
      } catch (error) {
        if (isMounted) {
          let fallbackProjects: EnergyQuickProject[] = [];

          try {
            const localProjectsResponse = await api.getProjects();
            fallbackProjects = mapProjectsToQuickOptions(localProjectsResponse.projects);
          } catch {
            fallbackProjects = [];
          }

          setHasLoadedProjects(true);
          setProjectLoadError(getProjectLoadErrorMessage(error, fallbackProjects.length > 0));
          syncProjectSelection(fallbackProjects);
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
  }, [hasLoadedProjects]);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';
  const currentProjectName =
    projectOptions.find((project) => project.orgId === chatForm.orgId)?.name ||
    chatForm.project ||
    projectOptions[0]?.name ||
    '';
  const promptProjectName = currentProjectName || '项目';
  const historyItems = useMemo(
    () => createHistoryItems(promptProjectName),
    [promptProjectName],
  );

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
        if (!chatForm.orgId.trim()) {
          throw new Error('项目列表暂不可用，请先检查项目接口后再使用快捷意图。');
        }

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
    <motion.div
      layout
      transition={layoutSpringTransition}
      className="flex h-full min-h-0 flex-col gap-4 xl:flex-row"
    >
      <motion.section
        layout
        animate={{ scale: isHistoryExpanded ? 1 : 1.008 }}
        transition={layoutSpringTransition}
        className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border shadow-sm ${cardSurface}`}
      >
        <div className="flex shrink-0 items-center justify-between px-5 py-5">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textPrimary}`}>对话工作台</h2>
          </div>
          {!isHistoryExpanded && (
            <button
              onClick={() => setIsHistoryExpanded(true)}
              className={`inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-4 py-2 text-sm font-semibold ${cardSurface} ${textPrimary}`}
            >
              <ChevronLeft size={16} />
              展开历史
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div className={`min-h-0 flex-1 overflow-y-auto rounded-[24px] ${mutedSurface} p-4`}>
            {chatMessages.length === 0 && !isThinking ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <h3 className={`text-2xl font-black tracking-tight ${textPrimary}`}>Halo · 云境</h3>
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
                    disabled={projectsLoading || projectOptions.length === 0}
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    {projectOptions.length === 0 ? (
                      <option value="">{projectsLoading ? '项目加载中...' : '暂无可用项目'}</option>
                    ) : (
                      projectOptions.map((project) => (
                        <option key={project.orgId} value={project.orgId}>
                          {project.name}
                        </option>
                      ))
                    )}
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
              placeholder={`输入你的问题，例如：帮我诊断今天 ${promptProjectName} 暖通空调的异常用能。`}
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
      </motion.section>

      <AnimatePresence initial={false}>
        {isHistoryExpanded && (
          <motion.aside
            layout
            initial={{ opacity: 0, scale: 0.96, x: 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: 24 }}
            transition={layoutSpringTransition}
            className="min-h-0 xl:w-[300px] xl:flex-none"
          >
            <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border p-5 shadow-sm ${cardSurface}`}>
          <div className="flex shrink-0 items-center justify-between">
            <div>
              <h3 className={`text-lg font-black ${textPrimary}`}>历史对话</h3>
              <p className={`mt-1 text-sm ${textSecondary}`}>保留最近常用的工作记录。</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                <Clock3 size={18} className={isDarkMode ? 'text-slate-200' : 'text-slate-600'} />
              </div>
              <button
                onClick={() => setIsHistoryExpanded(false)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-2xl border px-3.5 py-2 text-sm font-semibold ${cardSurface} ${textPrimary}`}
              >
                <ChevronRight size={16} />
                收起历史
              </button>
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
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
