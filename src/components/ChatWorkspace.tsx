import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
  Send,
  Sparkles,
  Square,
} from "lucide-react";
import {
  api,
  type ChatSession,
  type ChatSessionMessage,
  type ChatSessionSummary,
  type EnergyQueryConfig,
  type EnergyQueryOption,
  type EnergyQuickProject,
  type UpsertChatSessionPayload,
} from "../lib/api";
import {
  createChatSessionStore,
  toChatSessionSummary,
} from "../lib/chatSessions";
import {
  buildEnergyQueryPayload,
  queryEnergyReport,
  type ChatQueryForm,
} from "../lib/energyQuery";

type QuickIntentId =
  | "energy-compare"
  | "energy-diagnostic"
  | "energy-query"
  | "energy-report";

type ChatMessage = ChatSessionMessage & {
  showThinking?: boolean;
};

const quickIntents: Array<{
  description: string;
  id: QuickIntentId;
  label: string;
}> = [
  {
    description: "提取当前筛选条件下的能耗数据，并生成查询说明。",
    id: "energy-query",
    label: "能耗查询",
  },
  {
    description: "按项目、时间和能源类型输出对比结论。",
    id: "energy-compare",
    label: "能耗对比",
  },
  {
    description: "生成日报、周报或专题报告提纲。",
    id: "energy-report",
    label: "能源报表",
  },
  {
    description: "围绕异常波动、基线偏高和节能机会生成诊断建议。",
    id: "energy-diagnostic",
    label: "能源诊断",
  },
];

const emptyProjectOptions: EnergyQuickProject[] = [];

const energyTypeLabels: Record<string, string> = {
  electricity: "电",
  gas: "燃气",
  water: "水",
};

const intervalLabels: Record<string, string> = {
  day: "1天",
  hour: "1小时",
};

const createId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeStringList = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];

const normalizeQuickProjects = (
  projects: Array<Partial<EnergyQuickProject>>,
) => {
  const dedupedProjects = new Map<string, EnergyQuickProject>();

  projects.forEach((project) => {
    const name = normalizeString(project.name);
    const orgId = normalizeString(project.orgId);

    if (!name || !orgId) {
      return;
    }

    dedupedProjects.set(`${orgId}::${name}`, {
      availableGranularities: normalizeStringList(
        project.availableGranularities,
      ),
      availableMeterTypes: normalizeStringList(project.availableMeterTypes),
      channel: normalizeString(project.channel) || "DATABASE",
      firstSampleDate: normalizeString(project.firstSampleDate),
      lastSampleDate: normalizeString(project.lastSampleDate),
      name,
      orgId,
      organizationPath: normalizeString(project.organizationPath),
      projectCode: normalizeString(project.projectCode) || orgId,
      recordCount:
        typeof project.recordCount === "number" &&
        Number.isFinite(project.recordCount)
          ? project.recordCount
          : 0,
    });
  });

  return [...dedupedProjects.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "zh-CN"),
  );
};

const getAvailableProjectEnergyTypes = (
  project: EnergyQuickProject | null,
  config: EnergyQueryConfig | null,
) => {
  const projectValues = normalizeStringList(project?.availableMeterTypes);

  if (projectValues.length > 0) {
    return projectValues;
  }

  return (config?.energyTypes ?? []).map((option) => option.value);
};

const getAvailableProjectIntervals = (
  project: EnergyQuickProject | null,
  config: EnergyQueryConfig | null,
) => {
  const projectValues = normalizeStringList(project?.availableGranularities);

  if (projectValues.length > 0) {
    return projectValues;
  }

  return (config?.intervals ?? []).map((option) => option.value);
};

const pickAvailableValue = (
  values: string[],
  preferredValue: string,
  fallbackValue = "",
) => {
  if (preferredValue && values.includes(preferredValue)) {
    return preferredValue;
  }

  if (fallbackValue && values.includes(fallbackValue)) {
    return fallbackValue;
  }

  return values[0] ?? fallbackValue;
};

