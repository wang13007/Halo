import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true });
dotenv.config({ path: path.join(projectRoot, '.env'), override: false });

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  apiPort: toNumber(process.env.API_PORT, 8787),
  corsOrigin: process.env.CORS_ORIGIN ?? '',
  longforAuthorization: process.env.LONGFOR_AUTHORIZATION ?? '',
  longforCastgc: process.env.LONGFOR_CASTGC ?? '',
  longforGaiaApiKey: process.env.LONGFOR_X_GAIA_API_KEY ?? '',
  longforQueryReportUrl:
    process.env.LONGFOR_QUERY_REPORT_URL ??
    'https://gwp0-hw.longfor.com/yunjing-prod/qd-ems-analysis/api/v1/analysis/energy/queryReport',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
  supabaseDbUrl: process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
};

export const isSupabaseConfigured = () =>
  Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const resolveCorsOrigin = () => {
  if (!env.corsOrigin.trim()) {
    return true;
  }

  return env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};
