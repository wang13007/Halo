import { format } from "date-fns";
import { buildApiUrl, readApiBody } from "./api";

export type ChatQueryForm = {
  endDate: string;
  energyType: string;
  interval: string;
  orgId: string;
  pageNum: number;
  pageSize: number;
  project: string;
  projectId: string;
  queryName: string;
  startDate: string;
};

export type QueryReportProxyResponse = {
  data?: unknown;
  message?: string;
  ok: boolean;
  requestPayload: Record<string, unknown>;
  upstreamStatus: number;
  upstreamUrl: string;
};

const queryTypeCodeMap: Record<string, number> = {
  day: 2,
  hour: 1,
};

const buildBoundaryTimestamp = (date: string, boundary: "start" | "end") => {
  if (!date) {
    return Date.now();
  }

  const time = boundary === "start" ? "00:00:00.000" : "23:59:59.999";
  return new Date(`${date}T${time}+08:00`).getTime();
};

export function buildEnergyQueryPayload(form: ChatQueryForm) {
  const startAt = buildBoundaryTimestamp(form.startDate, "start");
  const endAt = buildBoundaryTimestamp(form.endDate, "end");
  const queryType = queryTypeCodeMap[form.interval] ?? 2;

  return {
    endTime: endAt,
    meterType: form.energyType,
    orgId: form.orgId,
    pageNum: form.pageNum,
    pageSize: form.pageSize,
    projectId: form.projectId,
    queryName: form.queryName.trim(),
    queryType,
    startTime: startAt,
  };
}

export async function queryEnergyReport(
  payload: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<QueryReportProxyResponse> {
  const targetUrl = buildApiUrl("/api/energy/query-report");
  const response = await fetch(targetUrl, {
    body: JSON.stringify({ payload }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
    signal,
  });

  try {
    const data = await readApiBody<QueryReportProxyResponse | string>(response);

    if (
      data &&
      typeof data === "object" &&
      "ok" in data &&
      "upstreamStatus" in data
    ) {
      return data as QueryReportProxyResponse;
    }

    return {
      data,
      message:
        typeof data === "string"
          ? data
          : "The query proxy returned an unexpected response payload.",
      ok: response.ok,
      requestPayload: payload,
      upstreamStatus: response.status,
      upstreamUrl: targetUrl,
    };
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "The query proxy did not return a readable JSON payload.",
      ok: false,
      requestPayload: payload,
      upstreamStatus: response.status,
      upstreamUrl: targetUrl,
    };
  }
}

function truncateUnknown(value: unknown, depth = 0): unknown {
  if (depth > 2) {
    return "[truncated]";
  }

  if (typeof value === "string") {
    return value.length > 600 ? `${value.slice(0, 600)}...` : value;
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, 4)
      .map((item) => truncateUnknown(item, depth + 1));
    return value.length > 4
      ? [...items, `... ${value.length - 4} more item(s)`]
      : items;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(
      0,
      8,
    );
    return Object.fromEntries(
      entries.map(([key, childValue]) => [
        key,
        truncateUnknown(childValue, depth + 1),
      ]),
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
    "已调用项目分项能耗查询接口 `queryReport`。",
    "",
    `项目：${form.project}`,
    `组织 ID：${form.orgId}`,
    `能源类型：${form.energyType}`,
    `查询日期：${form.startDate} 至 ${form.endDate}`,
    `统计粒度：${form.interval}`,
    `关键词：${form.queryName || "未填写"}`,
    `分页：第 ${form.pageNum} 页 / ${form.pageSize} 条`,
    "",
    `请求时间：${format(new Date(), "yyyy-MM-dd HH:mm:ss")}`,
    "",
    "请求参数预览：",
    toPreviewText(payload),
  ];

  if (!response.ok) {
    lines.push("");
    lines.push(`接口调用失败，上游状态：${response.upstreamStatus}`);

    if (response.message) {
      lines.push(response.message);
    }

    if (response.data !== undefined) {
      lines.push("");
      lines.push("错误响应预览：");
      lines.push(toPreviewText(response.data));
    }

    return lines.join("\n");
  }

  lines.push("");
  lines.push(`接口调用成功，上游状态：${response.upstreamStatus}`);
  lines.push("");
  lines.push("返回数据预览：");
  lines.push(toPreviewText(response.data));

  return lines.join("\n");
}
