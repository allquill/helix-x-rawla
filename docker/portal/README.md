# portal

> Full reference, including every environment variable: [DEPLOY.md](../../DEPLOY.md).

The Rawla backend and frontend images, run together on their own network.

```bash
cd docker/portal
cp .env.example .env                    # ONE file: Compose settings + backend config and secrets
docker compose up -d                    # or `pnpm docker:up` from the repo root
```

| URL | What |
|---|---|
| http://localhost:8080 | The portal. `/api` is proxied to the backend by the frontend's nginx. |
| http://127.0.0.1:3001/docs | Swagger, straight from the backend (published on localhost only). |
| http://localhost:8080/api/dev/outbox | Captured mail — verification and reset links (`MAIL_TRANSPORT=console`). |

By default (`DOCKER_REGISTRY` empty) the stack runs the images you built with
`pnpm docker:build`. To pull published ones instead, set
`DOCKER_REGISTRY=docker.allquill.com` and log in once with
`docker login docker.allquill.com`. The first `up` then pulls them, and
`docker compose pull` fetches updates.

The frontend waits for the backend to report healthy. The backend applies no
migrations itself: it starts only once its database is at the schema version
it needs. See "Data" below.

## One settings file

`.env` is the only file you edit, and it does two jobs:

- **Compose reads it** to fill in `docker-compose.yml`: image names and tags,
  the data folder, the network and the host ports.
- **The backend receives all of it** as its environment: app config and
  secrets (JWT, mail, Stripe) and the database choice (`DB_TYPE`,
  `DATABASE_URL`, `DB_SSL`). It is gitignored.

Every setting is explained in `.env.example`, with more on each backend
setting in `apps/backend/.env.example`. `TRUST_PROXY` is set in
`docker-compose.yml`, because this topology fixes it, and `DB_PATH` defaults
to `/data/helix_x.db` there. Compose interpolates the file, so write a literal
`$` in any value (e.g. a generated secret) as `$$`.

**Database choice**, in `.env` (details in `.env.example`):

| Database | Set |
|---|---|
| SQLite (default) | nothing: `DB_TYPE=sqlite` |
| The bundled `postgres` service | `DB_TYPE=postgres`, `COMPOSE_PROFILES=postgres`, `DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla` |
| Your own Postgres, e.g. one published on your Mac's port 5432 | `DB_TYPE=postgres`, `DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB`, `DB_SSL=` empty for a local server |

`localhost` in `DATABASE_URL` means the backend container itself, so it
never reaches a database on your Mac: use `host.docker.internal`.

## Changing the version or the data folder

```bash
# .env
DOCKER_REGISTRY=docker.allquill.com   # empty → local builds from `pnpm docker:build`
BACKEND_TAG=1.2.0                      # built with: TAG=1.2.0 pnpm docker:build:backend
FRONTEND_TAG=1.2.0
DOCKER_VOLUME_FOLDER=./docker-volume-staging
```

Then `docker compose up -d`, which pulls and recreates only what changed. Each
image is `<DOCKER_REGISTRY>/<*_IMAGE>:<*_TAG>`, and each part is set
independently, so bumping a tag never needs the full image path.

The database is a plain file on the host: `<DOCKER_VOLUME_FOLDER>/data/helix_x.db`.
With the default that is `docker/portal/docker-volume/data/helix_x.db`, which is
gitignored. A new, empty folder needs every migration applied by hand
before the backend will start, **with the stack down**. From the repo root:

```bash
pnpm docker:down
mkdir -p docker/portal/docker-volume/data
for f in apps/backend/node_modules/@helix-x/backend/migrations/sqlite/*.sql \
         apps/backend/migrations/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail docker/portal/docker-volume/data/helix_x.db < "$f" || break
done
pnpm docker:up
```

Pointing at an existing folder reuses its database. After upgrading the
images, apply any new migration files the same way (each by its full name).
The backend refuses to start until you do, and tells you which ones.
PostgreSQL (`COMPOSE_PROFILES=postgres`), upgrades and troubleshooting:
[`apps/backend/migrations/README.md`](../../apps/backend/migrations/README.md#set-up-a-database).

**Never open that file from the host while the stack is running**: not
`sqlite3`, not a GUI, and not an editor extension such as VS Code's SQLite
viewers, especially with auto-reload on. SQLite relies on file locks, and
Docker Desktop does not carry them between the Mac and the VM. A host reader
mistakes the backend's in-progress journal for a crashed one and "rolls it
back", which corrupts the database. The backend then fails with
`SqliteError: disk I/O error` and `PRAGMA integrity_check` reports broken
indexes. Stop the stack first (`pnpm docker:down`), or look from inside the
container, where locking works:

```bash
docker compose exec --user node backend sqlite3 /data/helix_x.db
```

**Sample data**, with the stack running. `DB_CONTAINER` makes the script's
SQL run inside the container, from the repo root:

```bash
API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample
# with the postgres profile:
API=http://localhost/api DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1 pnpm seed:sample
```

## Making yourself an administrator

Join through `/join` and verify your email, then grant yourself `super_admin`,
which holds every permission:

```bash
docker compose exec --user node backend node -e "
const db = require('better-sqlite3')(process.env.DB_PATH);
const r = db.prepare(\"INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower(?) AND r.name = 'super_admin'\").run(process.argv[1]);
console.log(r.changes ? 'granted super_admin to ' + process.argv[1] : 'nothing changed: no such user, or already super_admin');
" you@example.com
```

Sign out and back in, because roles are baked into the JWT at login. A fresh
database already has two administrators from the migrations
(`admin@example.com` / `Password!1`, `superadmin@example.com` /
`ChangeMe!123`). The passwords are published, so change them. See
[DEPLOY.md §6](../../DEPLOY.md#6-running-with-docker-compose).

## Stopping

```bash
docker compose down        # stops and removes the containers; the database file stays
rm -rf docker-volume       # deletes the database (`down -v` does NOT — it is a host folder)
```
