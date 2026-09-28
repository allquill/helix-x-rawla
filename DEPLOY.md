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
5. [The sample database](#5-the-sample-database)
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
```

The portal ships as **two images**:

| Image | Contains | Listens on |
|---|---|---|
| `helix-x-rawla-backend` | The compiled API, production `node_modules`, the migrations, and a bundled sample database | `3001` |
| `helix-x-rawla-frontend` | The Vite production bundle, served by nginx, which also proxies `/api` to the backend | `$PORT` (default `80`) |

The browser only ever talks to the frontend. The bundle calls `/api` on its own
origin, so there is no CORS and no backend URL baked into the JavaScript. The
backend never needs to be public.

**Where to find what**

| Path | What |
|---|---|
| `apps/backend/Dockerfile`, `apps/backend/Dockerfile.dockerignore`, `apps/backend/docker-entrypoint.sh` | Backend image |
| `apps/frontend/Dockerfile`, `apps/frontend/Dockerfile.dockerignore`, `apps/frontend/nginx/` | Frontend image and nginx config |
| `apps/backend/seed/` | The bundled sample database and its README |
| `docker/portal/` | Docker Compose stack: `docker-compose.yml`, `.env.example`, `backend.env.example` |
| `render.yaml`, `docs/deploy-render.md` | Render Blueprint and step-by-step guide |
| `scripts/build-sample-db.mjs` | Generates the sample database |

---

## 2. Prerequisites

- **Docker 24+ with buildx.** Docker Desktop includes both. Multi-arch
  publishing uses a `docker-container` builder, which is created automatically
  (see [§4.3](#43-multi-arch-publishing)).
- **Node 22 and pnpm 9.12.0.** These are needed for `pnpm build` and
  `pnpm docker:sample-db`. The image builds install their own toolchains.
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
| `runtime` | Copies `dist`, production `node_modules`, the entrypoint and `/opt/rawla/seed/` |

**Entrypoint order** (`docker-entrypoint.sh`):

1. **As root:** create the directory of `DB_PATH` and `chown` it to `node`.
   A platform disk, a Linux bind mount or a Kubernetes volume can arrive
   root-owned.
2. **Drop to `node`** with `setpriv`. The application never runs as root.
3. **Seed, if asked:** when `SEED_SAMPLE_DB=true` and the database file does
   not exist, copy the bundled sample into place ([§5](#5-the-sample-database)).
4. **Migrate:** unless `RUN_MIGRATIONS=false`, run pending migrations. This is
   idempotent.
5. **Start:** `exec node dist/main`.

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
| `pnpm docker:sample-db` | Regenerates the bundled sample database ([§5](#5-the-sample-database)) |
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
pnpm build && pnpm docker:sample-db                      # if you want a fresh sample
TAG=0.2.0 pnpm docker:push
```

Then point your deployment at `0.2.0` ([§12](#12-upgrading-and-releases)).
Prefer version tags over `local` for anything deployed: a moving tag makes
rollbacks guesswork.

---

## 5. The sample database

The backend image carries a sample database at
`/opt/rawla/seed/helix_x.db`. It has 21 members in every status across five
chapters, with households, spouses, children, references, life events, a full
audit trail and reference data.

- **Opt in with `SEED_SAMPLE_DB=true`.** The entrypoint copies the sample into
  `DB_PATH` **only when no database exists there**, then runs newer migrations
  over it.
- **An existing database is never overwritten,** so leaving the flag on is
  harmless. To re-seed, delete the data folder or volume.
- **Credentials are published:** `admin@example.com` / `Password!1`, and
  members `<first>.<last>@example.test` / `Rawla!Demo1`. Use it for **demos
  only**, and change the admin password on anything public.

**Regenerating it** (needs a current `pnpm build`):

```bash
pnpm build
pnpm docker:sample-db           # writes apps/backend/seed/helix_x.db
pnpm docker:build:backend       # or docker:push — bundles the new copy
```

`scripts/build-sample-db.mjs` does the following:
1. Migrates an empty database.
2. Serves it from a throwaway backend on `:3399`, with your
   `apps/backend/.env` ignored.
3. Fills it through the API with `scripts/seed-sample-data.mjs`, so password
   hashes, gate states and member IDs are the application's own.
4. Clears captured mail, links, lockouts and OAuth tokens.

If `apps/backend/seed/helix_x.db` is missing, the image still builds, and
`SEED_SAMPLE_DB=true` only logs a warning. Commit the file so builds on other
machines include it.

---

## 6. Running with Docker Compose

`docker/portal/` runs both containers on their own network.

```bash
cd docker/portal
cp .env.example .env                    # Compose settings: registry, tags, data folder, ports
cp backend.env.example backend.env      # backend config and secrets — edit it
docker compose up -d                    # or, from the repo root: pnpm docker:up
```

**Two env files, on purpose:**

- **`.env`** is read by Compose itself: images, data folder, network and ports
  ([§9.1](#91-compose-settings-dockerportalenv)). It never reaches a container.
- **`backend.env`** is handed to the backend container: app config and secrets
  ([§9.2](#92-backend-runtime)). It is gitignored.

Compose pins three backend values itself: `DB_PATH=/data/helix_x.db`,
`TRUST_PROXY=1` (one nginx hop), and `SEED_SAMPLE_DB` (taken from `.env`).

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
`docker/portal/docker-volume/data/helix_x.db`, gitignored). You can open it with
`sqlite3`, copy it to back it up, and delete the folder to start over.

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
JWT at login. `super_admin` holds every permission the migrations create. Don't use
`apps/backend/sql/admin-seed.sql` against a real database: its
`:seed_sample_users` is `'yes'`, which adds five accounts with published
passwords.

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

docker run -d --name backend --network rawla-net \
  -v rawla-data:/data \
  --env-file backend.env \
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
5. After the first deploy, set `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` to the
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

Read by Docker Compose only. Every one has a default in the compose file.

| Variable | Default | Notes |
|---|---|---|
| `COMPOSE_PROJECT_NAME` | `rawla-portal` | Prefix for container names |
| `DOCKER_REGISTRY` | *(empty)* | Registry host prefixed to both images. Empty uses your local `pnpm docker:build` images. `.env.example` sets `docker.allquill.com`. |
| `BACKEND_IMAGE` | `helix-x-rawla-backend` | Repository name only, with no registry and no tag |
| `BACKEND_TAG` | `local` | Image tag, e.g. `0.1.0` |
| `FRONTEND_IMAGE` | `helix-x-rawla-frontend` | Repository name only |
| `FRONTEND_TAG` | `local` | Image tag |
| `DOCKER_VOLUME_FOLDER` | `./docker-volume` | Host folder, relative to `docker/portal/`. The database is `<folder>/data/helix_x.db`. |
| `SEED_SAMPLE_DB` | `false` | `true` seeds an **empty** folder from the bundled sample ([§5](#5-the-sample-database)) |
| `RAWLA_NETWORK` | `rawla-net` | Docker network name |
| `FRONTEND_PORT` | `8080` | Host port for the portal |
| `BACKEND_PORT` | `3001` | Host port for the API, for `/docs` and debugging |
| `BACKEND_BIND` | `127.0.0.1` | Interface the API port binds to. `0.0.0.0` exposes it. |
| `BACKEND_ENV_FILE` | `./backend.env` | The backend's env file. Compose refuses to start if it is missing. |

### 9.2 Backend runtime

Passed to the backend container: `backend.env` under Compose, the service's env
on Render, `--env-file` or `-e` elsewhere. For local development the same
variables live in `apps/backend/.env` (template: `apps/backend/.env.example`).

**Core**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `NODE_ENV` | `production` (Image) | | Under `production`, `MAIL_TRANSPORT=console`, `PAYMENT_PROVIDER=console` and `STRIPE_API_BASE` are **refused at boot**, `DB_SYNCHRONIZE` defaults off, and the dev outbox is not mounted. Use `development` only for local stacks. |
| `PORT` | `3001` (Image) | | The API's listen port |
| `TRUST_PROXY` | *(unset)* | ⚠️ | Proxy hops to trust for `X-Forwarded-For` (Express `trust proxy`). Use `1` behind the frontend's nginx (Compose pins it), `2` on Render, and add one per extra proxy. Unset, every visitor counts as the proxy for per-IP limits. Also accepts `true` or a subnet list. |

**Database**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `DB_PATH` | `/data/helix_x.db` (Image, Compose) | | SQLite file. Keep it on a volume. |
| `DB_SYNCHRONIZE` | off in `production`, on otherwise | | Leave it `false`: migrations own the schema. `true` rebuilds tables from entities and can drop data. |
| `DB_LOGGING` | on in `development`, off otherwise | | `true`, `false`, `all`, or a list of TypeORM levels (`query,error,schema,warn,info,log`) |
| `RUN_MIGRATIONS` | `true` (Image) | | The entrypoint runs pending migrations on start. Set `false` if a separate job owns them. |
| `SEED_SAMPLE_DB` | `false` (Image, Compose) | | `true` seeds an empty `DB_PATH` from the bundled sample ([§5](#5-the-sample-database)) |

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
| `API_PUBLIC_URL` | `http://localhost:$PORT` | ✅ | Public origin of the API, used for the checkout return URLs. Behind the frontend's proxy it is the **same** as `PORTAL_PUBLIC_URL`. |

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
| `SAMPLE_DB_PORT` | `3399` | `docker:sample-db` | Port for the throwaway backend |
| `OUT` | `apps/backend/seed/helix_x.db` | `docker:sample-db` | Where the sample is written |
| `API`, `DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `http://localhost:3001/api`, `apps/backend/data/helix_x.db`, `admin@example.com`, `Password!1` | `seed:sample` | Target and admin for the sample-data script |

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
- [ ] `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` set to the public HTTPS origin
- [ ] `TRUST_PROXY` matches the number of proxies in front of the backend
- [ ] `SEED_SAMPLE_DB=false`, or the sample admin password changed immediately
- [ ] Images pushed multi-arch with a version tag. The deployment pins that tag.
- [ ] Backend runs **one** instance, with `/data` on persistent storage
- [ ] Backups of `helix_x.db` scheduled ([§11](#11-data-migrations-and-backups))
- [ ] TLS terminated in front of the frontend
- [ ] Consider building with `VITE_FEATURE_DEVTOOLS=false`
- [ ] An administrator granted ([§6](#6-running-with-docker-compose)), then
      signed out and back in

---

## 11. Data, migrations and backups

- **One file.** All state is `DB_PATH` (`/data/helix_x.db`).
- **Single writer.** SQLite allows one writer at a time, so run **one**
  backend instance. Never scale it horizontally or point two containers at one
  file. On platforms that stop the old instance before starting the new one
  (Render with a disk), each deploy has a few seconds of API downtime.
- **Migrations.** They run automatically on every start (`RUN_MIGRATIONS`).
  They are idempotent and forward-only. The schema is never synchronized from
  entities in production.
- **Backups.** Copy the file while the backend is stopped, or use SQLite's
  online backup:

  ```bash
  docker compose exec --user node backend node -e "require('better-sqlite3')(process.env.DB_PATH).backup('/data/backup-' + Date.now() + '.db').then(() => console.log('done'))"
  ```

  Under Compose the file is on the host (`docker/portal/docker-volume/data/`).
  On Render, disk snapshots are daily.
- **Restore.** Stop the backend, replace `helix_x.db` (and remove any `-wal`
  or `-shm` beside it), then start. Pending migrations apply automatically.

---

## 12. Upgrading and releases

1. **Framework changed?** Run `pnpm run pack` in
   `framework/helix-x-backend`.
2. **Publish:** `TAG=<version> pnpm docker:push`.
3. **Point the deployment at it:**
   - Compose: set `BACKEND_TAG` and `FRONTEND_TAG` in `docker/portal/.env`,
     then `docker compose pull && docker compose up -d`.
   - Render: bump both `image.url` tags in `render.yaml` and commit.
   - Elsewhere: re-run the containers with the new tag.
4. **Migrations** apply on the backend's first start.

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
| Boot fails: `MAIL_TRANSPORT=console` / `PAYMENT_PROVIDER=console is not allowed when NODE_ENV=production` | Configure real mail and Stripe, or use `NODE_ENV=development` for a local stack |
| `unable to open database file` | The data directory is not writable. The entrypoint fixes ownership when it starts as root, so don't override the user (`--user`) or mount the database read-only. |
| `Bind for 0.0.0.0:8080 failed: port is already allocated` | Change `FRONTEND_PORT` (or `BACKEND_PORT`) in `.env` |
| A framework change has no effect in the image | The `.artifacts/` tarballs are stale. Run `pnpm run pack` in `framework/helix-x-backend`, then rebuild. |
| A newly granted role has no effect | Roles are baked into the JWT at login. Sign out and back in. |
| The contact form rate-limits everyone together | `TRUST_PROXY` is unset or too low for the number of proxies |
| The frontend returns 502 on `/api/*` | The backend is down or unreachable. Check `BACKEND_UPSTREAM`, the shared network, and `docker compose logs backend`. |
| Links in emails point at `localhost` | Set `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` to the public origin |
| `compose up` says `env file … backend.env not found` | `cp backend.env.example backend.env` in `docker/portal/` |
