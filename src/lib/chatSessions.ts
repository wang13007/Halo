import {
  api,
  type ChatSession,
  type ChatSessionMessage,
  type ChatSessionSummary,
  type UpsertChatSessionPayload,
} from "./api";

export type ChatSessionStoreMode = "remote";

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const truncateText = (value: string, maxLength: number) => {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const toValidIsoString = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
};

const createSessionId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeMetadata = (value: unknown) =>
  isPlainObject(value) ? value : {};

const normalizeChatMessages = (messages: unknown): ChatSessionMessage[] => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.flatMap((message) => {
    if (!isPlainObject(message)) {
      return [];
    }

    const content =
      typeof message.content === "string" ? message.content.trim() : "";
    const role = message.role;
    const id =
      typeof message.id === "string" && message.id.trim()
        ? message.id.trim()
        : createSessionId();
    const thinking =
      typeof message.thinking === "string" && message.thinking.trim()
        ? message.thinking.trim()
        : undefined;
    const createdAt =
      toValidIsoString(message.createdAt) || new Date().toISOString();

    if ((role !== "assistant" && role !== "user") || !content) {
      return [];
    }

    return [
      {
        content,
        createdAt,
        id,
        role,
        ...(thinking ? { thinking } : {}),
      },
    ];
  });
};

const deriveSessionTitle = (messages: ChatSessionMessage[], title?: string) => {
  if (typeof title === "string" && title.trim()) {
    return truncateText(title, 48);
  }

  const firstUserMessage = messages.find((message) => message.role === "user");
  if (firstUserMessage) {
    return truncateText(firstUserMessage.content, 48);
  }

  return "新建会话";
};

const deriveSessionSummary = (
  messages: ChatSessionMessage[],
  summary?: string,
) => {
  if (typeof summary === "string" && summary.trim()) {
    return truncateText(summary, 96);
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === "assistant");

  if (lastAssistantMessage) {
    return truncateText(lastAssistantMessage.content, 96);
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");
  if (lastUserMessage) {
    return truncateText(lastUserMessage.content, 96);
  }

  return "";
};

const resolveLastMessageAt = (messages: ChatSessionMessage[]) => {
  const lastTimestamp = [...messages]
    .reverse()
    .map((message) => toValidIsoString(message.createdAt))
    .find(Boolean);

  return lastTimestamp || new Date().toISOString();
};

const normalizeChatSession = (value: unknown): ChatSession | null => {
  if (!isPlainObject(value)) {
    return null;
  }

  const messages = normalizeChatMessages(value.messages);
  const lastMessageAt =
    toValidIsoString(value.last_message_at) || resolveLastMessageAt(messages);

  return {
    created_at: toValidIsoString(value.created_at) || lastMessageAt,
    id:
      typeof value.id === "string" && value.id.trim()
        ? value.id.trim()
        : createSessionId(),
    last_message_at: lastMessageAt,
    metadata: normalizeMetadata(value.metadata),
    messages,
    status:
      typeof value.status === "string" && value.status.trim()
        ? value.status.trim()
        : "active",
    summary: deriveSessionSummary(
      messages,
      typeof value.summary === "string" ? value.summary : undefined,
    ),
    title: deriveSessionTitle(
      messages,
      typeof value.title === "string" ? value.title : undefined,
    ),
    updated_at: toValidIsoString(value.updated_at) || lastMessageAt,
  };
};

const sortSessions = (sessions: ChatSession[]) =>
  [...sessions].sort(
    (left, right) =>
      Date.parse(right.last_message_at) - Date.parse(left.last_message_at),
  );

export const toChatSessionSummary = (
  session: ChatSession,
): ChatSessionSummary => ({
  created_at: session.created_at,
  id: session.id,
  last_message_at: session.last_message_at,
  metadata: session.metadata,
  status: session.status,
  summary: session.summary,
  title: session.title,
  updated_at: session.updated_at,
});

const requireSession = (value: unknown, action: string) => {
  const session = normalizeChatSession(value);

  if (!session) {
    throw new Error(`Failed to ${action} chat session.`);
  }

  return session;
};

export const createChatSessionStore = () => ({
  getMode: (): ChatSessionStoreMode => "remote",
  async create(input: UpsertChatSessionPayload) {
    const response = await api.createChatSession(input);
    return requireSession(response.session, "create");
  },
  async get(sessionId: string) {
    const response = await api.getChatSession(sessionId);
    return requireSession(response.session, "load");
  },
  async list() {
    const response = await api.getChatSessions();
    return sortSessions(
      response.sessions
        .map((session) => normalizeChatSession(session))
        .filter((session): session is ChatSession => Boolean(session)),
    ).map(toChatSessionSummary);
  },
  async update(sessionId: string, input: UpsertChatSessionPayload) {
    const response = await api.updateChatSession(sessionId, input);
    return requireSession(response.session, "update");
  },
});
