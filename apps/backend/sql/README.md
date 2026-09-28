# `sql/` — seeding and inspecting a development database

Everything here operates on the SQLite file at `apps/backend/data/helix_x.db`
(or wherever `DB_PATH` points). None of it runs automatically.

| File | What it is | Safe to run |
| --- | --- | --- |
| [`admin-seed.sql`](admin-seed.sql) | Roles, permissions, grants, and an administrator. Idempotent. | Yes, any time |
| [`admin-inspect.sql`](admin-inspect.sql) | Read-only report on who can do what. | Yes, any time |

The portal's own sample data does *not* live here. It is a Node script,
[`scripts/seed-sample-data.mjs`](../../../scripts/seed-sample-data.mjs), and the
reason is the whole point of this page.

---

## The three layers, in order

A usable development database is built up in three passes. They are not
alternatives — each one depends on the last.

```
1. migrations          schema + the reference data the code reads
2. admin-seed.sql      the `admin` role, and a person holding it
3. seed:sample         members, households, chapters, an audit trail
```

### 1. Migrations — schema, and the data the code cannot run without

```bash
pnpm --filter @helix-x-rawla/backend migration:run
```

`DB_SYNCHRONIZE=false`, so migrations own the schema **locally too**; an entity
alone creates nothing.

`CommunityCoreSeed` is a data migration rather than a script, because the code
reads these values at runtime: the `applicant` role name, `registration.minimum_age`,
the membership tiers and their dues. A deploy that skipped a manual step would
be *broken*, not merely unseeded. It inserts the 13 portal permissions, the ten
portal roles and their grants, nine reference lists, twenty starter values and
ten portal settings — all `INSERT OR IGNORE`, so re-running is harmless.

Four reference lists ship **deliberately empty**: `gotra`, `thikana`, `industry`
and `skill`. `ReferenceDataService` treats an empty list as un-curated and
accepts any value, so the organisation supplies its own vocabulary before anyone
registers. Once a list has one value it is validated, and a submission carrying
anything else is refused.

### 2. `admin-seed.sql` — somebody who can sign in and administer

Register a user first, then point the script at them:

```bash
# edit `.parameter set :admin_email` near the top of the file
sqlite3 apps/backend/data/helix_x.db < apps/backend/sql/admin-seed.sql
```

It inserts 17 permissions (the framework's four, `navigation:manage`, and the 13
portal ones), the roles `super_admin`, `admin`, `navigation_manager` and `user`,
grants them, and assigns `admin` to `:admin_email`.

The portal permissions overlap with the migration above on purpose. The
migration grants them to the *portal* roles; this file creates the `admin` role
itself, which the migration knows nothing about. `INSERT OR IGNORE` makes the
overlap a no-op.

The admin grants are listed one by one rather than `CROSS JOIN`ed, so a domain
permission added later is never handed to every administrator just because it
exists. `super_admin` does get everything, by design.

`:seed_sample_users` is `'yes'` by default and adds five accounts useful for
exercising RBAC — `superadmin@`, `admin@`, `navmanager@`, `user@` and
`inactive@example.com`. Set it to anything else to skip them. They are framework
accounts with no member record, which is why they never appear in the directory.
`admin@example.com` signs in with `Password!1` (the same administrator
`pnpm seed:sample` creates); the other four use `ChangeMe!123`.

> **Then sign out and back in.** Roles and permissions are baked into the JWT at
> login and there is no refresh flow, so a session opened before the grant
> carries none of it. This costs everyone five confused minutes exactly once.

### 3. `pnpm seed:sample` — the portal's sample data

With the backend running:

```bash
pnpm seed:sample              # refuses to run over an existing dataset
pnpm seed:sample -- --reset   # replace it
```

It creates the administrator itself (running `admin-seed.sql` for you), so in
practice step 2 is only a separate command when you are not using this script.

## Why the sample data is a script and not a `.sql` file

**Because members carry state that only the application knows how to produce.**
A row hand-written with `INSERT` either looks right and is wrong, or is rejected
outright:

- `passwordHash` is bcrypt. There is no way to write a working one by hand.
- `isActive` is **derived**, and `CHK_member_active_implies_gates` enforces it on
  every row write. Set it inconsistently with the three gates and SQLite refuses
  the statement.
- `publicMemberId` (`RRA-00001`) is allocated on approval, in sequence.
- `member_status_history`, `audit_logs` and `notification_log` are written by the
  services as side effects of the transitions. Invented rows describe events that
  never happened.
- Verification tokens are stored **hashed**; the clear value exists only in the
  emailed link.

So the seeder drives the **HTTP API** and walks every applicant through the real
transitions — submit, verify, review, approve, take payment, archive. The queue
and the audit log end up reading like a system that has been used, because one
has been.

The single exception is `life_events`, which has no endpoint yet. Those go in
through `sqlite3`, and they are inert rows with no derived state.

## What you get

21 members across five chapters and **all eight statuses**:

| Status | Count | |
| --- | --- | --- |
| `active` | 8 | all three gates closed; three have spouses, two have children |
| `approved_awaiting_payment` | 3 | approved, dues outstanding |
| `pending` | 3 | verified, waiting in the queue |
| `in_review` | 2 | opened by a reviewer |
| `info_requested` | 1 | reviewer asked for more |
| `pending_email_verification` | 2 | submitted, link not followed — invisible to the queue |
| `rejected` | 1 | with a reason |
| `archived` | 1 | was active, then archived |

