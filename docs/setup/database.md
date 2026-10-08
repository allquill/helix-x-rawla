# Database and migrations

The database is set up **by hand**, from numbered SQL files. The backend never creates or changes a table: at startup it checks which files have been applied and refuses to start, printing the exact commands to run, if the database is behind.

## How it works

### Two tracks, applied in order

One `schema_migrations` table records two independent series of files as
`(track, version)`:

| Order | Track | Owns | Files |
|---|---|---|---|
| **1st** | `helix-x` | the framework's tables: users, roles, permissions and their join tables, OAuth, notification log and dev outbox, verification and credential tokens, login lockout, navigation config, documents with their folders and shares | shipped **inside `@helix-x/backend`**: `apps/backend/node_modules/@helix-x/backend/migrations/{sqlite,postgres}/`, and `/opt/migrations/helix-x/` in the image |
| **2nd** | `rawla` | this portal's tables, and the access and configuration it needs to run | **this folder**: `apps/backend/migrations/{sqlite,postgres}/`, and `/opt/migrations/rawla/` in the image |

**Always apply the framework's files first.** The app's files reference
framework tables, and the app's `0001` records itself in the
`schema_migrations` table the framework's `0001` creates. Applied the other
way round, it fails on its first statement and changes nothing.

### What each file creates