const clampDateToRange = (value: string, minDate: string, maxDate: string) => {
  if (!value) {
    return maxDate || minDate;
  }

  if (minDate && value < minDate) {
    return minDate;
  }

  if (maxDate && value > maxDate) {
    return maxDate;
  }

  return value;
};

const normalizeDateRange = (startDate: string, endDate: string) => {
  if (!startDate && !endDate) {
    return { endDate: "", startDate: "" };
  }

  if (!startDate) {
    return { endDate, startDate: endDate };
  }

  if (!endDate) {
    return { endDate: startDate, startDate };
  }

  return startDate <= endDate
    ? { endDate, startDate }
    : { endDate: startDate, startDate: endDate };
};

const findOptionLabel = (
  options: EnergyQueryOption[],
  value: string,
  fallbackMap: Record<string, string>,
) =>
  options.find((option) => option.value === value)?.label ??
  fallbackMap[value] ??
  value;

const getQueryConfigErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "查询配置加载失败。";
  }

  const message = error.message || "";

  if (
    message.includes("<!doctype") ||
    message.includes("<html") ||
    message.includes("HTML") ||
    message.includes("JSON")
  ) {
    return "当前站点未连接 Halo 后端接口。";
  }

  return message || "查询配置加载失败。";
};

const createChatMessage = ({
  content,
  role,
  thinking,
}: {
  content: string;
  role: "assistant" | "user";
  thinking?: string;
}): ChatMessage => ({
  content,
  createdAt: new Date().toISOString(),
  id: createId(),
  role,
  showThinking: false,
  ...(thinking ? { thinking } : {}),
});

const mapSessionMessagesToView = (
  messages: ChatSessionMessage[],
): ChatMessage[] =>
  messages.map((message) => ({
    ...message,
    showThinking: false,
  }));

const mapViewMessagesToSession = (
  messages: ChatMessage[],
): ChatSessionMessage[] =>
  messages.map(({ content, createdAt, id, role, thinking }) => ({
    content,
    createdAt,
    id,
    role,
    ...(thinking ? { thinking } : {}),
  }));

const formatRelativeTime = (value: string) => {
  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffInMinutes = Math.round((timestamp - Date.now()) / 60000);
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });

  if (Math.abs(diffInMinutes) < 60) {
    return formatter.format(diffInMinutes, "minute");
  }

  const diffInHours = Math.round(diffInMinutes / 60);

  if (Math.abs(diffInHours) < 24) {
    return formatter.format(diffInHours, "hour");
  }

  const diffInDays = Math.round(diffInHours / 24);

  if (Math.abs(diffInDays) < 30) {
    return formatter.format(diffInDays, "day");
  }

  const diffInMonths = Math.round(diffInDays / 30);

  if (Math.abs(diffInMonths) < 12) {
    return formatter.format(diffInMonths, "month");
  }

  return formatter.format(Math.round(diffInMonths / 12), "year");
};

const sortHistorySessions = (sessions: ChatSessionSummary[]) =>
  [...sessions].sort(
    (left, right) =>
      Date.parse(right.last_message_at) - Date.parse(left.last_message_at),
  );

const layoutSpringTransition = {
  damping: 28,
  mass: 0.9,
  stiffness: 280,
  type: "spring" as const,
};

const readContextFromSession = (session: ChatSession) => {
  if (!isPlainObject(session.metadata)) {
    return null;
  }

  const rawContext = session.metadata.context;

  if (!isPlainObject(rawContext)) {
    return null;
  }

  return rawContext;
};

