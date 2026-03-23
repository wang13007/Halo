import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3, Send, Square } from 'lucide-react';
import {
  buildEnergyQueryPayload,
  formatEnergyQueryMessage,
  queryEnergyReport,
  type ChatQueryForm,
} from '../lib/energyQuery';

type PendingChatAction = 'compare' | 'query' | 'report' | 'summary' | null;

type ChatMessage = {
  content: string;
  id: string;
  role: 'assistant' | 'user';
};

type QuickAction = {
  description: string;
  id: Exclude<PendingChatAction, null>;
  label: string;
  prompt: string;
};

type HistoryItem = {
  assistantReply: string;
  id: number;
  summary: string;
  time: string;
  title: string;
  userPrompt: string;
};

const projectPresetMap: Record<string, string> = {
  A区: 'L-SH00-SHZXM00.04',
};

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

const quickActions: QuickAction[] = [
  {
    description: '调用 queryReport 代理接口，返回当前筛选条件下的原始数据预览。',
    id: 'query',
    label: '实时查询',
    prompt: '查询当前筛选条件下的能耗数据。',
  },
  {
    description: '生成适合管理层查看的日报或周报提纲。',
    id: 'report',
    label: '生成报告',
    prompt: '生成当前条件下的能耗报告提纲。',
  },
  {
    description: '按项目、能源类型和时间范围做横向比较。',
    id: 'compare',
    label: '对比分析',
    prompt: '对比当前条件下的能耗差异。',
  },
  {
    description: '把当前上下文浓缩成一段可直接汇报的总结。',
    id: 'summary',
    label: '总结摘要',
    prompt: '总结当前条件下的关键结论。',
  },
];

