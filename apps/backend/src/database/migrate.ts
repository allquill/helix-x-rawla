import { existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DataSource, type QueryRunner } from 'typeorm';
import { pendingVersions, readSchemaTracks, schemaDriver, type SchemaTrackState } from '@helix-x/backend';
import { connectionOptions } from './connection';
import { schemaTracks } from './schema-version';

/**
 * Applies the pending numbered migrations — exactly the files the startup
 * check would tell an operator to run by hand, in the same order (the
 * framework's `helix-x` track first, then `rawla`).
 *
 * Used by `pnpm db:migrate`, and by the app at startup when
 * `DB_AUTO_MIGRATE=true`. The schema is still owned by the SQL files: this
 * only saves typing them. Each file is self-contained — its own transaction,
 * and its own `INSERT INTO schema_migrations` — so a failure stops at that
 * file with the database at the previous version, and the next run resumes.
 *
 * - SQLite: a copy of the database is written first (`VACUUM INTO`, safe on a
 *   live file) as `<DB_PATH>.pre-migrate-<timestamp>` — the undo, since
 *   migrations are forward-only. A new database is simply created.
 * - PostgreSQL: a session advisory lock serialises concurrent runs, so two
 *   instances starting together cannot both apply the same file.
 */

/** Arbitrary, fixed key for pg_advisory_lock; the same for every instance. */
const PG_LOCK_KEY = 4_172_207_310;

/**
 * Opens the database the app would use (DB_TYPE, DB_PATH / DATABASE_URL), on
 * its own short-lived connection with no entities, and migrates it. For
 * SQLite the folder is created first: a new database is a new file.
 */
export async function runMigrations(log?: (line: string) => void): Promise<MigrateResult> {
  const options = connectionOptions((key) => process.env[key]);
  if (options.type === 'better-sqlite3' && options.database !== ':memory:') {
    mkdirSync(dirname(options.database), { recursive: true });
  }
  const dataSource = new DataSource({ ...options, entities: [] });
  await dataSource.initialize();
  try {
    return await migrate(dataSource, log);
  } finally {
    await dataSource.destroy();
  }
}

export interface MigrateResult {
  applied: string[];
  backup: string | null;
}

export async function migrate(
  dataSource: DataSource,
  log: (line: string) => void = (line) => console.log(line),
): Promise<MigrateResult> {
  const driver = schemaDriver(dataSource);
  const tracks = schemaTracks();
  const runner = dataSource.createQueryRunner();
  await runner.connect();
  const applied: string[] = [];
  let backup: string | null = null;
  try {
    if (driver === 'postgres') await runner.query('SELECT pg_advisory_lock($1)', [PG_LOCK_KEY]);

    // Read again under the lock: another instance may have just migrated.
    const states = await readStates(dataSource, tracks);
    const pending = states.flatMap((s) => s.pending.map((version) => ({ state: s, version })));
    if (pending.length === 0) {
      log('db:migrate: schema is up to date');
      return { applied, backup };
    }

    if (driver === 'sqlite') backup = await backupSqlite(dataSource, runner, log);

    for (const { state, version } of pending) {
      const file = migrationPath(state.dir, driver, version);
      log(`db:migrate: applying ${state.track} ${version} (${file})`);
      await applyFile(dataSource, runner, driver, readFileSync(file, 'utf8'));

      // Each file records itself; a file that does not would be re-run forever.
      const after = (await readStates(dataSource, tracks)).find((s) => s.track === state.track);
      if (!after?.current || Number(after.current) < Number(version)) {
        throw new Error(
          `${file} ran but did not record '${state.track}' ${version} in schema_migrations — every migration file must insert its own row.`,
        );
      }
      applied.push(`${state.track}/${version}`);
    }
    log(`db:migrate: applied ${applied.length} migration(s): ${applied.join(', ')}`);
    return { applied, backup };
  } finally {
    if (driver === 'postgres') await runner.query('SELECT pg_advisory_unlock($1)', [PG_LOCK_KEY]).catch(() => {});
    await runner.release();
  }
}

async function readStates(dataSource: DataSource, tracks: ReturnType<typeof schemaTracks>): Promise<SchemaTrackState[]> {
  // null = no schema_migrations table: a new database, everything pending.
  return (await readSchemaTracks(dataSource, tracks)) ??
    tracks.map((t) => ({ ...t, current: null, pending: pendingVersions(null, t.version) }));
}

function migrationPath(dir: string, driver: 'sqlite' | 'postgres', version: string): string {
  const folder = join(dir, driver);
  const name = readdirSync(folder).find((f) => f.startsWith(`${version}_`) && f.endsWith('.sql'));
  if (!name) throw new Error(`no ${version}_*.sql in ${folder}`);
  return join(folder, name);
}

/**
 * Runs one whole file. The files contain several statements and their own
 * BEGIN/COMMIT, so they go to the driver's multi-statement entry point:
 * better-sqlite3's `exec`, and Postgres's simple-query protocol (a query with
 * no parameters).
 */
async function applyFile(
  dataSource: DataSource,
  runner: QueryRunner,
  driver: 'sqlite' | 'postgres',
  sql: string,
): Promise<void> {
  try {
    if (driver === 'postgres') {
      await runner.query(sql);
    } else {
      const db = (dataSource.driver as unknown as { databaseConnection: { exec(sql: string): void } })
        .databaseConnection;
      db.exec(sql);
    }
  } catch (error) {
    // Leave the connection usable and the file's transaction undone.
    await runner.query('ROLLBACK').catch(() => {});
    throw error;
  }
}

async function backupSqlite(dataSource: DataSource, runner: QueryRunner, log: (line: string) => void): Promise<string | null> {
  const file = String(dataSource.options.database ?? '');
  if (!file || file === ':memory:' || !existsSync(file) || statSync(file).size === 0) return null;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const target = `${file}.pre-migrate-${stamp}`;
  mkdirSync(dirname(target), { recursive: true });
  await runner.query(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
  log(`db:migrate: backup written to ${target}`);
  return target;
}
