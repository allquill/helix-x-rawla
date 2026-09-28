# syntax=docker/dockerfile:1.7
#
# Rawla portal API.
#
# Build from the rawla repo root (`pnpm docker:build:backend`). The build
# context is the helix-x WORKSPACE ROOT (../..), not this repo: the backend
# installs @helix-x/* from ../../framework/helix-x-backend/.artifacts/*.tgz,
# and those relative paths only resolve if the image mirrors the workspace
# layout — /ws/framework beside /ws/example/helix-x-rawla.
#
# Ignore rules live in Dockerfile.dockerignore beside this file: BuildKit reads
# `<Dockerfile>.dockerignore` in preference to a `.dockerignore` at the context
# root, which here would be outside this repo.
#
# The image bakes whatever tarballs are in .artifacts/ — run `pnpm run pack` in
# helix-x-backend first, or it ships the previous framework build.

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
WORKDIR /ws/example/helix-x-rawla

# Everything pnpm needs to resolve the backend's graph from the lockfile.
# Every workspace package.json is copied, not just the backend's, so the
# lockfile's importers match the workspace and --frozen-lockfile holds.
FROM base AS manifests
COPY framework/helix-x-backend/.artifacts/ /ws/framework/helix-x-backend/.artifacts/
COPY example/helix-x-rawla/package.json example/helix-x-rawla/pnpm-lock.yaml example/helix-x-rawla/pnpm-workspace.yaml ./
COPY example/helix-x-rawla/apps/backend/package.json apps/backend/
COPY example/helix-x-rawla/apps/frontend/package.json apps/frontend/
COPY example/helix-x-rawla/packages/client-sdk/package.json packages/client-sdk/

# ── build: full install, compile ───────────────────────────────────────────
FROM manifests AS build
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @helix-x-rawla/backend...
COPY example/helix-x-rawla/tsconfig.base.json ./
COPY example/helix-x-rawla/apps/backend/ apps/backend/
RUN pnpm --filter @helix-x-rawla/backend build

# ── prod-deps: runtime dependencies only ───────────────────────────────────
# The framework tarballs are unpacked into node_modules/.pnpm here, so the
# runtime image needs nothing from /ws/framework.
FROM manifests AS prod-deps
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --prod --frozen-lockfile --filter @helix-x-rawla/backend...

# ── runtime ────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/data/helix_x.db \
    RUN_MIGRATIONS=true

# Same paths as the build: pnpm's node_modules are relative symlinks into the
# root store, so the layout has to survive the copy.
WORKDIR /ws/example/helix-x-rawla/apps/backend
COPY --from=prod-deps /ws/example/helix-x-rawla/node_modules /ws/example/helix-x-rawla/node_modules
COPY --from=prod-deps /ws/example/helix-x-rawla/apps/backend/node_modules ./node_modules
COPY --from=build /ws/example/helix-x-rawla/apps/backend/dist ./dist
COPY example/helix-x-rawla/apps/backend/package.json ./
COPY --chmod=0755 example/helix-x-rawla/apps/backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

# SQLite lives on a volume, so the database outlives the container.
# No `USER node` here on purpose: the entrypoint starts as root, makes the
# database directory writable (a platform's persistent disk, a Linux bind mount
# or a Kubernetes volume can arrive root-owned), then drops to `node` before
# migrations and the app run.
RUN mkdir -p /data && chown node:node /data
VOLUME /data

EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
