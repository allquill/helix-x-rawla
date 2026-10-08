# syntax=docker/dockerfile:1.7
#
# Rawla portal frontend: the Vite bundle, served by nginx, which also proxies
# /api to the backend (BACKEND_UPSTREAM).
#
# Build from the rawla repo root (`pnpm docker:build:frontend`); the build
# context is this repo and nothing outside it. @helix-x/web and
# @helix-x/core-sdk are installed from Nexus like every other dependency, and
# Tailwind finds the framework's classes through the theme it imports from
# @helix-x/web, so the image needs no framework checkout.
#
# The registry credentials arrive as a BuildKit secret (`--secret id=npmrc`),
# mounted only for the install step — never in a layer, never in the image.
# The secret is a user-level .npmrc holding the credential (`pnpm registry:login`
# writes it to ~/.npmrc); the committed .npmrc in the context names the registry.
#
# Ignore rules live in Dockerfile.dockerignore beside this file (see the backend
# Dockerfile for why it is not a plain .dockerignore).

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# ── build ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# This app: manifests first so the install layer caches across source edits.
# Every workspace package.json is copied so the lockfile's importers match.
# .pnpmfile.cjs is a no-op here (HELIX_FRAMEWORK is unset), but the lockfile
# records its checksum, so --frozen-lockfile needs it present.
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.cjs .npmrc ./
# A lockfile written by `pnpm fw:local` / `fw:packed` points at a framework
# checkout the image does not have; say so instead of ERR_PNPM_OUTDATED_LOCKFILE.
COPY scripts/check-lockfile.mjs scripts/
RUN node scripts/check-lockfile.mjs
COPY apps/frontend/package.json apps/frontend/
COPY apps/backend/package.json apps/backend/
COPY packages/client-sdk/package.json packages/client-sdk/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    --mount=type=secret,id=npmrc,target=/root/.npmrc,required=true \
    pnpm install --frozen-lockfile --filter @helix-x-rawla/frontend...

COPY tsconfig.base.json ./
COPY packages/client-sdk/ packages/client-sdk/
COPY apps/frontend/ apps/frontend/
# The guide (docsify). `vite build` copies it to dist/guide/, served at /guide/.
COPY docs/ docs/

# `vite build` runs in production mode and reads the committed .env.production:
# VITE_API_SERVER is empty, so the bundle calls /api on its own origin.
RUN pnpm --filter @helix-x-rawla/client-sdk build \
 && pnpm --filter @helix-x-rawla/frontend build

# ── runtime ────────────────────────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}-alpine AS runtime

# Where /api is proxied. The default matches a compose service named `backend`;
# a bare host:port, as some platforms give private-service addresses, is
# accepted too. PORT is what nginx listens on: platforms such as Render, Heroku
# and Cloud Run set it; 80 otherwise.
ENV BACKEND_UPSTREAM=http://backend:3001 \
    PORT=80 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY apps/frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=0755 apps/frontend/nginx/15-backend-upstream.envsh /docker-entrypoint.d/15-backend-upstream.envsh
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1
