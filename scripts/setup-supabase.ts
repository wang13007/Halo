import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';
import { env } from '../server/config.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, '..');

const readSqlFile = async (relativePath: string) =>
  fs.readFile(path.join(projectRoot, relativePath), 'utf8');

const readMigrationSql = async () => {
  const migrationsDir = path.join(projectRoot, 'supabase', 'migrations');
  const migrationFiles = (await fs.readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  const statements = await Promise.all(
    migrationFiles.map((fileName) =>
      fs.readFile(path.join(migrationsDir, fileName), 'utf8'),
    ),
  );

  return statements.join('\n\n');
};

const run = async () => {
  if (!env.supabaseDbUrl) {
    throw new Error(
      'Missing SUPABASE_DB_URL. Add your Supabase Postgres connection string to .env.local before running `npm run db:setup`.',
    );
  }

  const schemaSql = await readMigrationSql();
  const seedSql = await readSqlFile('supabase/seed.sql');
  const shouldUseSsl = !env.supabaseDbUrl.includes('localhost');

  const client = new Client({
    connectionString: env.supabaseDbUrl,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    await client.query(`${schemaSql}\n${seedSql}`);
    console.log('Supabase schema and seed data are ready.');
  } finally {
    await client.end();
  }
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
