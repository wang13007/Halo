import { GoogleGenAI } from '@google/genai';
import { env } from '../config.js';
import { buildReportTemplatePromptContext, } from './report-templates.js';
const defaultModel = env.geminiModel || 'gemini-2.5-flash';
const aiClient = env.googleApiKey
    ? new GoogleGenAI({ apiKey: env.googleApiKey })
    : null;
export const isAiModelConfigured = () => Boolean(aiClient);
export const getAiRuntimeStatus = () => ({
    configured: isAiModelConfigured(),
    model: defaultModel,
    provider: 'gemini',
});
const sanitizeString = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const sanitizeItems = (value, fallback) => {
    if (!Array.isArray(value)) {
        return fallback;
    }
    const items = value
        .filter((item) => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 4);
    return items.length > 0 ? items : fallback;
};
const parseJsonText = (rawValue) => {
    try {
        return JSON.parse(rawValue);
    }
    catch {
        return null;
    }
};
const actionLabelMap = {
    'energy-compare': '能耗对比',
    'energy-diagnostic': '能源诊断报告',
    'energy-query': '能耗查询',
    'energy-report': '能源报表',
};
const resolveActionLabel = (action) => (action && actionLabelMap[action]) || '通用问答';
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const collectPrimaryRecords = (value) => {
    if (!value || typeof value !== 'object') {
        return [];
    }
    const root = value;
    if (isPlainObject(root.data) && Array.isArray(root.data.list)) {
        return root.data.list.filter((item) => Boolean(item) && typeof item === 'object');
    }
    if (Array.isArray(root.list)) {
        return root.list.filter((item) => Boolean(item) && typeof item === 'object');
    }
    return [];
};
const buildAvailabilityText = (availability) => {
    const available = availability.availableDataLabels.length > 0
        ? availability.availableDataLabels.join('、')
        : '暂无可确认的核心业务数据';
    const missing = availability.missingDataLabels.length > 0
        ? availability.missingDataLabels.join('、')
        : '暂无明确缺失项';
    return { available, missing };
};
const buildTemplateDescriptor = (selection) => {
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
    };
    return `${scopeLabel}${periodLabelMap[selection.period ?? 'daily']}（${selection.fileName}）`;
};
const buildFallbackReport = (input, selection, availability) => {
    const context = input.context ?? {};
    const actionLabel = resolveActionLabel(input.action);
    const records = collectPrimaryRecords(input.dataPreview);
    const sampleProject = sanitizeString(context.project, '未指定项目');
    const sampleDevice = sanitizeString(records[0]?.deviceName, '未识别到单表名称');
    const { available, missing } = buildAvailabilityText(availability);
    const title = selection?.kind === 'single-meter-diagnostic'
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
        lines.push('本次未获得足够的明细数据，暂时无法生成完整报告内容；系统已根据模板要求自动跳过无数据支撑的分析项。');
        lines.push('');
        lines.push('## 建议');
        lines.push('- 先补齐对应周期的能耗明细数据');
        lines.push('- 如需客流、天气、面积或设备运行分析，请一并提供相关数据源');
    }
    else {
        const uniqueProjects = new Set(records.map((record) => sanitizeString(record.orgName ?? record.orgId, '')).filter(Boolean));
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
        lines.push('- 当前为后端 fallback 版本，已按模板类型匹配报告骨架，并仅保留有数据支撑的分析方向。');
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
const toFiniteNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};
const formatEnergyNumber = (value) => value.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
const readEnergySummary = (value) => {
    if (!isPlainObject(value)) {
        return null;
    }
    const summary = isPlainObject(value.summary)
        ? value.summary
        : isPlainObject(value.data) && isPlainObject(value.data.summary)
            ? value.data.summary
            : null;
    if (!summary) {
        return null;
    }
    return {
        endDate: sanitizeString(summary.endDate, ''),
        matchedRecordCount: toFiniteNumber(summary.matchedRecordCount),
        meterCount: toFiniteNumber(summary.meterCount),
        projectName: sanitizeString(summary.projectName, ''),
        returnedGranularity: sanitizeString(summary.returnedGranularity, ''),
        startDate: sanitizeString(summary.startDate, ''),
        totalUsageKwh: toFiniteNumber(summary.totalUsageKwh),
    };
};
const normalizeEnergyRecord = (record) => ({
    deviceName: sanitizeString(record.deviceName ?? record.meterName, ''),
    energyItemPath: sanitizeString(record.energyItemPath, ''),
    meterType: sanitizeString(record.meterType, ''),
    projectName: sanitizeString(record.projectName ?? record.orgName, ''),
    sampleDate: sanitizeString(record.sampleDate ?? record.sampleTime, ''),
    usageKwh: toFiniteNumber(record.usageKwh ?? record.totalOne ?? record.value),
});
const readQueryIssue = (input) => {
    if (isPlainObject(input.context)) {
        const contextIssue = sanitizeString(input.context.queryError, '');
        if (contextIssue) {
            return contextIssue;
        }
    }
    if (isPlainObject(input.dataPreview)) {
        return sanitizeString(input.dataPreview.queryError, '');
    }
    return '';
};
const sumEnergyUsage = (records) => records.reduce((sum, record) => sum + record.usageKwh, 0);
const groupUsageByDate = (records) => {
    const grouped = new Map();
    records.forEach((record) => {
        const key = record.sampleDate || 'unknown';
        grouped.set(key, (grouped.get(key) ?? 0) + record.usageKwh);
    });
    return [...grouped.entries()]
        .map(([date, usageKwh]) => ({ date, usageKwh }))
        .sort((left, right) => left.date.localeCompare(right.date));
};
const buildFallbackEnergyAnalysis = (input) => {
    const context = isPlainObject(input.context) ? input.context : {};
    const summary = readEnergySummary(input.dataPreview);
    const queryIssue = readQueryIssue(input);
    const records = collectPrimaryRecords(input.dataPreview)
        .map(normalizeEnergyRecord)
        .filter((record) => record.usageKwh > 0);
    const totalUsageKwh = summary?.totalUsageKwh || sumEnergyUsage(records);
    const matchedRecordCount = summary?.matchedRecordCount || records.length;
    const meterCount = summary?.meterCount ||
        new Set(records.map((record) => record.deviceName || record.energyItemPath)).size;
    const projectName = summary?.projectName || sanitizeString(context.project, '未指定项目');
    const fallbackRange = [summary?.startDate, summary?.endDate]
        .filter(Boolean)
        .join(' 至 ');
    const timeRange = sanitizeString(context.timeRange, fallbackRange || '未指定');
    const topRecords = [...records]
        .sort((left, right) => right.usageKwh - left.usageKwh)
        .slice(0, 3);
    const groupedDates = groupUsageByDate(records);
    const highestDate = groupedDates.length > 0
        ? [...groupedDates].sort((left, right) => right.usageKwh - left.usageKwh)[0]
        : null;
    const lowestDate = groupedDates.length > 0
        ? [...groupedDates].sort((left, right) => left.usageKwh - right.usageKwh)[0]
        : null;
    const topUsage = sumEnergyUsage(topRecords);
    const topShare = totalUsageKwh > 0 ? topUsage / totalUsageKwh : 0;
    const title = `${resolveActionLabel(input.action)}分析`;
    const lines = [
        `## ${title}`,
        '',
        `- 项目：${projectName}`,
        `- 时间范围：${timeRange}`,
        `- 能源类型：${sanitizeString(context.energyType, '未指定')}`,
        `- 时间粒度：${sanitizeString(context.interval, summary?.returnedGranularity || '未指定')}`,
    ];
    if (queryIssue) {
        lines.push(`- 查询状态：${queryIssue}`);
    }
    if (records.length === 0) {
        lines.push('');
        lines.push('当前没有可用于分析的有效明细数据。');
        lines.push('建议先检查项目、日期范围和能耗类型，确认查询结果里已经返回 list/summary 后再继续追问。');
        return {
            model: defaultModel,
            reply: lines.join('\n'),
            thinking: [
                `已识别为 ${resolveActionLabel(input.action)} 场景`,
                queryIssue || '本次没有拿到可用的明细数据',
                '当前使用本地 fallback 生成结果',
            ].join('\n'),
            usedFallback: true,
        };
    }
    lines.push('');
    lines.push('## 关键结论');
    lines.push(`- 本次返回 ${matchedRecordCount} 条记录，覆盖 ${meterCount || records.length} 个表计，总用能 ${formatEnergyNumber(totalUsageKwh)} kWh。`);
    if (topRecords[0]) {
        const topRecordName = topRecords[0].deviceName || topRecords[0].energyItemPath || '未命名表计';
        lines.push(`- 最高单条记录为 ${topRecordName}，${topRecords[0].sampleDate || '未标注日期'} 用能 ${formatEnergyNumber(topRecords[0].usageKwh)} kWh。`);
    }
    if (highestDate && lowestDate && highestDate.date !== lowestDate.date) {
        const deltaPercent = lowestDate.usageKwh > 0
            ? ((highestDate.usageKwh - lowestDate.usageKwh) / lowestDate.usageKwh) * 100
            : 0;
        lines.push(`- 按日期汇总，${highestDate.date} 最高 ${formatEnergyNumber(highestDate.usageKwh)} kWh，${lowestDate.date} 最低 ${formatEnergyNumber(lowestDate.usageKwh)} kWh，波动 ${formatEnergyNumber(deltaPercent)}%。`);
    }
    else if (topShare >= 0.45) {
        lines.push(`- Top ${topRecords.length} 表计合计 ${formatEnergyNumber(topUsage)} kWh，占本次结果 ${formatEnergyNumber(topShare * 100)}%，负荷集中度较高。`);
    }
    else {
        lines.push('- 当前返回数据分布相对均衡，可继续围绕高耗能表计和异常日期追问。');
    }
    lines.push('');
    lines.push('## 重点对象');
    topRecords.forEach((record, index) => {
        const recordName = record.deviceName || record.energyItemPath || `表计 ${index + 1}`;
        lines.push(`- ${index + 1}. ${recordName}：${formatEnergyNumber(record.usageKwh)} kWh${record.sampleDate ? `（${record.sampleDate}）` : ''}`);
    });
    lines.push('');
    lines.push('## 建议');
    if (input.action === 'energy-compare' && groupedDates.length < 2) {
        lines.push('- 当前时间范围内只有单日数据，如需做趋势或对比，请扩大查询日期范围。');
    }
    else if (topShare >= 0.45) {
        lines.push('- 优先排查排名靠前的表计或分项，确认是否存在异常长时运行、重复计量或负荷集中。');
    }
    else {
        lines.push('- 可继续按设备、分项或日期下钻，定位具体的高耗能时段与设备。');
    }
    lines.push('- 如需更完整的自然语言报告，请在服务端配置 GEMINI_API_KEY 以启用大模型生成。');
    return {
        model: defaultModel,
        reply: lines.join('\n'),
        thinking: [
            `已识别为 ${resolveActionLabel(input.action)} 场景`,
            `总用能 ${formatEnergyNumber(totalUsageKwh)} kWh / 记录 ${matchedRecordCount}`,
            queryIssue || '已结合查询结果生成本地分析',
        ].join('\n'),
        usedFallback: true,
    };
};
const buildFallbackChat = (input) => {
    const context = input.context ?? {};
    const actionLabel = resolveActionLabel(input.action);
    const { availability, selection } = buildReportTemplatePromptContext(input);
    if (input.action === 'energy-report' || input.action === 'energy-diagnostic') {
        return buildFallbackReport(input, selection, availability);
    }
    if (input.dataPreview || readQueryIssue(input)) {
        return buildFallbackEnergyAnalysis(input);
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
        `上下文：${sanitizeString(context.project, '未指定项目')} / ${sanitizeString(context.timeRange, '未指定时间')}`,
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
const buildChatSystemInstruction = (input) => {
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
const generateJson = async (systemInstruction, payload) => {
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
export const generateHaloChatReply = async (input) => {
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
    }
    catch {
        return fallback;
    }
};
const buildFallbackArtifact = (input) => {
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
        summary: '当前使用本地 fallback 生成结构化方案。',
        title: input.name.trim(),
        usedFallback: true,
    };
};
export const generateHaloArtifact = async (input) => {
    const fallback = buildFallbackArtifact(input);
    if (!aiClient) {
        return {
            ...fallback,
            summary: `${fallback.summary} AI model is not configured on the server.`,
        };
    }
    try {
        const parsed = await generateJson([
            '你是 Halo 的 AI Coding 生成器。',
            '请根据名称、目标和提示词，输出适合企业能源管理平台使用的组件或应用定义。',
            '只返回 JSON，字段为 title、description、summary、badge、items。',
            'items 必须是 2 到 4 条简短要点。',
        ].join('\n'), input);
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
    }
    catch {
        return fallback;
    }
};
