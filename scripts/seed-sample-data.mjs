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
 * through sqlite3 at the end, and they are inert rows with no derived state.
 *
 * Usage:
 *   node scripts/seed-sample-data.mjs [--reset]
 *
 *   --reset   wipe previously seeded rows first. Without it the script refuses
 *             to run against a database that already has members, rather than
 *             half-applying itself on top.
 *
 * Env: API (default http://localhost:3001/api), DB (default
 * apps/backend/data/helix_x.db), ADMIN_EMAIL, ADMIN_PASSWORD.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API = process.env.API ?? 'http://localhost:3001/api';
const DB = resolve(ROOT, process.env.DB ?? 'apps/backend/data/helix_x.db');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@rawla.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Str0ng!Admin1';
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

const sqlite = (sql) => execFileSync('sqlite3', [DB], { input: sql, encoding: 'utf8' });

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

const CHAPTERS = [
  { name: 'Texas',      code: 'TX', contactEmail: 'texas@rawla.test',     states: ['TX', 'OK', 'LA', 'AR', 'NM'] },
  { name: 'East Coast', code: 'EC', contactEmail: 'eastcoast@rawla.test', states: ['NY', 'NJ', 'CT', 'MA', 'PA'] },
  { name: 'West Coast', code: 'WC', contactEmail: 'westcoast@rawla.test', states: ['CA', 'WA', 'OR', 'NV', 'AZ'] },
  { name: 'Midwest',    code: 'MW', contactEmail: 'midwest@rawla.test',   states: ['IL', 'MI', 'OH', 'MN', 'WI'] },
  { name: 'Southeast',  code: 'SE', contactEmail: 'southeast@rawla.test', states: ['GA', 'FL', 'NC', 'SC', 'TN'] },
];

/**
 * Four lists ship empty from the migration on purpose: `ReferenceDataService`
 * treats an empty list as un-curated and accepts anything, so the customer can
 * supply their own vocabulary before anyone registers. Populating them here is
 * what makes the sample members' values *validated* rather than merely
 * accepted — and it means every value below has to come from these lists.
 */
const REFERENCE_VALUES = {
  gotra: ['Rathore', 'Sisodia', 'Kachhwaha', 'Parmar', 'Solanki', 'Tomar', 'Bhati', 'Shekhawat', 'Jadeja', 'Gehlot'],
  thikana: ['Jodhpur', 'Udaipur', 'Jaipur', 'Bikaner', 'Chittorgarh', 'Bundi', 'Shekhawati', 'Amber', 'Mewar', 'Marwar'],
  industry: ['Technology', 'Healthcare', 'Finance', 'Education', 'Manufacturing', 'Legal', 'Real Estate', 'Hospitality', 'Construction', 'Retail'],
  skill: ['Software Engineering', 'Accounting', 'Event Planning', 'Public Speaking', 'Graphic Design', 'Teaching', 'Fundraising', 'Photography', 'Cooking', 'Legal Advice'],
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_');

// NOTE: `caste` is seeded with exactly four values by the migration
// (sengar, shaktawat, rathore, chauhan) and is therefore *curated* — every
// `caste` below must be one of them or the submission is refused.

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
  //   stop the backend, rm apps/backend/data/helix_x.db,
  //   pnpm --filter @helix-x-rawla/backend migration:run, start it, seed.
  //
  // Children before parents. `roles`, `permissions`, `portal_settings` and the
  // migration-seeded reference values are schema, not sample data, and stay.
  sqlite(`
PRAGMA foreign_keys = OFF;
DELETE FROM member_status_history;
DELETE FROM member_reference_contacts;
DELETE FROM membership_payments;
DELETE FROM consent_records;
DELETE FROM life_events;
DELETE FROM child_profiles;
DELETE FROM spouse_profiles;
DELETE FROM members;
DELETE FROM households;
DELETE FROM state_chapter_map;
DELETE FROM chapters;
DELETE FROM reference_list_values
  WHERE list_id IN (SELECT id FROM reference_lists WHERE key IN ('gotra','thikana','industry','skill'));
DELETE FROM user_roles;
DELETE FROM users;
DELETE FROM verification_token;
DELETE FROM credential_ticket;
DELETE FROM login_lockout;
DELETE FROM notification_log;
DELETE FROM dev_mail_outbox;
PRAGMA foreign_keys = ON;
`);
  const kept = Number(sqlite('SELECT COUNT(*) FROM audit_logs;').trim());
  log(`  cleared — ${kept} audit rows retained (append-only by design)`);
}

