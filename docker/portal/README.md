# portal

> Full reference, including every environment variable: [DEPLOY.md](../../DEPLOY.md).

The Rawla backend and frontend images, run together on their own network.

```bash
cd docker/portal
cp .env.example .env                    # registry, image tags, data folder, ports
cp backend.env.example backend.env      # backend config and secrets — required
docker compose up -d                    # or `pnpm docker:up` from the repo root
```

| URL | What |
|---|---|
| http://localhost:8080 | The portal. `/api` is proxied to the backend by the frontend's nginx. |
| http://127.0.0.1:3001/docs | Swagger, straight from the backend (published on localhost only). |
| http://localhost:8080/api/dev/outbox | Captured mail — verification and reset links (`MAIL_TRANSPORT=console`). |

The images come from `DOCKER_REGISTRY` (`docker.allquill.com` in
`.env.example`). The first `up` pulls them; after that, `docker compose pull`
fetches updates. Log in to the registry once with
`docker login docker.allquill.com`. To run images you built yourself with
`pnpm docker:build` instead, leave `DOCKER_REGISTRY` empty.

The frontend waits for the backend to report healthy, which happens only after
its migrations have run. The first start takes a few seconds longer.

## Two env files, on purpose

- **`.env`** is read by Compose itself. It holds the image names and tags, the
  data folder, the network and the host ports. It never reaches a container.
- **`backend.env`** is handed to the backend container. It holds the app config
  and the secrets: JWT, mail, Stripe. It is gitignored. The full list, with an
  explanation of each setting, is `apps/backend/.env.example`.

`DB_PATH` and `TRUST_PROXY` are set in `docker-compose.yml` rather than in
either file, because this topology fixes them.

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
gitignored. A new folder starts from an empty database, and the migrations run
into it. Pointing at an existing folder reuses its database.

## Starting from sample data

The backend image bundles a sample database: 21 members in every status across
five chapters, with households, an audit trail and reference data. To start
from it instead of an empty portal:

```bash
# .env
SEED_SAMPLE_DB=true
DOCKER_VOLUME_FOLDER=./docker-volume-demo   # must not hold a database yet
```

On first start the backend copies the sample into the empty folder, then runs
any newer migrations over it. Sign in as **`admin@example.com` /
`Password!1`**. Members are `<first>.<last>@example.test` / `Rawla!Demo1`.

- **An existing database is never overwritten,** so leaving the flag on is
  harmless. Delete the folder to re-seed.
- **The credentials are published,** so this is for demos only.
- **To refresh the sample,** run `pnpm build && pnpm docker:sample-db`, then
  rebuild or push the backend image. See `apps/backend/seed/README.md`.

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

Sign out and back in, because roles are baked into the JWT at login. Avoid
`apps/backend/sql/admin-seed.sql` on a real database: it also inserts five
sample accounts with published passwords. See
[DEPLOY.md §6](../../DEPLOY.md#6-running-with-docker-compose).

## Stopping

```bash
docker compose down        # stops and removes the containers; the database file stays
rm -rf docker-volume       # deletes the database (`down -v` does NOT — it is a host folder)
```
