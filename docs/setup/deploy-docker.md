# Deploying with Docker

How the two images are built, published and run — with Docker Compose or on any other Docker host. For the database see [Database and migrations](/setup/database.md); for every setting see [Configuration](/setup/configuration.md).

## Overview

```
browser ──▶ frontend  (nginx: the built app + a same-origin /api proxy)   :80 or $PORT
                │  /api/*   private network
                ▼
            backend   (NestJS API)                                        :3001
                │
                ▼
            /data/helix_x.db   (SQLite on a volume, host folder or disk)
            — or PostgreSQL, with DB_TYPE=postgres (see Production)
```

The portal ships as **two images**:

| Image | Contains | Listens on |
|---|---|---|
| `helix-x-rawla-backend` | The compiled API, production `node_modules`, both tracks of numbered SQL migrations (`/opt/migrations/{helix-x,rawla}`, applied by hand), and the `sqlite3` CLI | `3001` |
| `helix-x-rawla-frontend` | The Vite production bundle, served by nginx, which also proxies `/api` to the backend | `$PORT` (default `80`) |

The browser only ever talks to the frontend. The bundle calls `/api` on its own
origin, so there is no CORS and no backend URL baked into the JavaScript. The
backend never needs to be public.

**Where to find what**

| Path | What |
|---|---|
| `apps/backend/Dockerfile`, `apps/backend/Dockerfile.dockerignore`, `apps/backend/docker-entrypoint.sh` | Backend image |
| `apps/frontend/Dockerfile`, `apps/frontend/Dockerfile.dockerignore`, `apps/frontend/nginx/` | Frontend image and nginx config |
| `docker/portal/` | Docker Compose stack: `docker-compose.yml`, and `.env.example`, the single settings template |
| `render.yaml`, `docs/setup/deploy-render.md` | Render Blueprint and step-by-step guide |
| `scripts/seed-sample-data.mjs` | Fills a dev database with test data through the API (`pnpm seed:sample`) |

---

## Prerequisites

