#!/usr/bin/env node
/**
 * Sample data for a development database.
 *
 * This drives the **HTTP API**, not SQL, and that is the whole point. Members
 * carry derived state that only the application knows how to produce: bcrypt
 * password hashes, the `is_active` gate arithmetic that a CHECK constraint
 * enforces, allocated `RRA-` member ids, status history, audit rows and the
 * notification log. Rows hand-written with INSERT look right and are wrong —
 * or trip the constraint.
 *
 * The one exception is `life_events`, which has no endpoint yet; those go in
 * through SQL at the end, and they are inert rows with no derived state.
 *
 * It adds SAMPLE DATA ONLY. Everything a working portal needs is owned by the
 * numbered SQL migrations, and this script never writes any of it: users with
 * roles, roles, permissions and grants, portal settings, chapters and the
 * state→chapter map, navigation overrides, and the reference-list values
 * (apps/backend/migrations/, 0001 and 0002). It reads them, and refuses to run
 * against a database the migrations have not set up. One owner per row: if the
 * portal needs something to boot, it goes in a migration, never here.
 *
 * Usage:
 *   node scripts/seed-sample-data.mjs [--reset]
 *
 *   --reset   wipe previously seeded rows first. Without it the script refuses
 *             to run against a database that already has members, rather than
 *             half-applying itself on top.
 *
 * Env: API (default http://localhost:3001/api); ADMIN_EMAIL / ADMIN_PASSWORD, an
 * EXISTING administrator to sign in as (default: 0001's admin@example.com); and
 * the database the backend is using — DB_TYPE=sqlite (default) with DB (default
 * apps/backend/data/helix_x.db), or DB_TYPE=postgres with DATABASE_URL.
 *
 * A database inside a container: set DB_CONTAINER and the script's SQL runs
 * INSIDE that container rather than from the host.
 *   SQLite — the backend's container (Compose: rawla-portal-backend-1); DB is
 *   then a path in it (default /data/helix_x.db):
 *     API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample
 *   PostgreSQL — the database's container (Compose profile: rawla-portal-postgres-1),
 *   with psql there; DATABASE_URL as seen from inside it, or unset to use the
 *   container's own POSTGRES_USER / POSTGRES_DB:
 *     API=http://localhost/api DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1 pnpm seed:sample
 * Never point a host sqlite3 at a bind-mounted file the container has open:
 * Docker Desktop does not carry file locks across the mount, and two writers on
 * one SQLite file corrupt it.
 */
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API ?? 'http://localhost:3001/api';
const DB_CONTAINER = process.env.DB_CONTAINER;
const DB = DB_CONTAINER
  ? process.env.DB ?? '/data/helix_x.db'
  : resolve(ROOT, process.env.DB ?? 'apps/backend/data/helix_x.db');
const POSTGRES = (process.env.DB_TYPE ?? 'sqlite').toLowerCase() === 'postgres';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Password!1';
// Created by the app's 0001_baseline.sql; --reset keeps them.
const BUILT_IN_ADMINS = "'admin@example.com', 'superadmin@example.com'";
const MEMBER_PASSWORD = 'Rawla!Demo1';
const RESET = process.argv.includes('--reset');

const log = (...a) => console.log(...a);
const step = (s) => log(`\n\x1b[1m${s}\x1b[0m`);

/* ── plumbing ────────────────────────────────────────────────────────────── */