async function ensureAdmin() {
  step('Administrator');
  const reg = await api('/auth/register', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD, firstName: 'Portal', lastName: 'Administrator' },
  });
  log(reg.status === 201 || reg.status === 200 ? `  registered ${ADMIN_EMAIL}` : `  ${ADMIN_EMAIL} already exists`);

  // The `admin` role and its grants live in admin-seed.sql, not in a migration.
  const sqlPath = resolve(ROOT, 'apps/backend/sql/admin-seed.sql');
  if (!existsSync(sqlPath)) throw new Error(`missing ${sqlPath}`);
  execFileSync('bash', ['-c', `sqlite3 "${DB}" < "${sqlPath}"`], { stdio: 'ignore' });
  log('  applied admin-seed.sql');

  // Log in AFTER the grant: permissions are baked into the JWT at login and
  // there is no refresh flow, so a token minted before it carries none.
  const { body } = await api('/auth/login', {
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    expect: [200, 201],
  });
  const claims = JSON.parse(Buffer.from(body.accessToken.split('.')[1], 'base64url').toString());
  log(`  signed in — ${claims.roles.join(', ')} with ${claims.permissions.length} permissions`);
  return body.accessToken;
}

async function seedChapters(token) {
  step('Chapters and the state map');
  const byCode = {};
  for (const c of CHAPTERS) {
    const { body } = await api('/chapters', {
      body: { name: c.name, code: c.code, contactEmail: c.contactEmail },
      token, expect: [200, 201],
    });
    byCode[c.code] = body.id;
    for (const stateCode of c.states) {
      await api('/chapters/state-map', {
        method: 'PUT', body: { stateCode, chapterId: body.id }, token, expect: [200, 201],
      });
    }
    log(`  ${c.name.padEnd(11)} ${c.states.join(', ')}`);
  }
  return byCode;
}

async function seedReferenceData(token) {
  step('Reference data');
  for (const [key, values] of Object.entries(REFERENCE_VALUES)) {
    let n = 0;
    for (const [i, label] of values.entries()) {
      const res = await api(`/reference-data/${key}/values`, {
        body: { value: slug(label), label, sortOrder: (i + 1) * 10 }, token,
      });
      if (res.status === 200 || res.status === 201) n++;
    }
    log(`  ${key.padEnd(9)} +${n}`);
  }
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
function seedLifeEvents() {
  step('Life events');
  const rows = sqlite(
    `SELECT id, weddingDate, dateOfBirth FROM members WHERE isActive = 1 ORDER BY createdAt LIMIT 6;`,
  ).trim().split('\n').filter(Boolean);
  const types = ['birth', 'wedding', 'anniversary'];
  let n = 0;
  const stmts = rows.map((line, i) => {
    const [id, , dob] = line.split('|');
    const type = types[i % types.length];
    const date = type === 'birth' ? dob : `20${10 + i}-0${(i % 9) + 1}-1${i % 10}`;
    n++;
    return `INSERT INTO life_events (id, member_id, type, eventDate, notes, createdAt, updatedAt)
            VALUES (lower(hex(randomblob(16))), '${id}', '${type}', '${date}',
                    'Sample ${type} recorded by the seed script', datetime('now'), datetime('now'));`;
  });
  if (stmts.length) sqlite(stmts.join('\n'));
  log(`  inserted ${n}`);
}

function summary() {
  step('Result');
  log(sqlite(`
.mode list
.separator '  '
SELECT status, COUNT(*) FROM members GROUP BY status ORDER BY COUNT(*) DESC;
`).trimEnd());
  log('');
  log(sqlite(`
.mode list
.separator '  '
SELECT c.name, COUNT(m.id) FROM chapters c LEFT JOIN members m ON m.chapter_id = c.id
GROUP BY c.name ORDER BY c.name;
`).trimEnd());
  log('');
  const counts = sqlite(`
.mode list
.separator '  '
SELECT 'members', COUNT(*) FROM members
UNION ALL SELECT 'households', COUNT(*) FROM households
UNION ALL SELECT 'spouses', COUNT(*) FROM spouse_profiles
UNION ALL SELECT 'children', COUNT(*) FROM child_profiles
UNION ALL SELECT 'references', COUNT(*) FROM member_reference_contacts
UNION ALL SELECT 'life_events', COUNT(*) FROM life_events
UNION ALL SELECT 'status_history', COUNT(*) FROM member_status_history
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs
UNION ALL SELECT 'chapters', COUNT(*) FROM chapters
UNION ALL SELECT 'reference_values', COUNT(*) FROM reference_list_values
UNION ALL SELECT 'users', COUNT(*) FROM users;
`).trimEnd();
  log(counts);
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
if (!existsSync(DB)) {
  console.error(`No database at ${DB}. Run: pnpm --filter @helix-x-rawla/backend migration:run`);
  process.exit(1);
}

const existing = Number(sqlite('SELECT COUNT(*) FROM members;').trim());
if (existing > 0 && !RESET) {
  console.error(`\n${existing} members already exist. Re-run with --reset to replace the sample data.`);
  process.exit(1);
}
if (RESET) await reset();

const token = await ensureAdmin();
await seedChapters(token);
await seedReferenceData(token);
await submitAll();
await advanceAll(token);
seedLifeEvents();
summary();
