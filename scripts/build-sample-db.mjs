#!/usr/bin/env node
/**
 * Generate the sample database the backend image bundles.
 *
 *   pnpm build              # the backend's dist/ must be current
 *   pnpm docker:sample-db   # → apps/backend/seed/helix_x.db
 *
 * A fresh database, not a copy of anyone's dev data: migrations run into an
 * empty file, a throwaway backend serves it, and seed-sample-data.mjs fills it
 * through the HTTP API — so bcrypt hashes, activation gates, member ids and the
 * audit trail are the application's own. Transient rows (captured mail, live
 * links, lockouts, OAuth tokens) are then cleared, so nothing clickable ships.
 *
 * The backend runs from a temp working directory with an explicit environment,
 * so a developer's apps/backend/.env (real mail, Stripe keys) is never loaded.
 *
 * Env: SAMPLE_DB_PORT (default 3399), OUT (default apps/backend/seed/helix_x.db).
 */
import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND = join(ROOT, 'apps/backend');
const PORT = process.env.SAMPLE_DB_PORT ?? '3399';
const API = `http://localhost:${PORT}/api`;
const OUT = resolve(ROOT, process.env.OUT ?? 'apps/backend/seed/helix_x.db');

const step = (s) => console.log(`\n\x1b[1m${s}\x1b[0m`);

if (!existsSync(join(BACKEND, 'dist/main.js'))) {
  console.error('apps/backend/dist is missing. Run `pnpm build` first.');
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), 'rawla-sample-db-'));
const db = join(work, 'helix_x.db');

// Everything the backend needs, and nothing from a developer's .env.
const env = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  NODE_ENV: 'development',
  PORT,
  DB_PATH: db,
  DB_SYNCHRONIZE: 'false',
  DB_LOGGING: 'false',
  JWT_SECRET: 'sample-db-build-only',
  OAUTH_JWT_SECRET: 'sample-db-build-only-oauth',
  CONTACT_TO_EMAIL: 'contact@example.org',
  MAIL_TRANSPORT: 'console',
  PAYMENT_PROVIDER: 'console',
  PORTAL_PUBLIC_URL: 'http://localhost:8080',
  API_PUBLIC_URL: 'http://localhost:8080',
};

let server;
const stop = () => {
  if (server && server.exitCode === null) server.kill('SIGTERM');
};
process.on('exit', stop);

try {
  step(`Migrating a fresh database (${db})`);
  execFileSync(
    process.execPath,
    ['node_modules/typeorm/cli.js', '-d', 'dist/database/data-source.js', 'migration:run'],
    { cwd: BACKEND, env, stdio: ['ignore', 'ignore', 'inherit'] },
  );

  step(`Starting a throwaway backend on :${PORT}`);
  // cwd is the temp dir: ConfigModule looks for .env there and finds none.
  server = spawn(process.execPath, [join(BACKEND, 'dist/main.js')], { cwd: work, env, stdio: 'ignore' });
  let up = false;
  for (let i = 0; i < 60 && !up; i++) {
    await new Promise((r) => setTimeout(r, 500));
    up = await fetch(`${API}/health`).then((r) => r.ok, () => false);
    if (server.exitCode !== null) break;
  }
  if (!up) throw new Error(`the backend did not come up on :${PORT} (is the port free?)`);

  step('Seeding sample data through the API');
  execFileSync(process.execPath, [join(ROOT, 'scripts/seed-sample-data.mjs')], {
    cwd: ROOT,
    env: { ...process.env, API, DB: db },
    stdio: 'inherit',
  });

  stop();
  await new Promise((r) => (server.exitCode === null ? server.once('exit', r) : r()));

  step('Clearing transient rows');
  execFileSync('sqlite3', [db], {
    input: `
      DELETE FROM dev_mail_outbox;
      DELETE FROM notification_log;
      DELETE FROM verification_token;
      DELETE FROM credential_ticket;
      DELETE FROM login_lockout;
      DELETE FROM oauth_access_tokens;
      DELETE FROM oauth_refresh_tokens;
      DELETE FROM oauth_authorization_codes;
      DELETE FROM oauth_pending_requests;
      PRAGMA journal_mode = DELETE;
      VACUUM;
    `,
  });

  mkdirSync(dirname(OUT), { recursive: true });
  copyFileSync(db, OUT);
  step(`Wrote ${OUT}`);
  console.log(
    execFileSync('sqlite3', [OUT], {
      input: `.mode list
.separator '  '
SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'migrations', COUNT(*) FROM migrations;`,
      encoding: 'utf8',
    }).trimEnd(),
  );
  console.log('\n  admin  admin@example.com / Password!1');
  console.log('  Rebuild the backend image to bundle it: pnpm docker:build:backend (or docker:push)');
} finally {
  stop();
  rmSync(work, { recursive: true, force: true });
}