async function api(path, { method, body, token, expect } = {}) {
  const verb = method ?? (body === undefined ? 'GET' : 'POST');
  const res = await fetch(API + path, {
    method: verb,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  if (expect && !expect.includes(res.status)) {
    throw new Error(`${verb} ${path} -> ${res.status}: ${text.slice(0, 400)}`);
  }
  return { status: res.status, body: parsed };
}

/**
 * Run SQL against whichever database the backend uses; rows come back as arrays.
 * The few statements here are written to mean the same on both: quoted
 * camelCase columns, `= true`, CURRENT_TIMESTAMP, ids made in JS.
 */
let pgClient;
async function sql(text) {
  if (!POSTGRES) {
    const [cmd, args] = DB_CONTAINER
      ? ['docker', ['exec', '-i', '--user', 'node', DB_CONTAINER, 'sqlite3', '-separator', '\x1f', DB]]
      : ['sqlite3', ['-separator', '\x1f', DB]];
    const out = execFileSync(cmd, args, { input: text, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).map((line) => line.split('\x1f'));
  }
  if (DB_CONTAINER) {
    // psql in the database's container: no published port needed.
    const target = process.env.DATABASE_URL
      ? `psql -q -v ON_ERROR_STOP=1 -At -F "$SEP" "$DATABASE_URL"`
      : `psql -q -v ON_ERROR_STOP=1 -At -F "$SEP" -U "$POSTGRES_USER" -d "$POSTGRES_DB"`;
    const env = ['-e', 'SEP=\x1f', ...(process.env.DATABASE_URL ? ['-e', `DATABASE_URL=${process.env.DATABASE_URL}`] : [])];
    const out = execFileSync('docker', ['exec', '-i', ...env, DB_CONTAINER, 'sh', '-c', target], { input: text, encoding: 'utf8' });
    return out.split('\n').filter(Boolean).map((line) => line.split('\x1f'));
  }
  if (!pgClient) {
    // `pg` is the backend's dependency; resolve it from there.
    const { Client } = createRequire(resolve(ROOT, 'apps/backend/package.json'))('pg');
    pgClient = new Client({ connectionString: process.env.DATABASE_URL });
    await pgClient.connect();
  }
  const res = await pgClient.query({ text, rowMode: 'array' });
  return (Array.isArray(res) ? res.at(-1) : res).rows.map((r) => r.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''))));
}

/**
 * The clear token exists only in the emailed URL — it is hashed at rest, so
 * there is nowhere else to read it from. `MAIL_TRANSPORT=console` captures the
 * message in the dev outbox, which is the supported way to script these flows.
 * The outbox returns newest first.
 */
async function tokenFor(email) {
  const { body: outbox } = await api('/dev/outbox', { expect: [200] });
  const mine = outbox.messages.filter((m) => m.destination === email);
  if (!mine.length) throw new Error(`no outbox message for ${email}`);
  // Submitting sends two messages — "application received" and the
  // verification link — and they can land in the same second, so the newest
  // for an address is not reliably the one carrying a token. Read bodies,
  // newest first, and take the first that actually has one.
  for (const m of mine) {
    const { body: full } = await api(`/dev/outbox/${m.id}`, { expect: [200] });
    const found = /token=([A-Za-z0-9_-]+)/.exec(full.text ?? full.html ?? '');
    if (found) return found[1];
  }
  throw new Error(`no verification link in any message for ${email}`);
}

/** Verify the address and set a password, from the one link issued at submit. */
async function verifyAndSetPassword(email, password) {
  const token = await tokenFor(email);
  const { body: confirmed } = await api('/auth/email-verification/confirm', {
    body: { token },
    expect: [200, 201],
  });
  if (password && confirmed.setupTicket) {
    await api('/auth/credential-setup/confirm', {
      body: { ticket: confirmed.setupTicket, newPassword: password },
      expect: [200, 201],
    });
  }
}

/* ── the data ────────────────────────────────────────────────────────────── */

// Every gotra, thikana, caste and industry below must be a value the
// migrations put in its reference list (0001: caste; 0002: gotra, thikana,
// industry, skill). Those lists are curated, so anything else is refused —
// requireConfiguration() checks before the first write.

let phone = 4155550100;
const nextPhone = () => `+1${String(++phone).padStart(10, '0')}`;

/**
 * `target` is the status each member should end at. Everything before it is
 * driven through the real transitions, so the status history and audit trail
 * read like a real queue rather than a snapshot.
 */
