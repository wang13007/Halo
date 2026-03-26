import {
  api,
  type ChatSession,
  type ChatSessionMessage,
  type ChatSessionSummary,
  type UpsertChatSessionPayload,
} from './api';

export type ChatSessionStoreMode = 'local' | 'remote';

const LOCAL_STORAGE_KEY = 'halo.chat.sessions.v1';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const truncateText = (value: string, maxLength: number) => {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};

const toValidIsoString = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '';
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? '' : new Date(timestamp).toISOString();
};

const createSessionId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeMetadata = (value: unknown) => (isPlainObject(value) ? value : {});

const normalizeChatMessages = (messages: unknown): ChatSessionMessage[] => {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages.flatMap((message) => {
    if (!isPlainObject(message)) {
      return [];
    }

    const content = typeof message.content === 'string' ? message.content.trim() : '';
    const role = message.role;
    const id = typeof message.id === 'string' && message.id.trim() ? message.id.trim() : createSessionId();
    const thinking =
      typeof message.thinking === 'string' && message.thinking.trim()
        ? message.thinking.trim()
        : undefined;
    const createdAt = toValidIsoString(message.createdAt) || new Date().toISOString();

    if ((role !== 'assistant' && role !== 'user') || !content) {
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
  if (typeof title === 'string' && title.trim()) {
    return truncateText(title, 48);
  }

  const firstUserMessage = messages.find((message) => message.role === 'user');
  if (firstUserMessage) {
    return truncateText(firstUserMessage.content, 48);
  }

  return '新建会话';
};

const deriveSessionSummary = (messages: ChatSessionMessage[], summary?: string) => {
  if (typeof summary === 'string' && summary.trim()) {
    return truncateText(summary, 96);
  }

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'assistant');

  if (lastAssistantMessage) {
    return truncateText(lastAssistantMessage.content, 96);
  }

  const lastUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (lastUserMessage) {
    return truncateText(lastUserMessage.content, 96);
  }

  return '';
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
  const lastMessageAt = toValidIsoString(value.last_message_at) || resolveLastMessageAt(messages);

  return {
    created_at: toValidIsoString(value.created_at) || lastMessageAt,
    id: typeof value.id === 'string' && value.id.trim() ? value.id.trim() : createSessionId(),
    last_message_at: lastMessageAt,
    metadata: normalizeMetadata(value.metadata),
    messages,
    status:
      typeof value.status === 'string' && value.status.trim() ? value.status.trim() : 'active',
    summary:
      deriveSessionSummary(
        messages,
        typeof value.summary === 'string' ? value.summary : undefined,
      ),
    title:
      deriveSessionTitle(messages, typeof value.title === 'string' ? value.title : undefined),
    updated_at: toValidIsoString(value.updated_at) || lastMessageAt,
  };
};

const sortSessions = (sessions: ChatSession[]) =>
  [...sessions].sort(
    (left, right) => Date.parse(right.last_message_at) - Date.parse(left.last_message_at),
  );

const readLocalSessions = (): ChatSession[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;
    const rawSessions = Array.isArray(parsedValue)
      ? parsedValue
      : isPlainObject(parsedValue) && Array.isArray(parsedValue.sessions)
        ? parsedValue.sessions
        : [];

    return sortSessions(
      rawSessions
        .map((item) => normalizeChatSession(item))
        .filter((session): session is ChatSession => Boolean(session)),
    );
  } catch {
    return [];
  }
};

const writeLocalSessions = (sessions: ChatSession[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    LOCAL_STORAGE_KEY,
    JSON.stringify({ sessions: sortSessions(sessions) }),
  );
};

export const toChatSessionSummary = (session: ChatSession): ChatSessionSummary => ({
  created_at: session.created_at,
  id: session.id,
  last_message_at: session.last_message_at,
  metadata: session.metadata,
  status: session.status,
  summary: session.summary,
  title: session.title,
  updated_at: session.updated_at,
});

const mirrorSessionToLocal = (session: ChatSession) => {
  const localSessions = readLocalSessions().filter((item) => item.id !== session.id);
  writeLocalSessions([session, ...localSessions]);
};

const getLocalChatSession = (sessionId: string) => {
  const session = readLocalSessions().find((item) => item.id === sessionId);

  if (!session) {
    throw new Error('历史会话不存在。');
  }

  return session;
};

const buildLocalChatSession = (
  input: UpsertChatSessionPayload,
  existingSession?: ChatSession,
): ChatSession => {
  const messages = normalizeChatMessages(input.messages);
  const lastMessageAt = resolveLastMessageAt(messages);
  const session = normalizeChatSession({
    created_at: existingSession?.created_at ?? new Date().toISOString(),
    id: existingSession?.id ?? createSessionId(),
    last_message_at: lastMessageAt,
    metadata: input.metadata ?? existingSession?.metadata ?? {},
    messages,
    status: input.status ?? existingSession?.status ?? 'active',
    summary: input.summary ?? existingSession?.summary,
    title: input.title ?? existingSession?.title,
    updated_at: new Date().toISOString(),
  });

  if (!session) {
    throw new Error('历史会话保存失败。');
  }

  return session;
};

const createLocalChatSession = (input: UpsertChatSessionPayload) => {
  const session = buildLocalChatSession(input);
  const localSessions = readLocalSessions();

  writeLocalSessions([session, ...localSessions.filter((item) => item.id !== session.id)]);

  return session;
};

const updateLocalChatSession = (sessionId: string, input: UpsertChatSessionPayload) => {
  const localSessions = readLocalSessions();
  const existingSession = localSessions.find((item) => item.id === sessionId);
  const session = buildLocalChatSession(
    input,
    existingSession
      ? existingSession
      : {
          created_at: new Date().toISOString(),
          id: sessionId,
          last_message_at: new Date().toISOString(),
          metadata: {},
          messages: [],
          status: 'active',
          summary: '',
          title: '新建会话',
          updated_at: new Date().toISOString(),
        },
  );

  writeLocalSessions([session, ...localSessions.filter((item) => item.id !== session.id)]);

  return session;
};

export const createChatSessionStore = () => {
  let mode: ChatSessionStoreMode = 'remote';

  return {
    getMode: () => mode,
    async create(input: UpsertChatSessionPayload) {
      if (mode === 'local') {
        return createLocalChatSession(input);
      }

      try {
        const response = await api.createChatSession(input);
        mirrorSessionToLocal(response.session);
        return response.session;
      } catch {
        mode = 'local';
        return createLocalChatSession(input);
      }
    },
    async get(sessionId: string) {
      if (mode === 'local') {
        return getLocalChatSession(sessionId);
      }

      try {
        const response = await api.getChatSession(sessionId);
        mirrorSessionToLocal(response.session);
        return response.session;
      } catch (error) {
        mode = 'local';

        try {
          return getLocalChatSession(sessionId);
        } catch {
          throw error instanceof Error ? error : new Error('历史会话加载失败。');
        }
      }
    },
    async list() {
      if (mode === 'local') {
        return readLocalSessions().map(toChatSessionSummary);
      }

      try {
        const response = await api.getChatSessions();
        return response.sessions;
      } catch {
        mode = 'local';
        return readLocalSessions().map(toChatSessionSummary);
      }
    },
    async update(sessionId: string, input: UpsertChatSessionPayload) {
      if (mode === 'local') {
        return updateLocalChatSession(sessionId, input);
      }

      try {
        const response = await api.updateChatSession(sessionId, input);
        mirrorSessionToLocal(response.session);
        return response.session;
      } catch {
        mode = 'local';
        return updateLocalChatSession(sessionId, input);
      }
    },
  };
};
