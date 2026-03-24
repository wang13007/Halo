import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRootCandidates = [path.resolve(currentDir, '..'), path.resolve(currentDir, '..', '..')];
const projectRoot = projectRootCandidates.find((candidate) => fs.existsSync(path.join(candidate, 'package.json'))) ??
    path.resolve(currentDir, '..');
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });
dotenv.config({ path: path.join(projectRoot, '.env'), override: false });
const toNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
export const env = {
    apiPort: toNumber(process.env.PORT ?? process.env.API_PORT, 8787),
    corsOrigin: process.env.CORS_ORIGIN ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? '',
    googleApiKey: process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '',
    longforAuthorization: process.env.LONGFOR_AUTHORIZATION ?? '',
    longforCastgc: process.env.LONGFOR_CASTGC ?? '',
    longforGaiaApiKey: process.env.LONGFOR_X_GAIA_API_KEY ?? '',
    longforQueryReportUrl: process.env.LONGFOR_QUERY_REPORT_URL ??
        'https://gwp0-hw.longfor.com/yunjing-prod/qd-ems-analysis/api/v1/analysis/energy/queryReport',
    longforUserInfoUrl: process.env.LONGFOR_USER_INFO_URL ??
        'https://gwp0-hw.longfor.com/yunjing-prod/yunjing-base-server/api/v1/user/info',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    supabaseDbUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    supabaseUrl: process.env.SUPABASE_URL ?? '',
};
export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
export const resolveCorsOrigin = () => {
    if (!env.corsOrigin.trim()) {
        return true;
    }
    return env.corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};