const MEMBERS = [
  { first: 'Vikram',   last: 'Singh',    gender: 'male',   dob: '1985-04-12', state: 'TX', city: 'Austin',      gotra: 'rathore',   thikana: 'jodhpur',     caste: 'rathore',   tier: 'lifetime', industry: 'technology',   target: 'active',
    spouse: { firstName: 'Padmini', lastName: 'Singh', gotra: 'sisodia', thikana: 'udaipur', dateOfBirth: '1988-09-02' },
    children: [
      { firstName: 'Arjun', lastName: 'Singh', gender: 'male',   dateOfBirth: '2012-06-18', sequence: 1, educationLevel: 'Grade 7' },
      { firstName: 'Meera', lastName: 'Singh', gender: 'female', dateOfBirth: '2015-11-30', sequence: 2, educationLevel: 'Grade 4' },
    ] },
  { first: 'Devendra', last: 'Rathore',  gender: 'male',   dob: '1979-01-25', state: 'CA', city: 'San Jose',    gotra: 'kachhwaha', thikana: 'jaipur',      caste: 'chauhan',   tier: 'lifetime', industry: 'technology',   target: 'active',
    spouse: { firstName: 'Kiran', lastName: 'Rathore', gotra: 'bhati', thikana: 'bikaner', dateOfBirth: '1982-03-14' },
    children: [{ firstName: 'Ishaan', lastName: 'Rathore', gender: 'male', dateOfBirth: '2010-02-09', sequence: 1, educationLevel: 'Grade 9' }] },
  { first: 'Anuradha', last: 'Kanwar',   gender: 'female', dob: '1990-07-08', state: 'NY', city: 'Queens',      gotra: 'sisodia',   thikana: 'udaipur',     caste: 'shaktawat', tier: 'annual',   industry: 'finance',      target: 'active' },
  { first: 'Rajendra', last: 'Chauhan',  gender: 'male',   dob: '1972-11-03', state: 'IL', city: 'Naperville',  gotra: 'parmar',    thikana: 'chittorgarh', caste: 'chauhan',   tier: 'lifetime', industry: 'manufacturing', target: 'active' },
  { first: 'Sunita',   last: 'Baisa',    gender: 'female', dob: '1986-02-19', state: 'GA', city: 'Alpharetta',  gotra: 'solanki',   thikana: 'bundi',       caste: 'sengar',    tier: 'annual',   industry: 'healthcare',   target: 'active' },
  { first: 'Mahendra', last: 'Bhati',    gender: 'male',   dob: '1981-05-27', state: 'NJ', city: 'Edison',      gotra: 'bhati',     thikana: 'bikaner',     caste: 'rathore',   tier: 'annual',   industry: 'legal',        target: 'active',
    spouse: { firstName: 'Lakshmi', lastName: 'Bhati', gotra: 'tomar', thikana: 'amber', dateOfBirth: '1984-12-05' } },
  { first: 'Karan',    last: 'Shekhawat',gender: 'male',   dob: '1993-08-14', state: 'WA', city: 'Bellevue',    gotra: 'shekhawat', thikana: 'shekhawati',  caste: 'sengar',    tier: 'annual',   industry: 'technology',   target: 'active' },
  { first: 'Pooja',    last: 'Jadeja',   gender: 'female', dob: '1995-03-06', state: 'FL', city: 'Orlando',     gotra: 'jadeja',    thikana: 'marwar',      caste: 'shaktawat', tier: 'associate', industry: 'hospitality', target: 'active' },

  { first: 'Bhavani',  last: 'Gehlot',   gender: 'female', dob: '1991-10-21', state: 'TX', city: 'Dallas',      gotra: 'gehlot',    thikana: 'mewar',       caste: 'rathore',   tier: 'annual',   industry: 'education',    target: 'approved_awaiting_payment' },
  { first: 'Surendra', last: 'Tomar',    gender: 'male',   dob: '1988-06-30', state: 'MI', city: 'Troy',        gotra: 'tomar',     thikana: 'amber',       caste: 'chauhan',   tier: 'annual',   industry: 'finance',      target: 'approved_awaiting_payment' },
  { first: 'Nirmala',  last: 'Solanki',  gender: 'female', dob: '1983-12-11', state: 'NC', city: 'Cary',        gotra: 'solanki',   thikana: 'bundi',       caste: 'sengar',    tier: 'lifetime', industry: 'healthcare',   target: 'approved_awaiting_payment' },

  { first: 'Ajay',     last: 'Parmar',   gender: 'male',   dob: '1996-09-17', state: 'CA', city: 'Fremont',     gotra: 'parmar',    thikana: 'chittorgarh', caste: 'chauhan',   tier: 'annual',   industry: 'technology',   target: 'pending' },
  { first: 'Rekha',    last: 'Rathore',  gender: 'female', dob: '1992-04-04', state: 'MA', city: 'Waltham',     gotra: 'rathore',   thikana: 'jodhpur',     caste: 'rathore',   tier: 'annual',   industry: 'education',    target: 'pending' },
  { first: 'Gopal',    last: 'Singh',    gender: 'male',   dob: '1975-07-23', state: 'OH', city: 'Dublin',      gotra: 'bhati',     thikana: 'bikaner',     caste: 'sengar',    tier: 'lifetime', industry: 'construction', target: 'pending' },

  { first: 'Harish',   last: 'Kachhwaha',gender: 'male',   dob: '1989-01-09', state: 'TX', city: 'Houston',     gotra: 'kachhwaha', thikana: 'jaipur',      caste: 'chauhan',   tier: 'annual',   industry: 'real_estate',  target: 'in_review' },
  { first: 'Shalini',  last: 'Sisodia',  gender: 'female', dob: '1994-05-15', state: 'NY', city: 'Buffalo',     gotra: 'sisodia',   thikana: 'udaipur',     caste: 'shaktawat', tier: 'annual',   industry: 'retail',       target: 'in_review' },

  { first: 'Prakash',  last: 'Bhati',    gender: 'male',   dob: '1987-02-28', state: 'OR', city: 'Portland',    gotra: 'bhati',     thikana: 'marwar',      caste: 'rathore',   tier: 'annual',   industry: 'technology',   target: 'info_requested' },
  { first: 'Vinod',    last: 'Chauhan',  gender: 'male',   dob: '1984-03-02', state: 'NV', city: 'Las Vegas',   gotra: 'tomar',     thikana: 'amber',       caste: 'chauhan',   tier: 'annual',   industry: 'retail',       target: 'rejected' },
  { first: 'Uma',      last: 'Shekhawat',gender: 'female', dob: '1968-08-08', state: 'PA', city: 'Pittsburgh',  gotra: 'shekhawat', thikana: 'shekhawati',  caste: 'sengar',    tier: 'lifetime', industry: 'education',    target: 'archived' },

  { first: 'Tara',     last: 'Gehlot',   gender: 'female', dob: '1997-11-19', state: 'MN', city: 'Eden Prairie',gotra: 'gehlot',    thikana: 'mewar',       caste: 'rathore',   tier: 'annual',   industry: 'finance',      target: 'pending_email_verification' },
  { first: 'Nakul',    last: 'Jadeja',   gender: 'male',   dob: '1999-06-25', state: 'SC', city: 'Greenville',  gotra: 'jadeja',    thikana: 'marwar',      caste: 'shaktawat', tier: 'associate', industry: 'hospitality', target: 'pending_email_verification' },
];

