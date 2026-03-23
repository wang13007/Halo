import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import {
  buildEnergyQueryPayload,
  formatEnergyQueryMessage,
  queryEnergyReport,
  type ChatQueryForm,
} from '../lib/energyQuery';

type PendingChatAction = 'compare' | 'query' | 'report' | 'summary' | null;

type QuickAction = {
  description: string;
  id: Exclude<PendingChatAction, null>;
  label: string;
  prompt: string;
};

const projectPresetMap: Record<string, string> = {
  A区: 'L-SH00-SHZXM00.04',
};

const historyItems = [
  {
    id: 1,
    summary: '今日能耗趋势与异常波动复盘',
    time: '10 分钟前',
    title: 'A区今日能耗概览',
  },
  {
    id: 2,
    summary: '按项目输出周报并汇总本周设备负荷变化。',
    time: '2 小时前',
    title: '周报生成记录',
  },
  {
    id: 3,
    summary: '分析照明与暖通的成本差异。',
    time: '昨天',
    title: '分项对比分析',
  },
];

const quickActions: QuickAction[] = [
  {
    description: '调用 queryReport 代理接口拉取当前筛选条件下的实时能耗数据。',
    id: 'query',
    label: '实时查询',
    prompt: '查询当前筛选条件下的能耗用量',
  },
  {
    description: '生成适合管理层查看的结构化日报或周报摘要。',
    id: 'report',
    label: '生成报告',
    prompt: '生成本次筛选条件的能耗报告',
  },
  {
    description: '聚焦项目、能源类型和时间范围的横向对比。',
    id: 'compare',
    label: '对比分析',
    prompt: '对比当前筛选条件的能耗差异',
  },
  {
    description: '用自然语言快速总结当前筛选条件下的运营重点。',
    id: 'summary',
    label: '总结摘要',
    prompt: '总结当前筛选条件的重点结论',
  },
];