const actionLabelMap: Record<Exclude<PendingChatAction, null>, string> = {
  compare: '对比分析',
  query: '实时查询',
  report: '生成报告',
  summary: '总结摘要',
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const buildAssistantReply = (
  message: string,
  action: PendingChatAction,
  form: ChatQueryForm,
) => {
  const contextLine = `当前上下文：${form.project} / ${form.energyType} / ${form.timeRange} / ${form.interval}`;

  if (action === 'report') {
    return [
      '我先给你整理一版报告结构，可以直接继续扩写。',
      '',
      contextLine,
      '',
      '1. 总览：说明本时段总能耗和与上一周期的变化。',
      '2. 重点：优先关注暖通空调与照明插座的波动时段。',
      '3. 风险：夜间基线偏高时，需要复核设备待机和策略排程。',
      '4. 建议：保留峰值时段截图，并补充异常原因说明。',
    ].join('\n');
  }

  if (action === 'compare') {
    return [
      '我按对比分析的方式整理了一版思路。',
      '',
      contextLine,
      '',
      '建议优先比较以下维度：',
      '- 峰值出现时段是否一致',
      '- 暖通空调与照明插座的占比变化',
      '- 工作时段与夜间基线差值',
    ].join('\n');
  }

  if (action === 'summary') {
    return [
      '当前可以先这样总结：',
      '',
      contextLine,
      '',
      `围绕“${message}”这个问题，建议先确认总量变化，再判断异常时段和分项贡献，最后再落到节能动作与整改优先级。`,
    ].join('\n');
  }

  return [
    '我已经根据你的问题整理出一版可继续追问的回答。',
    '',
    contextLine,
    '',
    `问题：${message}`,
    '建议先查看总能耗趋势，再下钻到暖通空调、照明插座和动力设备三个主要分项。',
  ].join('\n');
};

export const ChatWorkspace = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [chatForm, setChatForm] = useState<ChatQueryForm>({
    energyType: '电',
    interval: '1小时',
    orgId: projectPresetMap.A区,
    pageNum: 1,
    pageSize: 20,
    project: 'A区',
    queryName: '',
    timeRange: '今天',
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingChatAction, setPendingChatAction] = useState<PendingChatAction>(null);

  const energyQueryAbortRef = useRef<AbortController | null>(null);
  const responseTimerRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isThinking]);

  useEffect(
    () => () => {
      energyQueryAbortRef.current?.abort();
      if (responseTimerRef.current !== null) {
        window.clearTimeout(responseTimerRef.current);
      }
    },
    [],
  );

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  const appendAssistantMessage = (content: string) => {
    setChatMessages((previous) => [...previous, { content, id: createId(), role: 'assistant' }]);
  };

  const appendUserMessage = (content: string) => {
    setChatMessages((previous) => [...previous, { content, id: createId(), role: 'user' }]);
  };

  const handleProjectChange = (project: string) => {
    setChatForm((previous) => ({
      ...previous,
      orgId: projectPresetMap[project] ?? previous.orgId,
      project,
    }));
  };

  const handleQuickAction = (action: QuickAction) => {
    setPendingChatAction(action.id);
    setInput(action.prompt);
    composerRef.current?.focus();
  };

  const handleSendChat = async () => {
    if (!input.trim() || isThinking) {
      return;
    }

    const message = input.trim();
    const action = pendingChatAction;

    appendUserMessage(message);
    setInput('');
    setPendingChatAction(null);
    setIsThinking(true);

    if (action === 'query' || /查询|用量|趋势|能耗|报表|耗电|用电/.test(message)) {
      const controller = new AbortController();
      energyQueryAbortRef.current = controller;

      try {
        const payload = buildEnergyQueryPayload(chatForm);
        const response = await queryEnergyReport(payload, controller.signal);
        appendAssistantMessage(formatEnergyQueryMessage(chatForm, payload, response));
      } catch (error) {
        if (!controller.signal.aborted) {
          appendAssistantMessage(error instanceof Error ? error.message : 'queryReport 请求失败。');
        }
      } finally {
        if (energyQueryAbortRef.current === controller) {
          energyQueryAbortRef.current = null;
        }
        setIsThinking(false);
      }

      return;
    }

    responseTimerRef.current = window.setTimeout(() => {
      appendAssistantMessage(buildAssistantReply(message, action, chatForm));
      setIsThinking(false);
      responseTimerRef.current = null;
    }, 600);
  };

  const handleStopChat = () => {
    if (!isThinking) {
      return;
    }

    energyQueryAbortRef.current?.abort();
    energyQueryAbortRef.current = null;

    if (responseTimerRef.current !== null) {
      window.clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }

    setIsThinking(false);
    appendAssistantMessage('已停止本次回答。');
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setChatMessages([
      { content: item.userPrompt, id: createId(), role: 'user' },
      { content: item.assistantReply, id: createId(), role: 'assistant' },
    ]);
    setPendingChatAction(null);
    setInput('');
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSendChat();
    }
  };

  const contextSummary = [
    `项目：${chatForm.project}`,
    `能源：${chatForm.energyType}`,
    `时间：${chatForm.timeRange}`,
    `粒度：${chatForm.interval}`,
  ];

  return (
    <div className="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className={`flex min-h-0 flex-col overflow-hidden rounded-[28px] border shadow-sm ${cardSurface}`}>
        <div className="flex shrink-0 flex-col gap-3 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textPrimary}`}>对话工作台</h2>
            <p className={`mt-1 text-sm leading-6 ${textSecondary}`}>
              从空白输入开始提问，系统会按当前上下文返回查询、分析或总结结果。
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

        <div className="shrink-0 px-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select
              value={chatForm.project}
              onChange={(event) => handleProjectChange(event.target.value)}
              className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
            >
              <option value="A区">A区</option>
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
            <input
              value={chatForm.queryName}
              onChange={(event) =>
                setChatForm((previous) => ({ ...previous, queryName: event.target.value }))
              }
              className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
              placeholder="关键词（可选）"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  pendingChatAction === action.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : `${cardSurface} ${textPrimary}`
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          <div className={`mb-3 flex flex-wrap gap-2 text-xs font-semibold ${textSecondary}`}>
            {contextSummary.map((item) => (
              <span
                key={item}
                className={`rounded-full px-3 py-1.5 ${
                  isDarkMode ? 'bg-white/8 text-slate-200' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item}
              </span>
            ))}
            {pendingChatAction && (
              <span className="rounded-full bg-blue-500/10 px-3 py-1.5 text-blue-600">
                动作：{actionLabelMap[pendingChatAction]}
              </span>
            )}
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto rounded-[24px] ${mutedSurface} p-4`}>
            {chatMessages.length === 0 && !isThinking ? (
              <div className="flex h-full min-h-[180px] flex-col items-center justify-center text-center">
                <h3 className={`text-2xl font-black tracking-tight ${textPrimary}`}>今天想聊什么？</h3>
                <p className={`mt-2 max-w-xl text-sm leading-6 ${textSecondary}`}>
                  可以直接输入问题，也可以先点上面的快捷动作，从实时查询、报告提纲或总结摘要开始。
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
                      className={`max-w-[82%] whitespace-pre-wrap rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : `${cardSurface} ${textPrimary}`
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className="flex justify-start">
                    <div className={`rounded-[22px] px-4 py-3 shadow-sm ${cardSurface} ${textPrimary}`}>
                      正在思考，请稍候...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="mt-3 shrink-0 rounded-[24px] border p-4 shadow-sm">
            <textarea
              ref={composerRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="输入你的问题，例如：帮我总结今天 A 区暖通空调的能耗重点。"
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
