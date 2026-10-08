# Database migrations

The full guide — local SQLite and PostgreSQL, Docker Compose, Render,
upgrades, sample data, troubleshooting and writing a migration — is
[`docs/setup/database.md`](../../../docs/setup/database.md) (`pnpm guide`, or
`/guide/` in a running portal). This file keeps only what you need at a shell.

## The rules

- The schema is owned by these files. The backend checks `schema_migrations`
  at startup and refuses to start, printing the exact commands, if the
  database is behind — unless `DB_AUTO_MIGRATE=true`, when it first applies
  the pending files itself (see below).
- Two tracks, **always the framework's first**:
  1. `helix-x` — `apps/backend/node_modules/@helix-x/backend/migrations/{sqlite,postgres}/`
  2. `rawla` — this folder, `{sqlite,postgres}/`
- Apply each file once, in order. Each is one transaction that records itself
  first, so re-running one fails immediately and changes nothing.
- **The order matters even when nothing errors.** The app's `0003` only grants
  the `documents:*` permissions that the framework's `0002` creates; applied
  first it grants nothing and still reports success.

## Applying them for you

`pnpm db:migrate` applies every pending file, in order, to the database in
`apps/backend/.env` (or `DB_PATH` / `DB_TYPE` + `DATABASE_URL` set inline), and
does nothing if there is none. Inside the image it is
`node dist/database/migrate-cli.js`. Starting the app with
`DB_AUTO_MIGRATE=true` runs the same step first.

- It runs exactly the files the startup check would list — nothing else.
- **SQLite:** a copy is written to `<DB_PATH>.pre-migrate-<time>` first. That
  is the undo: migrations are forward-only.
- **PostgreSQL:** an advisory lock means two instances starting together
  apply each file once.
- A failing file is rolled back and stops the run; the database stays at the
  last file that completed, and the next run resumes there.

The manual commands below remain the way to apply a file you want to review
or run step by step.

## A new database, by hand

```bash
# SQLite
mkdir -p apps/backend/data
for f in apps/backend/node_modules/@helix-x/backend/migrations/sqlite/*.sql \
         apps/backend/migrations/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail apps/backend/data/helix_x.db < "$f" || break
done

# PostgreSQL
for f in apps/backend/node_modules/@helix-x/backend/migrations/postgres/*.sql \
         apps/backend/migrations/postgres/*.sql; do
  echo "applying $f"; psql -q -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$f" || break
done
```

## An existing database, by hand

Apply only the files it is missing, framework track first, then start the new
build. The startup refusal lists them by name.

## This track's files

| File | Creates |
|---|---|
| `0001_baseline.sql` | The member-domain tables and `audit_logs`; portal settings and reference lists; 13 permissions and 12 roles with every grant; the 5 chapters and the state map; navigation overrides; two administrators |
| `0002_reference_values.sql` | Starter values for gotra, thikana, industry and skill |
| `0003_documents_access.sql` | Who may use private files (grants only; needs the framework's `0002` first) |
| `0004_events_volunteers.sql` | Events and volunteers: 15 tables, `members."eventEmailOptIn"`, 18 permissions with every grant, 5 settings, two reference lists |

## The first-install administrators

Both passwords are published here, so change them at once.

| Account | Password | Roles |
|---|---|---|
| `admin@example.com` | `Password!1` | `admin` |
| `superadmin@example.com` | `ChangeMe!123` | `super_admin`, `admin` |

Granting someone a role from a shell (then they sign out and back in):

```bash
sqlite3 -bail apps/backend/data/helix_x.db "INSERT OR IGNORE INTO user_roles (user_id, role_id)
  SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower('you@example.com') AND r.name = 'super_admin';"
# PostgreSQL: the same INSERT … SELECT with ON CONFLICT DO NOTHING instead of OR IGNORE
```
