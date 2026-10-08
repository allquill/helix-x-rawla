# Deploying to Render

> Every environment variable is in [Configuration](/setup/configuration.md).

Render builds the portal **from this repository**: it checks the repo out,
installs dependencies (the framework included, from Nexus) and builds. It
cannot pull images from `docker.allquill.com`, so the Docker images are not
used here — they are for [Docker hosts](/setup/deploy-docker.md).

Two services, created in the Render dashboard:

```
internet ──▶ rawla-frontend   Static Site: the built app; /api/* rewritten to the backend
                   │
                   ▼
             rawla-backend    Web Service (Node): the API, SQLite on a persistent disk
```

## Cost and limits

- **Paid backend.** `rawla-backend` needs a paid instance type (Starter or
  above), because Render attaches persistent disks only to paid services.
  Static sites are free.
- **One backend instance.** SQLite is a single file with a single writer, so
  `rawla-backend` runs exactly one instance. A service with a disk can't scale
  out anyway.
- **Brief downtime on each deploy.** Render stops the old backend instance
  before the new one starts, so the API is unavailable for a few seconds on
  every backend deploy. That is the price of a local-disk database.

## Every build: the registry credential

Both services install `@helix-x/*` from Nexus, so both need:

1. **Environment → `NPM_TOKEN`** = the base64 of `user:password` for
   `packages.allquill.com` (a read-only account).
2. A **Build Command** that starts with the login step. The two services'
   commands are below; they share this shape:

   ```bash
   node scripts/registry-login.mjs && pnpm install --frozen-lockfile --prod=false --config.confirm-modules-purge=false && <build>
   ```

   - The login comes **first**, so the install has the credential. It writes
     it to Render's user-level `~/.npmrc`.
   - `--prod=false`: with `NODE_ENV=production` set (the backend needs it),
     `pnpm install` would skip devDependencies — and `turbo`, `typescript`,
     `@nestjs/cli` and `vite` are all devDependencies. The symptom is
     `sh: 1: turbo: not found`. The app still runs with `NODE_ENV=production`.
   - `--config.confirm-modules-purge=false`: when Render restores a cached
     production-only `node_modules`, pnpm must rebuild it and otherwise stops
     to ask for confirmation, which a build cannot answer.
   - `&&`, not `;`: with `;` a failed install still runs the build, and the log
     shows the build's error instead of the install's.

Do **not** put the credential, or `${NPM_TOKEN}`, in the committed `.npmrc`.
pnpm ignores credentials that come from a project `.npmrc` — the build log says
`WARN Ignored project-level auth setting …` and the install then fails with 401
— because anyone able to commit could otherwise redirect the registry and
collect the token.

The lockfile must resolve the framework from Nexus (`pnpm check:lockfile`), or
the install fails with `ERR_PNPM_OUTDATED_LOCKFILE`.

## 1. The backend: `rawla-backend`

**New → Web Service**, this repo, runtime **Node**, a paid instance type.

| Setting | Value |
|---|---|
| Build Command | `node scripts/registry-login.mjs && pnpm install --frozen-lockfile --prod=false --config.confirm-modules-purge=false && pnpm --filter @helix-x-rawla/backend build` |
| Start Command | `pnpm run start:backend` (or `cd apps/backend && node dist/main`) |
| Health Check Path | `/api/health` |
| Disk | Mount path `/var/data`, 1 GB to start |

**Environment:**

