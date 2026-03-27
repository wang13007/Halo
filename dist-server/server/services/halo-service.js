import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { format } from "date-fns";
import { getSupabase } from "../lib/supabase.js";
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRootCandidates = [
    path.resolve(currentDir, "..", ".."),
    path.resolve(currentDir, "..", "..", ".."),
];
const projectRoot = projectRootCandidates.find((candidate) => fs.existsSync(path.join(candidate, "package.json"))) ?? path.resolve(currentDir, "..", "..");
const localImportedEnergyDataPath = path.join(projectRoot, "server", "data", "imported-energy-data.json");
const sumBy = (items, selector) => items.reduce((total, item) => total + (selector(item) ?? 0), 0);
const percentChange = (current, previous) => {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
};
const startOfLocalDay = (date = new Date()) => {
    const local = new Date(date);
    local.setHours(0, 0, 0, 0);
    return local;
};
const startOfCurrentMonth = (date = new Date()) => {
    const local = new Date(date);
    local.setDate(1);
    local.setHours(0, 0, 0, 0);
    return local;
};
const startOfPreviousMonth = (date = new Date()) => {
    const local = startOfCurrentMonth(date);
    local.setMonth(local.getMonth() - 1);
    return local;
};
const endOfPreviousMonth = (date = new Date()) => {
    const local = startOfCurrentMonth(date);
    local.setMilliseconds(-1);
    return local;
};
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const normalizeStringValue = (value) => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed || "";
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    return "";
};
const truncateText = (value, maxLength) => {
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) {
        return trimmed;
    }
    return `${trimmed.slice(0, maxLength).trimEnd()}...`;
};
const toValidIsoString = (value) => {
    if (typeof value !== "string" || !value.trim()) {
        return "";
    }
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? "" : new Date(timestamp).toISOString();
};
const toFiniteNumber = (value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string" && value.trim()) {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : 0;
    }
    return 0;
};
const parsePositiveInteger = (value, fallback) => {
    const normalized = Math.floor(toFiniteNumber(value));
    if (normalized <= 0) {
        return fallback;
    }
    return normalized;
};
const dateFormatterCache = new Map();
const getDateFormatter = (timeZone) => {
    const cached = dateFormatterCache.get(timeZone);
    if (cached) {
        return cached;
    }
    const formatter = new Intl.DateTimeFormat("en-CA", {
        day: "2-digit",
        month: "2-digit",
        timeZone,
        year: "numeric",
    });
    dateFormatterCache.set(timeZone, formatter);
    return formatter;
};
const formatDateInTimeZone = (value, timeZone) => {
    const parts = getDateFormatter(timeZone).formatToParts(typeof value === "number" ? new Date(value) : value);
    const year = parts.find((part) => part.type === "year")?.value ?? "";
    const month = parts.find((part) => part.type === "month")?.value ?? "";
    const day = parts.find((part) => part.type === "day")?.value ?? "";
    return year && month && day ? `${year}-${month}-${day}` : "";
};
const normalizeSearchText = (value) => normalizeStringValue(value).toLowerCase();
const normalizeStringList = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.map((item) => normalizeStringValue(item)).filter(Boolean);
};
const meterTypeLabelMap = {
    electricity: "电",
    gas: "燃气",
    water: "水",
};
const intervalLabelMap = {
    day: "1天",
    hour: "1小时",
};
const buildSearchTerms = (value) => normalizeSearchText(value)
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
const resolveDateFromTimestamp = (value, timeZone = "Asia/Shanghai") => {
    const timestamp = toFiniteNumber(value);
    if (!timestamp) {
        return "";
    }
    return formatDateInTimeZone(timestamp, timeZone);
};
const matchesImportedEnergyQuery = (row, queryName) => {
    const terms = buildSearchTerms(queryName);
    if (terms.length === 0) {
        return true;
    }
    const haystack = [
        row.energy_path,
        row.meter_name,
        row.meter_number,
        row.organization_path,
        row.project_name,
        row.project_code,
        row.sample_date,
    ]
        .map((item) => item.toLowerCase())
        .join(" ");
    return terms.every((term) => haystack.includes(term));
};
let cachedImportedEnergyData;
const readLocalImportedEnergyData = () => {
    if (cachedImportedEnergyData !== undefined) {
        return cachedImportedEnergyData;
    }
    if (!fs.existsSync(localImportedEnergyDataPath)) {
        cachedImportedEnergyData = null;
        return cachedImportedEnergyData;
    }
    try {
        const parsed = JSON.parse(fs.readFileSync(localImportedEnergyDataPath, "utf8"));
        const projects = Array.isArray(parsed.projects)
            ? parsed.projects
            : [];
        const records = Array.isArray(parsed.records)
            ? parsed.records
            : [];
        cachedImportedEnergyData = { projects, records };
        return cachedImportedEnergyData;
    }
    catch {
        cachedImportedEnergyData = null;
        return cachedImportedEnergyData;
    }
};
const buildImportedEnergyReportResponse = (rows, options) => {
    const total = rows.length;
    const offset = (options.pageNum - 1) * options.pageSize;
    const pagedRows = rows.slice(offset, offset + options.pageSize);
    const sampleDates = [...new Set(rows.map((row) => row.sample_date))].sort();
    const meterCount = new Set(rows.map((row) => row.meter_number)).size;
    const totalUsageKwh = rows.reduce((sum, row) => sum + toFiniteNumber(row.usage_kwh), 0);
    return {
        list: pagedRows.map((row) => ({
            deviceId: row.meter_number,
            deviceName: row.meter_name,
            deviceNumber: row.meter_number,
            energyItemPath: row.energy_path,
            granularity: row.granularity,
            meterName: row.meter_name,
            meterType: row.meter_type,
            metadata: row.metadata ?? {},
            orgId: row.org_id,
            orgName: row.project_name,
            orgPath: row.organization_path,
            projectCode: row.project_code,
            projectId: options.projectId,
            projectName: row.project_name,
            sampleDate: row.sample_date,
            sampleTime: row.sample_date,
            sourceFile: row.source_file,
            totalOne: Number(toFiniteNumber(row.usage_kwh).toFixed(2)),
            unit: "kWh",
            usageKwh: Number(toFiniteNumber(row.usage_kwh).toFixed(2)),
        })),
        pageNum: options.pageNum,
        pageSize: options.pageSize,
        summary: {
            endDate: sampleDates.at(-1) ?? options.endDate,
            matchedRecordCount: total,
            meterCount,
            meterType: options.meterType,
            orgId: options.orgId,
            projectName: options.projectName,
            projectId: options.projectId,
            requestedGranularity: options.requestedGranularity,
            returnedGranularity: rows[0]?.granularity ?? "day",
            startDate: sampleDates[0] ?? options.startDate,
            totalUsageKwh: Number(totalUsageKwh.toFixed(2)),
        },
        total,
    };
};
const normalizeChatMessages = (messages) => {
    if (!Array.isArray(messages)) {
        return [];
    }
    return messages.flatMap((message) => {
        if (!isPlainObject(message)) {
            return [];
        }
        const role = message.role;
        const content = typeof message.content === "string" ? message.content.trim() : "";
        const id = typeof message.id === "string" && message.id.trim()
            ? message.id.trim()
            : randomUUID();
        const thinking = typeof message.thinking === "string" && message.thinking.trim()
            ? message.thinking.trim()
            : undefined;
        const createdAt = toValidIsoString(message.createdAt) || new Date().toISOString();
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
const normalizeMetadata = (value) => isPlainObject(value) ? value : {};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (isPlainObject(error) && typeof error.message === "string") {
        return error.message;
    }
    return String(error ?? "");
};
const isRetryableSupabaseError = (error) => /(fetch failed|timeout|timed out|econnreset|etimedout|connect timeout|network)/i.test(getErrorMessage(error));
const withSupabaseRetry = async (operation, attempts = 3) => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            lastError = error;
            if (attempt === attempts || !isRetryableSupabaseError(error)) {
                throw error;
            }
            await sleep(350 * attempt);
        }
    }
    throw lastError;
};
const deriveSessionTitle = (messages, title) => {
    if (typeof title === "string" && title.trim()) {
        return truncateText(title, 48);
    }
    const firstUserMessage = messages.find((message) => message.role === "user");
    if (firstUserMessage) {
        return truncateText(firstUserMessage.content, 48);
    }
    return "新建会话";
};
const deriveSessionSummary = (messages, summary) => {
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
const resolveLastMessageAt = (messages) => {
    const lastTimestamp = [...messages]
        .reverse()
        .map((message) => toValidIsoString(message.createdAt))
        .find(Boolean);
    return lastTimestamp || new Date().toISOString();
};
const normalizeChatSession = (row) => ({
    created_at: row.created_at,
    id: row.id,
    last_message_at: row.last_message_at,
    metadata: normalizeMetadata(row.metadata),
    messages: normalizeChatMessages(row.messages ?? []),
    status: row.status,
    summary: row.summary,
    title: row.title,
    updated_at: row.updated_at,
});
const toChatSessionSummary = (session) => ({
    created_at: session.created_at,
    id: session.id,
    last_message_at: session.last_message_at,
    metadata: session.metadata,
    status: session.status,
    summary: session.summary,
    title: session.title,
    updated_at: session.updated_at,
});
const buildChatSessionPayload = (input) => {
    const messages = normalizeChatMessages(input.messages);
    const metadata = normalizeMetadata(input.metadata);
    return {
        last_message_at: resolveLastMessageAt(messages),
        messages,
        metadata,
        status: typeof input.status === "string" && input.status.trim()
            ? input.status.trim()
            : "active",
        summary: deriveSessionSummary(messages, input.summary),
        title: deriveSessionTitle(messages, input.title),
    };
};
export const listProjects = async () => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("projects")
            .select("id, code, name, location, timezone")
            .order("created_at", { ascending: true });
        if (error) {
            throw error;
        }
        return data ?? [];
    });
};
export const resolveProject = async (projectCode) => {
    const supabase = getSupabase();
    const baseQuery = supabase
        .from("projects")
        .select("id, code, name, location, timezone")
        .limit(1);
    const { data, error } = projectCode
        ? await baseQuery.eq("code", projectCode).maybeSingle()
        : await baseQuery.order("created_at", { ascending: true }).maybeSingle();
    if (error) {
        throw error;
    }
    if (!data) {
        throw new Error("No project data found. Run `npm run db:setup` to initialize your Supabase tables and demo data.");
    }
    return data;
};
export const getEnergyAnalysis = async (projectCode) => {
    const supabase = getSupabase();
    const project = await resolveProject(projectCode);
    const now = new Date();
    const todayStart = startOfLocalDay(now);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const currentMonthStart = startOfCurrentMonth(now);
    const previousMonthStart = startOfPreviousMonth(now);
    const previousMonthEnd = endOfPreviousMonth(now);
    const [todayResult, yesterdayResult, currentMonthResult, previousMonthResult,] = await Promise.all([
        supabase
            .from("energy_metrics")
            .select("metric_at, source, usage_kwh, cost_amount, carbon_kg")
            .eq("project_id", project.id)
            .gte("metric_at", todayStart.toISOString())
            .order("metric_at", { ascending: true }),
        supabase
            .from("energy_metrics")
            .select("metric_at, source, usage_kwh, cost_amount, carbon_kg")
            .eq("project_id", project.id)
            .gte("metric_at", yesterdayStart.toISOString())
            .lt("metric_at", todayStart.toISOString())
            .order("metric_at", { ascending: true }),
        supabase
            .from("energy_metrics")
            .select("metric_at, source, usage_kwh, cost_amount, carbon_kg")
            .eq("project_id", project.id)
            .gte("metric_at", currentMonthStart.toISOString())
            .order("metric_at", { ascending: true }),
        supabase
            .from("energy_metrics")
            .select("metric_at, source, usage_kwh, cost_amount, carbon_kg")
            .eq("project_id", project.id)
            .gte("metric_at", previousMonthStart.toISOString())
            .lte("metric_at", previousMonthEnd.toISOString())
            .order("metric_at", { ascending: true }),
    ]);
    for (const result of [
        todayResult,
        yesterdayResult,
        currentMonthResult,
        previousMonthResult,
    ]) {
        if (result.error) {
            throw result.error;
        }
    }
    const todayMetrics = (todayResult.data ?? []);
    const yesterdayMetrics = (yesterdayResult.data ?? []);
    const currentMonthMetrics = (currentMonthResult.data ??
        []);
    const previousMonthMetrics = (previousMonthResult.data ??
        []);
    const todayUsage = sumBy(todayMetrics, (metric) => metric.usage_kwh);
    const yesterdayUsage = sumBy(yesterdayMetrics, (metric) => metric.usage_kwh);
    const monthUsage = sumBy(currentMonthMetrics, (metric) => metric.usage_kwh);
    const previousMonthUsage = sumBy(previousMonthMetrics, (metric) => metric.usage_kwh);
    const monthCost = sumBy(currentMonthMetrics, (metric) => metric.cost_amount);
    const previousMonthCost = sumBy(previousMonthMetrics, (metric) => metric.cost_amount);
    const monthCarbon = sumBy(currentMonthMetrics, (metric) => metric.carbon_kg);
    const previousMonthCarbon = sumBy(previousMonthMetrics, (metric) => metric.carbon_kg);
    const chartByTime = new Map();
    todayMetrics.forEach((metric) => {
        const label = format(new Date(metric.metric_at), "HH:mm");
        const bucket = chartByTime.get(label) ?? {
            hvac: 0,
            lighting: 0,
            other: 0,
            plugs: 0,
            time: label,
        };
        const usage = metric.usage_kwh ?? 0;
        if (metric.source === "hvac") {
            bucket.hvac += usage;
        }
        else if (metric.source === "lighting") {
            bucket.lighting += usage;
        }
        else if (metric.source === "plugs") {
            bucket.plugs += usage;
        }
        else {
            bucket.other += usage;
        }
        chartByTime.set(label, bucket);
    });
    const breakdownBySource = new Map();
    currentMonthMetrics.forEach((metric) => {
        breakdownBySource.set(metric.source, (breakdownBySource.get(metric.source) ?? 0) + (metric.usage_kwh ?? 0));
    });
    return {
        breakdown: Array.from(breakdownBySource.entries()).map(([name, value]) => ({
            name,
            value: Number(value.toFixed(2)),
        })),
        chart: Array.from(chartByTime.values()),
        lastUpdatedAt: currentMonthMetrics.at(-1)?.metric_at ?? null,
        project,
        stats: {
            carbonKg: Number(monthCarbon.toFixed(2)),
            carbonTrendPercent: percentChange(monthCarbon, previousMonthCarbon),
            costTrendPercent: percentChange(monthCost, previousMonthCost),
            estimatedCostAmount: Number(monthCost.toFixed(2)),
            monthTrendPercent: percentChange(monthUsage, previousMonthUsage),
            monthUsageKwh: Number(monthUsage.toFixed(2)),
            todayTrendPercent: percentChange(todayUsage, yesterdayUsage),
            todayUsageKwh: Number(todayUsage.toFixed(2)),
        },
    };
};
export const createEnergyMetric = async (input) => {
    const supabase = getSupabase();
    const project = await resolveProject(input.projectCode);
    const { data, error } = await supabase
        .from("energy_metrics")
        .insert({
        carbon_kg: input.carbonKg ?? null,
        cost_amount: input.costAmount ?? null,
        energy_type: input.energyType,
        metadata: input.metadata ?? {},
        metric_at: input.metricAt,
        project_id: project.id,
        source: input.source,
        usage_kwh: input.usageKwh,
    })
        .select("id, metric_at, energy_type, source, usage_kwh, cost_amount, carbon_kg")
        .single();
    if (error) {
        throw error;
    }
    return data;
};
const loadImportedProjectRows = async (projectIds) => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        let query = supabase
            .from("projects")
            .select("id, code, name, metadata")
            .order("name", { ascending: true });
        if (projectIds && projectIds.length > 0) {
            query = query.in("id", projectIds);
        }
        const { data, error } = await query;
        if (error) {
            throw error;
        }
        return (data ?? []);
    });
};
const toImportedEnergyProject = (row, projectRow) => ({
    availableGranularities: normalizeStringList(projectRow?.metadata?.availableGranularities).length > 0
        ? normalizeStringList(projectRow?.metadata?.availableGranularities)
        : ["day"],
    availableMeterTypes: normalizeStringList(projectRow?.metadata?.availableMeterTypes).length > 0
        ? normalizeStringList(projectRow?.metadata?.availableMeterTypes)
        : ["electricity"],
    firstSampleDate: normalizeStringValue(row.first_sample_date) ||
        normalizeStringValue(projectRow?.metadata?.firstSampleDate),
    lastSampleDate: normalizeStringValue(row.last_sample_date) ||
        normalizeStringValue(projectRow?.metadata?.lastSampleDate),
    orgId: normalizeStringValue(row.org_id) || normalizeStringValue(row.project_code),
    organizationPath: normalizeStringValue(row.organization_path) ||
        normalizeStringValue(projectRow?.metadata?.organizationPath),
    projectCode: normalizeStringValue(row.project_code) || normalizeStringValue(projectRow?.code),
    projectId: normalizeStringValue(row.project_id) || normalizeStringValue(projectRow?.id),
    projectName: normalizeStringValue(projectRow?.name) || normalizeStringValue(row.project_name),
    recordCount: parsePositiveInteger(row.record_count, parsePositiveInteger(projectRow?.metadata?.recordCount, 0)),
});
const loadEnergyQueryProjectRows = async () => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("energy_query_projects")
            .select("project_id, project_code, project_name, org_id, organization_path, record_count, first_sample_date, last_sample_date")
            .order("project_name", { ascending: true });
        if (error) {
            throw error;
        }
        return (data ?? []);
    });
};
const toEnergyQueryOption = (value, labelMap) => ({
    label: labelMap[value] ?? value,
    value,
});
export const listImportedEnergyProjects = async (options = {}) => {
    const allowLocalFallback = options.allowLocalFallback ?? true;
    try {
        const rows = await loadEnergyQueryProjectRows();
        if (rows.length > 0) {
            const projectRows = await loadImportedProjectRows(rows.map((row) => row.project_id));
            const projectRowById = new Map(projectRows.map((row) => [row.id, row]));
            return rows.map((row) => toImportedEnergyProject(row, projectRowById.get(row.project_id)));
        }
        if (!allowLocalFallback) {
            throw new Error("No energy query projects were found in Supabase.");
        }
    }
    catch (error) {
        if (!allowLocalFallback) {
            throw error instanceof Error
                ? error
                : new Error("Failed to load energy query projects from Supabase.");
        }
        // Fall back to the local imported cache when Supabase tables are not ready yet.
    }
    return (readLocalImportedEnergyData()?.projects ?? []).map((project) => ({
        availableGranularities: Array.isArray(project.availableGranularities) &&
            project.availableGranularities.length > 0
            ? project.availableGranularities
            : ["day"],
        availableMeterTypes: Array.isArray(project.availableMeterTypes) &&
            project.availableMeterTypes.length > 0
            ? project.availableMeterTypes
            : ["electricity"],
        firstSampleDate: project.firstSampleDate,
        lastSampleDate: project.lastSampleDate,
        orgId: project.orgId,
        organizationPath: project.organizationPath,
        projectCode: project.projectCode,
        projectId: "projectId" in project ? normalizeStringValue(project.projectId) : "",
        projectName: project.projectName,
        recordCount: project.recordCount,
    }));
};
export const getEnergyQueryConfig = async (options = {}) => {
    const projects = await listImportedEnergyProjects(options);
    if (projects.length === 0) {
        throw new Error("No energy query configuration is available in the database.");
    }
    const energyTypeValues = [
        ...new Set(projects.flatMap((project) => project.availableMeterTypes)),
    ];
    const intervalValues = [
        ...new Set(projects.flatMap((project) => project.availableGranularities)),
    ];
    const defaultProject = projects[0];
    const defaultEnergyType = defaultProject.availableMeterTypes[0] ??
        energyTypeValues[0] ??
        "electricity";
    const defaultInterval = defaultProject.availableGranularities[0] ?? intervalValues[0] ?? "day";
    const defaultEndDate = defaultProject.lastSampleDate || defaultProject.firstSampleDate;
    const defaultStartDate = defaultProject.lastSampleDate || defaultProject.firstSampleDate;
    return {
        defaults: {
            endDate: defaultEndDate,
            energyType: defaultEnergyType,
            interval: defaultInterval,
            orgId: defaultProject.orgId,
            pageNum: 1,
            pageSize: 20,
            project: defaultProject.projectName,
            projectId: defaultProject.projectId,
            startDate: defaultStartDate,
        },
        energyTypes: energyTypeValues.map((value) => toEnergyQueryOption(value, meterTypeLabelMap)),
        intervals: intervalValues.map((value) => toEnergyQueryOption(value, intervalLabelMap)),
        projects,
    };
};
export const queryImportedEnergyReport = async (payload, options = {}) => {
    const allowLocalFallback = options.allowLocalFallback ?? true;
    const projectId = normalizeStringValue(payload.projectId ?? payload.project_id);
    const orgId = normalizeStringValue(payload.orgId ?? payload.projectCode ?? payload.project_code);
    const meterType = normalizeSearchText(payload.meterType) || "electricity";
    const startDate = resolveDateFromTimestamp(payload.startTime);
    const endDate = resolveDateFromTimestamp(payload.endTime);
    const pageNum = parsePositiveInteger(payload.pageNum, 1);
    const pageSize = Math.min(parsePositiveInteger(payload.pageSize, 20), 200);
    const requestedGranularity = parsePositiveInteger(payload.queryType, 2) === 1 ? "hour" : "day";
    try {
        const supabase = getSupabase();
        const importedProjects = await loadEnergyQueryProjectRows();
        const project = projectId
            ? importedProjects.find((item) => item.project_id === projectId)
            : orgId
                ? importedProjects.find((item) => item.org_id === orgId || item.project_code === orgId)
                : importedProjects[0];
        if (project) {
            const remoteRows = [];
            const batchSize = 1000;
            for (let offset = 0;; offset += batchSize) {
                let query = supabase
                    .from("energy_query_records")
                    .select("project_code, project_name, org_id, organization_path, energy_path, meter_name, meter_number, sample_date, granularity, meter_type, usage_kwh, source_file, metadata")
                    .eq("project_id", project.project_id)
                    .eq("meter_type", meterType)
                    .order("sample_date", { ascending: false })
                    .order("usage_kwh", { ascending: false })
                    .range(offset, offset + batchSize - 1);
                if (startDate) {
                    query = query.gte("sample_date", startDate);
                }
                if (endDate) {
                    query = query.lte("sample_date", endDate);
                }
                const { data, error } = await withSupabaseRetry(async () => query);
                if (error) {
                    throw error;
                }
                const chunk = (data ?? []);
                remoteRows.push(...chunk);
                if (chunk.length < batchSize) {
                    break;
                }
            }
            const filteredRows = remoteRows.filter((row) => matchesImportedEnergyQuery(row, payload.queryName));
            return buildImportedEnergyReportResponse(filteredRows, {
                endDate,
                meterType,
                orgId: project.org_id,
                pageNum,
                pageSize,
                projectId: project.project_id,
                projectName: project.project_name,
                requestedGranularity,
                startDate,
            });
        }
        if (!allowLocalFallback) {
            throw new Error(projectId
                ? `No Supabase energy records found for projectId "${projectId}".`
                : orgId
                    ? `No Supabase energy records found for orgId "${orgId}".`
                    : "No Supabase energy records are available.");
        }
    }
    catch (error) {
        if (!allowLocalFallback) {
            throw error instanceof Error
                ? error
                : new Error("Failed to query Supabase energy records.");
        }
        // Fall back to local imported data when Supabase schema is unavailable.
    }
    const localData = readLocalImportedEnergyData();
    const localProject = projectId
        ? localData?.projects.find((project) => "projectId" in project &&
            normalizeStringValue(project.projectId) === projectId)
        : orgId
            ? localData?.projects.find((project) => project.orgId === orgId)
            : localData?.projects[0];
    const scopedLocalRows = (projectId || orgId) && !localProject
        ? []
        : (localData?.records ?? []).filter((row) => !localProject || row.org_id === localProject.orgId);
    const filteredRows = scopedLocalRows
        .filter((row) => row.meter_type === meterType)
        .filter((row) => (!startDate || row.sample_date >= startDate) &&
        (!endDate || row.sample_date <= endDate))
        .filter((row) => matchesImportedEnergyQuery(row, payload.queryName));
    return buildImportedEnergyReportResponse(filteredRows, {
        endDate,
        meterType,
        orgId: localProject?.orgId ?? orgId,
        pageNum,
        pageSize,
        projectId: ("projectId" in (localProject ?? {}) &&
            normalizeStringValue(localProject?.projectId)) ||
            projectId,
        projectName: localProject?.projectName ?? "",
        requestedGranularity,
        startDate,
    });
};
export const listIntegrations = async (projectCode) => {
    const supabase = getSupabase();
    const project = projectCode ? await resolveProject(projectCode) : null;
    let query = supabase
        .from("system_integrations")
        .select("id, name, system_type, base_url, username, auth_type, status, last_synced_at, metadata, created_at")
        .order("created_at", { ascending: true });
    if (project) {
        query = query.eq("project_id", project.id);
    }
    const { data, error } = await query;
    if (error) {
        throw error;
    }
    return data ?? [];
};
export const createIntegration = async (input) => {
    const supabase = getSupabase();
    const project = await resolveProject(input.projectCode);
    const { data, error } = await supabase
        .from("system_integrations")
        .insert({
        auth_type: input.authType ?? "token",
        base_url: input.baseUrl,
        metadata: input.metadata ?? {},
        name: input.name,
        project_id: project.id,
        status: input.status ?? "connected",
        system_type: input.systemType,
        username: input.username ?? null,
    })
        .select("id, name, system_type, base_url, username, auth_type, status, last_synced_at, metadata, created_at")
        .single();
    if (error) {
        throw error;
    }
    return data;
};
export const listReports = async (projectCode) => {
    const supabase = getSupabase();
    const project = await resolveProject(projectCode);
    const { data, error } = await supabase
        .from("analysis_reports")
        .select("id, title, summary, report_date, status, file_url, created_at")
        .eq("project_id", project.id)
        .order("report_date", { ascending: false });
    if (error) {
        throw error;
    }
    return data ?? [];
};
export const createReport = async (input) => {
    const supabase = getSupabase();
    const project = await resolveProject(input.projectCode);
    const { data, error } = await supabase
        .from("analysis_reports")
        .insert({
        file_url: input.fileUrl ?? null,
        payload: input.payload ?? {},
        project_id: project.id,
        report_date: input.reportDate ?? format(new Date(), "yyyy-MM-dd"),
        status: input.status ?? "generated",
        summary: input.summary ?? "",
        title: input.title,
    })
        .select("id, title, summary, report_date, status, file_url, created_at")
        .single();
    if (error) {
        throw error;
    }
    return data;
};
export const listChatSessions = async () => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("chat_sessions")
            .select("id, title, summary, status, metadata, last_message_at, created_at, updated_at")
            .order("last_message_at", { ascending: false });
        if (error) {
            throw error;
        }
        return (data ?? []).map((row) => toChatSessionSummary(normalizeChatSession(row)));
    });
};
export const getChatSession = async (sessionId) => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from("chat_sessions")
            .select("id, title, summary, status, messages, metadata, last_message_at, created_at, updated_at")
            .eq("id", sessionId)
            .maybeSingle();
        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error("Chat session not found.");
        }
        return normalizeChatSession(data);
    });
};
export const createChatSession = async (input) => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const payload = buildChatSessionPayload(input);
        const { data, error } = await supabase
            .from("chat_sessions")
            .insert(payload)
            .select("id, title, summary, status, messages, metadata, last_message_at, created_at, updated_at")
            .single();
        if (error) {
            throw error;
        }
        return normalizeChatSession(data);
    });
};
export const updateChatSession = async (sessionId, input) => {
    return withSupabaseRetry(async () => {
        const supabase = getSupabase();
        const payload = buildChatSessionPayload(input);
        const { data, error } = await supabase
            .from("chat_sessions")
            .update(payload)
            .eq("id", sessionId)
            .select("id, title, summary, status, messages, metadata, last_message_at, created_at, updated_at")
            .maybeSingle();
        if (error) {
            throw error;
        }
        if (!data) {
            throw new Error("Chat session not found.");
        }
        return normalizeChatSession(data);
    });
};
