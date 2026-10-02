import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { DataSource } from 'typeorm';
import {
  HELIX_SCHEMA_TRACK,
  HELIX_SCHEMA_VERSION,
  assertSchemaTracks,
  helixMigrationsDir,
  type SchemaTrack,
} from '@helix-x/backend';

/**
 * This app's track in `schema_migrations`, and the newest of its numbered
 * migrations this build expects — the `NNNN` of the latest file in
 * apps/backend/migrations/{sqlite,postgres}/.
 *
 * The database holds two tracks, applied in this order:
 *   helix-x  the framework's tables — files shipped in @helix-x/backend,
 *            version HELIX_SCHEMA_VERSION (bumped by a new tarball)
 *   rawla    this app's tables and configuration — apps/backend/migrations/
 *
 * Bump SCHEMA_VERSION in the same change that adds a migration pair
 * (.claude/rules/database-migrations.md). The app never migrates a database
 * itself, so this check is what turns "someone forgot to apply 0004" into a
 * clear refusal at startup instead of a missing-column error mid-request.
 */
export const SCHEMA_TRACK = 'rawla';
export const SCHEMA_VERSION = '0003';

/** apps/backend — the same two levels up from src/database/ and dist/database/. */
const APP_ROOT = resolve(__dirname, '..', '..');

/**
 * Both tracks, with the folders an operator should type. The image sets
 * MIGRATIONS_DIR=/opt/migrations and carries both there; locally the
 * framework's files are read through the app's own node_modules link, which is
 * a far shorter path than the pnpm store the package resolves to.
 */
export function schemaTracks(env: NodeJS.ProcessEnv = process.env): SchemaTrack[] {
  const base = env.MIGRATIONS_DIR;
  const linked = join(APP_ROOT, 'node_modules', '@helix-x', 'backend', 'migrations');
  return [
    {
      track: HELIX_SCHEMA_TRACK,
      version: HELIX_SCHEMA_VERSION,
      dir: base ? `${base}/helix-x` : existsSync(linked) ? linked : helixMigrationsDir(),
    },
    {
      track: SCHEMA_TRACK,
      version: SCHEMA_VERSION,
      dir: base ? `${base}/rawla` : join(APP_ROOT, 'migrations'),
    },
  ];
}

/** Refuse to serve on a database where either track is behind this build. */
export async function assertSchemaVersion(dataSource: DataSource): Promise<void> {
  try {
    await assertSchemaTracks(dataSource, schemaTracks());
  } catch (error) {
    throw new Error(`${(error as Error).message}\nSee apps/backend/migrations/README.md.`);
  }
}
