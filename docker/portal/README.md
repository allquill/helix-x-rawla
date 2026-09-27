# portal

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

## Making yourself an administrator

A fresh account has no roles. `apps/backend/sql/admin-seed.sql` grants them.
Edit `:admin_email` at the top of it first. The database is on the host, so
run it with your own `sqlite3`, from this directory. This is safe while the
stack is running:

```bash
sqlite3 docker-volume/data/helix_x.db < ../../apps/backend/sql/admin-seed.sql
```

Then sign out and back in, because roles are baked into the JWT at login.

## Stopping

```bash
docker compose down        # stops and removes the containers; the database file stays
rm -rf docker-volume       # deletes the database (`down -v` does NOT — it is a host folder)
```
