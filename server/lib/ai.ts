import { GoogleGenAI } from '@google/genai';
import { env } from '../config.js';
import {
  buildReportTemplatePromptContext,
  type ReportDataAvailability,
  type ReportTemplateSelection,
} from './report-templates.js';

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

export const isAiModelConfigured = () => Boolean(aiClient);

export const getAiRuntimeStatus = () => ({
  configured: isAiModelConfigured(),
  model: defaultModel,
  provider: 'gemini' as const,
});

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

const actionLabelMap: Record<string, string> = {
  'energy-compare': '能耗对比',
  'energy-diagnostic': '能源诊断报告',
  'energy-query': '能耗查询',
  'energy-report': '能源报表',
};

const resolveActionLabel = (action?: string) =>
  (action && actionLabelMap[action]) || '通用问答';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const collectPrimaryRecords = (value: unknown): Array<Record<string, unknown>> => {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const root = value as Record<string, unknown>;

  if (isPlainObject(root.data) && Array.isArray(root.data.list)) {
    return root.data.list.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object',
    );
  }

  if (Array.isArray(root.list)) {
    return root.list.filter(
      (item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object',
    );
  }

  return [];
};

const buildAvailabilityText = (availability: ReportDataAvailability) => {
  const available =
    availability.availableDataLabels.length > 0
      ? availability.availableDataLabels.join('、')
      : '暂无可确认的核心业务数据';
  const missing =
    availability.missingDataLabels.length > 0
      ? availability.missingDataLabels.join('、')
      : '暂无明确缺失项';

  return { available, missing };
};

const buildTemplateDescriptor = (selection: ReportTemplateSelection | null) => {
  if (!selection) {
    return '未匹配专用模板';
  }

  if (selection.kind === 'single-meter-diagnostic') {
    return `${selection.title}（${selection.fileName}）`;
  }

  const scopeLabel = selection.scope === 'group' ? '集团' : '项目';
  const periodLabelMap = {
    daily: '日报',
    monthly: '月报',
    quarterly: '季报',
    weekly: '周报',
    yearly: '年报',
  } as const;

  return `${scopeLabel}${periodLabelMap[selection.period ?? 'daily']}（${selection.fileName}）`;
};

const buildFallbackReport = (
  input: HaloChatInput,
  selection: ReportTemplateSelection | null,
  availability: ReportDataAvailability,
): HaloChatOutput => {
  const context = input.context ?? {};
  const actionLabel = resolveActionLabel(input.action);
  const records = collectPrimaryRecords(input.dataPreview);
  const sampleProject = sanitizeString(context.project, '未指定项目');
  const sampleDevice = sanitizeString(records[0]?.deviceName, '未识别到单表名称');
  const { available, missing } = buildAvailabilityText(availability);
  const title =
    selection?.kind === 'single-meter-diagnostic'
      ? `${sampleDevice}异常诊断报告`
      : `${sampleProject}${actionLabel}`;

  const lines = [
    `# ${title}`,
    '',
    '## 报告说明',
    `- 报告类型：${buildTemplateDescriptor(selection)}`,
    `- 项目：${sampleProject}`,
    `- 时间范围：${sanitizeString(context.timeRange, '未指定')}`,
    `- 能源类型：${sanitizeString(context.energyType, '未指定')}`,
    `- 数据状态：${input.upstreamStatus ? `上游接口 ${input.upstreamStatus}` : '未返回上游状态'}`,
    '',
    '## 数据可用性',
    `- 当前可用：${available}`,
    `- 自动跳过：${missing}`,
  ];

  if (records.length === 0) {
    lines.push('');
    lines.push('## 结论');
    lines.push(
      '本次未获得足够的明细数据，暂时无法生成完整报告内容；系统已根据模板要求自动跳过无数据支撑的分析项。',
    );
    lines.push('');
    lines.push('## 建议');
    lines.push('- 先补齐对应周期的能耗明细数据');
    lines.push('- 如需客流、天气、面积或设备运行分析，请一并提供相关数据源');
  } else {
    const uniqueProjects = new Set(
      records.map((record) => sanitizeString(record.orgName ?? record.orgId, '')).filter(Boolean),
    );

    lines.push('');
    lines.push('## 数据概况');
    lines.push(`- 明细记录数：${records.length}`);
    lines.push(`- 涉及项目数：${uniqueProjects.size || 1}`);

    if (selection?.kind === 'single-meter-diagnostic') {
      lines.push(`- 电表名称：${sampleDevice}`);
      lines.push(`- 电表编号：${sanitizeString(records[0]?.deviceNumber, '未返回')}`);
    }

    lines.push('');
    lines.push('## 生成说明');
    lines.push(
      '- 当前为后端 fallback 版本，已按模板类型匹配报告骨架，并仅保留有数据支撑的分析方向。',
    );
    lines.push('- 若需要完整模板化报告正文，请配置 Gemini API Key 以启用模型生成。');
  }

  return {
    model: defaultModel,
    reply: lines.join('\n'),
    thinking: [
      `已识别报告模板：${buildTemplateDescriptor(selection)}`,
      `可用数据：${available}`,
      `已跳过：${missing}`,
    ].join('\n'),
    usedFallback: true,
  };
};

