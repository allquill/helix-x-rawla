# Install and run

For a developer's machine. To put the portal on a server, see
[Deploying with Docker](/setup/deploy-docker.md).

## What you need

- Node.js 22 or newer, and pnpm 9.12.0
- `sqlite3` on the command line (or a PostgreSQL server — see
  [Database and migrations](/setup/database.md#local-development-postgresql))
- Access to the Nexus npm registry. The framework (`@helix-x/web`,
  `@helix-x/backend`, `@helix-x/core-sdk`) is installed from
  `packages.allquill.com` like any other dependency. The repo's `.npmrc`
  names the registry; your credential goes in your own `~/.npmrc`, once:

```bash
export NPM_TOKEN=$(printf 'user:password' | base64)   # your Nexus account
pnpm registry:login                                  # writes it to ~/.npmrc, once
```

## Install

```bash
pnpm install

cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

No framework checkout is needed. To run against framework changes that are
not released yet, see "Working against unreleased framework code" in
`CLAUDE.md` (`pnpm fw:local`).

## Create the database

The backend never creates tables. Apply every migration by hand, the
framework's first:

```bash
mkdir -p apps/backend/data
for f in apps/backend/node_modules/@helix-x/backend/migrations/sqlite/*.sql \
         apps/backend/migrations/sqlite/*.sql; do
  echo "applying $f"; sqlite3 -bail apps/backend/data/helix_x.db < "$f" || break
done
```

The order is not optional — see
[why](/setup/troubleshooting.md#a-screen-is-missing-although-the-migration-was-applied).
PostgreSQL, upgrades and the details are in
[Database and migrations](/setup/database.md).

## Run

```bash
pnpm dev:backend     # http://localhost:3001  (API docs at /docs)
pnpm dev:frontend    # http://localhost:5173
pnpm seed:sample     # optional: sample members; needs the backend running
```

Only one Helix-X product can run at a time: they all use the same ports.

Sign in with one of the two first-install administrators — see
[The first sign-in](/setup/first-sign-in.md).

## Email and payments while developing

Out of the box nothing leaves your machine:

- **Mail** is captured rather than sent (`MAIL_TRANSPORT=console`). Read it at
  <http://localhost:3001/api/dev/outbox> — that is where confirmation, password
  and event emails appear, with their links.
- **Payments** take no money (`PAYMENT_PROVIDER=console`). "Paying" opens a
  backend address that settles on the spot and returns to the portal.

Both are refused in production. See [Configuration](/setup/configuration.md).

## Everyday commands

| Command | What it does |
|---|---|
| `pnpm build` | Builds everything — the repo-wide check |
| `pnpm typecheck` / `pnpm test` / `pnpm lint` | The other checks |
| `pnpm generate:sdk` | Regenerates the API client after a backend endpoint changes (backend must be running); restart the frontend afterwards |
| `pnpm db:schema:log` | Shows any difference between the code's entities and the database |
| `pnpm guide` | Serves this guide at <http://localhost:4000> |