Plus 21 households, 3 spouses, 3 children, 42 reference contacts, 6 life events,
80 status-history rows, ~162 audit rows, 5 chapters over a 25-state map, and 40
values filling the four lists the migration leaves empty.

### Accounts

| Sign in as | Password | What happens |
| --- | --- | --- |
| `admin@example.com` | `Password!1` | `admin`, all 13 portal permissions |
| `vikram.singh@example.test` | `Rawla!Demo1` | active member, household with spouse and two children |
| `pooja.jadeja@example.test` | `Rawla!Demo1` | active member, associate tier |
| `bhavani.gehlot@example.test` | `Rawla!Demo1` | 403 `PAYMENT_REQUIRED` |
| `ajay.parmar@example.test` | `Rawla!Demo1` | 403 `ACCOUNT_PENDING_APPROVAL` |
| `prakash.bhati@example.test` | `Rawla!Demo1` | 403 `INFO_REQUESTED` |
| `vinod.chauhan@example.test` | `Rawla!Demo1` | 403 `REGISTRATION_REJECTED` |
| `uma.shekhawat@example.test` | `Rawla!Demo1` | 403 `ACCOUNT_ARCHIVED` |

Every other member follows `<first>.<last>@example.test`. The two
`pending_email_verification` members have no password — they never followed the
link, which is the state being demonstrated.

A **wrong** password on any of them returns a bare `INVALID_CREDENTIALS` with no
gate detail. That asymmetry is deliberate: a login endpoint that reported the gate
before checking the password would be an account-enumeration oracle.

### Reading the verification links

`MAIL_TRANSPORT=console`, so mail lands in the dev outbox rather than being sent:

```bash
curl -s localhost:3001/api/dev/outbox | python3 -m json.tool
curl -s localhost:3001/api/dev/outbox/<id> | python3 -m json.tool
```

The list comes back **newest first**, and submitting sends *two* messages in the
same second — "we have received your application" and the verification link — so
pick the one whose body actually contains a `token=`, rather than assuming the
newest is the right one. Password-changed and welcome notices carry no link at
all.

That is the supported way to script a credential flow — the token is hashed at
rest, so the outbox is the only place the clear value appears.

## `--reset` does not clear the audit log

Two `BEFORE` triggers, `audit_logs_no_update` and `audit_logs_no_delete`, raise
on any `UPDATE` or `DELETE`. That is the append-only guarantee the audit
requirement asks for, and a convenience script is the last thing that should be
dropping them to get its way. `--reset` clears the sample rows and reports how
many audit rows it left behind; they carry no foreign keys, so they outlive the
members they describe without dangling.

For a genuinely empty database:

```bash
# stop the backend first — it holds the file open
rm -f apps/backend/data/helix_x.db*
pnpm --filter @helix-x-rawla/backend migration:run
# start the backend, then:
pnpm seed:sample
```

## Inspecting

```bash
sqlite3 apps/backend/data/helix_x.db < apps/backend/sql/admin-inspect.sql
```

Read-only. Reports row counts, every permission, roles with their permissions,
users with their roles, each user's *effective* permissions through those roles,
the raw join tables, who can reach the admin endpoints, and orphan checks.

Useful alongside it:

```sql
-- the gate columns behind every member's status
SELECT publicMemberId, firstName, lastName, status,
       isEmailVerified, isApproved, isPaymentMade, isActive
FROM members ORDER BY createdAt;

-- prove the derived flag agrees with the gates, for every row
SELECT COUNT(*) AS violations
FROM members m JOIN users u ON u.id = m.user_id
WHERE m.isActive <> (CASE WHEN u.isActive = 1 AND m.isEmailVerified = 1
                           AND m.isApproved = 1 AND m.isPaymentMade = 1
                           AND m.status NOT IN ('rejected','archived')
                      THEN 1 ELSE 0 END);
```

## A note on `sample-out.sql`

`helix-x-demo` ships a `sample-out.sql` in this folder and it was copied here
when the repo was scaffolded. **It has been deleted, and should not be copied
back.**

It is a `sqlite3 .dump` of a much older platform database — the newest row in it
is from May 2026 — and it no longer describes this schema. Its `users` table
still carries `resetToken` / `resetTokenExpiresAt`, which the `CredentialFlow`
migration replaced with the `verification_token` and `credential_ticket` tables,
and it has no `credentialEpoch` column. It knows about ten tables; this database
has thirty. It contains none of the portal domain, and it grants `mcp:tools:*`
permissions for an MCP server this repo does not run.

Loading it would not restore anything useful and could not restore a member,
because none of the member tables are in it. Use the three layers above instead.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Every request 403s, admin included | The permission exists but no role holds it — or the session predates the grant. Sign out and back in. |
| `migration:generate` says "No changes in database schema were found" | An entity is missing from `src/database/entities.ts`. The CLI has no module graph and cannot see `forFeature()`. |
| `audit_logs is append-only` | Working as designed. See above. |
| `CHECK constraint failed: CHK_member_active_implies_gates` | Something wrote `isActive` inconsistently with the gates. `MemberActivationService` is the only thing that should touch that column. |
| Seeder reports a 500 on a transition | Check the backend log, not the seeder — it surfaces whatever the API returned. |
| Seeder cannot reach the API | It needs the backend on `:3001`. `API=` and `DB=` override the defaults. |
| `EADDRINUSE` after restarting the backend | An older instance is still bound and holding the old database file. `pkill -f "node dist/main"` is unreliable here; kill by pid: `lsof -ti :3001 \| xargs kill -9`. |