const buildFallbackChat = (input: HaloChatInput): HaloChatOutput => {
  const context = input.context ?? {};
  const actionLabel = resolveActionLabel(input.action);
  const { availability, selection } = buildReportTemplatePromptContext(input);

  if (input.action === 'energy-report' || input.action === 'energy-diagnostic') {
    return buildFallbackReport(input, selection, availability);
  }

  const reply = [
    `已按“${actionLabel}”模式整理你的问题。`,
    '',
    `问题：${input.message}`,
    `项目：${sanitizeString(context.project, '未指定')}`,
    `能源类型：${sanitizeString(context.energyType, '未指定')}`,
    `时间范围：${sanitizeString(context.timeRange, '未指定')}`,
    `时间粒度：${sanitizeString(context.interval, '未指定')}`,
    '',
    input.dataPreview
      ? '当前已结合查询结果进行摘要，建议继续围绕异常时段、负荷结构和节能动作追问。'
      : '当前未附带查询结果，建议先发起查询或补充条件后再继续分析。',
  ].join('\n');

  const thinking = [
    `已识别为 ${actionLabel} 场景`,
    `上下文：${sanitizeString(context.project, '未指定项目')} / ${sanitizeString(
      context.timeRange,
      '未指定时间',
    )}`,
    input.upstreamStatus ? `已接入上游数据，状态码 ${input.upstreamStatus}` : '本次未读取上游数据',
    '当前使用本地 fallback 生成结构化结果',
  ].join('\n');

  return {
    model: defaultModel,
    reply,
    thinking,
    usedFallback: true,
  };
};