const emailFor = (m) => `${m.first}.${m.last}`.toLowerCase().replace(/[^a-z.]/g, '') + '@example.test';

/* ── steps ───────────────────────────────────────────────────────────────── */

async function reset() {
  step('Reset — clearing previously seeded rows');
  // `audit_logs` is deliberately NOT in this list. Two BEFORE triggers raise on
  // UPDATE and DELETE, which is the append-only guarantee the audit
  // requirement asks for — a convenience script is the last thing that should
  // be dropping them to get its way. The rows carry no foreign keys, so they
  // survive the members they describe without dangling; that is what an audit
  // log is for.
  //
  // For a genuinely empty database, recreate it instead:
  //   stop the backend, rm apps/backend/data/helix_x.db, apply the framework's
  //   migrations and then this app's (apps/backend/migrations/README.md),
  //   start it, seed.
  //
  // Children before parents. Only sample rows go: everything the migrations
  // own (roles, permissions, settings, chapters, the state map, navigation,
  // reference values and the two 0001 administrators) stays.
  await sql(`
${POSTGRES ? '' : 'PRAGMA foreign_keys = OFF;'}
DELETE FROM verification_token;
DELETE FROM credential_ticket;
DELETE FROM login_lockout;
DELETE FROM notification_log;
DELETE FROM dev_mail_outbox;
DELETE FROM member_status_history;
DELETE FROM member_reference_contacts;
DELETE FROM membership_payments;
DELETE FROM consent_records;
DELETE FROM event_notification_log;
DELETE FROM event_slot_bookings;
DELETE FROM event_waiver_signatures;
DELETE FROM event_payments;
DELETE FROM event_attendees;
DELETE FROM event_registrations;
DELETE FROM event_documents;
DELETE FROM event_donated_goods;
DELETE FROM event_cost_entries;
DELETE FROM event_time_slots;
DELETE FROM event_ticket_types;
DELETE FROM member_certificates;
DELETE FROM events;
DELETE FROM waiver_templates;
DELETE FROM portal_files;
DELETE FROM life_events;
DELETE FROM child_profiles;
DELETE FROM spouse_profiles;
DELETE FROM members;
DELETE FROM households;
DELETE FROM user_roles WHERE user_id NOT IN (SELECT id FROM users WHERE email IN (${BUILT_IN_ADMINS}));
DELETE FROM users WHERE email NOT IN (${BUILT_IN_ADMINS});
${POSTGRES ? '' : 'PRAGMA foreign_keys = ON;'}
`);
  const kept = Number((await sql('SELECT COUNT(*) FROM audit_logs;'))[0][0]);
  log(`  cleared — ${kept} audit rows retained (append-only by design)`);
}

