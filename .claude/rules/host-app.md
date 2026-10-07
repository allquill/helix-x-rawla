---
paths:
  - "apps/**"
---

# This repository holds hosts, not framework

Every directory under `apps/` is an *application*: wiring, configuration and
schema. Framework code does not belong here.

Before adding a file, ask where it belongs:

| What you are writing | Where it goes |
| --- | --- |
| A reusable React component | `helix-x-web/packages/design-system` |
| A feature: screens, routes, commands | `apps/frontend/src/plugins/<name>/` — **here** |
| A feature *every* Helix-X app would want | `helix-x-web/plugins/plugin-<name>` |
| A kernel capability | `helix-x-web/packages/core` |
| A **reusable** NestJS module — auth, notifications, a protocol | `helix-x-backend/packages/<name>` |
| A **product** feature with an API: entity, service, endpoints | `apps/backend/src/modules/<name>` — **here** |
| **Composition, env, schema, deployment concerns** | **here** |

**This is a product repo, not the reference app.** Unlike `helix-x-demo` —
whose plugins are first-party examples that ship inside `helix-x-web` — the
Rawla portal's five plugins are *this product's own* and belong here, as
app-local plugins under `apps/frontend/src/plugins/<name>/`, registered in
`plugins.ts`, depending on nothing but `@helix-x/web`. An app-local plugin is
still code-split and lazily activated; the rule below is about host *wiring*,
not about location.

Promote a plugin to `helix-x-web` only when a *different* application would
install it. "The chapters screen is quite generic" is not that test.

A page component, a route registration or a nav item written in `apps/frontend`
is a mistake: it cannot be lazily loaded, it cannot be reused, and it defeats the
plugin architecture. Contribute it from a plugin instead — the only file in this
app that should change to add a feature is `src/plugins.ts`.

**The backend rule is not the same shape**, and the difference is deliberate.
There is no plugin kernel on that side: a NestJS feature module in
`apps/backend/src/modules/<name>/` *is* the supported extension point, and
`CommunityCoreModule` is this product's domain module. The split there is by
reusability, not by layer. Something another product would install
belongs in `helix-x-backend`; something that only makes sense for this product
stays here. What is still a mistake is writing feature logic into
`app.module.ts`, `main.ts` or `src/controllers/` — those are composition and
bootstrap, and `GET /health` is all `src/controllers/` should ever hold.

## Changing a library while working here

The framework arrives as three Nexus packages — `@helix-x/web`,
`@helix-x/backend`, `@helix-x/core-sdk` — pinned exactly. A framework change
reaches this app by being **released** there and **bumped** here (all three
versions together). To try one before it is released, use local mode
(`CLAUDE.md`, "Working against unreleased framework code"), and never commit
the lockfile it writes.

The four sides propagate differently:

- **`helix-x-web`**, in local mode (`pnpm fw:local`), is linked from source.
  Edits are live; no build, no reinstall.
- **`helix-x-backend`**, even in local mode, is installed from a tarball. After
  editing it: `pnpm run pack` there, then `pnpm fw:local` here. **Skipping this
  silently keeps running the previous build** — the symptom is a change that
  appears to have no effect. It is `pnpm run pack`: `pack` is a built-in pnpm
  command that shadows the script and exits 0 without repacking.
- **`packages/client-sdk`** (`@helix-x-rawla/client-sdk`) is this app's own half
  of the API client. After adding or changing an endpoint **in this repo**:
  `pnpm generate:sdk` with the backend up on :3001, then restart Vite.
  `pnpm codegen` alone rewrites `src/` and leaves everyone reading the previous
  build.
- **`@helix-x/core-sdk`** is the framework's half, and is regenerated in
  `framework/helix-x-core-sdk` — **not** from this app. It reads
  `apps/openapi-host` in `helix-x-backend` on **:3101**; start it there with
  `pnpm openapi:dev`. Rebuild `helix-x-backend` first, or the host still serves
  the previous build and the regeneration produces no diff.

Which half an endpoint belongs to is decided by the `@helix-x-core-api` Swagger
tag. Every framework controller carries it, this app's controllers do not, and
`helix-x-backend/scripts/check-core-api-tags.mjs` fails the build if one is
forgotten. Adding that tag to a controller *here* would make the endpoint vanish
from both clients — codegen here subtracts it, and core-sdk never saw it.

## Module-resolution failures usually mean duplication

Three symptoms, one cause — a package resolved twice, once from a sibling
checkout and once from here. A registry install cannot do this (the framework
peers every such package); local mode can:

- `Nest can't resolve dependencies of the …Repository (?)` — two
  `TypeOrmModule` classes: the backend was linked instead of installed from a
  tarball. The fix is the install, not an import change.
- "Invalid hook call", or requests going out unauthenticated to a relative URL —
  duplicate `react` or `@helix-x-rawla/client-sdk`. The fix is `resolve.dedupe` in
  `apps/frontend/vite.config.ts` plus the matching tsconfig `paths`.
- A session that expires server-side and never signs the user out — duplicate
  `axios`. The SDK calls through the global axios instance and `plugin-auth`
  installs its 401 handler on the global axios instance; two copies means two
  globals. Same fix, same lists.

Add to both lists together; they must agree. Anything deduped must also be a
direct dependency of `apps/frontend` — dedupe resolves from the app root, so
deduping an undeclared package breaks `vite build` outright.

## Every app is a template

Someone will copy one of these to start a real product. Keep them honest:

- No dead configuration, no commented-out alternatives.
- `.env.example` lists every variable the app actually reads, with a comment
  saying what breaks without it.
- Secrets are never committed. `JWT_SECRET` must match between the backend and
  the MCP server; `OAUTH_JWT_SECRET` must differ from `JWT_SECRET`.
