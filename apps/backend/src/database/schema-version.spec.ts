import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { DataSource } from 'typeorm';
import { describeSchemaProblem, readSchemaTracks } from '@helix-x/backend';
import { assertSchemaVersion, SCHEMA_VERSION, schemaTracks } from './schema-version';

/**
 * The startup check (schema-version.ts, on @helix-x/backend's
 * assertSchemaTracks). Its message is the only guidance an operator gets when
 * a deploy is ahead of its database, so what it tells them to run — and in
 * which order — is pinned here, against real databases built from the files.
 */
describe('schema-version', () => {
  const tracks = schemaTracks({});
  const [framework, app] = tracks;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rawla-schema-'));
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  /** A SQLite file with the given baselines applied, opened as the app would. */
  async function database(files: string[]): Promise<DataSource> {
    const path = join(dir, 'db.sqlite');
    const db = new Database(path);
    for (const f of files) db.exec(readFileSync(f, 'utf8'));
    db.close();
    return new DataSource({ type: 'better-sqlite3', database: path }).initialize();
  }
  const frameworkBaseline = () => join(framework.dir, 'sqlite', '0001_baseline.sql');
  const appBaseline = () => join(app.dir, 'sqlite', '0001_baseline.sql');
  /** Every file of a track, in order — what "fully migrated" means for it. */
  const allOf = (dir: string) =>
    readdirSync(join(dir, 'sqlite'))
      .filter((f) => /^\d{4}_.+\.sql$/.test(f))
      .sort()
      .map((f) => join(dir, 'sqlite', f));

  it('SCHEMA_VERSION is a four-digit migration number', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d{4}$/);
  });

  it('puts the framework track first, and the image folders under MIGRATIONS_DIR', () => {
    expect(tracks.map((t) => t.track)).toEqual(['helix-x', 'rawla']);
    expect(schemaTracks({ MIGRATIONS_DIR: '/opt/migrations' }).map((t) => t.dir)).toEqual([
      '/opt/migrations/helix-x',
      '/opt/migrations/rawla',
    ]);
  });

  it('SCHEMA_VERSION is the newest migration in the folder', () => {
    expect(allOf(app.dir).at(-1)).toContain(`/${SCHEMA_VERSION}_`);
  });

  it('accepts a database with every migration of both tracks applied', async () => {
    const ds = await database([...allOf(framework.dir), ...allOf(app.dir)]);
    await expect(assertSchemaVersion(ds)).resolves.toBeUndefined();
    await ds.destroy();
  });

  it('tells an empty database to apply the framework, then the app, with -bail and real file names', async () => {
    const ds = await database([]);
    const error = await assertSchemaVersion(ds).catch((e: Error) => e);
    await ds.destroy();
    const text = (error as Error).message;
    expect(text).toContain('never been migrated');
    const fw = text.indexOf(`${framework.dir}/sqlite/0001_baseline.sql`);
    const own = text.indexOf(`${app.dir}/sqlite/0001_baseline.sql`);
    expect(fw).toBeGreaterThan(-1);
    expect(own).toBeGreaterThan(fw);
    expect(text).toContain('sqlite3 -bail');
  });

  it('asks only for the app track when the framework is current', async () => {
    const ds = await database([frameworkBaseline()]);
    const states = await readSchemaTracks(ds, tracks);
    await ds.destroy();
    const text = describeSchemaProblem(states, tracks, 'sqlite', 'data/helix_x.db');
    expect(text).toContain(`none of the 'rawla' migrations`);
    expect(text).not.toContain(`${framework.dir}/sqlite`);
    expect(text).toContain(`sqlite3 -bail "data/helix_x.db" < ${app.dir}/sqlite/0001_baseline.sql`);
  });

  it('refuses to apply the app baseline before the framework one', () => {
    const db = new Database(join(dir, 'db.sqlite'));
    expect(() => db.exec(readFileSync(appBaseline(), 'utf8'))).toThrow(/schema_migrations/);
    db.close();
  });

  it('gives a Postgres operator psql with ON_ERROR_STOP', () => {
    const states = tracks.map((t) => ({ ...t, current: '0001', pending: t.track === 'rawla' ? ['9999'] : [] }));
    const text = describeSchemaProblem(states, tracks, 'postgres', '');
    // No 9999 file exists, so the name falls back to a glob.
    expect(text).toContain(`psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f ${app.dir}/postgres/9999_*.sql`);
  });
});
