import cors from 'cors';
import express from 'express';
import { env, isSupabaseConfigured, resolveCorsOrigin } from './config.js';
import { getSupabase } from './lib/supabase.js';
import {
  createEnergyMetric,
  createIntegration,
  createReport,
  getEnergyAnalysis,
  listIntegrations,
  listProjects,
  listReports,
} from './services/halo-service.js';

const app = express();

const normalizeCastgc = (rawValue: string) => {
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

app.use(cors({ origin: resolveCorsOrigin() }));
app.use(express.json());

app.get('/api', (_request, response) => {
  response.json({
    message: 'Halo backend is running.',
    routes: [
      'GET /api/health',
      'GET /api/projects',
      'GET /api/energy/analysis',
      'POST /api/energy/query-report',
      'POST /api/energy/metrics',
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
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});

app.get('/api/energy/analysis', async (request, response, next) => {
  try {
    const projectCode =
      typeof request.query.projectCode === 'string'
        ? request.query.projectCode
        : undefined;

    const analysis = await getEnergyAnalysis(projectCode);
    response.json(analysis);
  } catch (error) {
    next(error);
  }
});

app.post('/api/energy/query-report', async (request, response) => {
  const authorization = env.longforAuthorization.trim();
  const castgc = normalizeCastgc(env.longforCastgc);
  const gaiaApiKey = env.longforGaiaApiKey.trim();
  const payload = (request.body?.payload ?? request.body ?? {}) as Record<string, unknown>;

  if ((!authorization || !gaiaApiKey) && !castgc) {
    response.status(500).json({
      ok: false,
      upstreamStatus: 500,
      upstreamUrl: env.longforQueryReportUrl,
      requestPayload: payload,
      message:
        '缺少龙湖接口鉴权，请在 .env.local 中配置 LONGFOR_AUTHORIZATION 与 LONGFOR_X_GAIA_API_KEY，或配置 LONGFOR_CASTGC。',
    });
    return;
  }

  try {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    };

    if (authorization) {
      headers.authorization = authorization;
    }

    if (gaiaApiKey) {
      headers['x-gaia-api-key'] = gaiaApiKey;
    }

    if (castgc) {
      headers.CASTGC = castgc;
      headers.Cookie = `CASTGC=${castgc}`;
    }

    const upstreamResponse = await fetch(env.longforQueryReportUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const rawText = await upstreamResponse.text();
    let data: unknown = rawText;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = rawText;
    }

    response.status(upstreamResponse.status).json({
      ok: upstreamResponse.ok,
      upstreamStatus: upstreamResponse.status,
      upstreamUrl: env.longforQueryReportUrl,
      requestPayload: payload,
      data,
    });
  } catch (error) {
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
        error:
          'energyType, metricAt, source and usageKwh are required to create an energy metric.',
      });
      return;
    }

    const metric = await createEnergyMetric(request.body);
    response.status(201).json({ metric });
  } catch (error) {
    next(error);
  }
});

app.get('/api/reports', async (request, response, next) => {
  try {
    const projectCode =
      typeof request.query.projectCode === 'string'
        ? request.query.projectCode
        : undefined;

    const reports = await listReports(projectCode);
    response.json({ reports });
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});

app.get('/api/integrations', async (request, response, next) => {
  try {
    const projectCode =
      typeof request.query.projectCode === 'string'
        ? request.query.projectCode
        : undefined;

    const integrations = await listIntegrations(projectCode);
    response.json({ integrations });
  } catch (error) {
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
  } catch (error) {
    next(error);
  }
});

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    const message =
      error instanceof Error ? error.message : 'Unexpected server error';

    response.status(500).json({ error: message });
  },
);

app.listen(env.apiPort, () => {
  console.log(
    `Halo backend listening on http://localhost:${env.apiPort} in ${env.nodeEnv} mode`,
  );
});
