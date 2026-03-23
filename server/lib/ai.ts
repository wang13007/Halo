import { GoogleGenAI } from '@google/genai';
import { env } from '../config.js';

type HaloChatInput = {
  action?: string;
  context?: Record<string, unknown>;
  dataPreview?: unknown;
  message: string;
  requestPayload?: Record<string, unknown> | null;
  upstreamStatus?: number | null;
};

type HaloArtifactInput = {
  artifactType: 'app' | 'widget';
  goal?: string;
  name: string;
  prompt: string;
  size?: string;
};

type HaloChatOutput = {
  model: string;
  reply: string;
  thinking: string;
  usedFallback: boolean;
};

type HaloArtifactOutput = {
  badge: string;
  description: string;
  items: string[];
  model: string;
  summary: string;
  title: string;
  usedFallback: boolean;
};

const defaultModel = env.geminiModel || 'gemini-2.5-flash';

const aiClient = env.googleApiKey
  ? new GoogleGenAI({ apiKey: env.googleApiKey })
  : null;

const sanitizeString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const sanitizeItems = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  return items.length > 0 ? items : fallback;
};

const parseJsonText = (rawValue: string) => {
  try {
    return JSON.parse(rawValue) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const buildFallbackChat = (input: HaloChatInput): HaloChatOutput => {
  const context = input.context ?? {};
  const actionLabel =
    input.action === 'energy-query'
      ? '能耗查询'
      : input.action === 'energy-compare'
        ? '能耗对比'
        : input.action === 'energy-report'
          ? '能源报表'
          : input.action === 'energy-diagnostic'
            ? '能源诊断报告'
            : '通用问答';

  const reply = [
    `已按“${actionLabel}”模式整理你的问题。`,
    '',
    `问题：${input.message}`,
    `项目：${sanitizeString(context.project, '未指定')}`,
    `能源类型：${sanitizeString(context.energyType, '未指定')}`,
    `时间范围：${sanitizeString(context.timeRange, '未指定')}`,
    `时间间隔：${sanitizeString(context.interval, '未指定')}`,
    '',
    input.dataPreview
      ? '当前已结合查询结果进行摘要，建议继续围绕异常时段、负荷结构和节能动作追问。'
      : '当前未附带查询结果，建议先发起查询或补充条件后再继续分析。',
  ].join('\n');

  const thinking = [
    `识别为 ${actionLabel} 场景`,
    `带入项目与时间上下文：${sanitizeString(context.project, '未指定')} / ${sanitizeString(
      context.timeRange,
      '未指定',
    )}`,
    input.upstreamStatus ? `已接入上游数据状态：${input.upstreamStatus}` : '本次未读取上游数据',
    '当前使用本地 fallback 生成结构化结果',
  ].join('\n');

  return {
    model: defaultModel,
    reply,
    thinking,
    usedFallback: true,
  };
};

const buildFallbackArtifact = (input: HaloArtifactInput): HaloArtifactOutput => {
  const badge = input.artifactType === 'widget' ? `${input.size ?? '中'}组件` : 'AI Coding';

  return {
    badge,
    description: `围绕“${input.prompt.trim()}”生成的${input.artifactType === 'widget' ? '小组件' : '应用'}说明，适合继续细化字段、交互和数据来源。`,
    items: [
      `目标：${input.goal?.trim() || '提升日常使用效率'}`,
      `核心：${input.prompt.trim().slice(0, 36)}`,
      input.artifactType === 'widget' ? `尺寸：${input.size ?? 'medium'}` : '支持运行、编辑与收藏',
    ],
    model: defaultModel,
    summary: '当前使用本地 fallback 生成结构化方案',
    title: input.name.trim(),
    usedFallback: true,
  };
};

const generateJson = async (
  systemInstruction: string,
  payload: Record<string, unknown>,
) => {
  if (!aiClient) {
    return null;
  }

  const response = await aiClient.models.generateContent({
    config: {
      responseMimeType: 'application/json',
      systemInstruction,
    },
    contents: JSON.stringify(payload, null, 2),
    model: defaultModel,
  });

  return parseJsonText(response.text ?? '');
};

export const generateHaloChatReply = async (
  input: HaloChatInput,
): Promise<HaloChatOutput> => {
  const fallback = buildFallbackChat(input);

  try {
    const parsed = await generateJson(
      [
        '你是 Halo 的企业能耗助手。',
        '请使用简洁、专业、明确的中文输出。',
        '你会根据 message、context、requestPayload、upstreamStatus 和 dataPreview 生成回答。',
        '只返回 JSON，字段为 answer 和 thinkingSummary。',
        'thinkingSummary 只能是简短的高层摘要，不要暴露内部推理或长链路思考。',
      ].join('\n'),
      input,
    );

    if (!parsed) {
      return fallback;
    }

    return {
      model: defaultModel,
      reply: sanitizeString(parsed.answer, fallback.reply),
      thinking: sanitizeString(parsed.thinkingSummary, fallback.thinking),
      usedFallback: false,
    };
  } catch {
    return fallback;
  }
};

export const generateHaloArtifact = async (
  input: HaloArtifactInput,
): Promise<HaloArtifactOutput> => {
  const fallback = buildFallbackArtifact(input);

  try {
    const parsed = await generateJson(
      [
        '你是 Halo 的 AI Coding 生成器。',
        '请根据名称、目标和提示词，输出适合企业能源管理平台使用的组件或应用定义。',
        '只返回 JSON，字段为 title、description、summary、badge、items。',
        'items 必须是 2 到 4 条简短要点。',
      ].join('\n'),
      input,
    );

    if (!parsed) {
      return fallback;
    }

    return {
      badge: sanitizeString(parsed.badge, fallback.badge),
      description: sanitizeString(parsed.description, fallback.description),
      items: sanitizeItems(parsed.items, fallback.items),
      model: defaultModel,
      summary: sanitizeString(parsed.summary, fallback.summary),
      title: sanitizeString(parsed.title, fallback.title),
      usedFallback: false,
    };
  } catch {
    return fallback;
  }
};
