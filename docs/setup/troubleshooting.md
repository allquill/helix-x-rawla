# Troubleshooting

## Start here

Three causes account for most reports.

### Someone cannot see a screen they should

Roles and permissions are fixed into the session at sign-in. After granting a
role, or after a migration that adds permissions, **sign out and sign back
in**.

### A screen is missing although the migration was applied

If signing out and in does not help, the migration may have been applied **in
the wrong order**. The app's `0003` only *grants* the file permissions; the
framework's `0002` *creates* them. Applied the other way round, every grant
matches nothing and the file still reports success — so `schema_migrations`
says `0003` is applied, and nobody holds `documents:read`.

Check:

```sql
select r.name, count(*) from role_permissions rp
  join roles r on r.id = rp.role_id
  join permissions p on p.id = rp.permission_id
 where p.name like 'documents:%' group by 1;
```

No rows means the grants are missing. Repair it by running just the grant
lines again — they are safe to repeat:

```bash
grep '^INSERT OR IGNORE INTO role_permissions' apps/backend/migrations/sqlite/0003_documents_access.sql \
  | sqlite3 -bail apps/backend/data/helix_x.db
```

Then sign out and back in. Always apply the framework's files first — see
[Database and migrations](/setup/database.md#two-tracks-applied-in-order).

### A change has no effect in the browser

After `pnpm generate:sdk`, or after changing a `VITE_*` flag, **restart the
frontend dev server**. It serves the previous build of the API client from a
cache and does not notice the change.

## Events

| You see | Cause and fix |
|---|---|
| No "New event" button | Only the three Secretaries and `super_admin` can create events; `admin` cannot. See [Roles](/setup/roles.md#two-things-admin-deliberately-cannot-do). |
| "Add at least one ticket before publishing" | Every event needs a ticket; a free event needs one priced at 0. |
| A member is told there is "no ticket" for a child | No active ticket's age band covers that age on the event day. Add or widen a band. |
| No invitation emails after publishing | They go out within about five minutes. Check the Details tab. If nothing is ever sent, no backend instance has `JOBS_ENABLED` on. Registration must also still be open. |
| An invitation shows as "unconfirmed" | The server stopped between claiming and sending it. It is not retried, so that a member is never emailed twice. |
| Every action on an event answers "This event is closed" | It was closed. That is permanent. |
| An Admin cannot open an event's documents | The event is closed: they are now for the Finance and General Secretaries. |
| A registration stays "Awaiting payment" after paying by card | With Stripe, confirmation arrives by webhook. Check `STRIPE_WEBHOOK_SECRET` and that the webhook reaches `/api/payments/stripe/webhook`. |

## Database


| You see | Cause and fix |
|---|---|
| Backend exits with *Database schema is not ready*, listing commands | Pending migrations. Run the listed commands in order, then start again. |
| `no such table: schema_migrations` when applying the app's `0001` | The framework's `0001` isn't applied yet. Apply it first; nothing was changed. |
| `UNIQUE constraint failed: schema_migrations…` / `duplicate key … schema_migrations_pkey` / `table "schema_migrations" already exists` | That file is already applied. Nothing was changed; move on to the next file. |
| pgAdmin / DBeaver: `relation "…" does not exist` or `no schema has been selected to create in`, after running another migration in the same query tab | An older copy of a file that `pg_dump` produced emptied the tab's `search_path` for the whole session. Run `ROLLBACK;` then `SET search_path TO public;` (or open a new query tab) and run the file again. Current files keep that reset local to their own transaction, and app files start with `SET LOCAL search_path TO public;`, so running them back to back in one tab works. |
| `The server does not support SSL connections` | `DB_SSL` is `true` or `no-verify` against a local Postgres. Set `DB_SSL=` (empty). |
| `password authentication failed for user …` | Wrong user or password in `DATABASE_URL`. Check the role name exactly: it's case-sensitive. |
| `SqliteError: disk I/O error`, `integrity_check` shows broken indexes | Something on the host opened the Compose SQLite file while the stack ran. Stop the stack, recreate the file from the migrations, and use the container for access from then on. |
| The Documents section is missing, or `/api/documents` answers 403 | The grants are in app `0003`, and permissions are baked into the JWT at login. Apply it, then sign out and back in. |
| `seed:sample`: *Configuration missing — apply the migrations* | The database isn't fully migrated. Apply the pending files. |
| `seed:sample`: *N members already exist* | Re-run with `-- --reset`. |
| `seed:sample`: *Cannot sign in as …* | You changed the admin password. Pass `ADMIN_EMAIL` / `ADMIN_PASSWORD`. |

## Deployment


| Symptom | Cause and fix |
|---|---|
| `pnpm docker:up` tries to pull `helix-x-rawla-backend:latest` from Docker Hub | The image name was built without registry or tag. Each part (`DOCKER_REGISTRY`, `*_IMAGE`, `*_TAG`) must be set separately in `.env`, and `*_IMAGE` is the repository name only. Check with `docker compose config \| grep image`. |
| The container exits immediately on Render or an x86 server (`exec format error`) | The image is arm64-only (built on Apple Silicon). Republish with `pnpm docker:push`. |
| `Multi-platform build is not supported for the docker driver` | You ran a multi-platform build on the default builder. Use `pnpm docker:push`, which creates `rawla-builder`. |
| Boot fails: `Configuration key "CONTACT_TO_EMAIL" does not exist` (or `OAUTH_JWT_SECRET`) | A required variable is missing ([Backend runtime](/setup/configuration.md#backend-runtime)) |
| Boot fails: `Configuration key "DOCUMENTS_SIGNING_SECRET" does not exist`, or `signingSecret must be at least 32 characters` | Set `DOCUMENTS_SIGNING_SECRET` to a random value of 32 or more characters |
| The Documents section is missing after an upgrade | The `documents:*` grants arrive with migration `0003`, and permissions are baked into the JWT. Sign out and back in. |
| Document previews and downloads fail or point at the wrong host | The links are built on `API_PUBLIC_URL` + `/api`. Set it to the public origin, or set `DOCUMENTS_PUBLIC_BASE_URL`. |
| An upload fails with `413` | The file is over nginx's limit on `/api/documents` (55 MB) or `DOCUMENTS_MAX_FILE_SIZE_MB` |
| Boot fails: `MAIL_TRANSPORT=console` / `PAYMENT_PROVIDER=console is not allowed when NODE_ENV=production` | Configure real mail and Stripe, or use `NODE_ENV=development` for a local stack |
| `unable to open database file` | The data directory is not writable. The entrypoint fixes ownership when it starts as root, so don't override the user (`--user`) or mount the database read-only. |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | Change `FRONTEND_PORT` (or `BACKEND_PORT`) in `.env` |
| A framework change has no effect in the image | The image installs the framework version in the lockfile. Bump `@helix-x/web`, `@helix-x/backend` and `@helix-x/core-sdk` to the new release, run `pnpm install`, then rebuild. |
| `pnpm install` or the image build fails with `401` / `ERR_PNPM_FETCH_401` on `@helix-x/…` | The Nexus credentials are missing or wrong. Check the `.npmrc` at the repo root (see [Prerequisites](/setup/deploy-docker.md#prerequisites)); the image build reads it through `NPMRC`. |
| The image build fails: `secret npmrc: not found` | Build through `pnpm docker:build`, which passes the `.npmrc` as a secret, or add `--secret id=npmrc,src=.npmrc` yourself. |
| CI fails at "Lockfile resolves the framework from the registry" | `pnpm-lock.yaml` was committed from local mode. Run `pnpm fw:registry` and commit the result. |
| `pnpm docker:build` stops with "pnpm-lock.yaml points @helix-x/* at a local checkout", or the image build fails with `ERR_PNPM_OUTDATED_LOCKFILE` | The lockfile was written in local mode (`pnpm fw:local` / `fw:packed`), which the image cannot use. Run `pnpm fw:registry` (the framework version must be on Nexus), then build again. |
| A newly granted role has no effect | Roles are baked into the JWT at login. Sign out and back in. |
| The contact form rate-limits everyone together | `TRUST_PROXY` is unset or too low for the number of proxies |
| The frontend returns 502 on `/api/*` | The backend is down or unreachable. Check `BACKEND_UPSTREAM`, the shared network, and `docker compose logs backend`. |
| Links in emails point at `localhost` | Set `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` to the public origin |
| `compose up` says `env file … .env not found` | `cp .env.example .env` in `docker/portal/` |
| Compose backend ignores your Postgres settings / still uses SQLite | Put `DB_TYPE` and `DATABASE_URL` in `docker/portal/.env` (the only file the stack reads), then `pnpm docker:up` to recreate the container. |
| Compose backend: `ECONNREFUSED 127.0.0.1:5432` / `::1:5432` | `DATABASE_URL` says `localhost`, which inside the container is the container itself. Use `host.docker.internal` for a database on the Docker host. |
| `DATABASE_URL is required when DB_TYPE=postgres` | Set `DATABASE_URL` in `.env`: for Compose's `postgres` profile, `postgres://rawla:rawla@postgres:5432/rawla` |
| Compose backend: `Database schema is not ready … has never been migrated`, although `docker-volume/data/helix_x.db` is migrated, and the printed path is relative (`"data/helix_x.db"`) | `DB_PATH` in `docker/portal/.env` is a relative path, so the database is created inside the container instead of on the `/data` volume, and is lost on every recreate. Delete the line; Compose sets `/data/helix_x.db`. Then `docker compose up -d`. **Don't apply the migrations it lists** — they would go into that throwaway file. |
| Backend exits: `Database schema is not ready` | A numbered migration hasn't been applied. The message lists the exact files and commands, in order ([Database and migrations](/setup/database.md)). With Compose's restart policy it retries until you apply them. |
| `SqliteError: disk I/O error`; `integrity_check` shows broken indexes | Something on the host opened the Compose SQLite file while the stack ran. Stop the stack, recreate the file from the migrations, and access it only through the container from then on. |
| `The server does not support SSL connections` | `DB_SSL=true`/`no-verify` against a server without SSL (e.g. local Postgres). Set `DB_SSL=` (empty). |
| On Postgres: `Data type "datetime" … is not supported` | An entity uses `type: 'datetime'`. Use `type: Date` (see `.claude/rules/database-migrations.md`). |
