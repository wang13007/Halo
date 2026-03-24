import cors from 'cors';
import express from 'express';
import { env, isSupabaseConfigured, resolveCorsOrigin } from './config.js';
import { generateHaloArtifact, generateHaloChatReply } from './lib/ai.js';
import { getSupabase } from './lib/supabase.js';
import { createEnergyMetric, createIntegration, createReport, getEnergyAnalysis, listIntegrations, listProjects, listReports, } from './services/halo-service.js';
const app = express();
const normalizeCastgc = (rawValue) => {
    const value = rawValue.trim();
    if (!value) {
        return '';
    }
    if (value.startsWith('CASTGC:')) {
        return value.slice('CASTGC:'.length).trim();
    }
    if (value.startsWith('CASTGC=')) {
        return value.slice('CASTGC='.length).trim();
    }
    return value;
};
const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const normalizeStringValue = (value) => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || '';
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    return '';
};
const getFirstNonEmptyString = (record, keys) => {
    for (const key of keys) {
        const normalized = normalizeStringValue(record[key]);
        if (normalized) {
            return normalized;
        }
    }
    return '';
};
const buildLongforHeaders = () => {
    const authorization = env.longforAuthorization.trim();
    const castgc = normalizeCastgc(env.longforCastgc);
    const gaiaApiKey = env.longforGaiaApiKey.trim();
    const headers = {
        Accept: 'application/json, text/plain, */*',
    };
    if (authorization) {
        headers.authorization = authorization;
    }
    if (gaiaApiKey) {
        headers['x-gaia-api-key'] = gaiaApiKey;
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
const projectChannelKeys = ['channel', 'projectChannel', 'orgChannel'];
const projectNameKeys = ['name', 'projectName', 'orgName', 'orgFullName', 'label', 'title'];
const projectIdKeys = ['orgId', 'organizationId', 'projectId', 'projectCode', 'orgCode', 'id', 'code'];
const projectShapeKeys = [
    'orgId',
    'organizationId',
    'projectId',
    'projectCode',
    'orgCode',
    'projectName',
    'orgName',
    'orgFullName',
];
const collectEnergyQuickProjects = (value, projects, seen, context = { channel: '', path: [] }) => {
    if (Array.isArray(value)) {
        value.forEach((item) => collectEnergyQuickProjects(item, projects, seen, context));
        return;
    }
    if (!isPlainObject(value)) {
        return;
    }
    const channel = getFirstNonEmptyString(value, projectChannelKeys) || context.channel;
    const name = getFirstNonEmptyString(value, projectNameKeys);
    const orgId = getFirstNonEmptyString(value, projectIdKeys);
    const isProjectPath = context.path.some((segment) => /org|project/i.test(segment));
    const hasProjectShape = isProjectPath || projectShapeKeys.some((key) => key in value);
    if (channel === 'C2' && hasProjectShape && name && orgId) {
        const dedupeKey = `${orgId}::${name}`;
        if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            projects.push({ channel, name, orgId });
        }
    }
    Object.entries(value).forEach(([key, childValue]) => {
        collectEnergyQuickProjects(childValue, projects, seen, {
            channel,
            path: [...context.path, key],
        });
    });
};
const extractEnergyQuickProjects = (payload) => {
    const projects = [];
    collectEnergyQuickProjects(payload, projects, new Set());
    return projects.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'));
};
const getUpstreamBusinessError = (payload) => {
    if (!isPlainObject(payload)) {
        return '';
    }
    const code = getFirstNonEmptyString(payload, ['code', 'status', 'errCode']);
    if (!code || ['0', '200', 'success', 'SUCCESS'].includes(code)) {
        return '';
    }
    const message = getFirstNonEmptyString(payload, ['msg', 'message', 'error', 'errorMessage']);
    return message ? `${message} (code: ${code})` : `Upstream business error (code: ${code})`;
};
app.use(cors({ origin: resolveCorsOrigin() }));
app.use(express.json());
app.get('/api', (_request, response) => {
    response.json({
        message: 'Halo backend is running.',
        routes: [
            'GET /api/health',
            'GET /api/projects',
            'GET /api/energy/analysis',
            'GET /api/energy/quick-projects',
            'POST /api/energy/query-report',
            'POST /api/energy/metrics',
            'POST /api/ai/chat',
            'POST /api/ai/coding',
            'GET /api/reports',
            'POST /api/reports',
            'GET /api/integrations',
            'POST /api/integrations',
        ],
    });
});
app.get('/api/health', async (_request, response) => {
    if (!isSupabaseConfigured()) {
        response.json({
            database: {
                configured: false,
                reachable: false,
                schemaReady: false,
            },
            serverTime: new Date().toISOString(),
            status: 'degraded',
        });
        return;
    }
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('projects')
            .select('id')
            .limit(1);
        if (error) {
            throw error;
        }
        response.json({
            database: {
                configured: true,
                reachable: true,
                schemaReady: true,
                projectCount: data?.length ?? 0,
            },
            serverTime: new Date().toISOString(),
            status: 'ok',
        });
    }
    catch (error) {
        response.json({
            database: {
                configured: true,
                reachable: false,
                schemaReady: false,
            },
            error: error instanceof Error ? error.message : 'Unknown database error',
            serverTime: new Date().toISOString(),
            status: 'error',
        });
    }
});
app.get('/api/projects', async (_request, response, next) => {
    try {
        const projects = await listProjects();
        response.json({ projects });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/energy/analysis', async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === 'string'
            ? request.query.projectCode
            : undefined;
        const analysis = await getEnergyAnalysis(projectCode);
        response.json(analysis);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/ai/chat', async (request, response, next) => {
    try {
        const { message } = request.body ?? {};
        if (!message || typeof message !== 'string') {
            response.status(400).json({ error: 'message is required to generate an AI reply.' });
            return;
        }
        const result = await generateHaloChatReply(request.body);
        response.json(result);
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/ai/coding', async (request, response, next) => {
    try {
        const { artifactType, name, prompt } = request.body ?? {};
        if (!artifactType || !name || !prompt) {
            response.status(400).json({
                error: 'artifactType, name and prompt are required to generate an AI artifact.',
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
app.get('/api/energy/quick-projects', async (_request, response) => {
    const longforConfig = buildLongforHeaders();
    if (!hasLongforCredentials(longforConfig)) {
        response.status(500).json({
            error: 'Missing Longfor credentials. Configure LONGFOR_AUTHORIZATION and LONGFOR_X_GAIA_API_KEY, or configure LONGFOR_CASTGC.',
            projects: [],
            upstreamStatus: 500,
            upstreamUrl: env.longforUserInfoUrl,
        });
        return;
    }
    try {
        const upstreamResponse = await fetch(env.longforUserInfoUrl, {
            headers: longforConfig.headers,
            method: 'GET',
        });
        const data = await parseUpstreamResponse(upstreamResponse);
        const upstreamBusinessError = getUpstreamBusinessError(data);
        if (!upstreamResponse.ok) {
            const upstreamMessage = isPlainObject(data)
                ? getFirstNonEmptyString(data, ['message', 'msg', 'error'])
                : '';
            response.status(upstreamResponse.status).json({
                error: upstreamMessage ||
                    `Failed to fetch Longfor quick-query projects: ${upstreamResponse.status}`,
                projects: [],
                upstreamStatus: upstreamResponse.status,
                upstreamUrl: env.longforUserInfoUrl,
            });
            return;
        }
        if (upstreamBusinessError) {
            response.status(401).json({
                error: upstreamBusinessError,
                loginUrl: isPlainObject(data) ? getFirstNonEmptyString(data, ['loginUrl']) : '',
                projects: [],
                upstreamStatus: upstreamResponse.status,
                upstreamUrl: env.longforUserInfoUrl,
            });
            return;
        }
        response.json({
            projects: extractEnergyQuickProjects(data),
            upstreamStatus: upstreamResponse.status,
            upstreamUrl: env.longforUserInfoUrl,
        });
    }
    catch (error) {
        response.status(502).json({
            error: error instanceof Error
                ? error.message
                : 'Failed to fetch Longfor quick-query projects.',
            projects: [],
            upstreamStatus: 502,
            upstreamUrl: env.longforUserInfoUrl,
        });
    }
});
app.post('/api/energy/query-report', async (request, response) => {
    const longforConfig = buildLongforHeaders();
    const payload = (request.body?.payload ?? request.body ?? {});
    if (!hasLongforCredentials(longforConfig)) {
        response.status(500).json({
            ok: false,
            upstreamStatus: 500,
            upstreamUrl: env.longforQueryReportUrl,
            requestPayload: payload,
            message: '缺少龙湖接口鉴权，请在 .env.local 中配置 LONGFOR_AUTHORIZATION 与 LONGFOR_X_GAIA_API_KEY，或配置 LONGFOR_CASTGC。',
        });
        return;
    }
    try {
        const upstreamResponse = await fetch(env.longforQueryReportUrl, {
            method: 'POST',
            headers: {
                ...longforConfig.headers,
                'Content-Type': 'application/json',
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
            message: error instanceof Error ? error.message : 'queryReport 代理请求失败。',
        });
    }
});
app.post('/api/energy/metrics', async (request, response, next) => {
    try {
        const { energyType, metricAt, source, usageKwh } = request.body ?? {};
        if (!energyType || !metricAt || !source || usageKwh === undefined) {
            response.status(400).json({
                error: 'energyType, metricAt, source and usageKwh are required to create an energy metric.',
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
app.get('/api/reports', async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === 'string'
            ? request.query.projectCode
            : undefined;
        const reports = await listReports(projectCode);
        response.json({ reports });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/reports', async (request, response, next) => {
    try {
        const { title } = request.body ?? {};
        if (!title) {
            response.status(400).json({ error: 'title is required to create a report.' });
            return;
        }
        const report = await createReport(request.body);
        response.status(201).json({ report });
    }
    catch (error) {
        next(error);
    }
});
app.get('/api/integrations', async (request, response, next) => {
    try {
        const projectCode = typeof request.query.projectCode === 'string'
            ? request.query.projectCode
            : undefined;
        const integrations = await listIntegrations(projectCode);
        response.json({ integrations });
    }
    catch (error) {
        next(error);
    }
});
app.post('/api/integrations', async (request, response, next) => {
    try {
        const { baseUrl, name, systemType } = request.body ?? {};
        if (!name || !systemType || !baseUrl) {
            response.status(400).json({
                error: 'name, systemType and baseUrl are required to create an integration.',
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
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    response.status(500).json({ error: message });
});
app.listen(env.apiPort, () => {
    console.log(`Halo backend listening on http://localhost:${env.apiPort} in ${env.nodeEnv} mode`);
});