| Key | Value |
|---|---|
| `NPM_TOKEN` | base64 of `user:password` for Nexus (above) |
| `NODE_ENV` | `production` |
| `DB_PATH` | `/var/data/helix_x.db` — on the disk, or it is lost on every deploy |
| `DOCUMENTS_LOCAL_ROOT` | `/var/data/documents` — uploads, on the same disk |
| `DB_AUTO_MIGRATE` | `true` — applies pending migrations at every start (below) |
| `TRUST_PROXY` | `2` — Render's edge, then the static site's rewrite. If the contact form's per-IP limit treats every visitor as one, the hop count is wrong. |
| `JWT_SECRET`, `OAUTH_JWT_SECRET`, `DOCUMENTS_SIGNING_SECRET` | three **different** random values (`openssl rand -base64 48`); the signing secret needs 32+ characters |
| `JWT_EXPIRES_IN` | `7d` |
| `MAIL_TRANSPORT` | `gmail` |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | the sending Gmail address and a [Google App Password](https://myaccount.google.com/apppasswords) — not the account password; it needs 2-Step Verification |
| `MAIL_FROM` | `Rajputana Rawla <that-same@gmail.com>` — Gmail rewrites any other sender |
| `CONTACT_TO_EMAIL` | where Contact Us messages go; comma-separate several |
| `PAYMENT_PROVIDER` | `stripe` (`console` is refused in production) |
| `STRIPE_SECRET_KEY` | `sk_test_…` until you take real payments |
| `STRIPE_WEBHOOK_SECRET` | a placeholder until step 3 gives the real one |
| `PORTAL_PUBLIC_URL`, `API_PUBLIC_URL` | both the **frontend's** URL (step 2) — emailed links, the Stripe return URL and document links are built from them |

`pnpm run start:backend` runs through turbo, which by default hides every
environment variable `turbo.json` does not declare — the backend then fails
with `Configuration key "OAUTH_JWT_SECRET" does not exist` although the key is
set on Render. `turbo.json` passes the whole environment through to the
`start`, `dev` and `preview` tasks (`"passThroughEnv": ["*"]`) for this reason;
keep it there.

**The schema.** With `DB_AUTO_MIGRATE=true` the first start on the empty disk
applies every migration (the framework's, then the portal's), and each later
deploy applies only the new ones — before the app serves anything. A SQLite
copy is kept at `/var/data/helix_x.db.pre-migrate-<time>` before each batch;
delete old ones now and then. Leave it unset if you would rather apply each
upgrade yourself: the backend then refuses to start on a database that is
behind and lists the files, and `cd apps/backend && node dist/database/migrate-cli.js`
in the service's **Shell** applies them. More in
[Database and migrations](/setup/database.md).

The new portal has the two administrators, the chapters, the navigation
config and the reference values from the migrations, and no members. Don't run
`seed:sample` against it: sample data is for development databases only.

## 2. The frontend: `rawla-frontend`

**New → Static Site**, this repo.

| Setting | Value |
|---|---|
| Build Command | `node scripts/registry-login.mjs && pnpm install --frozen-lockfile --prod=false --config.confirm-modules-purge=false && pnpm --filter @helix-x-rawla/frontend... build` |
| Publish Directory | `apps/frontend/dist` |
| Environment | `NPM_TOKEN`, as above |

`@helix-x-rawla/frontend...` builds the frontend **and** the API client it
depends on. The build reads the committed `apps/frontend/.env.production`:
`VITE_API_SERVER` is empty, so the app calls `/api` on its own origin, and
`VITE_*` flags are baked in at build time — change one, rebuild.

**Redirects/Rewrites**, in this order:

| Source | Destination | Action |
|---|---|---|
| `/api/*` | `https://<rawla-backend>.onrender.com/api/*` | Rewrite |
| `/*` | `/index.html` | Rewrite |

The first sends API calls to the backend (what nginx does in the image); the
second lets a deep link such as `/members/me` load the app. After the first
deploy, check that `/`, a deep link, `/guide/` and `/api/health` all load
through the frontend's URL.

## 3. After the first deploy

1. **Set the public URLs.** Put the frontend's URL (or your custom domain) in
   both `PORTAL_PUBLIC_URL` and `API_PUBLIC_URL` on `rawla-backend`, and save,
   which redeploys.
2. **Add the Stripe webhook.** In the Stripe dashboard, **Developers →
   Webhooks → Add endpoint**:
   - URL: `https://<rawla-backend>.onrender.com/api/payments/stripe/webhook`
   - event: `checkout.session.completed`

   Put the endpoint's signing secret (`whsec_…`) in `STRIPE_WEBHOOK_SECRET`.
   Dues settle only when this signed webhook arrives.
3. **Make yourself an administrator.**
   1. Join through `/join` and verify your email, so the account exists.
   2. In **rawla-backend → Shell**, grant `super_admin` through the app's own
      `better-sqlite3` driver:

      ```bash
      cd apps/backend && node -e "
      const db = require('better-sqlite3')(process.env.DB_PATH);
      const r = db.prepare(\"INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower(?) AND r.name = 'super_admin'\").run(process.argv[1]);
      console.log(r.changes ? 'granted super_admin to ' + process.argv[1] : 'nothing changed: no such user, or already super_admin');
      " you@example.com
      ```

   `super_admin` holds every permission the migrations create. Sign out and
   back in afterwards, because roles are baked into the JWT at login.

## Upgrading

Push to the branch the services deploy from; Render rebuilds both. With
`DB_AUTO_MIGRATE=true` the backend applies the release's new migrations —
including a framework migration from a new `@helix-x/backend` — before it
starts. A migration that fails stops the start, leaves the database at the
last file that completed, and the previous deploy keeps serving.

A framework upgrade is a version bump of `@helix-x/*` in this repo plus the
refreshed lockfile, committed like any other change.

## Backups and data

- **Snapshots.** Render snapshots the disk daily; restore from
  **rawla-backend → Disks**.
- **Before each migration batch** a copy is kept beside the database
  (`helix_x.db.pre-migrate-<time>`), when `DB_AUTO_MIGRATE` is on.
- **Manual copy.** For a copy you hold yourself, use SQLite's online backup
  from the Shell:
  `cd apps/backend && node -e "require('better-sqlite3')(process.env.DB_PATH).backup('/var/data/backup-' + Date.now() + '.db')"`.
- **Uploaded documents share the disk.** They are files under
  `/var/data/documents`, and the database holds only their metadata, so
  restore the two together. The 1 GB disk fills quickly with uploads of up to
  50 MB each: grow it under **rawla-backend → Disks**, or move the files to a
  bucket with `DOCUMENTS_STORAGE_DRIVER=s3` and the `DOCUMENTS_S3_*` keys
  ([Backend runtime](/setup/configuration.md#backend-runtime)).
- **Never delete the disk.** Deleting the disk, or the `rawla-backend`
  service, deletes the database and every uploaded document.

## PostgreSQL instead of the disk

Create a Render Postgres database, then on `rawla-backend` set
`DB_TYPE=postgres` and `DATABASE_URL` to its **internal** connection string,
and remove the disk (and `DB_PATH`). That also lifts the single-instance and
deploy-downtime limits: with `DB_AUTO_MIGRATE=true`, an advisory lock makes
instances that start together apply each migration once. Uploaded documents
then need `DOCUMENTS_STORAGE_DRIVER=s3`, since there is no disk to keep them on.