export const ChatWorkspace = ({ isDarkMode }: { isDarkMode: boolean }) => {
  const [chatForm, setChatForm] = useState<ChatQueryForm>({
    endDate: "",
    energyType: "",
    interval: "",
    orgId: "",
    pageNum: 1,
    pageSize: 20,
    project: "",
    queryName: "",
    startDate: "",
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [historySessions, setHistorySessions] = useState<ChatSessionSummary[]>(
    [],
  );
  const [input, setInput] = useState("");
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(true);
  const [isThinking, setIsThinking] = useState(false);
  const [projectOptions, setProjectOptions] =
    useState<EnergyQuickProject[]>(emptyProjectOptions);
  const [queryConfig, setQueryConfig] = useState<EnergyQueryConfig | null>(
    null,
  );
  const [projectLoadError, setProjectLoadError] = useState("");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<QuickIntentId | null>(
    null,
  );
  const [showIntentPanel, setShowIntentPanel] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [isSessionSaving, setIsSessionSaving] = useState(false);
  const [sessionSaveError, setSessionSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const activeRequestRef = useRef<AbortController | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const requestRunIdRef = useRef(0);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sessionStoreRef = useRef(createChatSessionStore());

  const setCurrentSessionId = (sessionId: string | null) => {
    activeSessionIdRef.current = sessionId;
    setActiveSessionId(sessionId);
  };

  const selectedProject = useMemo(
    () =>
      projectOptions.find((project) => project.orgId === chatForm.orgId) ??
      projectOptions[0] ??
      null,
    [chatForm.orgId, projectOptions],
  );

  const energyTypeOptions = useMemo(() => {
    const allowedValues = new Set(
      getAvailableProjectEnergyTypes(selectedProject, queryConfig),
    );
    return (queryConfig?.energyTypes ?? []).filter((option) =>
      allowedValues.has(option.value),
    );
  }, [queryConfig, selectedProject]);

  const intervalOptions = useMemo(() => {
    const allowedValues = new Set(
      getAvailableProjectIntervals(selectedProject, queryConfig),
    );
    return (queryConfig?.intervals ?? []).filter((option) =>
      allowedValues.has(option.value),
    );
  }, [queryConfig, selectedProject]);

  const selectedEnergyTypeLabel = useMemo(
    () =>
      findOptionLabel(energyTypeOptions, chatForm.energyType, energyTypeLabels),
    [chatForm.energyType, energyTypeOptions],
  );
  const selectedIntervalLabel = useMemo(
    () => findOptionLabel(intervalOptions, chatForm.interval, intervalLabels),
    [chatForm.interval, intervalOptions],
  );
  const selectedTimeRangeLabel = useMemo(() => {
    if (!chatForm.startDate && !chatForm.endDate) {
      return "未指定";
    }

    return `${chatForm.startDate || chatForm.endDate} 至 ${chatForm.endDate || chatForm.startDate}`;
  }, [chatForm.endDate, chatForm.startDate]);

  const applyProjectSelection = (
    project: EnergyQuickProject | null,
    config: EnergyQueryConfig | null,
    options?: {
      preferredEnergyType?: string;
      preferredEndDate?: string;
      preferredInterval?: string;
      preferredStartDate?: string;
      preferredText?: string;
      resetDates?: boolean;
    },
  ) => {
    setChatForm((previous) => {
      if (!project) {
        return {
          ...previous,
          endDate: "",
          energyType: "",
          interval: "",
          orgId: "",
          project: "",
          startDate: "",
        };
      }

      const availableEnergyTypes = getAvailableProjectEnergyTypes(
        project,
        config,
      );
      const availableIntervals = getAvailableProjectIntervals(project, config);
      const defaultDate = project.lastSampleDate || project.firstSampleDate;
      const nextEnergyType = pickAvailableValue(
        availableEnergyTypes,
        options?.preferredEnergyType ?? previous.energyType,
        config?.defaults.energyType ?? "",
      );
      const nextInterval = pickAvailableValue(
        availableIntervals,
        options?.preferredInterval ?? previous.interval,
        config?.defaults.interval ?? "",
      );
      const rawStartDate = options?.resetDates
        ? defaultDate
        : clampDateToRange(
            options?.preferredStartDate ?? previous.startDate,
            project.firstSampleDate ?? "",
            project.lastSampleDate ?? "",
          );
      const rawEndDate = options?.resetDates
        ? defaultDate
        : clampDateToRange(
            options?.preferredEndDate ?? previous.endDate,
            project.firstSampleDate ?? "",
            project.lastSampleDate ?? "",
          );
      const { startDate, endDate } = normalizeDateRange(
        rawStartDate,
        rawEndDate,
      );

      return {
        ...previous,
        endDate: endDate || defaultDate,
        energyType: nextEnergyType,
        interval: nextInterval,
        orgId: project.orgId,
        project: project.name,
        queryName: options?.preferredText ?? previous.queryName,
        startDate: startDate || defaultDate,
      };
    });
  };

  const upsertHistorySession = (session: ChatSession) => {
    const summary = toChatSessionSummary(session);

    setHistorySessions((previous) =>
      sortHistorySessions([
        summary,
        ...previous.filter((item) => item.id !== summary.id),
      ]),
    );
  };

  const cancelActiveRun = () => {
    requestRunIdRef.current += 1;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setIsThinking(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isThinking]);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    const requestController = new AbortController();
    let isMounted = true;

    const loadQueryConfig = async () => {
      setProjectsLoading(true);
      setProjectLoadError("");

      try {
        const response = await api.getEnergyQueryConfig(
          requestController.signal,
        );

        if (!isMounted) {
          return;
        }

        const normalizedProjects = normalizeQuickProjects(response.projects);
        const normalizedConfig: EnergyQueryConfig = {
          ...response,
          projects: normalizedProjects,
        };
        const matchedProject =
          normalizedProjects.find(
            (project) => project.orgId === response.defaults.orgId,
          ) ??
          normalizedProjects[0] ??
          null;

        setQueryConfig(normalizedConfig);
        setProjectOptions(normalizedProjects);
        applyProjectSelection(matchedProject, normalizedConfig, {
          preferredEnergyType: response.defaults.energyType,
          preferredEndDate: response.defaults.endDate,
          preferredInterval: response.defaults.interval,
          preferredStartDate: response.defaults.startDate,
          resetDates: false,
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setQueryConfig(null);
        setProjectOptions([]);
        setProjectLoadError(getQueryConfigErrorMessage(error));
      } finally {
        if (isMounted) {
          setProjectsLoading(false);
        }
      }
    };

    void loadQueryConfig();

    return () => {
      isMounted = false;
      requestController.abort();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadHistorySessions = async () => {
      setHistoryLoading(true);
      setHistoryError("");

      try {
        const sessions = await sessionStoreRef.current.list();

        if (!isMounted) {
          return;
        }

        setHistorySessions(sortHistorySessions(sessions));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setHistorySessions([]);
        setHistoryError(
          error instanceof Error ? error.message : "历史会话加载失败。",
        );
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistorySessions();

    return () => {
      isMounted = false;
    };
  }, []);

  const textPrimary = isDarkMode ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDarkMode ? "text-slate-400" : "text-slate-500";
  const cardSurface = isDarkMode
    ? "border-white/10 bg-slate-900/70"
    : "border-white/80 bg-white/84";
  const mutedSurface = isDarkMode ? "bg-white/5" : "bg-slate-50";
  const promptProjectName = selectedProject?.name || chatForm.project || "项目";
  const selectedIntentMeta = useMemo(
    () => quickIntents.find((intent) => intent.id === selectedIntent) ?? null,
    [selectedIntent],
  );
  const activeHistorySession = useMemo(
    () =>
      historySessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, historySessions],
  );
  const statusTone = sessionSaveError ? "text-rose-500" : textSecondary;
  const conversationStatus = useMemo(() => {
    if (sessionSaveError) {
      return sessionSaveError;
    }

    if (isSessionSaving) {
      return "当前会话保存中...";
    }

    if (isThinking) {
      return "AI 正在生成回复，消息会自动保存到数据库历史会话。";
    }

    if (chatMessages.length === 0) {
      return "点击“新建会话”开始新的对话，消息会自动写入数据库历史会话。";
    }

    if (lastSavedAt) {
      return `已自动保存到数据库历史会话 · ${formatRelativeTime(lastSavedAt) || "刚刚"}`;
    }

    if (activeHistorySession) {
      return `当前会话：${activeHistorySession.title}`;
    }

    return "当前会话内容会自动保存到数据库历史会话。";
  }, [
    activeHistorySession,
    chatMessages.length,
    isSessionSaving,
    isThinking,
    lastSavedAt,
    sessionSaveError,
  ]);

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
    const matchedProject =
      projectOptions.find((project) => project.orgId === orgId) ?? null;
    applyProjectSelection(matchedProject, queryConfig, { resetDates: true });
  };

  const handleStartDateChange = (value: string) => {
    const minDate = selectedProject?.firstSampleDate ?? "";
    const maxDate = selectedProject?.lastSampleDate ?? "";
    const nextStartDate = clampDateToRange(value, minDate, maxDate);
    const { endDate, startDate } = normalizeDateRange(
      nextStartDate,
      chatForm.endDate,
    );

    setChatForm((previous) => ({
      ...previous,
      endDate,
      startDate,
    }));
  };

  const handleEndDateChange = (value: string) => {
    const minDate = selectedProject?.firstSampleDate ?? "";
    const maxDate = selectedProject?.lastSampleDate ?? "";
    const nextEndDate = clampDateToRange(value, minDate, maxDate);
    const { endDate, startDate } = normalizeDateRange(
      chatForm.startDate,
      nextEndDate,
    );

    setChatForm((previous) => ({
      ...previous,
      endDate,
      startDate,
    }));
  };

  const persistConversation = async (
    messages: ChatMessage[],
    sessionId = activeSessionIdRef.current,
  ) => {
    if (messages.length === 0) {
      return null;
    }

    setIsSessionSaving(true);
    setSessionSaveError("");

    try {
      const payload: UpsertChatSessionPayload = {
        messages: mapViewMessagesToSession(messages),
        metadata: {
          context: {
            endDate: chatForm.endDate,
            energyType: selectedEnergyTypeLabel,
            energyTypeValue: chatForm.energyType,
            interval: selectedIntervalLabel,
            intervalValue: chatForm.interval,
            orgId: chatForm.orgId,
            project: chatForm.project,
            queryName: chatForm.queryName,
            startDate: chatForm.startDate,
            timeRange: selectedTimeRangeLabel,
          },
          source: "chat-workspace",
        },
      };

      const session = sessionId
        ? await sessionStoreRef.current.update(sessionId, payload)
        : await sessionStoreRef.current.create(payload);

      setCurrentSessionId(session.id);
      setLastSavedAt(session.updated_at);
      upsertHistorySession(session);

      return session;
    } catch (error) {
      setSessionSaveError(
        error instanceof Error ? error.message : "会话保存失败，请稍后重试。",
      );
      return null;
    } finally {
      setIsSessionSaving(false);
    }
  };

  const handleCreateNewSession = () => {
    cancelActiveRun();
    setCurrentSessionId(null);
    setChatMessages([]);
    setInput("");
    setSelectedIntent(null);
    setShowIntentPanel(false);
    setSessionSaveError("");
    setLastSavedAt(null);
    setLoadingSessionId(null);
  };

  const handleSendChat = async () => {
    if (!input.trim() || isThinking) {
      return;
    }

    const message = input.trim();
    const activeIntent = selectedIntent;
    const requestController = new AbortController();
    const requestRunId = requestRunIdRef.current + 1;
    let workingSessionId = activeSessionIdRef.current;

    requestRunIdRef.current = requestRunId;
    activeRequestRef.current = requestController;

    const userMessage = createChatMessage({
      content: message,
      role: "user",
    });
    const nextMessages = [...chatMessages, userMessage];

    setChatMessages(nextMessages);
    setInput("");
    setSelectedIntent(null);
    setShowIntentPanel(false);
    setIsThinking(true);
    setSessionSaveError("");

    const savedSessionAfterUserMessage = await persistConversation(
      nextMessages,
      workingSessionId,
    );

    if (savedSessionAfterUserMessage) {
      workingSessionId = savedSessionAfterUserMessage.id;
    }

    if (requestRunId !== requestRunIdRef.current) {
      return;
    }

    try {
      let dataPreview: unknown = null;
      let requestPayload: Record<string, unknown> | null = null;
      let upstreamStatus: number | null = null;

      if (activeIntent) {
        if (!chatForm.orgId.trim()) {
          throw new Error("数据库查询配置尚未准备好，请先检查项目接口。");
        }

        requestPayload = buildEnergyQueryPayload(chatForm);
        const reportResponse = await queryEnergyReport(
          requestPayload,
          requestController.signal,
        );

        if (!reportResponse.ok) {
          throw new Error(reportResponse.message || "能耗查询失败。");
        }

        dataPreview = reportResponse.data ?? null;
        upstreamStatus = reportResponse.upstreamStatus;
      }

      if (requestRunId !== requestRunIdRef.current) {
        return;
      }

      const response = await api.chatWithAi(
        {
          action: activeIntent ?? undefined,
          context: {
            endDate: chatForm.endDate,
            energyType: selectedEnergyTypeLabel,
            interval: selectedIntervalLabel,
            project: chatForm.project,
            queryName: chatForm.queryName,
            startDate: chatForm.startDate,
            timeRange: selectedTimeRangeLabel,
          },
          dataPreview,
          message,
          requestPayload,
          upstreamStatus,
        },
        requestController.signal,
      );

      if (requestRunId !== requestRunIdRef.current) {
        return;
      }

      const assistantMessage = createChatMessage({
        content: response.reply,
        role: "assistant",
        thinking: response.thinking,
      });
      const finalMessages = [...nextMessages, assistantMessage];

      setChatMessages(finalMessages);

      const savedSessionAfterReply = await persistConversation(
        finalMessages,
        workingSessionId,
      );

      if (savedSessionAfterReply) {
        workingSessionId = savedSessionAfterReply.id;
      }
    } catch (error) {
      if (
        requestController.signal.aborted ||
        requestRunId !== requestRunIdRef.current
      ) {
        return;
      }

      const assistantMessage = createChatMessage({
        content: error instanceof Error ? error.message : "AI 对话请求失败。",
        role: "assistant",
        thinking:
          "本次回复未能正常完成，建议检查后端环境变量或网络状态后重试。",
      });
      const failedMessages = [...nextMessages, assistantMessage];

      setChatMessages(failedMessages);
      await persistConversation(failedMessages, workingSessionId);
    } finally {
      if (activeRequestRef.current === requestController) {
        activeRequestRef.current = null;
      }

      if (requestRunId === requestRunIdRef.current) {
        setIsThinking(false);
      }
    }
  };

  const handleStopChat = () => {
    if (!isThinking) {
      return;
    }

    cancelActiveRun();
  };

  const handleHistoryClick = async (sessionId: string) => {
    if (loadingSessionId === sessionId) {
      return;
    }

    cancelActiveRun();
    setLoadingSessionId(sessionId);
    setHistoryError("");
    setSessionSaveError("");

    try {
      const session = await sessionStoreRef.current.get(sessionId);
      const context = readContextFromSession(session);
      const preferredOrgId = normalizeString(context?.orgId);

      setChatMessages(mapSessionMessagesToView(session.messages));
      setCurrentSessionId(session.id);
      setSelectedIntent(null);
      setShowIntentPanel(false);
      setInput("");
      setLastSavedAt(session.updated_at);
      upsertHistorySession(session);

      if (preferredOrgId) {
        const matchedProject =
          projectOptions.find((project) => project.orgId === preferredOrgId) ??
          null;

        applyProjectSelection(matchedProject, queryConfig, {
          preferredEnergyType:
            normalizeString(context?.energyTypeValue) ||
            normalizeString(context?.energyType),
          preferredEndDate: normalizeString(context?.endDate),
          preferredInterval:
            normalizeString(context?.intervalValue) ||
            normalizeString(context?.interval),
          preferredStartDate: normalizeString(context?.startDate),
          preferredText: normalizeString(context?.queryName),
          resetDates: false,
        });
      }
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : "历史会话加载失败。",
      );
    } finally {
      setLoadingSessionId(null);
    }
  };

  const handleComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
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
        <div className="flex shrink-0 flex-col gap-4 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className={`text-xl font-black tracking-tight ${textPrimary}`}>
              对话工作台
            </h2>
            <p className={`mt-1 text-sm ${statusTone}`}>{conversationStatus}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCreateNewSession}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <Plus size={16} />
              新建会话
            </button>

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
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-5 pb-5">
          <div
            className={`min-h-0 flex-1 overflow-y-auto rounded-[24px] ${mutedSurface} p-4`}
          >
            {chatMessages.length === 0 && !isThinking ? (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center">
                <h3
                  className={`text-2xl font-black tracking-tight ${textPrimary}`}
                >
                  Halo · 云境
                </h3>
                <p
                  className={`mt-2 max-w-xl text-sm leading-6 ${textSecondary}`}
                >
                  输入问题即可开始对话。发送后的内容会自动保存到数据库中的历史会话，你也可以随时点击右上角创建新的会话。
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-[22px] px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.role === "user"
                          ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                          : `${cardSurface} ${textPrimary}`
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>

                      {message.role === "assistant" && message.thinking && (
                        <div className="mt-3 rounded-[18px] border border-slate-200/60 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                          <button
                            onClick={() => toggleThinking(message.id)}
                            className="inline-flex items-center gap-2 text-xs font-bold text-blue-600"
                          >
                            <Sparkles size={14} />
                            Thinking
                            <ChevronDown
                              size={14}
                              className={`transition ${message.showThinking ? "rotate-180" : ""}`}
                            />
                          </button>

                          {message.showThinking && (
                            <div
                              className={`mt-2 whitespace-pre-wrap text-xs leading-5 ${textSecondary}`}
                            >
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
                    <div
                      className={`rounded-[22px] px-4 py-3 shadow-sm ${cardSurface} ${textPrimary}`}
                    >
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
                    <div className="text-sm font-bold text-blue-600">
                      {selectedIntentMeta.label}
                    </div>
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

                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <select
                    value={chatForm.orgId}
                    onChange={(event) =>
                      handleProjectChange(event.target.value)
                    }
                    disabled={projectsLoading || projectOptions.length === 0}
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    {projectOptions.length === 0 ? (
                      <option value="">
                        {projectsLoading ? "项目加载中..." : "暂无可用项目"}
                      </option>
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
                      setChatForm((previous) => ({
                        ...previous,
                        energyType: event.target.value,
                      }))
                    }
                    disabled={energyTypeOptions.length === 0}
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    {energyTypeOptions.length === 0 ? (
                      <option value="">暂无能源类型</option>
                    ) : (
                      energyTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>

                  <select
                    value={chatForm.interval}
                    onChange={(event) =>
                      setChatForm((previous) => ({
                        ...previous,
                        interval: event.target.value,
                      }))
                    }
                    disabled={intervalOptions.length === 0}
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  >
                    {intervalOptions.length === 0 ? (
                      <option value="">暂无统计粒度</option>
                    ) : (
                      intervalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))
                    )}
                  </select>

                  <input
                    type="date"
                    value={chatForm.startDate}
                    min={selectedProject?.firstSampleDate || undefined}
                    max={selectedProject?.lastSampleDate || undefined}
                    onChange={(event) =>
                      handleStartDateChange(event.target.value)
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  />

                  <input
                    type="date"
                    value={chatForm.endDate}
                    min={selectedProject?.firstSampleDate || undefined}
                    max={selectedProject?.lastSampleDate || undefined}
                    onChange={(event) =>
                      handleEndDateChange(event.target.value)
                    }
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  />

                  <input
                    value={chatForm.queryName}
                    onChange={(event) =>
                      setChatForm((previous) => ({
                        ...previous,
                        queryName: event.target.value,
                      }))
                    }
                    placeholder="表具名称 / 分项关键词"
                    className={`rounded-2xl border px-4 py-3 text-sm focus:outline-none ${cardSurface} ${textPrimary}`}
                  />
                </div>

                {selectedProject && (
                  <div className={`mt-2 text-xs ${textSecondary}`}>
                    数据范围：{selectedProject.firstSampleDate || "未知"} 至{" "}
                    {selectedProject.lastSampleDate || "未知"}
                  </div>
                )}

                {projectsLoading && (
                  <div className={`mt-2 text-xs ${textSecondary}`}>
                    数据库查询配置同步中...
                  </div>
                )}

                {projectLoadError && (
                  <div className="mt-2 text-xs text-rose-500">
                    {projectLoadError}
                  </div>
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
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
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
              placeholder={`输入你的问题，例如：帮我诊断 ${promptProjectName} 最近一天的异常用能。`}
              className={`h-24 w-full resize-none rounded-[20px] border px-4 py-3 text-sm leading-6 focus:outline-none ${cardSurface} ${textPrimary}`}
            />

            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className={`text-sm ${textSecondary}`}>
                Enter 发送，Shift + Enter 换行。
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleStopChat}
                  disabled={!isThinking}
                  className={`inline-flex items-center justify-center gap-2 rounded-[20px] border px-4 py-2.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60 ${cardSurface} ${textPrimary}`}
                >
                  <Square size={15} />
                  停止
                </button>
                <button
                  onClick={() => void handleSendChat()}
                  disabled={!input.trim() || isThinking}
                  className="inline-flex items-center justify-center gap-2 rounded-[20px] bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
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
            <div
              className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border p-5 shadow-sm ${cardSurface}`}
            >
              <div className="flex shrink-0 items-center justify-between gap-3">
                <div>
                  <h3 className={`text-lg font-black ${textPrimary}`}>
                    历史对话
                  </h3>
                  <p className={`mt-1 text-sm ${textSecondary}`}>
                    当前会话会自动保存到数据库。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`rounded-2xl p-3 ${mutedSurface}`}>
                    <Clock3
                      size={18}
                      className={
                        isDarkMode ? "text-slate-200" : "text-slate-600"
                      }
                    />
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

              {historyError && (
                <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/8 px-3 py-2 text-xs leading-5 text-rose-500">
                  {historyError}
                </div>
              )}

              <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {historyLoading ? (
                  <div
                    className={`rounded-[22px] border p-4 text-sm ${cardSurface} ${textSecondary}`}
                  >
                    正在加载历史会话...
                  </div>
                ) : historySessions.length === 0 ? (
                  <div
                    className={`rounded-[22px] border p-4 text-sm leading-6 ${cardSurface} ${textSecondary}`}
                  >
                    还没有历史会话。发送第一条消息后，当前对话会自动保存到这里。
                  </div>
                ) : (
                  historySessions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => void handleHistoryClick(item.id)}
                      disabled={loadingSessionId === item.id}
                      className={`w-full rounded-[22px] border p-4 text-left transition hover:-translate-y-0.5 disabled:cursor-wait ${
                        item.id === activeSessionId
                          ? isDarkMode
                            ? "border-white/20 bg-white/10"
                            : "border-slate-900/10 bg-slate-100"
                          : cardSurface
                      }`}
                    >
                      <div className={`text-sm font-bold ${textPrimary}`}>
                        {item.title}
                      </div>
                      <div
                        className={`mt-1 text-xs leading-5 ${textSecondary}`}
                      >
                        {item.summary || "暂无摘要"}
                      </div>
                      <div className="mt-3 text-xs text-slate-400">
                        {loadingSessionId === item.id
                          ? "加载中..."
                          : formatRelativeTime(item.last_message_at) || "刚刚"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
