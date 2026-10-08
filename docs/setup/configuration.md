# Configuration

Every variable the portal reads, where it is read, and what breaks without it.


Legend:
- **Req.** — ✅ required, ⚠️ required under a condition, blank means optional.
- **Image** — the value is baked into the image.
- **Compose** — the value is pinned by `docker-compose.yml`.

### Compose settings (`docker/portal/.env`)

Read by Docker Compose to fill in `docker-compose.yml`. Every one has a
default in the compose file. The same file also carries the backend
settings in [Backend runtime](/setup/configuration.md#backend-runtime), and the backend container receives
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
| `DB_TYPE`, `DATABASE_URL`, `DB_SSL` | `sqlite` | Backend settings ([Backend runtime](/setup/configuration.md#backend-runtime)) that pick the database. For the bundled service, also set `COMPOSE_PROFILES=postgres` and `DATABASE_URL=postgres://rawla:rawla@postgres:5432/rawla`. For your own Postgres, see the table in [Running with docker compose](/setup/deploy-docker.md#running-with-docker-compose). |
| `COMPOSE_PROFILES` | *(unset)* | `postgres` starts the optional Postgres service. Its data is in `DOCKER_VOLUME_FOLDER/postgres`. |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | `rawla` | Credentials the bundled `postgres` service is created with. Keep `DATABASE_URL` in step with them. |
| `POSTGRES_IMAGE` | `postgres:16-alpine` | Postgres image. Use 13 or later, which `gen_random_uuid()` needs. |
| `RAWLA_NETWORK` | `rawla-net` | Docker network name |
| `FRONTEND_PORT` | `8080` | Host port for the portal |
| `BACKEND_PORT` | `3001` | Host port for the API, for `/docs` and debugging |
| `BACKEND_BIND` | `127.0.0.1` | Interface the API port binds to. `0.0.0.0` exposes it. |

### Backend runtime

Passed to the backend container: `docker/portal/.env` under Compose (the same
file as the Compose settings below), the service's env on Render, `--env-file` or `-e` elsewhere. For local development the same
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
| `DB_TYPE` | `sqlite` | | `sqlite` (a file at `DB_PATH`) or `postgres` (`DATABASE_URL`). Each has its own numbered SQL migrations, applied by hand ([Data, migrations and backups](/setup/production.md#data-migrations-and-backups)). |
| `DATABASE_URL` | — | ⚠️ `postgres` | `postgres://user:password@host:5432/db`. From a container, a database on the Docker host is `host.docker.internal`, never `localhost`. |
| `DB_SSL` | *(unset)* | | `true` requires verified TLS. `no-verify` encrypts without checking the certificate, which some managed providers need. Unset means no TLS, which is fine on a private network. |

**Database**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `DB_PATH` | `/data/helix_x.db` (Image, Compose) | | SQLite file (SQLite only). Keep it on a volume. |
| `DB_SYNCHRONIZE` | off | | Leave it `false`: migrations own the schema. `true` rebuilds tables from entities and can drop data. |
| `DB_LOGGING` | on in `development`, off otherwise | | `true`, `false`, `all`, or a list of TypeORM levels (`query,error,schema,warn,info,log`) |
| `DB_AUTO_MIGRATE` | `false` | | `true` applies pending migrations at startup, before the schema check — the same as `pnpm db:migrate`. SQLite: a `<DB_PATH>.pre-migrate-<time>` copy is written first. Postgres: an advisory lock stops two instances migrating at once. Off, the app refuses a database that is behind and lists the files to apply ([Database and migrations](/setup/database.md)). |
| `DB_MAINTENANCE` | `false` | | `true` keeps the container up **without** starting the app, so you can open a shell and apply migrations by hand. `DB_AUTO_MIGRATE=true` is usually simpler. Set it back to `false` afterwards. |
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
| `DOCUMENTS_LOCAL_ROOT` | `data/documents` | | `local` only. Compose sets `/data/documents` (Render: `/var/data/documents`), on the same persistent storage as the database. |
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
| `JOBS_ENABLED` | `true` | | The timer that emails event invitations and reminders. Set `false` on an instance that should only serve requests. Two instances may both leave it on: a message is claimed in the database before it is sent, so it goes out once. If no instance has it on, published events are never announced. |
| `STRIPE_SECRET_KEY` | — | ⚠️ `stripe` | `sk_test_…` or `sk_live_…`. Boot fails without it. |
| `STRIPE_WEBHOOK_SECRET` | — | ⚠️ `stripe` | Signing secret of the endpoint `https://<portal>/api/payments/stripe/webhook`. Dues settle only on this signed webhook. |
| `STRIPE_API_BASE` | — | | Points the SDK at `docker/stripe-mock` for offline testing. Refused in production. |

**Public URLs**

| Variable | Default | Req. | Notes |
|---|---|---|---|
| `PORTAL_PUBLIC_URL` | `http://localhost:5173` | ✅ | The portal's public origin. Emailed verification, set-password and reset links point here. In Docker it is the **frontend's** URL. |
| `API_PUBLIC_URL` | `http://localhost:$PORT` | ✅ | Public origin of the API, used for the checkout return URLs and the document view and download links. Behind the frontend's proxy it is the **same** as `PORTAL_PUBLIC_URL`. |

### Frontend runtime

| Variable | Default | Notes |
|---|---|---|
| `BACKEND_UPSTREAM` | `http://backend:3001` (Image) | Where nginx proxies `/api`. A full URL, or a bare `host:port` (`http://` is added). |
| `PORT` | `80` (Image) | nginx listen port. Platforms such as Render set it. |
| `NGINX_ENTRYPOINT_LOCAL_RESOLVERS` | `1` (Image) | Makes nginx resolve `BACKEND_UPSTREAM` per request, using the container's DNS. Leave it set. The image derives `NGINX_LOCAL_RESOLVERS` from `/etc/resolv.conf` for the template. Don't set that one yourself. |

### Frontend build time (`VITE_*`)

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
| `VITE_FEATURE_EVENTS` | `true` | Events, household registration and event administration. Also shows the upcoming-event card on `/`. |
| `VITE_FEATURE_VOLUNTEERS` | `true` | The Volunteers page (Top Volunteers) |
| `VITE_FEATURE_HELP` | `true` | The Help and Admin guide links to this guide at `/guide/` |
| `VITE_FEATURE_OAUTH` | `true` | OAuth client management |
| `VITE_FEATURE_REPORTS` | `true` | Reports plugin |
| `VITE_FEATURE_CONTACT` | *(unset)* | Contact Us page. Unset means on. |
| `VITE_FEATURE_DOCUMENTS` | *(unset)* | My files and Shared with me. Unset means on. |
| `VITE_FEATURE_DEVTOOLS` | `true` | The plugin inspector. **Opt-in** (`=== 'true'`). Consider `false` for production builds. |

All `VITE_FEATURE_*` flags except `DEVTOOLS` are **opt-out**: a plugin is on
unless its flag is exactly `false`.

### Build and publish variables

These are read by the `pnpm docker:*` scripts from your shell, not by the
containers.

| Variable | Default | Used by | Notes |
|---|---|---|---|
| `TAG` | `local` | `docker:build*`, `docker:push*` | Image tag |
| `DOCKER_REGISTRY` | `docker.allquill.com` | `docker:push*` | Registry to push to |
| `DOCKER_PLATFORMS` | `linux/amd64,linux/arm64` | `docker:push*` | Platforms to build |
| `API`, `DB`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `http://localhost:3001/api`, `apps/backend/data/helix_x.db`, `admin@example.com`, *(in `0001_baseline.sql`)* | `seed:sample` | Target for the sample-data script, and an **existing** administrator (from the migrations) it signs in as. It creates no accounts. With `DB_TYPE=postgres` it uses `DATABASE_URL` instead of `DB`. |
| `DB_CONTAINER` | unset | `seed:sample` | A backend container's name (Compose: `rawla-portal-backend-1`). Runs the script's SQL inside it, with `DB` as a path in the container (default `/data/helix_x.db`). Required for a bind-mounted SQLite file: host access corrupts it while the container runs. |

### Read by the framework but not used by this app

The shared framework packages read these, but the Rawla backend does not
compose the modules that use them: no AI, agents or MCP modules are imported,
and `plugin-chat` is not registered in the frontend. Setting them has no
effect:

`LANGGRAPH_URL`, `LANGGRAPH_API_URL`, `LLM_MODEL`, `LLM_MAX_TOKENS`,
`LLM_TEMPERATURE`, `MCP_SERVER_URL`, `VITE_AGENTS_SERVER`,
`VITE_LANGGRAPH_GRAPH_ID`.

---
