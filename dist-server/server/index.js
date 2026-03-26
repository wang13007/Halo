import cors from "cors";
import express from "express";
import { env, isSupabaseConfigured, resolveCorsOrigin } from "./config.js";
import { generateHaloArtifact, generateHaloChatReply, getAiRuntimeStatus, } from "./lib/ai.js";
import { createChatSession, createEnergyMetric, createIntegration, createReport, getEnergyQueryConfig, getChatSession, getEnergyAnalysis, listChatSessions, listIntegrations, listProjects, listReports, queryImportedEnergyReport, updateChatSession, } from "./services/halo-service.js";
const app = express();
const normalizeCastgc = (rawValue) => {
    const value = rawValue.trim();
    if (!value) {
        return "";
    }
    if (value.startsWith("CASTGC:")) {
        return value.slice("CASTGC:".length).trim();
    }
    if (value.startsWith("CASTGC=")) {
        return value.slice("CASTGC=".length).trim();
    }
    return value;
};
const buildLongforHeaders = () => {
    const authorization = env.longforAuthorization.trim();
    const castgc = normalizeCastgc(env.longforCastgc);
    const gaiaApiKey = env.longforGaiaApiKey.trim();
    const headers = {
        Accept: "application/json, text/plain, */*",
    };
    if (authorization) {
        headers.authorization = authorization;
    }
    if (gaiaApiKey) {
        headers["x-gaia-api-key"] = gaiaApiKey;
    }
    if (castgc) {
        headers.CASTGC = castgc;
        headers.Cookie = `CASTGC=${castgc}; account=${castgc}`;
    }
    return {
        authorization,
        castgc,
        gaiaApiKey,
        headers,
    };
};
const hasLongforCredentials = (config) => Boolean(config.castgc || (config.authorization && config.gaiaApiKey));
const parseUpstreamResponse = async (upstreamResponse) => {
    const rawText = await upstreamResponse.text();
    if (!rawText) {
        return null;
    }
    try {
        return JSON.parse(rawText);
    }
    catch {
        return rawText;
    }
};
app.use(cors({ origin: resolveCorsOrigin() }));
app.use(express.json());
app.get("/api", (_request, response) => {
    response.json({
        message: "Halo backend is running.",
        routes: [
            "GET /api/health",
            "GET /api/projects",
            "GET /api/chat/sessions",
            "GET /api/chat/sessions/:sessionId",
            "POST /api/chat/sessions",
            "PATCH /api/chat/sessions/:sessionId",
            "GET /api/energy/analysis",
            "GET /api/energy/query-config",
            "GET /api/energy/quick-projects",
            "POST /api/energy/query-report",
            "POST /api/energy/metrics",
            "POST /api/ai/chat",
            "POST /api/ai/coding",
            "GET /api/reports",
            "POST /api/reports",
            "GET /api/integrations",
            "POST /api/integrations",
        ],
    });
});
app.get("/api/health", async (_request, response) => {
    const aiStatus = getAiRuntimeStatus();
    if (!isSupabaseConfigured()) {
        response.json({
            ai: aiStatus,
            database: {
                configured: false,
                reachable: false,
                schemaReady: false,
            },
            serverTime: new Date().toISOString(),
            status: "degraded",
        });
        return;
    }
    try {
        const projects = await listProjects();
        response.json({
            ai: aiStatus,
            database: {
                configured: true,
                reachable: true,
                schemaReady: true,
                projectCount: projects.length,
            },
            serverTime: new Date().toISOString(),
            status: aiStatus.configured ? "ok" : "degraded",
        });
    }
    catch (error) {
        response.json({
            ai: aiStatus,
            database: {
                configured: true,
                reachable: false,
                schemaReady: false,
            },
            error: error instanceof Error ? error.message : "Unknown database error",
            serverTime: new Date().toISOString(),
            status: "error",
        });
    }
});
app.get("/api/projects", async (_request, response, next) => {
    try {
        const projects = await listProjects();
        response.json({ projects });
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/chat/sessions", async (_request, response, next) => {
    try {
        const sessions = await listChatSessions();
        response.json({ sessions });
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/chat/sessions/:sessionId", async (request, response, next) => {
    try {
        const session = await getChatSession(request.params.sessionId);
        response.json({ session });
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/chat/sessions", async (request, response, next) => {
    try {
        const { messages } = request.body ?? {};
        if (!Array.isArray(messages)) {
            response
                .status(400)
                .json({ error: "messages must be an array to create a chat session." });
            return;
        }
        const session = await createChatSession(request.body);
        response.status(201).json({ session });
    }
    catch (error) {
        next(error);
    }
});
app.patch("/api/chat/sessions/:sessionId", async (request, response, next) => {
    try {
        const { messages } = request.body ?? {};
        if (!Array.isArray(messages)) {
            response
                .status(400)
                .json({ error: "messages must be an array to update a chat session." });
            return;
        }
        const session = await updateChatSession(request.params.sessionId, request.body);
        response.json({ session });
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/energy/analysis", async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === "string"
            ? request.query.projectCode
            : undefined;
        const analysis = await getEnergyAnalysis(projectCode);
        response.json(analysis);
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/energy/query-config", async (_request, response, next) => {
    try {
        const config = await getEnergyQueryConfig({ allowLocalFallback: false });
        response.json(config);
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/ai/chat", async (request, response, next) => {
    try {
        const { message } = request.body ?? {};
        if (!message || typeof message !== "string") {
            response
                .status(400)
                .json({ error: "message is required to generate an AI reply." });
            return;
        }
        const result = await generateHaloChatReply(request.body);
        response.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/ai/coding", async (request, response, next) => {
    try {
        const { artifactType, name, prompt } = request.body ?? {};
        if (!artifactType || !name || !prompt) {
            response.status(400).json({
                error: "artifactType, name and prompt are required to generate an AI artifact.",
            });
            return;
        }
        const result = await generateHaloArtifact(request.body);
        response.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/energy/quick-projects", async (_request, response) => {
    try {
        const config = await getEnergyQueryConfig({ allowLocalFallback: false });
        response.json({
            projects: config.projects.map((project) => ({
                channel: "DATABASE",
                name: project.projectName,
                orgId: project.orgId,
                projectCode: project.projectCode,
                projectId: project.projectId,
                projectName: project.projectName,
            })),
            upstreamStatus: 200,
            upstreamUrl: "supabase://public.energy_query_projects",
        });
        return;
    }
    catch (error) {
        response.status(500).json({
            error: error instanceof Error
                ? error.message
                : "Failed to load database-backed energy query projects.",
            projects: [],
            upstreamStatus: 500,
            upstreamUrl: "supabase://public.energy_query_projects",
        });
        return;
    }
});
app.post("/api/energy/query-report", async (request, response) => {
    const payload = (request.body?.payload ?? request.body ?? {});
    try {
        const report = await queryImportedEnergyReport(payload, {
            allowLocalFallback: false,
        });
        const message = report.summary.requestedGranularity === "hour"
            ? "Imported Excel data currently contains daily readings only. Returned daily Supabase records."
            : "Returned Supabase energy records.";
        response.json({
            ok: true,
            upstreamStatus: 200,
            upstreamUrl: "supabase://public.energy_query_records",
            requestPayload: payload,
            message,
            data: report,
        });
        return;
    }
    catch (error) {
        response.status(500).json({
            ok: false,
            upstreamStatus: 500,
            upstreamUrl: "supabase://public.energy_query_records",
            requestPayload: payload,
            message: error instanceof Error
                ? error.message
                : "Failed to query Supabase energy records.",
        });
    }
});
app.post("/api/energy/query-report-legacy", async (request, response) => {
    const longforConfig = buildLongforHeaders();
    const payload = (request.body?.payload ?? request.body ?? {});
    if (!hasLongforCredentials(longforConfig)) {
        response.status(500).json({
            ok: false,
            upstreamStatus: 500,
            upstreamUrl: env.longforQueryReportUrl,
            requestPayload: payload,
            message: "缺少龙湖接口鉴权，请在 .env.local 中配置 LONGFOR_AUTHORIZATION 与 LONGFOR_X_GAIA_API_KEY，或配置 LONGFOR_CASTGC。",
        });
        return;
    }
    try {
        const upstreamResponse = await fetch(env.longforQueryReportUrl, {
            method: "POST",
            headers: {
                ...longforConfig.headers,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });
        const data = await parseUpstreamResponse(upstreamResponse);
        response.status(upstreamResponse.status).json({
            ok: upstreamResponse.ok,
            upstreamStatus: upstreamResponse.status,
            upstreamUrl: env.longforQueryReportUrl,
            requestPayload: payload,
            data,
        });
    }
    catch (error) {
        response.status(502).json({
            ok: false,
            upstreamStatus: 502,
            upstreamUrl: env.longforQueryReportUrl,
            requestPayload: payload,
            message: error instanceof Error ? error.message : "queryReport 代理请求失败。",
        });
    }
});
app.post("/api/energy/metrics", async (request, response, next) => {
    try {
        const { energyType, metricAt, source, usageKwh } = request.body ?? {};
        if (!energyType || !metricAt || !source || usageKwh === undefined) {
            response.status(400).json({
                error: "energyType, metricAt, source and usageKwh are required to create an energy metric.",
            });
            return;
        }
        const metric = await createEnergyMetric(request.body);
        response.status(201).json({ metric });
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/reports", async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === "string"
            ? request.query.projectCode
            : undefined;
        const reports = await listReports(projectCode);
        response.json({ reports });
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/reports", async (request, response, next) => {
    try {
        const { title } = request.body ?? {};
        if (!title) {
            response
                .status(400)
                .json({ error: "title is required to create a report." });
            return;
        }
        const report = await createReport(request.body);
        response.status(201).json({ report });
    }
    catch (error) {
        next(error);
    }
});
app.get("/api/integrations", async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === "string"
            ? request.query.projectCode
            : undefined;
        const integrations = await listIntegrations(projectCode);
        response.json({ integrations });
    }
    catch (error) {
        next(error);
    }
});
app.post("/api/integrations", async (request, response, next) => {
    try {
        const { baseUrl, name, systemType } = request.body ?? {};
        if (!name || !systemType || !baseUrl) {
            response.status(400).json({
                error: "name, systemType and baseUrl are required to create an integration.",
            });
            return;
        }
        const integration = await createIntegration(request.body);
        response.status(201).json({ integration });
    }
    catch (error) {
        next(error);
    }
});
app.use((error, _request, response, _next) => {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    response.status(500).json({ error: message });
});
app.listen(env.apiPort, () => {
    console.log(`Halo backend listening on http://localhost:${env.apiPort} in ${env.nodeEnv} mode`);
});
