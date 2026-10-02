# Deploying helix-x-rawla with Docker

This is the complete reference for building, publishing and running the Rawla
portal as containers. It covers local Docker Compose, any other Docker host,
and Render. Every environment variable the application reads is listed in
[§9](#9-environment-reference).

**Contents**

1. [Overview](#1-overview)
2. [Prerequisites](#2-prerequisites)
3. [The images](#3-the-images)
4. [Building and publishing](#4-building-and-publishing)
5. [Database setup and test data](#5-database-setup-and-test-data)
6. [Running with Docker Compose](#6-running-with-docker-compose)
7. [Running on any other Docker host](#7-running-on-any-other-docker-host)
8. [Deploying to Render](#8-deploying-to-render)
9. [Environment reference](#9-environment-reference)
10. [Production checklist](#10-production-checklist)
11. [Data, migrations and backups](#11-data-migrations-and-backups)
12. [Upgrading and releases](#12-upgrading-and-releases)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Overview

```
browser ──▶ frontend  (nginx: the built app + a same-origin /api proxy)   :80 or $PORT
                │  /api/*   private network
                ▼
            backend   (NestJS API)                                        :3001
                │
                ▼
            /data/helix_x.db   (SQLite on a volume, host folder or disk)
            — or PostgreSQL, with DB_TYPE=postgres (§11.1)
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
| `render.yaml`, `docs/deploy-render.md` | Render Blueprint and step-by-step guide |
| `scripts/seed-sample-data.mjs` | Fills a dev database with test data through the API (`pnpm seed:sample`) |

---

## 2. Prerequisites

- **Docker 24+ with buildx.** Docker Desktop includes both. Multi-arch
  publishing uses a `docker-container` builder, which is created automatically
  (see [§4.3](#43-multi-arch-publishing)).
- **Node 22 and pnpm 9.12.0.** These are needed for `pnpm build` and
  `pnpm seed:sample`. The image builds install their own toolchains.
- **`sqlite3` CLI** (preinstalled on macOS) to apply migrations to a SQLite
  file from the host, or **`psql`** for PostgreSQL. Neither is needed if you
  run them inside a container: the backend image ships `sqlite3`, and every
  Postgres image ships `psql`.
- **The workspace layout.** The images are built from the **helix-x workspace
  root**, not from this repository. The apps reach the framework through
  relative paths into sibling checkouts, so this layout must exist:

  ```
  helix-x/
    framework/helix-x-backend    (packed tarballs in .artifacts/)
    framework/helix-x-web        (linked from source)
    framework/helix-x-core-sdk   (built inside the image)
    example/helix-x-rawla        ← this repo; run every command here
  ```

- **Fresh framework tarballs.** The backend image installs `@helix-x/*` from
  `framework/helix-x-backend/.artifacts/*.tgz`. After any change there, run
  `pnpm run pack` in `framework/helix-x-backend`, or the image ships the
  previous framework build. Use `pnpm run pack`, not `pnpm pack`: the built-in
  command shadows the script and repacks nothing.
- **Registry access** when you publish or pull:
  `docker login docker.allquill.com`.

---

## 3. The images

### 3.1 Backend (`apps/backend/Dockerfile`)

It is a multi-stage build on `node:22-bookworm-slim`. Glibc is used because the
native modules `bcrypt` and `better-sqlite3` ship glibc prebuilds.

| Stage | Does |
|---|---|
| `base` | Adds a toolchain (`python3 make g++`) for native-module fallbacks, and enables corepack (`COREPACK_ENABLE_DOWNLOAD_PROMPT=0`, so the pinned pnpm installs unattended) |
| `manifests` | Copies the framework tarballs, the lockfile and every workspace `package.json` |
| `build` | Runs `pnpm install --frozen-lockfile`, then `nest build` |
| `prod-deps` | Installs production dependencies only. The framework tarballs are unpacked here, so the runtime image needs no framework checkout. |
| `runtime` | Copies `dist`, production `node_modules`, the entrypoint and both migration tracks: this app's to `/opt/migrations/rawla`, the framework's (from the installed `@helix-x/backend`) to `/opt/migrations/helix-x` |

**Entrypoint order** (`docker-entrypoint.sh`):

1. **As root:** create the directory of `DB_PATH` and `chown` it to `node`.
   A platform disk, a Linux bind mount or a Kubernetes volume can arrive
   root-owned.
2. **Drop to `node`** with `setpriv`. The application never runs as root.
3. **Maintenance, if asked:** with `DB_MAINTENANCE=true`, stop here and idle,
   so a shell can be opened to apply migrations ([§11](#11-data-migrations-and-backups)).
4. **Start:** `exec node dist/main`. **It never migrates.** Before serving,
   the app checks `schema_migrations` against the versions this build needs,
   for the framework's track and this app's. If the database is behind, it
   exits and prints the exact migration files and commands to run, in order.

`/data` is a declared volume. A `HEALTHCHECK` polls `/api/health`, and Compose
uses it to start the frontend only after the backend is ready.

### 3.2 Frontend (`apps/frontend/Dockerfile`)

- **Build stage:**
  - Installs `framework/helix-x-web`, which has its own pnpm version and
    lockfile. The linked plugins resolve their dependencies, and the design
    system's Tailwind, from there.
  - Builds `@helix-x/core-sdk` and this repo's `client-sdk`, then runs
    `vite build` in production mode.
- **Runtime:** `nginx:1.27-alpine`, which provides:
  - `listen ${PORT}` (default 80)
  - an SPA fallback, so `/join` and `/members/me` serve `index.html`
  - immutable one-year caching on `/assets/`, and `no-cache` on `index.html`
  - gzip
  - `/api/` proxied to `BACKEND_UPSTREAM`, forwarding `X-Forwarded-For`
- **The upstream is resolved per request,** so nginx starts even before the
  backend's hostname exists. A `BACKEND_UPSTREAM` without a scheme (a bare
  `host:port`) gets `http://` added by `nginx/15-backend-upstream.envsh`.

### 3.3 Build context and ignore files

Both builds use the workspace root (`../..`) as the context. A plain
`.dockerignore` would have to sit at that root, outside this repo. BuildKit
instead reads **`<Dockerfile>.dockerignore` next to each Dockerfile**:
`apps/backend/Dockerfile.dockerignore` and
`apps/frontend/Dockerfile.dockerignore`.

Both are **allow-lists**: they ignore `*`, then re-include only what that
image needs. Local `.env` files, `data/`, `node_modules` and `dist` never enter
a build. The only env file in the frontend image is the committed
`.env.production`, which holds public `VITE_*` values only.

---

## 4. Building and publishing

### 4.1 Scripts

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
| `pnpm docker:up` / `docker:down` / `docker:logs` | Runs the Compose stack in `docker/portal/` ([§6](#6-running-with-docker-compose)) |

Build variables are listed in [§9.5](#95-build-and-publish-variables).
Examples:

```bash
TAG=0.2.0 pnpm docker:build:backend
TAG=0.2.0 pnpm docker:push
DOCKER_PLATFORMS=linux/amd64 TAG=0.2.0 pnpm docker:push:backend   # one platform only
pnpm docker:build:frontend --no-cache                              # extra flags pass through
```

### 4.2 Local builds versus published images

`docker:build` tags images **without a registry**
(`helix-x-rawla-backend:local`). Compose uses them when `DOCKER_REGISTRY` is
empty. `docker:push` builds and pushes **directly to the registry**, without
loading anything into your local image list.

### 4.3 Multi-arch publishing

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

### 4.4 Release flow

```bash
(cd ../../framework/helix-x-backend && pnpm run pack)   # if the framework changed
TAG=0.2.0 pnpm docker:push
```

Then point your deployment at `0.2.0` ([§12](#12-upgrading-and-releases)).
Prefer version tags over `local` for anything deployed: a moving tag makes
rollbacks guesswork.

---

## 5. Database setup and test data

**The single guide is [`apps/backend/migrations/README.md`](apps/backend/migrations/README.md):**
creating, migrating and seeding a database by hand, for local SQLite and
PostgreSQL, Docker Compose (either driver), Render, upgrades and
troubleshooting. In short:

1. **Migrations**, applied by hand: the framework's track, then this app's,
   each file in order. They create the schema, and everything a working
   portal needs (see the table below). The backend never migrates, and it
   refuses to start on a database that is behind.
2. **Sample data** (`pnpm seed:sample`), development only: members through
   the API. It never writes what the migrations own.

| Owner | Rows |
|---|---|
| SQL migrations | users with roles, roles, permissions, grants, settings, chapters and the state map, navigation overrides, reference lists and their values |
| `pnpm seed:sample` | sample members, households, spouses, children, references, status transitions, life events |

Nothing in the images or migrations is demo data. The migrations (framework
`0001`, then the app's `0001` and `0002`) give a working, **empty** portal:
schema, access, chapters, navigation, reference-list values and the two
administrators. For a local database with realistic content, fill it through
the API:

```bash
pnpm dev:backend                 # against a migrated dev database
pnpm seed:sample                 # 21 members in every status, households, an audit trail
pnpm seed:sample -- --reset      # replace them
```

It works on either driver (`DB_TYPE=postgres` with `DATABASE_URL`). It adds
sample members only: it reads the chapters, navigation and reference values
the migrations created, refuses a database without them, and never writes
access or configuration. Against a Compose stack, its SQL runs inside a
container: `API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample`
(`DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1` with the postgres
profile). The members sign in with
`<first>.<last>@example.test` / `Rawla!Demo1`. **Never run it against a real
database.**

---

## 6. Running with Docker Compose

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
[the guide](apps/backend/migrations/README.md#docker-compose-postgresql).

**One settings file, `docker/portal/.env`** (gitignored), with two jobs:

- **Compose interpolates it:** images, data folder, network and ports
  ([§9.1](#91-compose-settings-dockerportalenv)).
- **The backend receives all of it** (`env_file`): app config, secrets and the
  database choice ([§9.2](#92-backend-runtime)).

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
`admin@example.com` / `Password!1` and `superadmin@example.com` / `ChangeMe!123`.
The passwords are published, so change both.

**Stopping:**

```bash
docker compose down        # removes the containers; the database folder stays
rm -rf docker-volume       # deletes the database. `down -v` does not: it is a host folder
```

---

## 7. Running on any other Docker host

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
  ([§11](#11-data-migrations-and-backups)).
- **Migrate before starting,** as above; the backend refuses an unmigrated
  database. For an upgrade, apply only the newer files in the same way
  ([guide](apps/backend/migrations/README.md#upgrade-an-existing-database)).

---

## 8. Deploying to Render

[`render.yaml`](render.yaml) is a Render Blueprint for the same topology:

- **`rawla-backend`:** a **private service** with a 1 GB **persistent disk**
  at `/data`. It needs a paid plan, because Render only attaches disks to paid
  services.
- **`rawla-frontend`:** a public **web service** whose `BACKEND_UPSTREAM` is
  wired from the backend's private `hostport`.

**Checklist:**

1. Push multi-arch images: `TAG=0.1.0 pnpm docker:push`. Render is
   amd64-only.
2. Push this repo to GitHub, GitLab or Bitbucket. A Blueprint is read from a
   connected repo.
3. In Render, add the registry credential `allquill` for `docker.allquill.com`.
4. Choose **New → Blueprint**, then fill in the prompted secrets: Gmail,
   `CONTACT_TO_EMAIL`, Stripe keys and the public URLs.
   `JWT_SECRET` and `OAUTH_JWT_SECRET` are generated for you.
5. **The first deploy lands on an empty disk**, so the backend can't start
   yet. Set `DB_MAINTENANCE=true`, deploy, and apply the migrations from the
   backend's Shell
   ([the loop](apps/backend/migrations/README.md#render-or-any-container-platform)),
   then set it back to `false`.
6. After the first deploy, set `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` to the
   frontend URL, and add the Stripe webhook
   `https://<frontend>/api/payments/stripe/webhook`.

Render runs `NODE_ENV=production` with `TRUST_PROXY=2` (Render's edge plus
nginx). The full walkthrough, including the admin grant through Render's Shell,
backups and upgrades, is in [`docs/deploy-render.md`](docs/deploy-render.md).

---

## 9. Environment reference

Legend:
- **Req.** — ✅ required, ⚠️ required under a condition, blank means optional.
- **Image** — the value is baked into the image.
- **Compose** — the value is pinned by `docker-compose.yml`.

### 9.1 Compose settings (`docker/portal/.env`)

Read by Docker Compose to fill in `docker-compose.yml`. Every one has a
default in the compose file. The same file also carries the backend
settings in [§9.2](#92-backend-runtime), and the backend container receives
all of it.

| Variable | Default | Notes |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `rawla-portal` | Prefix for container names |
| `DOCKER_REGISTRY` | *(empty)* | Registry host prefixed to both images. Empty uses your local `pnpm docker:build` images. `.env.example` sets `docker.allquill.com`. |
| `BACKEND_IMAGE` | `helix-x-rawla-backend` | Repository name only, with no registry and no tag |
| `BACKEND_TAG` | `local` | Image tag, e.g. `0.1.0` |
| `FRONTEND_IMAGE` | `helix-x-rawla-frontend` | Repository name only |
| `FRONTEND_TAG` | `local` | Image tag |
| `DOCKER_VOLUME_FOLDER` | `./docker-volume` | Host folder, relative to `docker/portal/`. The database is `<folder>/data/helix_x.db`. |
| `DB_TYPE`, `DATABASE_URL`, `DB_SSL` | `sqlite` | Backend settings ([§9.2](#92-backend-runtime)) that pick the database. For the bundled service, also set `COMPOSE_PROFILES=postgres` and `DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla`. For your own Postgres, see the table in [§6](#6-running-with-docker-compose). |
| `COMPOSE_PROFILES` | *(unset)* | `postgres` starts the optional Postgres service. Its data is in `DOCKER_VOLUME_FOLDER/postgres`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `rawla` | Credentials the bundled `postgres` service is created with. Keep `DATABASE_URL` in step with them. |
| `POSTGRES_IMAGE` | `postgres:16-alpine` | Postgres image. Use 13 or later, which `gen_random_uuid()` needs. |
| `RAWLA_NETWORK` | `rawla-net` | Docker network name |
| `FRONTEND_PORT` | `8080` | Host port for the portal |
| `BACKEND_PORT` | `3001` | Host port for the API, for `/docs` and debugging |
| `BACKEND_BIND` | `127.0.0.1` | Interface the API port binds to. `0.0.0.0` exposes it. |

### 9.2 Backend runtime

Passed to the backend container: `docker/portal/.env` under Compose (the same
file as §9.1), the service's env on Render, `--env-file` or `-e` elsewhere. For local development the same
variables live in `apps/backend/.env` (template: `apps/backend/.env.example`).

**Core**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` (Image) | | Under `production`, `MAIL_TRANSPORT=console`, `PAYMENT_PROVIDER=console` and `STRIPE_API_BASE` are **refused at boot**, `DB_SYNCHRONIZE` defaults off, and the dev outbox is not mounted. Use `development` only for local stacks. |
| `PORT` | `3001` (Image) | | The API's listen port |
| `TRUST_PROXY` | *(unset)* | ⚠️ | Proxy hops to trust for `X-Forwarded-For` (Express `trust proxy`). Use `1` behind the frontend's nginx (Compose pins it), `2` on Render, and add one per extra proxy. Unset, every visitor counts as the proxy for per-IP limits. Also accepts `true` or a subnet list. |

**Database driver**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `DB_TYPE` | `sqlite` | | `sqlite` (a file at `DB_PATH`) or `postgres` (`DATABASE_URL`). Each has its own numbered SQL migrations, applied by hand ([§11](#11-data-migrations-and-backups)). |
| `DATABASE_URL` | — | ⚠️ `postgres` | `postgres://user:password@host:5432/db`. From a container, a database on the Docker host is `host.docker.internal`, never `localhost`. |
| `DB_SSL` | *(unset)* | | `true` requires verified TLS. `no-verify` encrypts without checking the certificate, which some managed providers need. Unset means no TLS, which is fine on a private network. |

**Database**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `DB_PATH` | `/data/helix_x.db` (Image, Compose) | | SQLite file (SQLite only). Keep it on a volume. |
| `DB_SYNCHRONIZE` | off | | Leave it `false`: migrations own the schema. `true` rebuilds tables from entities and can drop data. |
| `DB_LOGGING` | on in `development`, off otherwise | | `true`, `false`, `all`, or a list of TypeORM levels (`query,error,schema,warn,info,log`) |
| `DB_MAINTENANCE` | `false` | | `true` keeps the container up **without** starting the app, so you can open a shell and apply migrations by hand, e.g. on a new Render disk. Set it back to `false` afterwards. |
| `MIGRATIONS_DIR` | `/opt/migrations` (Image) | | Where the startup error message says the migration files are: `<dir>/helix-x/` and `<dir>/rawla/`. Unset, it names the framework's inside `node_modules/@helix-x/backend/migrations` and this app's in `apps/backend/migrations` |

**Authentication**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `JWT_SECRET` | ⚠️ `change-me-in-production` | ✅ | Signs session tokens. **Not enforced:** if unset, the framework silently uses this public default and anyone can forge a session. Always set a long random value (`openssl rand -base64 48`). |
| `JWT_EXPIRES_IN` | `7d` | | Session lifetime. There is no refresh flow, so roles change only at the next sign-in. |
| `OAUTH_JWT_SECRET` | — | ✅ | Signs OAuth tokens. Boot fails without it. It **must differ** from `JWT_SECRET`. |
| `OAUTH_ACCESS_TOKEN_TTL` | `1h` | | OAuth access-token lifetime |
| `OAUTH_REFRESH_TOKEN_TTL` | `30d` | | OAuth refresh-token lifetime |
| `OAUTH_ISSUER` | `my-app` | | `iss` claim on OAuth tokens. Set it to your portal's identity. |
| `OAUTH_CHECK_REVOCATION` | `false` | | `true` checks OAuth tokens against revocation on every request |

**Mail**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `MAIL_TRANSPORT` | `console` | ✅ in production | `console` (dev only: captured at `/api/dev/outbox`), `gmail` or `smtp` |
| `MAIL_FROM` | `Helix X <no-reply@localhost>` | ✅ in production | Sender. With Gmail, use the Gmail address itself, because Gmail rewrites others. |
| `MAIL_REPLY_TO` | — | | Optional Reply-To |
| `GMAIL_USER` | — | ⚠️ `gmail` | Gmail address |
| `GMAIL_APP_PASSWORD` | — | ⚠️ `gmail` | A [Google App Password](https://myaccount.google.com/apppasswords), not the account password |
| `SMTP_HOST` | — | ⚠️ `smtp` | SMTP server |
| `SMTP_PORT` | `587` | | |
| `SMTP_SECURE` | `false` | | `true` for implicit TLS, usually port 465 |
| `SMTP_USER` | — | | |
| `SMTP_PASSWORD` | — | | |

**Contact Us form**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `CONTACT_TO_EMAIL` | — | ✅ | Recipient(s), comma-separated. **Boot fails without it.** |
| `CONTACT_SUBJECT_PREFIX` | `[Contact]` | | Prepended to each subject |
| `CONTACT_RATE_LIMIT_PER_HOUR` | `5` | | Submissions per client IP per hour. Needs a correct `TRUST_PROXY`. |

**Documents** (`/api/documents`: private files, folders and sharing)

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `DOCUMENTS_SIGNING_SECRET` | — | ✅ | Signs the short-lived view and download links. At least 32 characters. **Boot fails without it.** |
| `DOCUMENTS_STORAGE_DRIVER` | `local` | | `local` (a directory) or `s3` (any S3-compatible store) |
| `DOCUMENTS_LOCAL_ROOT` | `data/documents` | | `local` only. Compose and Render set `/data/documents`, on the same persistent storage as the database. |
| `DOCUMENTS_STORAGE_NAMING` | `readable` | | `readable` keeps the file name in the stored path; `opaque` stores ids only. Naming, not encryption. New uploads only. |
| `DOCUMENTS_MAX_FILE_SIZE_MB` | `50` | | Upload limit. The frontend's nginx allows 55 MB on `/api/documents`; raising this means raising that. |
| `DOCUMENTS_ALLOWED_MIME_TYPES` | *(any)* | | Comma-separated, exact or wildcard (`image/*,application/pdf`) |
| `DOCUMENTS_LINK_TTL_SECONDS` | `300` | | Lifetime of a view or download link |
| `DOCUMENTS_PUBLIC_BASE_URL` | `API_PUBLIC_URL` + `/api` | | Absolute API root the links are built on. Set it only when that default is wrong. |
| `DOCUMENTS_S3_BUCKET` | — | ⚠️ `s3` | Boot fails without it under `s3` |
| `DOCUMENTS_S3_REGION`, `DOCUMENTS_S3_PREFIX`, `DOCUMENTS_S3_ENDPOINT`, `DOCUMENTS_S3_FORCE_PATH_STYLE` | — | | `s3` only. For MinIO, set the endpoint and `FORCE_PATH_STYLE=true`. |
| `DOCUMENTS_S3_ACCESS_KEY_ID`, `DOCUMENTS_S3_SECRET_ACCESS_KEY` | — | | `s3` only. Leave both empty to use the AWS default credential chain. |

**Membership dues**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `PAYMENT_PROVIDER` | `console` | ✅ in production | `console` (dev only: a dev route settles dues instantly) or `stripe` |
| `STRIPE_SECRET_KEY` | — | ⚠️ `stripe` | `sk_test_…` or `sk_live_…`. Boot fails without it. |
| `STRIPE_WEBHOOK_SECRET` | — | ⚠️ `stripe` | Signing secret of the endpoint `https://<portal>/api/payments/stripe/webhook`. Dues settle only on this signed webhook. |
| `STRIPE_API_BASE` | — | | Points the SDK at `docker/stripe-mock` for offline testing. Refused in production. |

**Public URLs**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `PORTAL_PUBLIC_URL` | `http://localhost:5173` | ✅ | The portal's public origin. Emailed verification, set-password and reset links point here. In Docker it is the **frontend's** URL. |
| `API_PUBLIC_URL` | `http://localhost:$PORT` | ✅ | Public origin of the API, used for the checkout return URLs and the document view and download links. Behind the frontend's proxy it is the **same** as `PORTAL_PUBLIC_URL`. |

### 9.3 Frontend runtime

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_UPSTREAM` | `http://backend:3001` (Image) | Where nginx proxies `/api`. A full URL, or a bare `host:port` (`http://` is added). |
| `PORT` | `80` (Image) | nginx listen port. Platforms such as Render set it. |
| `NGINX_ENTRYPOINT_LOCAL_RESOLVERS` | `1` (Image) | Makes nginx resolve `BACKEND_UPSTREAM` per request, using the container's DNS. Leave it set. The image derives `NGINX_LOCAL_RESOLVERS` from `/etc/resolv.conf` for the template. Don't set that one yourself. |

### 9.4 Frontend build time (`VITE_*`)

These are inlined into the JavaScript bundle **when the image is built**, from
the committed `apps/frontend/.env.production`. Changing one means rebuilding the
frontend image. Every value is public by definition, so never put a secret
here.

| Variable | Value in `.env.production` | Notes |
|---|---|---|
| `VITE_API_SERVER` | *(empty)* | API base URL. Empty means same-origin `/api`, which the image's nginx proxies. |
| `VITE_APP_NAME` | `Rajputana Rawla` | Name in the navbar and auth pages |
| `VITE_APP_LOGO` | `/extension/rra-crest-mark.svg` | Logo path, served from `public/` |
| `VITE_FEATURE_HOME` | `true` | Landing page at `/` |
| `VITE_FEATURE_REGISTRATION` | `true` | `/join` and the membership status page |
| `VITE_FEATURE_MEMBERS` | `true` | Member list, profiles, privacy |
| `VITE_FEATURE_MEMBERSHIP_ADMIN` | `true` | Application review, reference data, portal settings, audit log |
| `VITE_FEATURE_CHAPTERS` | `true` | Chapter administration |
| `VITE_FEATURE_OAUTH` | `true` | OAuth client management |
| `VITE_FEATURE_REPORTS` | `true` | Reports plugin |
| `VITE_FEATURE_CONTACT` | *(unset)* | Contact Us page. Unset means on. |
| `VITE_FEATURE_DOCUMENTS` | *(unset)* | My files and Shared with me. Unset means on. |
| `VITE_FEATURE_DEVTOOLS` | `true` | The plugin inspector. **Opt-in** (`=== 'true'`). Consider `false` for production builds. |

All `VITE_FEATURE_*` flags except `DEVTOOLS` are **opt-out**: a plugin is on
unless its flag is exactly `false`.

### 9.5 Build and publish variables

These are read by the `pnpm docker:*` scripts from your shell, not by the
containers.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `TAG` | `local` | `docker:build*`, `docker:push*` | Image tag |
| `DOCKER_REGISTRY` | `docker.allquill.com` | `docker:push*` | Registry to push to |
| `DOCKER_PLATFORMS` | `linux/amd64,linux/arm64` | `docker:push*` | Platforms to build |
| `API`, `DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `http://localhost:3001/api`, `apps/backend/data/helix_x.db`, `admin@example.com`, `Password!1` | `seed:sample` | Target for the sample-data script, and an **existing** administrator (from the migrations) it signs in as. It creates no accounts. With `DB_TYPE=postgres` it uses `DATABASE_URL` instead of `DB`. |
| `DB_CONTAINER` | unset | `seed:sample` | A backend container's name (Compose: `rawla-portal-backend-1`). Runs the script's SQL inside it, with `DB` as a path in the container (default `/data/helix_x.db`). Required for a bind-mounted SQLite file: host access corrupts it while the container runs. |

### 9.6 Read by the framework but not used by this app

The shared framework packages read these, but the Rawla backend does not
compose the modules that use them: no AI, agents or MCP modules are imported,
and `plugin-chat` is not registered in the frontend. Setting them has no
effect:

`LANGGRAPH_URL`, `LANGGRAPH_API_URL`, `LLM_MODEL`, `LLM_MAX_TOKENS`,
`LLM_TEMPERATURE`, `MCP_SERVER_URL`, `VITE_AGENTS_SERVER`,
`VITE_LANGGRAPH_GRAPH_ID`.

---

## 10. Production checklist

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
- [ ] Backups of `helix_x.db` and `/data/documents` scheduled ([§11](#11-data-migrations-and-backups))
- [ ] TLS terminated in front of the frontend
- [ ] Consider building with `VITE_FEATURE_DEVTOOLS=false`
- [ ] An administrator granted ([§6](#6-running-with-docker-compose)), then
      signed out and back in

---

## 11. Data, migrations and backups

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
  the framework's first.** The backend never migrates. At startup it checks
  `schema_migrations` and refuses to run against a database where either
  track is behind, printing what to apply.
  - SQLite: `sqlite3 -bail <db> < /opt/migrations/<track>/sqlite/NNNN_x.sql`
  - Postgres: `psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f /opt/migrations/<track>/postgres/NNNN_x.sql`

  A **new database** gets every file of the framework's track, then every
  file of this app's, in order (a `for` loop over `*.sql`; name files in full
  otherwise, because `/bin/sh` doesn't expand a glob in `<`). An **existing**
  database gets only the newer files. A new image whose `@helix-x/backend`
  adds a framework migration will not start until it is applied. On a
  platform where the only shell is inside the backend container (Render),
  start it with `DB_MAINTENANCE=true`. Every command, per environment, is in
  [`apps/backend/migrations/README.md`](apps/backend/migrations/README.md).
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

### 11.1 PostgreSQL

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
  [Step by step](apps/backend/migrations/README.md#docker-compose-postgresql).
- **Compose, your own Postgres:** no profile. Set `DB_TYPE=postgres` and
  `DATABASE_URL=postgresql://USER:PASSWORD@host.docker.internal:5432/DB` in
  `docker/portal/.env`, migrate it as a
  [local PostgreSQL](apps/backend/migrations/README.md#local-development-postgresql),
  then `pnpm docker:up`.
- **Local or other hosts:** point `DATABASE_URL` at your database. Leave
  `DB_SSL` **empty** for a local server; set `DB_SSL=true` (or `no-verify`)
  only for managed providers. Apply both tracks' `postgres/*.sql`, the
  framework's first, with `psql -v ON_ERROR_STOP=1`.
  The backend won't start on an empty database.
  [Step by step](apps/backend/migrations/README.md#local-development-postgresql).
- **Render:** a Render Postgres database, instead of the disk. Add a
  `databases:` entry to `render.yaml` and set `DATABASE_URL` from it with
  `fromDatabase: { name: …, property: connectionString }`, plus
  `DB_TYPE=postgres`. You can then drop the backend's `disk`, and with it the
  single-instance and deploy-downtime limits.
- **Backups:** use `pg_dump` or your provider's snapshots, instead of copying
  a file.

## 12. Upgrading and releases

1. **Framework changed?** Run `pnpm run pack` in
   `framework/helix-x-backend`.
2. **Publish:** `TAG=<version> pnpm docker:push`.
3. **Point the deployment at it:**
   - Compose: set `BACKEND_TAG` and `FRONTEND_TAG` in `docker/portal/.env`,
     then `docker compose pull && docker compose up -d`.
   - Render: bump both `image.url` tags in `render.yaml` and commit.
   - Elsewhere: re-run the containers with the new tag.
4. **Migrations:** if the release adds `NNNN_*.sql` files (in
   `apps/backend/migrations/`, or in a new `@helix-x/backend`), apply them by
   hand, framework track first, **before** step 3. Additive changes are safe
   for the running version.
   [How](apps/backend/migrations/README.md#upgrade-an-existing-database).
   Otherwise the new backend refuses to start and lists what's missing. On
   Render with a disk, apply them in the old instance's Shell, or deploy with
   `DB_MAINTENANCE=true`, apply, and unset it.

**Rolling back:** point back at the previous tag. Migrations are forward-only,
so if a release changed the schema, restore the pre-upgrade backup as well.

---

## 13. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `pnpm docker:up` tries to pull `helix-x-rawla-backend:latest` from Docker Hub | The image name was built without registry or tag. Each part (`DOCKER_REGISTRY`, `*_IMAGE`, `*_TAG`) must be set separately in `.env`, and `*_IMAGE` is the repository name only. Check with `docker compose config \| grep image`. |
| The container exits immediately on Render or an x86 server (`exec format error`) | The image is arm64-only (built on Apple Silicon). Republish with `pnpm docker:push`. |
| `Multi-platform build is not supported for the docker driver` | You ran a multi-platform build on the default builder. Use `pnpm docker:push`, which creates `rawla-builder`. |
| Boot fails: `Configuration key "CONTACT_TO_EMAIL" does not exist` (or `OAUTH_JWT_SECRET`) | A required variable is missing ([§9.2](#92-backend-runtime)) |
| Boot fails: `Configuration key "DOCUMENTS_SIGNING_SECRET" does not exist`, or `signingSecret must be at least 32 characters` | Set `DOCUMENTS_SIGNING_SECRET` to a random value of 32 or more characters |
| The Documents section is missing after an upgrade | The `documents:*` grants arrive with migration `0003`, and permissions are baked into the JWT. Sign out and back in. |
| Document previews and downloads fail or point at the wrong host | The links are built on `API_PUBLIC_URL` + `/api`. Set it to the public origin, or set `DOCUMENTS_PUBLIC_BASE_URL`. |
| An upload fails with `413` | The file is over nginx's limit on `/api/documents` (55 MB) or `DOCUMENTS_MAX_FILE_SIZE_MB` |
| Boot fails: `MAIL_TRANSPORT=console` / `PAYMENT_PROVIDER=console is not allowed when NODE_ENV=production` | Configure real mail and Stripe, or use `NODE_ENV=development` for a local stack |
| `unable to open database file` | The data directory is not writable. The entrypoint fixes ownership when it starts as root, so don't override the user (`--user`) or mount the database read-only. |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | Change `FRONTEND_PORT` (or `BACKEND_PORT`) in `.env` |
| A framework change has no effect in the image | The `.artifacts/` tarballs are stale. Run `pnpm run pack` in `framework/helix-x-backend`, then rebuild. |
| A newly granted role has no effect | Roles are baked into the JWT at login. Sign out and back in. |
| The contact form rate-limits everyone together | `TRUST_PROXY` is unset or too low for the number of proxies |
| The frontend returns 502 on `/api/*` | The backend is down or unreachable. Check `BACKEND_UPSTREAM`, the shared network, and `docker compose logs backend`. |
| Links in emails point at `localhost` | Set `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` to the public origin |
| `compose up` says `env file … .env not found` | `cp .env.example .env` in `docker/portal/` |
| Compose backend ignores your Postgres settings / still uses SQLite | Put `DB_TYPE` and `DATABASE_URL` in `docker/portal/.env` (the only file the stack reads), then `pnpm docker:up` to recreate the container. |
| Compose backend: `ECONNREFUSED 127.0.0.1:5432` / `::1:5432` | `DATABASE_URL` says `localhost`, which inside the container is the container itself. Use `host.docker.internal` for a database on the Docker host. |
| `DATABASE_URL is required when DB_TYPE=postgres` | Set `DATABASE_URL` in `.env`: for Compose's `postgres` profile, `postgres://rawla:rawla@postgres:5432/rawla` |
| Backend exits: `Database schema is not ready` | A numbered migration hasn't been applied. The message lists the exact files and commands, in order ([guide](apps/backend/migrations/README.md#troubleshooting)). With Compose's restart policy it retries until you apply them. |
| `SqliteError: disk I/O error`; `integrity_check` shows broken indexes | Something on the host opened the Compose SQLite file while the stack ran. Stop the stack, recreate the file from the migrations, and access it only through the container from then on. |
| `The server does not support SSL connections` | `DB_SSL=true`/`no-verify` against a server without SSL (e.g. local Postgres). Set `DB_SSL=` (empty). |
| On Postgres: `Data type "datetime" … is not supported` | An entity uses `type: 'datetime'`. Use `type: Date` (see `.claude/rules/database-migrations.md`). |
