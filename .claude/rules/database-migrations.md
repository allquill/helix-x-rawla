---
paths:
  - "apps/backend/src/modules/**/entities/**"
  - "apps/backend/src/database/**"
  - "apps/backend/migrations/**"
  - "scripts/seed-sample-data.mjs"
---

# Every database change is a pair of numbered SQL migrations

The schema is owned by **plain SQL files, applied by hand**, in two tracks
of one `schema_migrations` table:

- **`helix-x`** — the framework's tables (users, roles, permissions, OAuth,
  notifications, tokens, navigation config). The files ship **inside
  `@helix-x/backend`** and are written in `framework/helix-x-backend`
  (`packages/backend/migrations/`, with its own rule). Applied first.
- **`rawla`** — this app's tables and everything the portal needs:
  `apps/backend/migrations/sqlite/NNNN_*.sql` and
  `apps/backend/migrations/postgres/NNNN_*.sql`. Applied second.

The backend never migrates unless asked — `pnpm db:migrate`, or
`DB_AUTO_MIGRATE=true` at startup, which run exactly the pending files, in
order, through `src/database/migrate.ts`. That is why **every file must insert
its own `schema_migrations` row**: the runner checks after each file and stops
if the version did not move. TypeORM migrations are gone, `synchronize` is
off, and the app **refuses to start** unless both tracks have reached the
version this build needs: `HELIX_SCHEMA_VERSION` from the installed package,
and `SCHEMA_VERSION` in `src/database/schema-version.ts`. The entities
describe the schema but no longer create it.

## 0. Pick the track

| The change | Where it goes |
|---|---|
| A column, index or entity in `framework/helix-x-backend` | **the framework's track**: a migration pair and `HELIX_SCHEMA_VERSION` bump there, then a release and a version bump here. Never a file in this folder. |
| A community-core entity, `audit_logs` | **here** |
| A portal permission, role or grant, even though `roles`/`permissions` are framework tables | **here**, rows keyed by name |
| Chapters, state map, navigation overrides, portal settings, reference lists **and their values**, the first-install accounts | **here** |

The framework's track carries only what the framework's own code uses. A
product's roles, grants, accounts and configuration are always this app's
rows, however framework-owned the table they land in.

So any change to this app's schema, **or** to data the portal ships with
(roles, permissions, grants, portal settings, reference lists), must do
**all** of the following in the same change. A change that skips one works on
the author's machine and fails for the next person who deploys it.

## 1. Write the migration pair

- **Take the next number** (`ls apps/backend/migrations/sqlite`) and create
  **both** files with the same number and name:
  - `migrations/sqlite/0002_add_life_event_venue.sql`
  - `migrations/postgres/0002_add_life_event_venue.sql`
- **Shape of every file:**

  ```sql
  -- 0002_add_life_event_venue.sql — <driver>
  -- What it does and why. Say so here if it is NOT safe for the previous
  -- release to run against (a drop or rename), and how to stage it.
  BEGIN;                                                    -- SQLite: BEGIN TRANSACTION;
  SET LOCAL search_path TO public;                          -- Postgres only
  INSERT INTO schema_migrations (track, version, name) VALUES ('rawla', '0002', 'add_life_event_venue');  -- FIRST
  ALTER TABLE "life_events" ADD COLUMN "venue" text;
  COMMIT;
  ```

  The bookkeeping insert goes **first**, so a second application fails before
  it changes anything.
- **Postgres files are session-neutral.** Operators run them in pgAdmin or
  DBeaver, where one query tab is one session across files. So a file starts
  with `SET LOCAL search_path TO public;` (it must not depend on what ran
  before) and never changes session state beyond its transaction (it must
  not break what runs after). SQL drafted from `pg_dump` carries
  `set_config('search_path', '', false)`: change it to `true`. Check by
  feeding the whole track to **one** `psql` session:
  `cat fw/*.sql app/*.sql | psql -v ON_ERROR_STOP=1 …`.
- **Draft the DDL with TypeORM, then review it.** Point it at a database at
  the **previous** version (both tracks), one per driver:

  ```bash
  DB_PATH=/tmp/at-0001.db pnpm db:schema:log                              # SQLite
  DB_TYPE=postgres DATABASE_URL=postgres://… pnpm db:schema:log           # Postgres
  ```

  It prints the SQL that would make that database match the entities (the
  framework's `HELIX_ENTITIES` and this app's, via `src/database/entities.ts`).
  Copy what belongs to your change. If it shows framework tables, the
  installed `@helix-x/backend` is ahead of the database: apply the framework's pending
  files first rather than copying their DDL here. On SQLite a column change is often a whole
  table rebuild (`CREATE TABLE "temporary_…"`, copy, drop, rename), so keep
  that exact sequence.
- **Seeded data goes in both dialects,** keyed by natural keys (`name`, `key`,
  `(list_id, value)`), never by generated ids:
  - SQLite: `INSERT OR IGNORE`, `lower(hex(randomblob(16)))`, `datetime('now')`
  - Postgres: `ON CONFLICT DO NOTHING`, the column default `gen_random_uuid()`,
    `now()`