const buildChatSystemInstruction = (input: HaloChatInput) => {
  const { availability, selection } = buildReportTemplatePromptContext(input);
  const { available, missing } = buildAvailabilityText(availability);

  if (input.action === 'energy-report' || input.action === 'energy-diagnostic') {
    const baseRules = [
      '你是 Halo 的企业能源报告助手。',
      '请使用专业、简洁、明确的中文输出。',
      '最终 answer 必须是 Markdown 报告正文，不要输出解释性前言。',
      '只能基于 message、context、requestPayload、upstreamStatus 和 dataPreview 中能证实的事实写内容。',
      '如果模板中的某个分析项没有数据支撑，必须直接跳过对应小节或段落，不能编造、不能补写假设性数据。',
      '如果整章没有数据支撑，可以省略整章；输出时保持自然顺序和清晰层级。',
      '如果仅有能耗明细数据，优先输出总量、趋势、异常时段、波动、诊断结论和管理建议。',
      '严禁虚构天气、客流、面积、预算目标、设备运行状态、租户/公区拆分等缺失数据。',
      '如果数据不足以支撑完整报告，需要明确说明“本次基于已返回数据生成，未覆盖的分析项已自动跳过”。',
      '只返回 JSON，字段为 answer 和 thinkingSummary。',
      'thinkingSummary 只能是 2 到 4 条高层摘要，不能暴露详细推理过程。',
    ];

    if (!selection) {
      return [
        ...baseRules,
        '当前未匹配到专用模板，请按报告型 Markdown 输出，并根据可用数据自动裁剪章节。',
        `当前可用数据：${available}`,
        `当前缺失数据：${missing}`,
      ].join('\n');
    }

    return [
      ...baseRules,
      `当前匹配模板：${buildTemplateDescriptor(selection)}`,
      `当前可用数据：${available}`,
      `当前缺失数据：${missing}`,
      '优先遵循以下模板的章节语言、标题层级和专业表达方式：',
      '--- 模板开始 ---',
      selection.template,
      '--- 模板结束 ---',
      selection.kind === 'single-meter-diagnostic'
        ? '当前任务是单电表异常诊断，请优先保留数据质量检查、总体用能特征、异常识别、异常时段分析、偏差分析、影响判断、异常等级评估和后续建议。'
        : '当前任务是周期性能源报告，请优先保留摘要、总体表现、趋势分析、异常诊断和管理建议中有数据支撑的部分。',
    ].join('\n');
  }

  return [
    '你是 Halo 的企业能源助手。',
    '请使用简洁、专业、明确的中文输出。',
    '你会根据 message、context、requestPayload、upstreamStatus 和 dataPreview 生成回复。',
    '只返回 JSON，字段为 answer 和 thinkingSummary。',
    'thinkingSummary 只能是简短的高层摘要，不能暴露详细推理过程。',
  ].join('\n');
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
  const reportPromptContext = buildReportTemplatePromptContext(input);

  if (!aiClient) {
    return {
      ...fallback,
      thinking: `${fallback.thinking}\nAI model is not configured on the server. Set GEMINI_API_KEY to enable Gemini replies.`,
    };
  }

  try {
    const parsed = await generateJson(buildChatSystemInstruction(input), {
      ...input,
      reportPromptContext: reportPromptContext.selection
        ? {
            availability: reportPromptContext.availability,
            template: {
              fileName: reportPromptContext.selection.fileName,
              kind: reportPromptContext.selection.kind,
              period: reportPromptContext.selection.period,
              scope: reportPromptContext.selection.scope,
              title: reportPromptContext.selection.title,
            },
          }
        : {
            availability: reportPromptContext.availability,
          },
    });

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

const buildFallbackArtifact = (input: HaloArtifactInput): HaloArtifactOutput => {
  const badge = input.artifactType === 'widget' ? `${input.size ?? '中'}组件` : 'AI Coding';

  return {
    badge,
    description: `围绕“${input.prompt.trim()}”生成的${
      input.artifactType === 'widget' ? '小组件' : '应用'
    }说明，适合继续细化字段、交互和数据来源。`,
    items: [
      `目标：${input.goal?.trim() || '提升日常使用效率'}`,
      `核心：${input.prompt.trim().slice(0, 36)}`,
      input.artifactType === 'widget' ? `尺寸：${input.size ?? 'medium'}` : '支持运行、编辑与收藏',
    ],
    model: defaultModel,
    summary: '当前使用本地 fallback 生成结构化方案。',
    title: input.name.trim(),
    usedFallback: true,
  };
};

export const generateHaloArtifact = async (
  input: HaloArtifactInput,
): Promise<HaloArtifactOutput> => {
  const fallback = buildFallbackArtifact(input);

  if (!aiClient) {
    return {
      ...fallback,
      summary: `${fallback.summary} AI model is not configured on the server.`,
    };
  }

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