async function signIn() {
  step('Administrator');
  // An administrator the migrations created (0001: admin@example.com). This
  // script never creates accounts or grants roles — that is SQL's job.
  const res = await api('/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  if (res.status !== 200 && res.status !== 201) {
    console.error(`\nCannot sign in as ${ADMIN_EMAIL} (${res.status}). Use an administrator from the migrations:`
      + ` ADMIN_EMAIL=… ADMIN_PASSWORD=… (see apps/backend/migrations/README.md).`);
    process.exit(1);
  }
  const claims = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString());
  log(`  signed in as ${ADMIN_EMAIL} — ${claims.roles.join(', ')} with ${claims.permissions.length} permissions`);
  return res.body.accessToken;
}

/**
 * Read-only: the configuration the sample members depend on must already be
 * there, from the migrations. Checked before the first write, so a database
 * the migrations have not set up is refused whole rather than half-seeded.
 */
async function requireConfiguration(token) {
  step('Configuration (from the migrations)');
  const missing = [];

  const { body: stateMap } = await api('/chapters/state-map', { token, expect: [200] });
  const mapped = new Set(stateMap.map((m) => m.stateCode));
  for (const state of new Set(MEMBERS.map((m) => m.state))) {
    if (!mapped.has(state)) missing.push(`state ${state} has no chapter`);
  }

  const { body: nav } = await api('/navigation/config', { token, expect: [200] });
  if (!nav?.document?.routes?.['rawla.registration.join']) missing.push('navigation override for the join form');

  const { body: lists } = await api('/reference-data', { token, expect: [200] });
  const values = Object.fromEntries(lists.map((l) => [l.key, new Set(l.values.map((v) => v.value))]));
  const need = (key, value) => {
    if (value && !values[key]?.has(value)) missing.push(`${key} value '${value}'`);
  };
  for (const m of MEMBERS) {
    need('gotra', m.gotra); need('thikana', m.thikana); need('caste', m.caste); need('industry', m.industry);
    if (m.spouse) { need('gotra', m.spouse.gotra); need('thikana', m.spouse.thikana); }
  }

  if (missing.length) {
    console.error(`\nConfiguration missing — apply the migrations (apps/backend/migrations/README.md):\n  `
      + [...new Set(missing)].join('\n  '));
    process.exit(1);
  }
  log(`  ${mapped.size} states mapped, navigation override present, reference values present`);
}