- **Never edit a file that has been applied anywhere,** including
  `0001_baseline.sql`. Fix forward with the next number.
- **Only this app's track.** Never record a `helix-x` version or create a
  framework table in this folder.
- **Stay extension-free on Postgres.** `gen_random_uuid()` is core in 13+.
  `CREATE EXTENSION` needs rights that managed providers often withhold.

## 2. Bump `SCHEMA_VERSION`

Set it to the new number in `src/database/schema-version.ts`. That is how a
new image refuses a database nobody migrated. Forget it, and the image boots
and fails later, mid-request, on a missing column.

## 3. Keep the entities portable

One entity serves both drivers:

- **Timestamps:** `type: Date`, never `'datetime'` (absent on Postgres) or
  `'timestamp'` (absent on SQLite).
- **FKs to uuid primary keys:** `type: uuidRef()` (`src/database/db-type.ts`),
  which is `uuid` on Postgres and `text` on SQLite. Integer FKs (`user_id`)
  stay `'integer'`.
- **CHECK constraints and any SQL expression:** a per-driver branch in
  `db-type.ts`, like `memberActiveCheck()`. SQLite booleans are `0`/`1`;
  Postgres rejects `= 0`.
- **No dialect-specific SQL or error text in services:** use
  `isUniqueViolation()`.
- **Register new entities** in `src/database/entities.ts`, or `schema:log`
  cannot see them and silently drafts nothing.
- **Framework entities** (`framework/helix-x-backend`) follow the same rules,
  but their migration pair lives in that repo (`packages/backend/migrations/`,
  checked by its `pnpm db:check`), not here. Change them there, release,
  bump `@helix-x/backend` here, then apply the new framework file to your
  databases.

## 4. Configuration and access ship in migrations; test data never does

**Access and first-install accounts ship in migrations, never in scripts.**
Every permission and role the code checks (backend `@Permissions()`, frontend
`when` gates, role names like `applicant` or `admin`) must exist after
applying both tracks to an empty database, and so must a way to sign in
(this app's `0001` administrators). The framework's track supplies only its
own four `*:manage` permissions and the `user` role; everything else is here. A new permission or role therefore arrives in a
numbered migration pair, with its grants, in the same change as the code that
checks it. Only staff roles (`STAFF_ROLES`) can sign in without a member
record, so a first-install account must hold one.

The same goes for configuration a working portal depends on: the chapters and
state→chapter map (registration routes by state) and the navigation overrides
(framework `/register` disabled, join form at `/register`) are in `0001`. A
change to them is a migration pair too.

**Test data is never in a migration, and configuration is never in the
script.** Every row has exactly one owner:

| Owner | Rows |
|---|---|
| SQL migrations | users with roles, roles, permissions, grants, portal settings, chapters and the state map, navigation overrides, reference lists and their values |
| `pnpm seed:sample` (`scripts/seed-sample-data.mjs`) | sample members and everything hanging off them (households, spouses, children, references, transitions, life events), through the API |

The script only **reads** the SQL-owned rows: `requireConfiguration()` checks
them before its first write and refuses a database the migrations have not
set up. It never creates an account, grants a role or writes configuration.
If the portal needs a row to be usable after boot, it goes in a migration. If
a sample member needs a value the migrations lack, add the value in a
migration, not in the script. It must keep working on top of a fresh
database of either driver with every migration applied.

## 5. Prove it

Every item must pass before the change is done:

- [ ] **SQLite:** apply the framework's files, then `0001…NNNN` here, with
      `sqlite3 -bail` to a new file, then `pnpm db:schema:log` (absolute
      `DB_PATH`) prints **"Your schema is up to date"**
- [ ] **Postgres:** the same on a fresh `postgres:16` with
      `psql -v ON_ERROR_STOP=1`
- [ ] **Re-applying** the new file fails on its `schema_migrations` insert and
      changes nothing
- [ ] **A database at the previous version**, plus only the new file, also
      reaches "up to date". That is the real upgrade path.
- [ ] **End to end:** a backend on a fresh database of each driver boots, and
      `pnpm seed:sample` completes against it. This exercises the app on
      Postgres, not only the schema.
- [ ] `pnpm --filter @helix-x-rawla/backend test` and `pnpm build`

## Applying: the operator's side

This is documented in `apps/backend/migrations/README.md`: `sqlite3 -bail`
or `psql -v ON_ERROR_STOP=1`, framework track first, each in order,
**before** deploying the image that needs them. The image carries both
tracks under `/opt/migrations/{helix-x,rawla}/`.

## Why it works this way

- **SQL files are the source of truth** because they are what an operator
  reviews and runs. A database is changed only by a file someone read.
- **Two tracks because the framework is shared.** Every product built on
  `@helix-x/backend` needs the same framework tables; shipping their
  migrations in the package means a framework change is written once, not
  copied into each product.
- **The pairs exist because TypeORM can't share one history across drivers,**
  and every earlier schema step was dialect-specific (SQLite triggers,
  `INSERT OR IGNORE`, table rebuilds).
- **`schema:log` "up to date" is the check,** because it is the one thing
  that proves the files, the entities and a real database agree. A migration
  that forgot a column shows up there, and nowhere else, until production.
