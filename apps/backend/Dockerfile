# syntax=docker/dockerfile:1.7
#
# Rawla portal API.
#
# Build from the rawla repo root (`pnpm docker:build:backend`); the build
# context is this repo and nothing outside it. @helix-x/backend is installed
# from Nexus like every other dependency, so the image needs no framework
# checkout.
#
# The registry credentials arrive as a BuildKit secret (`--secret id=npmrc`),
# mounted only for the install steps — never in a layer, never in the image.
# The secret is a user-level .npmrc holding the credential (`pnpm registry:login`
# writes it to ~/.npmrc); the committed .npmrc in the context names the registry.
#
# Ignore rules live in Dockerfile.dockerignore beside this file: BuildKit reads
# `<Dockerfile>.dockerignore` in preference to a `.dockerignore` at the context
# root, so the frontend and backend images keep separate allow-lists.

ARG NODE_VERSION=22

# ── base: toolchain for native modules ─────────────────────────────────────
# bcrypt@5 downloads a prebuilt binary and falls back to compiling; glibc
# (bookworm) matches the prebuilds of both it and better-sqlite3@13.
FROM node:${NODE_VERSION}-bookworm-slim AS base
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
 && rm -rf /var/lib/apt/lists/*
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Everything pnpm needs to resolve the backend's graph from the lockfile.
# Every workspace package.json is copied, not just the backend's, so the
# lockfile's importers match the workspace and --frozen-lockfile holds.
FROM base AS manifests
# .pnpmfile.cjs is a no-op here (HELIX_FRAMEWORK is unset), but the lockfile
# records its checksum, so --frozen-lockfile needs it present.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs .npmrc ./
# A lockfile written by `pnpm fw:local` / `fw:packed` points at a framework
# checkout the image does not have; say so instead of ERR_PNPM_OUTDATED_LOCKFILE.
COPY scripts/check-lockfile.mjs scripts/
RUN node scripts/check-lockfile.mjs
COPY apps/backend/package.json apps/backend/
COPY apps/frontend/package.json apps/frontend/
COPY packages/client-sdk/package.json packages/client-sdk/

# ── build: full install, compile ───────────────────────────────────────────
FROM manifests AS build
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --filter @helix-x-rawla/backend...
COPY tsconfig.base.json ./
COPY apps/backend/ apps/backend/
RUN pnpm --filter @helix-x-rawla/backend build

# ── prod-deps: runtime dependencies only ───────────────────────────────────
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    pnpm install --prod --frozen-lockfile --filter @helix-x-rawla/backend...

# ── runtime ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/helix_x.db \
    MIGRATIONS_DIR=/opt/migrations

# The sqlite3 CLI, so the numbered migrations can be applied by hand inside the
# container (docker exec) — the app changes the schema only with DB_AUTO_MIGRATE=true.
RUN apt-get update \
 && apt-get install -y --no-install-recommends sqlite3 \
 && rm -rf /var/lib/apt/lists/*

# Same paths as the build: pnpm's node_modules are relative symlinks into the
# root store, so the layout has to survive the copy.
WORKDIR /app/apps/backend
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=prod-deps /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY apps/backend/package.json ./
COPY --chmod=0755 apps/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# The numbered SQL migrations, for applying by hand from inside the container —
# both tracks, the framework's first:
#   sqlite3 -bail /data/helix_x.db < /opt/migrations/helix-x/sqlite/000N_*.sql
#   sqlite3 -bail /data/helix_x.db < /opt/migrations/rawla/sqlite/000N_*.sql
# The framework's ship inside @helix-x/backend; -L copies them out of the pnpm
# store rather than as a symlink into it.
COPY apps/backend/migrations/ /opt/migrations/rawla/
RUN cp -rL node_modules/@helix-x/backend/migrations /opt/migrations/helix-x

# SQLite lives on a volume, so the database outlives the container.
# No `USER node` here on purpose: the entrypoint starts as root, makes the
# database directory writable (a platform's persistent disk, a Linux bind mount
# or a Kubernetes volume can arrive root-owned), then drops to `node` before
# the app runs.
RUN mkdir -p /data && chown node:node /data
VOLUME /data

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