async function submitAll() {
  step(`Submitting ${MEMBERS.length} registrations`);
  for (const m of MEMBERS) {
    const email = emailFor(m);
    const { body } = await api('/public/registrations', {
      body: {
        firstName: m.first, lastName: m.last, gender: m.gender, dateOfBirth: m.dob,
        thikana: m.thikana, gotra: m.gotra, caste: m.caste,
        email, phone: nextPhone(),
        addressLine1: `${100 + MEMBERS.indexOf(m)} Rajputana Way`,
        city: m.city, stateCode: m.state, postalCode: '00000',
        membershipTier: m.tier, industry: m.industry,
        acceptCommunityGuidelines: true, acceptPrivacyPolicy: true,
        ...(m.spouse ? { spouse: m.spouse } : {}),
        ...(m.children ? { children: m.children } : {}),
        references: [
          { name: 'Reference One', phone: nextPhone() },
          { name: 'Reference Two', phone: nextPhone() },
        ],
      },
      expect: [200, 201],
    });
    m.id = body.memberId;
    m.email = email;
    log(`  ${(m.first + ' ' + m.last).padEnd(20)} ${m.state}  -> ${body.status}`);
  }
}

async function advanceAll(token) {
  step('Advancing each application through the real transitions');
  for (const m of MEMBERS) {
    if (m.target === 'pending_email_verification') { log(`  ${(m.first + ' ' + m.last).padEnd(20)} pending_email_verification`); continue; }

    // Verified members get a password so they can actually sign in.
    await verifyAndSetPassword(m.email, MEMBER_PASSWORD);
    if (m.target === 'pending') { log(`  ${(m.first + ' ' + m.last).padEnd(20)} pending`); continue; }

    // Opening the application is what moves it to in_review — the same call
    // the reviewer's screen makes.
    await api(`/registrations/${m.id}`, { token, expect: [200] });
    if (m.target === 'in_review') { log(`  ${(m.first + ' ' + m.last).padEnd(20)} in_review`); continue; }

    if (m.target === 'info_requested') {
      await api(`/registrations/${m.id}/request-info`, {
        body: { message: 'Please send a scan of a photo ID and confirm your ancestral thikana.' },
        token, expect: [200, 201],
      });
      log(`  ${(m.first + ' ' + m.last).padEnd(20)} info_requested`);
      continue;
    }
    if (m.target === 'rejected') {
      await api(`/registrations/${m.id}/reject`, {
        body: { reason: 'Neither reference contact could confirm the applicant, and the ancestral thikana could not be corroborated.' },
        token, expect: [200, 201],
      });
      log(`  ${(m.first + ' ' + m.last).padEnd(20)} rejected`);
      continue;
    }

    await api(`/registrations/${m.id}/approve`, { method: 'POST', token, expect: [200, 201] });
    if (m.target === 'approved_awaiting_payment') { log(`  ${(m.first + ' ' + m.last).padEnd(20)} approved_awaiting_payment`); continue; }

    await api(`/registrations/${m.id}/payment-status`, {
      body: { isPaymentMade: true, reason: 'Dues settled by cheque, banked and reconciled.' },
      token, expect: [200, 201],
    });
    if (m.target === 'archived') {
      await api(`/members/${m.id}/archive`, {
        body: { reason: 'Member relocated overseas and asked to be removed from the directory.' },
        token, expect: [200, 201],
      });
      log(`  ${(m.first + ' ' + m.last).padEnd(20)} archived`);
      continue;
    }
    log(`  ${(m.first + ' ' + m.last).padEnd(20)} active`);
  }
}

