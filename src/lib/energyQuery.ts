import {
  endOfDay,
  endOfHour,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

export type ChatQueryForm = {
  project: string;
  orgId: string;
  energyType: string;
  timeRange: string;
  interval: string;
  queryName: string;
  pageNum: number;
  pageSize: number;
};

export type QueryReportProxyResponse = {
  ok: boolean;
  upstreamStatus: number;
  upstreamUrl: string;
  requestPayload: Record<string, unknown>;
  data?: unknown;
  message?: string;
};

const energyTypeCodeMap: Record<string, string> = {
  电: 'electricity',
  水: 'water',
  燃气: 'gas',
};

const queryTypeCodeMap: Record<string, number> = {
  '1小时': 1,
  '1天': 2,
};

function resolveTimeRange(timeRange: string, now = new Date()) {
  if (timeRange === '本周') {
    return {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }

  if (timeRange === '本月') {
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }

  return {
    start: startOfDay(now),
    end: endOfDay(now),
  };
}

export function buildEnergyQueryPayload(form: ChatQueryForm) {
  const { start, end } = resolveTimeRange(form.timeRange);
  const startAt = form.interval === '1小时' ? startOfHour(start).getTime() : start.getTime();
  const endAt = form.interval === '1小时' ? endOfHour(end).getTime() : end.getTime();
  const queryType = queryTypeCodeMap[form.interval] ?? 1;
  const energyTypeCode = energyTypeCodeMap[form.energyType] ?? form.energyType;

  return {
    endTime: endAt,
    meterType: energyTypeCode,
    orgId: form.orgId,
    pageNum: form.pageNum,
    pageSize: form.pageSize,
    queryName: form.queryName.trim(),
    queryType,
    startTime: startAt,
  };
}

export async function queryEnergyReport(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<QueryReportProxyResponse> {
  const response = await fetch('/api/energy/query-report', {
    body: JSON.stringify({ payload }),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  try {
    return (await response.json()) as QueryReportProxyResponse;
  } catch {
    return {
      message: '代理接口没有返回可解析的 JSON 数据。',
      ok: response.ok,
      requestPayload: payload,
      upstreamStatus: response.status,
      upstreamUrl: '/api/energy/query-report',
    };
  }
}

function truncateUnknown(value: unknown, depth = 0): unknown {
  if (depth > 2) {
    return '[truncated]';
  }

  if (typeof value === 'string') {
    return value.length > 600 ? `${value.slice(0, 600)}...` : value;
  }

  if (Array.isArray(value)) {
    const items = value.slice(0, 4).map((item) => truncateUnknown(item, depth + 1));
    return value.length > 4 ? [...items, `... ${value.length - 4} more item(s)`] : items;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 8);
    return Object.fromEntries(
      entries.map(([key, childValue]) => [key, truncateUnknown(childValue, depth + 1)]),
    );
  }

  return value;
}

function toPreviewText(value: unknown) {
  return JSON.stringify(truncateUnknown(value), null, 2);
}

export function formatEnergyQueryMessage(
  form: ChatQueryForm,
  payload: Record<string, unknown>,
  response: QueryReportProxyResponse,
) {
  const lines = [
    '已调用项目分项能耗查询接口 `queryReport`。',
    '',
    `项目：${form.project}`,
    `组织 ID：${form.orgId}`,
    `能源类型：${form.energyType}`,
    `时间范围：${form.timeRange}`,
    `统计粒度：${form.interval}`,
    `关键词：${form.queryName || '未填写'}`,
    `分页：第 ${form.pageNum} 页 / ${form.pageSize} 条`,
    '',
    `请求时间：${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`,
    '',
    '请求参数预览：',
    toPreviewText(payload),
  ];

  if (!response.ok) {
    lines.push('');
    lines.push(`接口调用失败，上游状态：${response.upstreamStatus}`);

    if (response.message) {
      lines.push(response.message);
    }

    if (response.data !== undefined) {
      lines.push('');
      lines.push('错误响应预览：');
      lines.push(toPreviewText(response.data));
    }

    return lines.join('\n');
  }

  lines.push('');
  lines.push(`接口调用成功，上游状态：${response.upstreamStatus}`);
  lines.push('');
  lines.push('返回数据预览：');
  lines.push(toPreviewText(response.data));

  return lines.join('\n');
}
