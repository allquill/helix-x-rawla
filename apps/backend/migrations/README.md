# Database setup: migrations and sample data

The database is set up **by hand**, in two steps:

1. **Migrations** (numbered SQL files, this folder and the framework's):
   the schema plus everything a working portal needs.
2. **Sample data** (`pnpm seed:sample`, development only): members and
   everything that hangs off them.

The backend **never** creates or changes a table. At startup it checks
`schema_migrations`. If the database is behind this build, it refuses to
start and prints the exact commands to run.

- [How it works](#how-it-works)
- [Set up a database](#set-up-a-database): [local SQLite](#local-development-sqlite-the-default) ·
  [local PostgreSQL](#local-development-postgresql) · [Compose, SQLite](#docker-compose-sqlite-the-default) ·
  [Compose, PostgreSQL](#docker-compose-postgresql) · [Render or any container platform](#render-or-any-container-platform)
- [Add sample data](#add-sample-data)
- [Upgrade an existing database](#upgrade-an-existing-database)
- [Right after the first install](#right-after-the-first-install)
- [Troubleshooting](#troubleshooting)
- [Writing a migration](#writing-a-migration)

## How it works

### Two tracks, applied in order

One `schema_migrations` table records two independent series of files as
`(track, version)`:

| Order | Track | Owns | Files |
|---|---|---|---|
| **1st** | `helix-x` | the framework's tables: users, roles, permissions and their join tables, OAuth, notification log and dev outbox, verification and credential tokens, login lockout, navigation config | shipped **inside `@helix-x/backend`**: `apps/backend/node_modules/@helix-x/backend/migrations/{sqlite,postgres}/`, and `/opt/migrations/helix-x/` in the image |
| **2nd** | `rawla` | this portal's tables, and the access and configuration it needs to run | **this folder**: `apps/backend/migrations/{sqlite,postgres}/`, and `/opt/migrations/rawla/` in the image |

**Always apply the framework's files first.** The app's files reference
framework tables, and the app's `0001` records itself in the
`schema_migrations` table the framework's `0001` creates. Applied the other
way round, it fails on its first statement and changes nothing.

### What each file creates

| File | Creates |
|---|---|
| framework `0001_baseline.sql` | `schema_migrations`, every framework table and index, the four permissions the framework checks (`users:manage`, `roles:manage`, `permissions:manage`, `navigation:manage`) and the `user` role its sign-up assigns |
| app `0001_baseline.sql` | the community-core tables, and `audit_logs` with its append-only triggers · portal settings and the reference lists · the 13 portal permissions and 12 portal roles, with every grant (`super_admin` and `admin` hold all 17) · the 5 chapters and the state→chapter map · the navigation overrides (framework `/register` off, join form at `/register`) · **two administrators** (below) |
| app `0002_reference_values.sql` | 10 starter values each for gotra, thikana, industry and skill, so registration works right after boot. A list with values is *curated*: only listed values are accepted, and administrators maintain them under master data. |

The two administrators, both with published passwords, so change them:

| Account | Password | Roles |
|---|---|---|
| `admin@example.com` | `Password!1` | `admin` |
| `superadmin@example.com` | `ChangeMe!123` | `super_admin`, `admin` |

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

## Set up a database

Every recipe runs **from the repo root**, and every one ends with a database
at the latest version of both tracks.

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
sqlite3 "$DB" "SELECT track, version FROM schema_migrations"   # helix-x 0001, rawla 0001, rawla 0002

pnpm dev:backend        # :3001 — then, optionally, sample data:
pnpm seed:sample
```

This needs the `sqlite3` CLI (preinstalled on macOS). The loop is for a **new**
file. On an existing one it stops at the first file, which is already
applied; see [Upgrade](#upgrade-an-existing-database).

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
[local PostgreSQL](#local-development-postgresql), then `pnpm docker:up`.

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

With a new, empty disk the backend refuses to start, so there's nothing to
open a shell into. Start the container in maintenance mode instead:

1. Set **`DB_MAINTENANCE=true`** and deploy. The container stays up and
   doesn't start the app.
2. Open a shell in it (Render: **rawla-backend → Shell**) and run:

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

## Add sample data

`pnpm seed:sample` (`scripts/seed-sample-data.mjs`) needs a **running
backend** on a **fully migrated** database. It adds 21 members across the
five chapters and all eight statuses, with households, spouses, children,
reference contacts, life events and a real audit trail. Everything goes
through the HTTP API, because members carry derived state (password hashes,
the activation CHECK, `RRA-` ids, status history) that hand-written INSERTs
get wrong.

| Where the database is | Command |
|---|---|
| Local SQLite | `pnpm seed:sample` |
| Local PostgreSQL | `DB_TYPE=postgres DATABASE_URL='postgresql://…' pnpm seed:sample` |
| Compose, SQLite | `API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample` |
| Compose, PostgreSQL | `API=http://localhost/api DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1 pnpm seed:sample` |

- **Refuses to run over existing members.** `-- --reset` replaces them. It
  clears sample rows only, and keeps the migrations' rows and the two
  administrators. `audit_logs` stays, because it's append-only.
- **Refuses an unprepared database.** It first checks the state map,
  navigation and reference values. If any are missing, it stops with
  "Configuration missing — apply the migrations" and writes nothing.
- **Environment:**

  | Variable | Default | Purpose |
  |---|---|---|
  | `API` | `http://localhost:3001/api` | The running backend |
  | `DB_TYPE` | `sqlite` | `postgres` for PostgreSQL |
  | `DB` | `apps/backend/data/helix_x.db` (`/data/helix_x.db` with `DB_CONTAINER`) | SQLite file |
  | `DATABASE_URL` | none | PostgreSQL connection. With `DB_CONTAINER`, as seen from inside that container, or unset to use its `POSTGRES_USER`/`POSTGRES_DB` |
  | `DB_CONTAINER` | none | Run the script's SQL inside this container |
  | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@example.com`, `Password!1` | An **existing** administrator to sign in as. Set these if you changed the password. |

- **Sample sign-ins:** every member is `<first>.<last>@example.test` /
  `Rawla!Demo1`, e.g. `vikram.singh@example.test` (active, with a family),
  `bhavani.gehlot@…` (awaiting dues) and `ajay.parmar@…` (awaiting approval).

## Upgrade an existing database

When a release adds migration files (in this folder, or in a new
`@helix-x/backend`), apply them **before** starting the new build. It refuses
to start until they're applied.

**1. See what's applied**, and compare it with the files in each track:

```bash
sqlite3 apps/backend/data/helix_x.db "SELECT track, max(version) FROM schema_migrations GROUP BY track"
psql "$URL" -Atc "SELECT track, max(version) FROM schema_migrations GROUP BY track"
```

Or just start the new backend: it prints every pending file, in order, as a
ready-to-run command.

**2. Apply each newer file, framework track first, by its full name:**

```bash
sqlite3 -bail apps/backend/data/helix_x.db < apps/backend/migrations/sqlite/0002_reference_values.sql
# inside the container / Render Shell:
sqlite3 -bail /data/helix_x.db < /opt/migrations/rawla/sqlite/0002_reference_values.sql
# PostgreSQL:
psql -q -v ON_ERROR_STOP=1 "$URL" -f apps/backend/migrations/postgres/0002_reference_values.sql
```

Additive changes (new tables, columns, rows) are safe for the running old
version, so apply first, then deploy. A migration that isn't additive says so
in its header, and describes how to stage it.

**Back up first:** copy the SQLite file with the backend stopped, or use
`pg_dump`.

## Right after the first install

1. **Sign in as `admin@example.com` and change both administrators'
   passwords.** They're published in this repository.
2. **Give real people roles** in `/admin/users`, or from a shell:

   ```bash
   sqlite3 -bail apps/backend/data/helix_x.db "INSERT OR IGNORE INTO user_roles (user_id, role_id)
     SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower('you@example.com') AND r.name = 'super_admin';"
   # PostgreSQL: the same INSERT … SELECT with ON CONFLICT DO NOTHING instead of OR IGNORE
   ```

   Then sign out and back in, because roles are baked into the JWT at login.
3. **Set the chapter contact emails** in `/admin/chapters` (they ship empty),
   and extend the reference lists under master data.
4. **Deactivate the two built-in administrators** once real ones exist, if
   you prefer.

## Troubleshooting

| You see | Cause and fix |
|---|---|
| Backend exits with *Database schema is not ready*, listing commands | Pending migrations. Run the listed commands in order, then start again. |
| `no such table: schema_migrations` when applying the app's `0001` | The framework's `0001` isn't applied yet. Apply it first; nothing was changed. |
| `UNIQUE constraint failed: schema_migrations…` / `duplicate key … schema_migrations_pkey` / `table "schema_migrations" already exists` | That file is already applied. Nothing was changed; move on to the next file. |
| pgAdmin / DBeaver: `relation "…" does not exist` or `no schema has been selected to create in`, after running another migration in the same query tab | An older copy of a file that `pg_dump` produced emptied the tab's `search_path` for the whole session. Run `ROLLBACK;` then `SET search_path TO public;` (or open a new query tab) and run the file again. Current files keep that reset local to their own transaction, and app files start with `SET LOCAL search_path TO public;`, so running them back to back in one tab works. |
| `The server does not support SSL connections` | `DB_SSL` is `true` or `no-verify` against a local Postgres. Set `DB_SSL=` (empty). |
| `password authentication failed for user …` | Wrong user or password in `DATABASE_URL`. Check the role name exactly: it's case-sensitive. |
| `SqliteError: disk I/O error`, `integrity_check` shows broken indexes | Something on the host opened the Compose SQLite file while the stack ran. Stop the stack, recreate the file from the migrations, and use the container for access from then on. |
| `seed:sample`: *Configuration missing — apply the migrations* | The database isn't fully migrated. Apply the pending files. |
| `seed:sample`: *N members already exist* | Re-run with `-- --reset`. |
| `seed:sample`: *Cannot sign in as …* | You changed the admin password. Pass `ADMIN_EMAIL` / `ADMIN_PASSWORD`. |

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