- **Docker 24+ with buildx.** Docker Desktop includes both. Multi-arch
  publishing uses a `docker-container` builder, which is created automatically
  (see [Multi arch publishing](/setup/deploy-docker.md#multi-arch-publishing)).
- **Node 22 and pnpm 9.12.0.** These are needed for `pnpm build` and
  `pnpm seed:sample`. The image builds install their own toolchains.
- **`sqlite3` CLI** (preinstalled on macOS) to apply migrations to a SQLite
  file from the host, or **`psql`** for PostgreSQL. Neither is needed if you
  run them inside a container: the backend image ships `sqlite3`, and every
  Postgres image ships `psql`.
- **Access to the Nexus npm registry.** The framework (`@helix-x/web`,
  `@helix-x/backend`, `@helix-x/core-sdk`) is installed from
  `packages.allquill.com` like any other dependency, so the image build needs
  credentials. The repo's `.npmrc` names the registry and goes into the build;
  the credential lives in your `~/.npmrc` (see [Install and run](/setup/install.md)):

  ```bash
  NPM_TOKEN=$(printf 'user:password' | base64) pnpm registry:login
  ```

  `pnpm docker:build` hands `~/.npmrc` to the build as a BuildKit secret, which
  is mounted only while dependencies install. It never ends up in an image
  layer. To use a different file, set `NPMRC=/path/to/npmrc`.
- **Image registry access** when you publish or pull:
  `docker login docker.allquill.com`.

Everything else comes from this repository: it is the whole build context,
and no other checkout needs to exist.

---

## The images

### Backend (`apps/backend/Dockerfile`)

It is a multi-stage build on `node:22-bookworm-slim`. Glibc is used because the
native modules `bcrypt` and `better-sqlite3` ship glibc prebuilds.

| Stage | Does |
|---|---|
| `base` | Adds a toolchain (`python3 make g++`) for native-module fallbacks, and enables corepack (`COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, so the pinned pnpm installs unattended) |
| `manifests` | Copies the lockfile, `.pnpmfile.cjs` and every workspace `package.json` |
| `build` | Runs `pnpm install --frozen-lockfile` (registry credentials from the `npmrc` secret), then `nest build` |
| `prod-deps` | Installs production dependencies only |
| `runtime` | Copies `dist`, production `node_modules`, the entrypoint and both migration tracks: this app's to `/opt/migrations/rawla`, the framework's (from the installed `@helix-x/backend`) to `/opt/migrations/helix-x` |

**Entrypoint order** (`docker-entrypoint.sh`):

1. **As root:** create the directory of `DB_PATH` and `chown` it to `node`.
   A platform disk, a Linux bind mount or a Kubernetes volume can arrive
   root-owned.
2. **Drop to `node`** with `setpriv`. The application never runs as root.
3. **Maintenance, if asked:** with `DB_MAINTENANCE=true`, stop here and idle,
   so a shell can be opened to apply migrations ([Data, migrations and backups](/setup/production.md#data-migrations-and-backups)).
4. **Start:** `exec node dist/main`. It migrates only with
   `DB_AUTO_MIGRATE=true`, applying the pending files first. Before serving,
   the app checks `schema_migrations` against the versions this build needs,
   for the framework's track and this app's. If the database is behind, it
   exits and prints the exact migration files and commands to run, in order.

`/data` is a declared volume. A `HEALTHCHECK` polls `/api/health`, and Compose
uses it to start the frontend only after the backend is ready.

### Frontend (`apps/frontend/Dockerfile`)

- **Build stage:**
  - Installs dependencies from the lockfile, the framework included
    (registry credentials from the `npmrc` secret).
  - Builds this repo's `client-sdk`, then runs `vite build` in production
    mode. The framework's Tailwind classes come from the theme it imports
    from `@helix-x/web`.
- **Runtime:** `nginx:1.27-alpine`, which provides:
  - `listen ${PORT}` (default 80)
  - an SPA fallback, so `/join` and `/members/me` serve `index.html`
  - immutable one-year caching on `/assets/`, and `no-cache` on `index.html`
  - gzip
  - `/api/` proxied to `BACKEND_UPSTREAM`, forwarding `X-Forwarded-For`
- **The upstream is resolved per request,** so nginx starts even before the
  backend's hostname exists. A `BACKEND_UPSTREAM` without a scheme (a bare
  `host:port`) gets `http://` added by `nginx/15-backend-upstream.envsh`.

### Build context and ignore files

Both builds use this repo's root as the context. Rather than one shared
`.dockerignore` there, BuildKit reads **`<Dockerfile>.dockerignore` next to
each Dockerfile**, so each image keeps its own list:
`apps/backend/Dockerfile.dockerignore` and
`apps/frontend/Dockerfile.dockerignore`.

Both are **allow-lists**: they ignore `*`, then re-include only what that
image needs. Local `.env` files, the registry credentials, `data/`,
`node_modules` and `dist` never enter a build. The only env file in the frontend image is the committed
`.env.production`, which holds public `VITE_*` values only.

---

## Building and publishing

### Scripts

All run from this repo's root:

| Command | Does |
|---|---|
| `pnpm docker:build` | Builds both images for **this machine's** platform |
| `pnpm docker:build:backend` | Builds `helix-x-rawla-backend:${TAG:-local}` |
| `pnpm docker:build:frontend` | Builds `helix-x-rawla-frontend:${TAG:-local}` |
| `pnpm docker:push` | Builds **multi-arch** (amd64 + arm64) and pushes both to the registry |
| `pnpm docker:push:backend` | Builds and pushes `${DOCKER_REGISTRY:-docker.allquill.com}/helix-x-rawla-backend:${TAG:-local}` |
| `pnpm docker:push:frontend` | The same for the frontend |
| `pnpm docker:builder` | Creates the `rawla-builder` buildx builder if it is missing. The push scripts call it. |
| `pnpm docker:up` / `docker:down` / `docker:logs` | Runs the Compose stack in `docker/portal/` ([Running with docker compose](/setup/deploy-docker.md#running-with-docker-compose)) |

Build variables are listed in [Build and publish variables](/setup/configuration.md#build-and-publish-variables).
Examples:

```bash
TAG=0.2.0 pnpm docker:build:backend
TAG=0.2.0 pnpm docker:push
DOCKER_PLATFORMS=linux/amd64 TAG=0.2.0 pnpm docker:push:backend   # one platform only
pnpm docker:build:frontend --no-cache                              # extra flags pass through
```

### Local builds versus published images

`docker:build` tags images **without a registry**
(`helix-x-rawla-backend:local`). Compose uses them when `DOCKER_REGISTRY` is
empty. `docker:push` builds and pushes **directly to the registry**, without
loading anything into your local image list.

### Multi-arch publishing

Servers and Render run `linux/amd64`. An image built on an Apple Silicon Mac
with `docker:build` is `linux/arm64` only, and **an amd64 host cannot start
it**. `docker:push` therefore builds both platforms into one tag.

Docker Desktop's default builder cannot build more than one platform, so the
push scripts use a `docker-container` builder named `rawla-builder`. It is
created on first use, is idle between pushes, and holds its own build cache.
`docker buildx rm rawla-builder` removes it safely. On a Mac the amd64 half is
emulated and takes a few minutes.

Check a published tag:

```bash
docker buildx imagetools inspect docker.allquill.com/helix-x-rawla-backend:0.1.0 | grep Platform
```

### Release flow

```bash
TAG=0.2.0 pnpm docker:push
```

Then point your deployment at `0.2.0` ([Upgrading and releases](/setup/production.md#upgrading-and-releases)).
Prefer version tags over `local` for anything deployed: a moving tag makes
rollbacks guesswork.

---


## Running with Docker Compose

`docker/portal/` runs both containers on their own network.

```bash
cd docker/portal
cp .env.example .env                    # ONE file: Compose settings + backend config and secrets — edit it
cd ../..
mkdir -p docker/portal/docker-volume/data  # a NEW database: every migration, stack down
for f in apps/backend/node_modules/@helix-x/backend/migrations/sqlite/*.sql \
         apps/backend/migrations/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail docker/portal/docker-volume/data/helix_x.db < "$f" || break
done
pnpm docker:up                          # = docker compose -f docker/portal/docker-compose.yml up -d
API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample   # optional, dev only
```

The backend refuses to start on an unmigrated database, so the migrations come
first. For PostgreSQL (`COMPOSE_PROFILES=postgres`) the steps differ; see
[the guide](/setup/database.md#docker-compose-postgresql).

**One settings file, `docker/portal/.env`** (gitignored), with two jobs:

- **Compose interpolates it:** images, data folder, network and ports
  ([Compose settings](/setup/configuration.md#compose-settings-dockerportalenv)).
- **The backend receives all of it** (`env_file`): app config, secrets and the
  database choice ([Backend runtime](/setup/configuration.md#backend-runtime)).

Compose sets only `TRUST_PROXY=1` (one nginx hop) and `DB_PATH` (default
`/data/helix_x.db`). It never overrides `DB_TYPE` or `DATABASE_URL`, so
whatever `.env` says reaches the backend. A literal `$` in any value is
written `$$`, because Compose interpolates the file.

**Database choice:**

| Database | In `.env` |
|---|---|
| SQLite (default) | `DB_TYPE=sqlite` |
| The bundled `postgres` service | `DB_TYPE=postgres`, `COMPOSE_PROFILES=postgres`, `DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla` |
| Your own Postgres | `DB_TYPE=postgres`, `DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB` (a database on the Docker host) or its real hostname, and `DB_SSL` as the server needs |

Inside the container `localhost` is the container itself, never your machine.

| URL | What |
|---|---|
| `http://localhost:8080` | The portal (`FRONTEND_PORT`) |
| `http://127.0.0.1:3001/docs` | Swagger, direct from the backend (`BACKEND_PORT`, bound to localhost) |
| `http://localhost:8080/api/dev/outbox` | Captured mail when `MAIL_TRANSPORT=console`: verification and reset links |

**Images.** Each image name is `[DOCKER_REGISTRY/]IMAGE:TAG`, with each part
set independently. When `DOCKER_REGISTRY` is set, the first `up` pulls the
images, and `docker compose pull` updates them. When it is empty, Compose uses
your `pnpm docker:build` output.

**Data.** The database lives in a **host folder**,
`${DOCKER_VOLUME_FOLDER}/data/helix_x.db` (default
`docker/portal/docker-volume/data/helix_x.db`, gitignored). **Open it from the
host only with the stack down** (`sqlite3`, a GUI, an editor extension):
file locks don't cross between the host and Docker's VM, and a host reader
corrupts a database the container is writing (`SqliteError: disk I/O error`).
While it runs, use `docker compose exec --user node backend sqlite3 /data/helix_x.db`.
With the stack down you can copy the file to back it up, or delete the folder
to start over (then apply the migrations again).

**Making yourself an administrator.** Join through `/join` and verify your
email, then:

```bash
docker compose exec --user node backend node -e "
const db = require('better-sqlite3')(process.env.DB_PATH);
const r = db.prepare(\"INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower(?) AND r.name = 'super_admin'\").run(process.argv[1]);
console.log(r.changes ? 'granted super_admin to ' + process.argv[1] : 'nothing changed: no such user, or already super_admin');
" you@example.com
```

`--user node` runs it as the app's own user, since a plain `exec` is root in
this image. Sign out and back in afterwards, because roles are baked into the
JWT at login. `super_admin` holds every permission the migrations create.
A fresh install already has two administrators from the migrations:
`admin@example.com` / *(in `0001_baseline.sql`)* and `superadmin@example.com` / *(in `0001_baseline.sql`)*.
The passwords are published, so change both.

**Stopping:**

```bash
docker compose down        # removes the containers; the database folder stays
rm -rf docker-volume       # deletes the database. `down -v` does not: it is a host folder
```

---

## Running on any other Docker host

The same images run anywhere Docker does. Without Compose:

```bash
docker network create rawla-net
docker volume create rawla-data

# a NEW database: apply every migration with the image's own sqlite3 and files
docker run --rm -v rawla-data:/data --entrypoint sh \
  docker.allquill.com/helix-x-rawla-backend:0.1.0 -c \
  'for f in /opt/migrations/helix-x/sqlite/*.sql /opt/migrations/rawla/sqlite/*.sql; do
     echo "applying $f"; sqlite3 -bail /data/helix_x.db < "$f" || break; done'

docker run -d --name backend --network rawla-net \
  -v rawla-data:/data \
  --env-file docker/portal/.env \
  -e TRUST_PROXY=1 \
  docker.allquill.com/helix-x-rawla-backend:0.1.0

docker run -d --name frontend --network rawla-net -p 80:80 \
  -e BACKEND_UPSTREAM=http://backend:3001 \
  docker.allquill.com/helix-x-rawla-frontend:0.1.0
```

- **Put both on one user-defined network,** so `backend` resolves by name.
- **Put TLS in front of the frontend**, with a load balancer or reverse proxy.
  Each extra proxy in front of nginx adds one to `TRUST_PROXY`.
- **Where the platform sets the port,** the frontend listens on `$PORT`.
  This is the Heroku, Cloud Run or Render convention.
- **Run one backend instance only.** SQLite has one writer
  ([Data, migrations and backups](/setup/production.md#data-migrations-and-backups)).
- **Migrate before starting,** as above; the backend refuses an unmigrated
  database. For an upgrade, apply only the newer files in the same way
  ([guide](/setup/database.md#upgrade-an-existing-database)).

---
