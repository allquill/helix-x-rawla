# Production, backups and upgrades

What to check before going live, how the data is kept safe, and how a release is rolled out.

## Production checklist

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` and `OAUTH_JWT_SECRET` set to **different**, long, random
      values. `JWT_SECRET` has a public fallback if forgotten.
- [ ] `MAIL_TRANSPORT` is `gmail` or `smtp`, with credentials, and `MAIL_FROM`
      is a real sender
- [ ] `PAYMENT_PROVIDER=stripe` with `STRIPE_SECRET_KEY`, and the webhook
      endpoint created with its `STRIPE_WEBHOOK_SECRET`
- [ ] `CONTACT_TO_EMAIL` set
- [ ] `DOCUMENTS_SIGNING_SECRET` set to a third long, random value
- [ ] `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` set to the public HTTPS origin
- [ ] `TRUST_PROXY` matches the number of proxies in front of the backend
- [ ] The two first-install administrators from `0001_baseline.sql` (`admin@example.com`, `superadmin@example.com`) have new passwords
- [ ] Images pushed multi-arch with a version tag. The deployment pins that tag.
- [ ] Every numbered migration up to the image's version applied by hand, before the image is deployed
- [ ] Backend runs **one** instance, with `/data` on persistent storage
- [ ] Backups of `helix_x.db` and `/data/documents` scheduled ([Data, migrations and backups](/setup/production.md#data-migrations-and-backups))
- [ ] TLS terminated in front of the frontend
- [ ] Consider building with `VITE_FEATURE_DEVTOOLS=false`
- [ ] An administrator granted ([Running with docker compose](/setup/deploy-docker.md#running-with-docker-compose)), then
      signed out and back in

---

## Data, migrations and backups

- **One file and one folder.** The database is `DB_PATH`
  (`/data/helix_x.db`); uploaded documents are the files under
  `DOCUMENTS_LOCAL_ROOT` (`/data/documents`), unless
  `DOCUMENTS_STORAGE_DRIVER=s3` puts them in a bucket. The database holds
  only their metadata, so back up and restore the two together.
- **Single writer.** SQLite allows one writer at a time, so run **one**
  backend instance. Never scale it horizontally or point two containers at one
  file. On platforms that stop the old instance before starting the new one
  (Render with a disk), each deploy has a few seconds of API downtime.
- **Migrations: numbered SQL, applied by hand, in two tracks.** The
  framework's (`helix-x`: users, roles, OAuth, notifications, navigation)
  ship inside `@helix-x/backend`; this app's (`rawla`) live in
  `apps/backend/migrations/{sqlite,postgres}/NNNN_*.sql`. The image carries
  both, at `/opt/migrations/helix-x/` and `/opt/migrations/rawla/`. **Apply
  the framework's first** — or let the app do it: `DB_AUTO_MIGRATE=true`, or
  `node dist/database/migrate-cli.js` in the container. Otherwise it checks
  `schema_migrations` and refuses to run against a database where either
  track is behind, printing what to apply.
  - SQLite: `sqlite3 -bail <db> < /opt/migrations/<track>/sqlite/NNNN_x.sql`
  - Postgres: `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /opt/migrations/<track>/postgres/NNNN_x.sql`

  A **new database** gets every file of the framework's track, then every
  file of this app's, in order (a `for` loop over `*.sql`; name files in full
  otherwise, because `/bin/sh` doesn't expand a glob in `<`). An **existing**
  database gets only the newer files. A new image whose `@helix-x/backend`
  adds a framework migration will not start until it is applied. On a
  platform where the only shell is inside the backend container, set
  `DB_AUTO_MIGRATE=true`, or start it with `DB_MAINTENANCE=true` and apply
  them from that shell. Every command, per environment, is in
  [Database and migrations](/setup/database.md).
- **Backups.** Copy the file while the backend is stopped, or use SQLite's
  online backup:

  ```bash
  docker compose exec --user node backend node -e "require('better-sqlite3')(process.env.DB_PATH).backup('/data/backup-' + Date.now() + '.db').then(() => console.log('done'))"
  ```

  Under Compose the file is on the host (`docker/portal/docker-volume/data/`).
  On Render, disk snapshots are daily.
- **Restore.** Stop the backend, replace `helix_x.db` (and remove any `-wal`
  or `-shm` beside it), then apply any migrations newer than the backup,
  then start.

---

### PostgreSQL

The backend also runs on PostgreSQL 13+ with `DB_TYPE=postgres` and
`DATABASE_URL`. The same image serves both drivers. SQLite stays the default,
and its schema is unchanged.

- **Migrations:** the `postgres/` folder of each track, the twin of the
  SQLite set with the same numbers, framework's first. Apply them with
  `psql -v ON_ERROR_STOP=1`. Every schema change is a **pair**, and
  `.claude/rules/database-migrations.md` holds the checklist.
- **Compose, bundled service:** set `DB_TYPE=postgres`,
  `COMPOSE_PROFILES=postgres` and
  `DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla` in
  `docker/portal/.env`. Start only the database (`docker compose up -d
  postgres`), apply the migrations through `docker compose exec -T postgres
  psql`, then start the rest. Its port isn't published, so `seed:sample`
  reaches it with `DB_CONTAINER=rawla-portal-postgres-1`.
  [Step by step](/setup/database.md#docker-compose-postgresql).
- **Compose, your own Postgres:** no profile. Set `DB_TYPE=postgres` and
  `DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB` in
  `docker/portal/.env`, migrate it as a
  [local PostgreSQL](/setup/database.md#local-development-postgresql),
  then `pnpm docker:up`.
- **Local or other hosts:** point `DATABASE_URL` at your database. Leave
  `DB_SSL` **empty** for a local server; set `DB_SSL=true` (or `no-verify`)
  only for managed providers. Apply both tracks' `postgres/*.sql`, the
  framework's first, with `psql -v ON_ERROR_STOP=1`.
  The backend won't start on an empty database.
  [Step by step](/setup/database.md#local-development-postgresql).
- **Render:** a Render Postgres database instead of the disk: set
  `DB_TYPE=postgres` and `DATABASE_URL` to its internal connection string on
  the backend, and drop the disk — and with it the single-instance and
  deploy-downtime limits ([Deploying to Render](/setup/deploy-render.md#postgresql-instead-of-the-disk)).
- **Backups:** use `pg_dump` or your provider's snapshots, instead of copying
  a file.

## Upgrading and releases

1. **Framework changed?** Bump whichever of `@helix-x/web`, `@helix-x/backend`
   and `@helix-x/core-sdk` was released to its new version, run `pnpm install`,
   and commit the lockfile.
2. **Docker hosts — publish:** `TAG=<version> pnpm docker:push`.
3. **Point the deployment at it:**
   - Compose: set `BACKEND_TAG` and `FRONTEND_TAG` in `docker/portal/.env`,
     then `docker compose pull && docker compose up -d`.
   - Render builds from the repo: push the commit and it rebuilds
     ([Deploying to Render](/setup/deploy-render.md#upgrading)).
   - Elsewhere: re-run the containers with the new tag.
4. **Migrations:** if the release adds `NNNN_*.sql` files (in
   `apps/backend/migrations/`, or in a new `@helix-x/backend`), apply them
   **before** step 3 — by hand, framework track first, or with
   `DB_AUTO_MIGRATE=true` the new backend does it as it starts. Additive
   changes are safe for the running version.
   [How](/setup/database.md#upgrade-an-existing-database).
   Otherwise the new backend refuses to start and lists what's missing. On
   Render with a disk, apply them in the old instance's Shell, or deploy with
   `DB_MAINTENANCE=true`, apply, and unset it.

**Rolling back:** point back at the previous tag. Migrations are forward-only,
so if a release changed the schema, restore the pre-upgrade backup as well.

---
