# syntax=docker/dockerfile:1.7
#
# Rawla portal frontend: the Vite bundle, served by nginx, which also proxies
# /api to the backend (BACKEND_UPSTREAM).
#
# Build from the rawla repo root (`pnpm docker:build:frontend`). The build
# context is the helix-x WORKSPACE ROOT (../..), not this repo: the app links
# @helix-x/* from ../../framework/helix-x-web (source) and
# ../../framework/helix-x-core-sdk, and styles.css points Tailwind at
# ../../../../../framework/helix-x-web. The image mirrors the workspace layout —
# /ws/framework beside /ws/example/helix-x-rawla — so every one of those
# relative paths resolves unchanged.
#
# Ignore rules live in Dockerfile.dockerignore beside this file (see the backend
# Dockerfile for why it is not a plain .dockerignore).

ARG NODE_VERSION=22
ARG NGINX_VERSION=1.27

# ── build ──────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS build
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable

# helix-x-web is linked from source, and a linked package resolves its own
# imports (and the design system's Tailwind CSS) from ITS node_modules — so the
# framework checkout needs its own install. Corepack picks the pnpm version its
# package.json pins, which differs from this repo's.
WORKDIR /ws/framework/helix-x-web
COPY framework/helix-x-web/ ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# @helix-x/core-sdk is consumed from its dist/, built here rather than trusted
# from the host.
WORKDIR /ws/framework/helix-x-core-sdk
COPY framework/helix-x-core-sdk/ ./
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile \
 && pnpm build

# This app: manifests first so the install layer caches across source edits.
# Every workspace package.json is copied so the lockfile's importers match.
WORKDIR /ws/example/helix-x-rawla
COPY example/helix-x-rawla/package.json example/helix-x-rawla/pnpm-lock.yaml example/helix-x-rawla/pnpm-workspace.yaml ./
COPY example/helix-x-rawla/apps/frontend/package.json apps/frontend/
COPY example/helix-x-rawla/apps/backend/package.json apps/backend/
COPY example/helix-x-rawla/packages/client-sdk/package.json packages/client-sdk/
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @helix-x-rawla/frontend...

COPY example/helix-x-rawla/tsconfig.base.json ./
COPY example/helix-x-rawla/packages/client-sdk/ packages/client-sdk/
COPY example/helix-x-rawla/apps/frontend/ apps/frontend/

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

COPY example/helix-x-rawla/apps/frontend/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --chmod=0755 example/helix-x-rawla/apps/frontend/nginx/15-backend-upstream.envsh /docker-entrypoint.d/15-backend-upstream.envsh
COPY --from=build /ws/example/helix-x-rawla/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/" || exit 1