export const ChatWorkspace = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [chatForm, setChatForm] = useState<ChatQueryForm>({
    energyType: '电',
    interval: '1小时',
    orgId: projectPresetMap.A区,
    pageNum: 1,
    pageSize: 20,
    project: 'A区',
    queryName: '',
    timeRange: '今日',
  });
  const [chatMessages, setChatMessages] = useState<Array<{ content: string; role: 'assistant' | 'user' }>>([
    {
      content:
        '你好，我是 Halo Web 助手。你可以直接查询能耗、生成报告，或者进入系统配置查看后端接入状态。',
      role: 'assistant',
    },
  ]);
  const [input, setInput] = useState('');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingChatAction, setPendingChatAction] = useState<PendingChatAction>(null);

  const energyQueryAbortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    energyQueryAbortRef.current?.abort();
  }, []);

  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const cardSurface = isDarkMode
    ? 'border-white/10 bg-slate-900/70'
    : 'border-white/80 bg-white/84';
  const mutedSurface = isDarkMode ? 'bg-white/5' : 'bg-slate-50';

  const appendAssistantMessage = (content: string) => {
    setChatMessages((previous) => [...previous, { content, role: 'assistant' }]);
  };

  const appendUserMessage = (content: string) => {
    setChatMessages((previous) => [...previous, { content, role: 'user' }]);
  };

  const handleProjectChange = (project: string) => {
    setChatForm((previous) => ({
      ...previous,
      orgId: projectPresetMap[project] ?? previous.orgId,
      project,
    }));
  };

  const handleSendChat = async () => {
    if (!input.trim()) {
      return;
    }

    const message = input.trim();
    const action = pendingChatAction;

    appendUserMessage(message);
    setInput('');
    setPendingChatAction(null);
    setIsThinking(true);

    if (action === 'query' || /查询|用量|趋势|能耗/.test(message)) {
      const controller = new AbortController();
      energyQueryAbortRef.current = controller;

      try {
        const payload = buildEnergyQueryPayload(chatForm);
        const response = await queryEnergyReport(payload, controller.signal);
        appendAssistantMessage(formatEnergyQueryMessage(chatForm, payload, response));
      } catch (error) {
        if (!controller.signal.aborted) {
          appendAssistantMessage(
            error instanceof Error ? error.message : 'queryReport 请求失败。',
          );
        }
      } finally {
        if (energyQueryAbortRef.current === controller) {
          energyQueryAbortRef.current = null;
        }
        setIsThinking(false);
      }

      return;
    }

    window.setTimeout(() => {
      setIsThinking(false);
      appendAssistantMessage(
        [
          '已根据当前筛选条件生成分析建议。',
          '',
          `项目：${chatForm.project}`,
          `能源类型：${chatForm.energyType}`,
          `时间范围：${chatForm.timeRange}`,
          `统计粒度：${chatForm.interval}`,
          '',
          action === 'report'
            ? '建议输出日报，重点关注暖通空调负荷和夜间异常波动。'
            : action === 'compare'
              ? '建议优先对比暖通空调与照明插座的波动差异。'
              : '建议先查看今日总能耗与本月累计，再决定是否继续下钻。',
        ].join('\n'),
      );
    }, 900);
  };

  const handleStopChat = () => {
    energyQueryAbortRef.current?.abort();
    energyQueryAbortRef.current = null;
    setIsThinking(false);
    appendAssistantMessage('已停止本次对话生成。');
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className={`rounded-[32px] border p-6 shadow-sm ${cardSurface}`}>
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={`text-2xl font-black tracking-tight ${textPrimary}`}>对话工作台</h2>
            <p className={`mt-2 text-sm ${textSecondary}`}>
              历史对话入口已经收回到标题区域，页面边缘不再使用单独悬浮按钮。
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

        <div className="mb-5 grid gap-3 lg:grid-cols-5">
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
            <option value="今日">今日</option>
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
            placeholder="关键词，例如 暖通"
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                setPendingChatAction(action.id);
                setInput(action.prompt);
              }}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                pendingChatAction === action.id
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900'
                  : `${cardSurface} ${textPrimary}`
              }`}
            >
              <div className="font-bold">{action.label}</div>
              <div className="mt-1 text-xs opacity-70">{action.description}</div>
            </button>
          ))}
        </div>

        <div className={`rounded-[28px] ${mutedSurface} p-4`}>
          <div className="mb-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              `组织 ID：${chatForm.orgId}`,
              `分页：第 ${chatForm.pageNum} 页 / ${chatForm.pageSize} 条`,
              `当前动作：${pendingChatAction ?? '自由提问'}`,
            ].map((item) => (
              <span
                key={item}
                className={`rounded-full px-3 py-1.5 ${
                  isDarkMode ? 'bg-white/8 text-slate-200' : 'bg-white text-slate-600'
                }`}
              >
                {item}
              </span>
            ))}
          </div>

          <div className="space-y-4">
            {chatMessages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[82%] rounded-[26px] px-5 py-4 text-sm leading-7 shadow-sm whitespace-pre-wrap ${
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
                <div className={`rounded-[26px] px-5 py-4 shadow-sm ${cardSurface} ${textPrimary}`}>
                  正在生成内容，请稍候...
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入你的问题，例如：查询今天 A 区暖通空调电耗趋势"
            className={`min-h-[110px] rounded-[28px] border px-5 py-4 text-sm leading-7 focus:outline-none resize-none ${cardSurface} ${textPrimary}`}
          />
          <button
            onClick={() => void handleSendChat()}
            className="inline-flex items-center justify-center rounded-[28px] bg-slate-900 px-6 py-4 text-sm font-bold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            发送
          </button>
          <button
            onClick={handleStopChat}
            className={`inline-flex items-center justify-center rounded-[28px] border px-6 py-4 text-sm font-bold ${cardSurface} ${textPrimary}`}
          >
            停止
          </button>
        </div>
      </section>

      {isHistoryExpanded && (
        <aside className={`rounded-[32px] border p-5 shadow-sm ${cardSurface}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`text-lg font-black ${textPrimary}`}>历史对话</h3>
              <p className={`mt-1 text-sm ${textSecondary}`}>保留最近常用的工作记录。</p>
            </div>
            <div className={`rounded-2xl p-3 ${mutedSurface}`}>
              <Clock3 size={18} className={isDarkMode ? 'text-slate-200' : 'text-slate-600'} />
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {historyItems.map((item) => (
              <button
                key={item.id}
                className={`w-full rounded-[24px] border p-4 text-left transition hover:-translate-y-0.5 ${cardSurface}`}
              >
                <div className={`text-sm font-bold ${textPrimary}`}>{item.title}</div>
                <div className={`mt-1 text-xs ${textSecondary}`}>{item.summary}</div>
                <div className="mt-3 text-xs text-slate-400">{item.time}</div>
              </button>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
};