| File | Creates |
|---|---|
| framework `0001_baseline.sql` | `schema_migrations`, every framework table and index, the four permissions the framework checks (`users:manage`, `roles:manage`, `permissions:manage`, `navigation:manage`) and the `user` role its sign-up assigns |
| framework `0002_documents.sql` | `document_folders`, `documents` and `document_shares`, and the four `documents:*` permissions (`read`, `write`, `share`, `manage`), granted to no role |
| app `0001_baseline.sql` | the community-core tables, and `audit_logs` with its append-only triggers · portal settings and the reference lists · the 13 portal permissions and 12 portal roles, with every grant (`super_admin` and `admin` hold all 17) · the 5 chapters and the state→chapter map · the navigation overrides (framework `/register` off, join form at `/register`) · **two administrators** (below) |
| app `0002_reference_values.sql` | 10 starter values each for gotra, thikana, industry and skill, so registration works right after boot. A list with values is *curated*: only listed values are accepted, and administrators maintain them under master data. |
| app `0003_documents_access.sql` | Who may use documents. Grants only: `member` and the eight staff roles hold `documents:read`, `write` and `share`; `admin` and `super_admin` also hold `documents:manage` (list and delete anyone's files, not read them). `youth_member`, `applicant` and `navigation_manager` hold none. Needs the framework's `0002` first. |
| app `0004_events_volunteers.sql` | Events and volunteers: 15 tables (`events` with ticket types, time slots, registrations, attendees, payments, documents, donated goods, costs and the notification log; `waiver_templates` and signatures; `member_certificates`; `portal_files`) and `members."eventEmailOptIn"` · 18 permissions with every grant — `events:create` goes to the three Secretaries and `super_admin`, **not** `admin` · 5 portal settings · the `dietary_preference` and `tshirt_size` reference lists with starting values. Additive. |

The two administrators, both with published passwords, so change them:

| Account | Password | Roles |
|---|---|---|
| `admin@example.com` | *(in `0001_baseline.sql`)* | `admin` |
| `superadmin@example.com` | *(in `0001_baseline.sql`)* | `super_admin`, `admin` |

### One owner per row

| Owner | Rows |
|---|---|
| **SQL migrations** | users with roles, roles, permissions, grants, portal settings, chapters and the state map, navigation overrides, reference lists and their values |
| **`pnpm seed:sample`** | sample members with their households, spouses, children, references, status transitions and life events, created through the API |

The seed script never writes an account, role, grant or configuration. It
checks that they exist and refuses a database the migrations have not set up.

### Rules for applying a file

- **SQLite: `sqlite3 -bail`.** Plain `sqlite3` carries on after an error;
  `-bail` stops at the first one and the file's transaction rolls back.
- **PostgreSQL: `psql -v ON_ERROR_STOP=1`**, for the same reason.
- **Each file is one transaction whose first statement records it.** Applying
  a file twice fails at once and changes nothing, so a mistaken re-run is
  harmless.
- **Name files in full, or use a `for` loop** (as below). `/bin/sh`, the shell
  in the image, does not expand `0002_*.sql` in a `<` redirection. The glob
  sorts `0001`, `0002`, … in order, so a loop applies them in the right order.

## Applying migrations automatically

Two ways, the same code — both run exactly the files the startup check would
list, in order, and do nothing if none is pending:

| | Command |
|---|---|
| Once, from the repo root | `pnpm db:migrate` (reads `apps/backend/.env`; `DB_PATH=…` or `DB_TYPE=postgres DATABASE_URL=…` inline wins) |
| Inside the backend container | `docker exec -u node <container> node dist/database/migrate-cli.js` — **`-u node`**, or the files it creates are root-owned and the app cannot write them |
| On every start | set `DB_AUTO_MIGRATE=true` ([Configuration](/setup/configuration.md#backend-runtime)) — in `docker/portal/.env` for Compose |

- **SQLite:** a copy is written to `<DB_PATH>.pre-migrate-<time>` before the
  first file. That is the undo — migrations are forward-only. Delete old copies
  once you are happy.
- **PostgreSQL:** an advisory lock means instances that start together apply
  each file once; the others wait, then find nothing to do. Back up first
  (`pg_dump`, or your provider's snapshot).
- **A failing file stops the run** and is rolled back; the database stays at
  the last file that completed. Fix the cause and run it again.

Leave `DB_AUTO_MIGRATE` off where you want a person to review each upgrade
first — the app then refuses to start on a database that is behind, as below.

## Set up a database by hand

Every recipe runs **from the repo root**, and every one ends with a database
at the latest version of both tracks. `pnpm db:migrate` does the same in one
step.

### Local development: SQLite (the default)

`apps/backend/.env`: `DB_TYPE=sqlite` (or unset), and `DB_PATH` unset (the
default is `data/helix_x.db`, relative to `apps/backend`).

```bash
FW=apps/backend/node_modules/@helix-x/backend/migrations
APP=apps/backend/migrations
DB=apps/backend/data/helix_x.db

mkdir -p apps/backend/data
for f in $FW/sqlite/*.sql $APP/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail "$DB" < "$f" || break
done
sqlite3 "$DB" "SELECT track, version FROM schema_migrations"   # helix-x 0001-0002, rawla 0001-0003

pnpm dev:backend        # :3001 — then, optionally, sample data:
pnpm seed:sample
```

This needs the `sqlite3` CLI (preinstalled on macOS). The loop is for a **new**
file. On an existing one it stops at the first file, which is already
applied; see [Upgrade](/setup/database.md#upgrade-an-existing-database).

**Start over:** stop the backend,
`rm -f apps/backend/data/helix_x.db apps/backend/data/helix_x.db-journal`, and
run the recipe again.

### Local development: PostgreSQL

**1. Create an empty database** (13 or later), for example `rawla_dev`:

```bash
psql "postgresql://USER:PASSWORD@localhost:5432/postgres" -c 'CREATE DATABASE rawla_dev'
# no psql on the host? run it in the Postgres container:
docker exec -it <postgres-container> psql -U USER -d postgres -c 'CREATE DATABASE rawla_dev'
```

**2. Point the backend at it** in `apps/backend/.env`:

```bash
DB_TYPE=postgres
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/rawla_dev
DB_SSL=                 # EMPTY for a local server (SSL is off). true / no-verify are for managed providers.
```

**3. Apply both tracks:**

```bash
FW=apps/backend/node_modules/@helix-x/backend/migrations
APP=apps/backend/migrations
URL='postgresql://USER:PASSWORD@localhost:5432/rawla_dev'    # single quotes: passwords often hold ! or $

for f in $FW/postgres/*.sql $APP/postgres/*.sql; do
  echo "applying $f"; psql -q -v ON_ERROR_STOP=1 "$URL" -f "$f" || break
done

# no psql on the host: feed each file to psql in the Postgres container
for f in $FW/postgres/*.sql $APP/postgres/*.sql; do
  echo "applying $f"; docker exec -i <postgres-container> psql -q -v ON_ERROR_STOP=1 -U USER -d rawla_dev < "$f" || break
done
```

**4. Start and seed:**

```bash
pnpm dev:backend
DB_TYPE=postgres DATABASE_URL="$URL" pnpm seed:sample
```

### Docker Compose: SQLite (the default)

The database is a plain file on the host:
`docker/portal/docker-volume/data/helix_x.db` (`DOCKER_VOLUME_FOLDER` in
`docker/portal/.env`). The image carries both tracks under `/opt/migrations/`.

> **Never open that file from the host while the stack is running**: not
> `sqlite3`, not a GUI, not an editor extension. File locks don't cross
> between the Mac and Docker's VM, so a host reader corrupts the database
> (`SqliteError: disk I/O error`). Work on it from the host **only with the
> stack down**; while it runs, use the container.

**New database**, with the stack down, applied from the host:

```bash
pnpm docker:down
FW=apps/backend/node_modules/@helix-x/backend/migrations
APP=apps/backend/migrations
DB=docker/portal/docker-volume/data/helix_x.db

mkdir -p docker/portal/docker-volume/data
for f in $FW/sqlite/*.sql $APP/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail "$DB" < "$f" || break
done
pnpm docker:up
```

**Sample data**, with the stack running. Its SQL runs **inside** the backend
container:

```bash
API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample
```

**Look at the data while it runs:**
`docker compose -f docker/portal/docker-compose.yml exec --user node backend sqlite3 /data/helix_x.db`

### Docker Compose: PostgreSQL

`docker/portal/.env` is the stack's only settings file: Compose reads it, and
the backend receives all of it.

**Your own Postgres** (for example a container publishing port 5432 on your
Mac): set `DB_TYPE=postgres` and
`DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB` (not
`localhost`, which inside the backend container is the container itself),
with `DB_SSL=` empty for a local server. Migrate and seed it exactly as in
[local PostgreSQL](/setup/database.md#local-development-postgresql), then `pnpm docker:up`.

**The bundled `postgres` service:** set `DB_TYPE=postgres`,
`COMPOSE_PROFILES=postgres` and
`DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla` (change the
credentials together with `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`).
The data lives in `docker/portal/docker-volume/postgres/`. The database has no
published port, so everything goes through its container:

```bash
cd docker/portal
docker compose up -d postgres            # the database only: the backend would refuse an empty one

FW=../../apps/backend/node_modules/@helix-x/backend/migrations
APP=../../apps/backend/migrations
for f in $FW/postgres/*.sql $APP/postgres/*.sql; do
  echo "applying $f"; docker compose exec -T postgres psql -q -v ON_ERROR_STOP=1 -U rawla -d rawla < "$f" || break
done

docker compose up -d                     # backend and frontend
cd ../..
API=http://localhost/api DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1 pnpm seed:sample
```

### Render, or any container platform

The simplest: set **`DB_AUTO_MIGRATE=true`**, and the backend applies every
migration on its first start and the new ones on each later deploy. On Render
that is all it takes ([Deploying to Render](/setup/deploy-render.md)).

To apply them yourself instead: with a new, empty disk the backend refuses to
start, so there's nothing to open a shell into. Start the container in
maintenance mode:

1. Set **`DB_MAINTENANCE=true`** and deploy. The container stays up and
   doesn't start the app.
2. Open a shell in it and run `node dist/database/migrate-cli.js`, or file by file:

   ```sh
   for f in /opt/migrations/helix-x/sqlite/*.sql /opt/migrations/rawla/sqlite/*.sql; do
     echo "applying $f"; sqlite3 -bail /data/helix_x.db < "$f" || break
   done
   ```

   For a managed PostgreSQL, run the `postgres/` folders with
   `psql -q -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$f"` from any machine
   with psql, using the database's **external** connection string.
3. Set `DB_MAINTENANCE=false` and redeploy.

Never run `seed:sample` against a real deployment.


## Upgrade an existing database

When a release adds migration files (in this folder, or in a new
`@helix-x/backend`), apply them **before** starting the new build — with
`pnpm db:migrate`, by starting it with `DB_AUTO_MIGRATE=true`, or by hand as
below. Otherwise it refuses to start until they're applied.

**1. See what's applied**, and compare it with the files in each track:

```bash
sqlite3 apps/backend/data/helix_x.db "SELECT track, max(version) FROM schema_migrations GROUP BY track"
psql "$URL" -Atc "SELECT track, max(version) FROM schema_migrations GROUP BY track"
```

Or just start the new backend: it prints every pending file, in order, as a
ready-to-run command.

**2. Apply each newer file, framework track first, by its full name:**

```bash
sqlite3 -bail apps/backend/data/helix_x.db < apps/backend/node_modules/@helix-x/backend/migrations/sqlite/0002_documents.sql
sqlite3 -bail apps/backend/data/helix_x.db < apps/backend/migrations/sqlite/0003_documents_access.sql
sqlite3 -bail apps/backend/data/helix_x.db < apps/backend/migrations/sqlite/0004_events_volunteers.sql
# inside the container:
sqlite3 -bail /data/helix_x.db < /opt/migrations/helix-x/sqlite/0002_documents.sql
sqlite3 -bail /data/helix_x.db < /opt/migrations/rawla/sqlite/0003_documents_access.sql
sqlite3 -bail /data/helix_x.db < /opt/migrations/rawla/sqlite/0004_events_volunteers.sql
# PostgreSQL:
psql -q -v ON_ERROR_STOP=1 "$URL" -f apps/backend/node_modules/@helix-x/backend/migrations/postgres/0002_documents.sql
psql -q -v ON_ERROR_STOP=1 "$URL" -f apps/backend/migrations/postgres/0003_documents_access.sql
psql -q -v ON_ERROR_STOP=1 "$URL" -f apps/backend/migrations/postgres/0004_events_volunteers.sql
```

Additive changes (new tables, columns, rows) are safe for the running old
version, so apply first, then deploy. A migration that isn't additive says so
in its header, and describes how to stage it.

**Back up first:** copy the SQLite file with the backend stopped, or use
`pg_dump`.


## Writing a migration

Adding or changing a table, or data the portal ships with, means a new
**pair** here (`sqlite/` and `postgres/`, same number and name, framework
changes excepted), plus a bump of `SCHEMA_VERSION` in
`src/database/schema-version.ts`.

- **Name:** `NNNN_snake_case.sql`, gapless within the track.
- **One transaction.** The **first** statement records the file:
  `INSERT INTO schema_migrations (track, version, name) VALUES ('rawla', 'NNNN', 'name');`
- **Forward-only.** Never edit a file that has been applied anywhere.

The full checklist, including how `pnpm db:schema:log` drafts the DDL and
proves there is no drift, is `.claude/rules/database-migrations.md`. Framework
tables change in `framework/helix-x-backend` (`packages/backend/migrations/`),
never here.
