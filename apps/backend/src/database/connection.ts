import { isPostgres } from './db-type';

/**
 * The driver-specific half of the TypeORM options, shared by the running app
 * (`app.module.ts`) and the migration CLI (`data-source.ts`) so the two can
 * never connect differently.
 *
 * - `DB_TYPE=sqlite` (default): better-sqlite3 on `DB_PATH`.
 * - `DB_TYPE=postgres`: `DATABASE_URL`. `DB_SSL=true` requires a verified TLS
 *   connection; `DB_SSL=no-verify` encrypts without verifying the server
 *   certificate (some managed providers need it).
 *
 * No migrations here: the schema is owned by the numbered SQL files in
 * `apps/backend/migrations/`, applied by hand — the app never changes it. See
 * `.claude/rules/database-migrations.md`.
 */
export function connectionOptions(get: (key: string) => string | undefined) {
  if (isPostgres()) {
    const url = get('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is required when DB_TYPE=postgres.');
    const ssl = get('DB_SSL');
    return {
      type: 'postgres' as const,
      url,
      // uuid keys default to gen_random_uuid(), built into Postgres 13+ — no
      // uuid-ossp extension, which managed providers do not always allow.
      uuidExtension: 'pgcrypto' as const,
      // Never CREATE EXTENSION on connect: the app does not change the schema.
      installExtensions: false,
      ssl: ssl === 'true' ? true : ssl === 'no-verify' ? { rejectUnauthorized: false } : undefined,
    };
  }
  return {
    type: 'better-sqlite3' as const,
    database: get('DB_PATH') ?? 'data/helix_x.db',
  };
}