/**
 * No endpoint exists for these yet, so they go in directly. They are inert
 * rows — no derived state, no constraint — which is why SQL is acceptable here
 * and nowhere else in this script.
 */
async function seedLifeEvents() {
  step('Life events');
  const rows = await sql(
    `SELECT "id", "weddingDate", "dateOfBirth" FROM "members" WHERE "isActive" = true ORDER BY "createdAt" LIMIT 6;`,
  );
  const types = ['birth', 'wedding', 'anniversary'];
  const stmts = rows.map(([id, , dob], i) => {
    const type = types[i % types.length];
    const date = type === 'birth' ? dob : `20${10 + i}-0${(i % 9) + 1}-1${i % 10}`;
    return `INSERT INTO "life_events" ("id", "member_id", "type", "eventDate", "notes", "createdAt", "updatedAt")
            VALUES ('${randomUUID()}', '${id}', '${type}', '${date}',
                    'Sample ${type} recorded by the seed script', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
  });
  if (stmts.length) await sql(stmts.join('\n'));
  log(`  inserted ${stmts.length}`);
}

async function summary() {
  step('Result');
  const table = (rows) => rows.map((r) => r.join('  ')).join('\n');
  log(table(await sql(`SELECT "status", COUNT(*) FROM "members" GROUP BY "status" ORDER BY COUNT(*) DESC;`)));
  log('');
  log(table(await sql(`SELECT c."name", COUNT(m."id") FROM "chapters" c LEFT JOIN "members" m ON m."chapter_id" = c."id"
GROUP BY c."name" ORDER BY c."name";`)));
  log('');
  log(table(await sql(`
SELECT 'members', COUNT(*) FROM "members"
UNION ALL SELECT 'households', COUNT(*) FROM "households"
UNION ALL SELECT 'spouses', COUNT(*) FROM "spouse_profiles"
UNION ALL SELECT 'children', COUNT(*) FROM "child_profiles"
UNION ALL SELECT 'references', COUNT(*) FROM "member_reference_contacts"
UNION ALL SELECT 'life_events', COUNT(*) FROM "life_events"
UNION ALL SELECT 'status_history', COUNT(*) FROM "member_status_history"
UNION ALL SELECT 'audit_logs', COUNT(*) FROM "audit_logs"
UNION ALL SELECT 'chapters', COUNT(*) FROM "chapters"
UNION ALL SELECT 'reference_values', COUNT(*) FROM "reference_list_values"
UNION ALL SELECT 'users', COUNT(*) FROM "users";`)));
  log(`\n  admin      ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  log(`  members    <first>.<last>@example.test / ${MEMBER_PASSWORD}`);
  log(`             (only verified members have a password)`);
}

/* ── main ────────────────────────────────────────────────────────────────── */

const health = await api('/health').catch(() => null);
if (health?.status !== 200) {
  console.error(`The backend is not answering on ${API}. Start it with: pnpm dev:backend`);
  process.exit(1);
}
if (!POSTGRES && !DB_CONTAINER && !existsSync(DB)) {
  console.error(`No database at ${DB}. Apply apps/backend/migrations/sqlite/*.sql to it first (see apps/backend/migrations/README.md).`);
  process.exit(1);
}

const existing = Number((await sql('SELECT COUNT(*) FROM "members";'))[0][0]);
if (existing > 0 && !RESET) {
  console.error(`\n${existing} members already exist. Re-run with --reset to replace the sample data.`);
  process.exit(1);
}

const token = await signIn();
await requireConfiguration(token);
if (RESET) await reset();
await submitAll();
await advanceAll(token);
await seedLifeEvents();
await summary();
await pgClient?.end();
