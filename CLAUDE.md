# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code
in this repository.

`helix-x-rawla` is the **Rajputana Rawla of America member portal**: two hosts
that compose the Helix-X libraries, plus this product's own screens, domain logic
and schema. Framework code does not belong here — if you are about to write
something reusable, it belongs in one of the sibling repos instead:

| Repo | Holds |
| --- | --- |
| [`helix-x-web`](../../framework/helix-x-web) | React plugin kernel, bindings, shell, design system, first-party plugins |
| [`helix-x-backend`](../../framework/helix-x-backend) | NestJS modules (auth, notifications, navigation, OAuth, documents) |
| `helix-x-rawla` (here) | two host apps, eight portal plugins, the `community-core`, `events`, `payments` and `portal-files` backend modules, and the generated client |

Note the client SDK is **not** shared with the other products. Each owns its own
at `packages/client-sdk`, generated from its own backend; only the framework half,
`@helix-x/core-sdk`, is common, and it is regenerated in `framework/` from
`apps/openapi-host`, never from a product's backend. Regenerating here therefore
cannot affect anyone else — which was not true of the single shared SDK this
replaced.

`.claude/rules/*.md` are path-scoped and attach automatically.

[`docs/`](docs/) is the reader-facing guide — a docsify site in two parts, a
**User Guide** for members and **Setup and Administration**. `pnpm guide`
serves it on :4000 (not `pnpm docs`, a built-in npm command); the frontend
ships the same folder at `/guide/` (a small plugin in `vite.config.ts` serves
it in dev and copies it at build; nginx has a `location /guide/`), and the
`help` plugin links to it. `.claude/rules/docs-upkeep.md` maps each kind of
change to the page that covers it. It is static and readable without signing
in, so nothing secret goes in it.

## What this product is

A membership portal for a US-based community organisation with geographic
chapters. The core of the domain is the **three activation gates**: a member is
active only when their email is verified, an administrator has approved them,
and their dues are settled.

```
is_active = is_email_verified AND is_approved AND is_payment_made
            AND status NOT IN ('rejected', 'archived')
```

`is_active` is **derived, never a settable flag** — a database `CHECK`
constraint enforces it, and `MemberActivationService` is the only writer. The
payment gate is deliberately outside that constraint so it can be switched off
wholesale by a portal setting.

`providers/gate-rules.ts` is the single source of truth for which gate blocks a
caller and what to tell them. It is pure, it is unit-tested, and the remediation
hrefs it returns (`/join/status`, `/verify-email`, `/forgot-password`) are
**hardcoded backend-side and must match the frontend route table** — change a
route path and that link 404s with nothing failing at build time.

**Only an unverified email, a rejected application or an archived account
refuses sign-in** (`blocksLogin` in `gate-rules.ts`). Approval and dues are
worked through *signed in*: `MemberGateInterceptor` confines a not-yet-active
member to the `@GateExempt()` routes — their status page, their profile and the
dues checkout — until the last gate closes. Refusing those at login instead is a
dead end, because every one of their remediation pages needs a session.

A blocked login answers with a machine-readable `code`, a `remediation` and the
`gates` snapshot. A *wrong password* always answers `INVALID_CREDENTIALS` with
no gate detail, so the endpoint cannot be used to enumerate accounts. That
asymmetry is the security property; do not "simplify" it.

## Commands

Node ≥ 22, pnpm 9.12.0. Everything runs through Turborepo from the repo root.

```bash
pnpm install          # needs .npmrc with Nexus credentials (see below)
pnpm build            # the repo-wide gate
pnpm typecheck
pnpm test
pnpm lint

pnpm dev:frontend     # :5173   pnpm dev:backend  # :3001
pnpm dev:agents       # :2024   pnpm dev:mcp      # :3002

pnpm generate:sdk   # regenerate the API client

pnpm fw:local         # framework from the sibling checkout (see "How the framework arrives")
pnpm fw:registry      # …and back to the Nexus versions

# a new SQLite DB: every migration by hand, framework track first
# (apps/backend/migrations/README.md: PostgreSQL, Compose, upgrades, seeding)
for f in apps/backend/node_modules/@helix-x/backend/migrations/sqlite/*.sql apps/backend/migrations/sqlite/*.sql; do
  sqlite3 -bail apps/backend/data/helix_x.db < "$f" || break; done
pnpm seed:sample      # sample members via the API; DB_CONTAINER=… for a containerised DB
pnpm db:schema:log    # SQL the entities still need vs the database — drafts a migration, checks drift
pnpm clean            # node_modules, dist, .turbo — a full reinstall follows
```


A single test, per runner:

```bash
# frontend — vitest
pnpm --filter @helix-x-rawla/frontend test -- -t 'every lazy plugin activates'
pnpm --filter @helix-x-rawla/frontend test:watch

# backend — jest
pnpm --filter @helix-x-rawla/backend test -- -t 'should return status ok'
```

Not every app defines every task, and turbo silently skips the ones that don't:
`lint` exists only on the backend, `build` on `frontend`, `backend`
and `client-sdk`,
and `test` only on `frontend` and `backend`. `typecheck` is the one task all four have — reach for
it when a change touches an app turbo would otherwise not visit.

`turbo.json` gives `typecheck` and `test` a `^build` dependency, because the
NestJS apps resolve their libraries from `dist/`.

## How the framework arrives

This is the thing to understand before debugging anything that looks like a
module-resolution problem.

**The framework is three ordinary dependencies from Nexus**
(`packages.allquill.com`), pinned exactly:

| Package | In | Imported as |
| --- | --- | --- |
| `@helix-x/web` | `apps/frontend` | `@helix-x/web` (kernel, React, shell), `@helix-x/web/design-system`, `@helix-x/web/react-router`, `@helix-x/web/plugin-auth`, `@helix-x/web/plugin-auth/manifest`, … |
| `@helix-x/backend` | `apps/backend` | `@helix-x/backend` (every module), or one: `@helix-x/backend/authentication`, `@helix-x/backend/documents`, … |
| `@helix-x/core-sdk` | `apps/frontend`, `packages/client-sdk` | `@helix-x/core-sdk` |

Each is the whole of one framework repo, assembled by that repo's
`scripts/assemble.mjs`; the internal packages (`@helix-x/plugin-auth`,
`@helix-x/authentication`, …) are private to the framework and never installed
here. Versions are `0.0.x`, where a caret matches exactly one version, so
**every framework release is a version bump here** — all three, together.

`.npmrc` (git-ignored) maps `@helix-x` to Nexus and carries your credentials;
CI writes its own, and the Docker builds take it as a BuildKit secret.

**`@helix-x/web` peers everything that must exist once** — `react`,
`react-dom`, `react-router-dom`, `axios`, `zod`, `react-hook-form`,
`@hookform/resolvers`, `@helix-x/core-sdk`, `tailwindcss` — so pnpm resolves
each from `apps/frontend`, and the page has one React, one axios global and one
`OpenAPI` singleton. That is why those are direct dependencies of
`apps/frontend`.

**The API client is two packages, and both resolve `dist/`.**
`@helix-x/core-sdk` is the framework's half, and the `@helix-x/web` plugins
import it. This repo owns the other half in `packages/client-sdk`, whose
`src/core/*.ts` re-export `@helix-x/core-sdk` so the two share one `OpenAPI`
singleton. `apps/frontend` depends on both. A regeneration is not live: see
[The generated client](#the-generated-client).

### Working against unreleased framework code

`.pnpmfile.cjs` points the three packages at the sibling `framework/` checkout,
and does nothing unless `HELIX_FRAMEWORK` is set:

```bash
pnpm fw:local      # web + core-sdk linked from source (plugin edits are live),
                   # backend from its .artifacts tarball
pnpm fw:packed     # all three from .artifacts tarballs — exactly what a release publishes
pnpm fw:registry   # back to Nexus: restores the committed lockfile, reinstalls
```

Both modes need `pnpm run pack` in the framework repo first (in local mode,
only `helix-x-backend`), and both rewrite `pnpm-lock.yaml` with paths into
`framework/`. **Never commit that lockfile** — `pnpm check:lockfile` fails on
it, and so does CI; `pnpm fw:registry` restores the committed one.

**The backend is never linked, even locally.** A symlinked NestJS package
resolves its `@nestjs/*` **peer** dependencies from the library repo, not from
here — so the graph gets two `TypeOrmModule` classes, `forRoot()` registers
into one DI context and a library module's `forFeature()` into the other, and
the app dies on startup with:

```
Nest can't resolve dependencies of the NotificationLogRepository (?).
Please make sure that the argument DataSource at index [0] is available
in the TypeOrmModule context.
```

That error means *duplication*, not a missing import. A tarball extracts into
this repo's own `node_modules`, so peers resolve from here — as a registry
install does. **After changing a backend package in local mode: `pnpm run pack`
there, `pnpm fw:local` here.** Skipping it silently keeps running the previous
build. (`pnpm run pack`, not `pnpm pack` — `pack` is a built-in pnpm command
and shadows the script, exiting 0 without repacking anything.)

## The generated client

`@helix-x-rawla/client-sdk` is generated from **this application's** OpenAPI document
and covers its full API surface — the endpoints composed from `@helix-x/backend`
and this app's own, in one client with one `OpenAPI` singleton. `plugin-auth`
sets `OpenAPI.BASE` and the bearer token once, and every call is covered whoever
declared the controller.

Regenerating, after adding or changing an endpoint here:

```bash
pnpm dev:backend                                  # something must answer on :3001
curl -s localhost:3001/docs-json | head -c 40     # must start {"openapi":"3.0.0"
pnpm generate:sdk         # check-ids, codegen, build
```

Three things bite:

- **`pnpm generate`, not `pnpm codegen`.** Consumers resolve `dist/`, so codegen
  alone rewrites `src/` and leaves everyone reading the previous client. The
  symptom is a new endpoint that is simply not on the SDK.
- **Restart Vite afterwards.** The dev server serves the linked `dist/` through a
  cached transform and does not notice it changed — verified, not assumed.
- **Handler method names become operationIds**, so they must be unique across the
  whole composed app. A collision silently drops an endpoint from the client;
  `check-operation-ids.mjs` runs before every codegen to catch it.

The client used to live in `helix-x-backend`, which meant an app-owned endpoint
could not reach the frontend without writing it into a framework package. It has
its own checkout for that reason.

### Deduplication in the frontend

A registry install resolves every peer of `@helix-x/web` from this app, so
there is one copy of each by construction. **Local mode** (`pnpm fw:local`)
links the framework checkout, whose files resolve their imports from *its*
`node_modules` — the duplication problem in a different costume — and
`apps/frontend` guards against it in four places that must stay in step:

- `vite.config.ts` → `resolve.dedupe` for `react`, `react-dom`,
  `react-router-dom`, **`axios`**, **`@helix-x-rawla/client-sdk`** and the form
  stack — **`zod`**, **`react-hook-form`**, **`@hookform/resolvers`**.
- `vitest.config.ts` → its own `resolve.dedupe` with the same list. Vitest does
  not read `vite.config.ts` here, so a package deduped in one and not the other
  passes `pnpm dev` and fails `pnpm test`, or the reverse.
- `tsconfig.json` → `paths` for the type-level half: `react`, `react-dom` and
  `@helix-x-rawla/client-sdk` (`react-router-dom` ships its own types, so it needs no
  entry).
- `vite.config.ts` → `optimizeDeps.exclude: ['@helix-x/web']`, so Vite serves
  the framework as-is instead of pre-bundling it. Its plugins load through
  dynamic `import()`, which the optimizer would discover one at a time and
  re-bundle mid-session; and in local mode it is what keeps an edit to the
  linked source live. One entry covers every plugin — a new plugin in
  `src/plugins.ts` needs no change here.

**Everything in `resolve.dedupe` must be a direct dependency of
`apps/frontend`.** Dedupe resolves the package from the app root, so deduping
something the app does not declare makes it unresolvable and `vite build` fails
with *"Rollup failed to resolve import"*. That is why `axios` is in
`apps/frontend/package.json` even though no file here imports it.

Duplicate React breaks every hook with "invalid hook call", which says nothing
about duplication. A duplicate SDK is worse because it fails quietly: the SDK
exports a mutable `OpenAPI` singleton, so `plugin-auth` sets the base URL and
bearer token on one copy while every request reads the other — calls go out
unauthenticated to a relative URL. `@helix-x/web` peers `@helix-x/core-sdk`,
so a registry install cannot duplicate it; the entry stays because the failure
is silent if it ever does.

`axios` is the same failure one layer down. `core/request.ts` in the SDK issues
every call through the **global** axios instance, and `plugin-auth` installs its
401 → sign-out interceptor on the **global** axios instance — but linked, they
resolve axios from different checkouts, so without deduping they are two different
globals and the interceptor is installed on one nobody uses. The symptom is a
session that expires server-side and never signs the user out: calls just start
failing.

The form stack fails in the dep optimizer, not in the module graph. Vite
pre-bundles each package **name** once, and whichever copy it meets first serves
every importer — so when the optimizer reached `zod` through the linked
`plugin-auth`, this app's zod-4 schemas silently ran on the framework's zod 3.
The symptom was a registration form that crashed inside zod with *"array.map is
not a function"* on the first invalid submit. The versions now match (the
framework plugins moved to zod 4 / resolvers 5), and the dedupe keeps a future
drift from reaching the page. Check `node_modules/.vite/deps/_metadata.json`:
a `src` path pointing into `framework/helix-x-web` means the wrong copy won.

Duplicate `@types/react` produces the same class of confusion at compile time:
identical versions from two pnpm stores are *not* the same type, so library
source that typechecks in its own repo fails here. Hence the tsconfig `paths`.

All of this is local-mode scaffolding: a registry install needs none of it,
and it costs nothing there.

## The two apps

**`apps/frontend`** — `createApplication`, the plugin registry in
`src/plugins.ts`, and host contributions. The only file that changes to add a
feature is `plugins.ts`. Feature flags are `PluginRegistration.enabled`, read from
`import.meta.env`; there is no separate flag registry, and flags are inlined at
bundle time so **restart Vite after changing one**.

The SDK base URL is host configuration: it goes in `settingsDefaults` as
`helix.auth.apiBaseUrl`, and `plugin-auth` configures `OpenAPI.BASE` from there.
A plugin must never invent a URL.

**The host does not seed a user.** `createApplication` is called with no `user`,
so the app starts signed out; `plugin-auth` resolves the real identity from the
backend during `onStartup`. A host that seeded one would be asserting an
identity the backend never issued — every `when` clause would gate on a fiction
and the first API call would 401. (An earlier version of this app shipped a
"switch user" button that did exactly that. It has been removed.)

`/` is public and owned by the **`home` plugin**, not by `plugin-dashboard` —
which is why `plugin-dashboard` is not registered at all. Two enabled plugins
declaring the same path is a conflict, not a merge. `plugin-chat` is absent for a
different reason: it proxies a LangGraph agents server this repo does not run.

`plugin-documents` (My files, Shared with me) is registered behind
`VITE_FEATURE_DOCUMENTS`. Its routes and nav gate on `documents:read`, which
arrives with this app's migration `0003` — so an account that signed in before
the migration sees nothing until it signs in again.

`/` declares `layout: 'app.full'`: full width, no sidebar, no content gutter, so
the hero runs edge to edge. The primary nav moves into the header there, which is
what keeps the rest of the app reachable from a page with no rail.

**The eight portal plugins** live in `apps/frontend/src/plugins/`: `events`, `volunteers`, `help` (manifest-only: links to the guide), `home`,
`registration`, `members`, `chapters`, `membership-admin`. Each is `manifest.ts`
(plain data) plus `index.tsx` (`activate()`).

Two rules bite here:

- A route's `when` clause appears **twice** — in the manifest and again in
  `registerRoute`. The manifest's copy gates the route before the plugin loads;
  the other gates it afterwards. They must agree, and both must match the
  `@Permissions()` on the endpoint behind the screen.
- `membership-admin` defines the `portal.sectionnav` slot **in its manifest**,
  not only in `activate()`. That is what lets `chapters` contribute its tab
  without `membership-admin` ever loading. Move it and the Chapters tab silently
  disappears.

Pages take path params **as props** (`RouteViewProps`), never `useParams()` —
there are no `<Route>` elements for it to match against, so it returns `{}`.
`useNavigate` and `<Link>` are fine; React Router still owns the history.

**`apps/backend`** — `app.module.ts` is the canonical composition. Order matters
once, and this app is exactly the case that makes it matter:
`CommunityAuthHooksModule` supplies `AUTH_HOOKS` and must sit **after
`AuthModule` and before `CommunityCoreModule`**. It is `@Global()`, and it must
never import `AuthModule` — nothing it declares may depend on `AuthService`,
because that is a real provider cycle (`AuthService -> AUTH_HOOKS -> AuthService`).

The domain lives in `src/modules/community-core/` — 15 entities, 13 providers,
4 controllers. Things in it that look tidyable but are not:

- `members.user_id` is an **integer** (the framework's `users` PK) while every
  other key in the module is a uuid string. Getting this wrong yields a join
  that silently matches nothing.
- The `CHK_member_active_implies_gates` constraint uses **camelCase** column
  names in its expression. snake_case fails at `CREATE TABLE`.
- `MemberController` declares `me/status` and `me` **before** `:id`. Nest matches
  in declaration order; reorder them and `/members/me` resolves to
  `getPortalMember`.
- `MemberGateInterceptor` is an `APP_INTERCEPTOR`, **not a guard**. A global
  guard runs before each controller's `JwtAuthGuard` and would never see a
  principal.
- The `@ApiTags` split `'Portal Registration'` (public) vs `'Portal
  Registrations'` (admin) is what produces the two separate SDK service classes
  the UI imports.
- Every optional `@Query()` needs an explicit `@ApiQuery({ required: false })`.
  Without it Swagger marks the parameter **required** and the generated client
  demands it — which is how casts creep into the UI hooks to paper over it.

The schema is owned by **numbered SQL files applied by hand**, in two tracks
of one `schema_migrations` table, always applied in this order:

1. **`helix-x`** — the framework's tables (users, roles, permissions, OAuth,
   notifications, tokens, navigation config, documents), shipped **inside
   `@helix-x/backend`** (`node_modules/@helix-x/backend/migrations/`) and
   written in `framework/helix-x-backend`, never here.
2. **`rawla`** — this app's tables and everything the portal needs to run:
   `apps/backend/migrations/{sqlite,postgres}/NNNN_*.sql`.

The backend never migrates. There are no TypeORM migrations, and
`synchronize` is off unless `DB_SYNCHRONIZE=true`. **The app refuses to
start** unless both tracks have reached what this build needs
(`HELIX_SCHEMA_VERSION` from the package, `SCHEMA_VERSION` in
`src/database/schema-version.ts`), and prints the exact `sqlite3` / `psql`
commands, with full file names, in order. So a new `@helix-x/backend`
release that adds a framework migration stops the app until it is applied —
deliberately. `docs/setup/database.md` covers applying them (the short form, with the commands, is `apps/backend/migrations/README.md`).

- The **running app** uses `autoLoadEntities: true`: entities describe the
  schema to TypeORM but never create it.
- **`pnpm db:schema:log`** (the TypeORM CLI on `src/database/data-source.ts`)
  prints the SQL a database still needs to match the entities, or "Your schema
  is up to date". It drafts a new migration and proves there is no drift. It
  has no module graph and reads `src/database/entities.ts` (the framework's
  `HELIX_ENTITIES` plus this app's), so **adding an entity means adding it
  there too**, or it silently drafts nothing for it.
  It loads `.env` first (`src/load-env.ts`); variables set inline still win.

**Two drivers, one set of entities.** `DB_TYPE=sqlite` (default) or `postgres`
(with `DATABASE_URL`), chosen in `src/database/connection.ts`. Every schema or
seeded-data change to this app's track is a **pair**: the same `NNNN_name.sql` in both
`migrations/sqlite/` and `migrations/postgres/`, plus a bump of
`SCHEMA_VERSION`. Entities must stay portable: `type: Date` for timestamps,
`uuidRef()` for uuid FKs, and per-driver SQL expressions in
`src/database/db-type.ts`. Configuration a working portal needs (access,
chapters and state map, navigation overrides, first-install administrators,
reference-list values) is in the migrations; test data never is. **Every row
has one owner:** `pnpm seed:sample` adds sample members through the API, only
reads the SQL-owned rows (and refuses a database without them), and never
writes access or configuration. The full checklist is
`.claude/rules/database-migrations.md`, which attaches automatically.
`src/load-env.ts` must stay the first import in `main.ts` and `data-source.ts`:
entity decorators read `DB_TYPE` when first imported, before `ConfigModule`
would have loaded `.env`.

Serving: global prefix `/api`, Swagger at `/docs`, Scalar at `/docs-scalar`, raw
OpenAPI at `/docs-json`. Everything but two things comes from the composed
library modules: `GET /api/health`, and `apps/backend/src/modules/community-core/` —
the app's own NestJS feature module, and the reference example for adding one.

**A backend feature does not need a change in `helix-x-backend`.** A module in
`apps/backend/src/modules/<name>/` that imports `JwtGuardModule`,
`PermissionsGuard` and `@Permissions()` from `@helix-x/backend` is the supported
extension point; `CommunityCoreModule` is this app's domain and
[`docs/backend/modules.md`](docs/backend/modules.md) walks it. Two constraints
that bite there: handler method names become OpenAPI operationIds and so must be
unique across the whole app, and a `@Permissions()` name does nothing until a
row exists in `permissions` and a role holds it — until then every caller gets
403, admins included.

**Documents are the framework's `DocumentsModule`, composed last** in
`app.module.ts`: private files with folders and sharing behind
`/api/documents`, whose tables are the framework's `0002` and whose client is
in `@helix-x/core-sdk` (the controllers carry `@helix-x-core-api`, so
`pnpm generate:sdk` here never sees them). Bytes go to
`DOCUMENTS_STORAGE_DRIVER`: `local` (default, `DOCUMENTS_LOCAL_ROOT`, which is
`/data/documents` in the image) or `s3`. `DOCUMENTS_SIGNING_SECRET` (32+
characters) signs the short-lived view and download links, and **the app
refuses to boot without it**. Those links are built on `API_PUBLIC_URL` +
`/api` unless `DOCUMENTS_PUBLIC_BASE_URL` says otherwise; get it wrong behind
nginx and every preview is a dead link. Three things that bite:

- `GET /api/document-content/:token` has **no guard on purpose** — the signed
  token is the credential — so `MemberGateInterceptor` sees no principal and
  lets it through. Every other document route is gated: a member who is not
  yet active gets the gate's 403 there, and none is in `FRAMEWORK_GATE_EXEMPT`.
- The upload limit lives in two places: `DOCUMENTS_MAX_FILE_SIZE_MB` (50) and
  `client_max_body_size` on `location /api/documents` in the frontend's nginx
  template (55m). Raise one without the other and uploads fail with 413.
- `multer` is a direct dependency of `apps/backend` although nothing here
  imports it: `@helix-x/documents` peers `multer >=2.1.0`, and
  `@nestjs/platform-express` alone brings 2.0.2.

**Events and volunteers are `src/modules/events/`** (EVT, VOL, certificates),
on two small `@Global()` modules: `payments/` (the checkout gateway and the one
webhook, shared with dues) and `portal-files/` (files governed by the DOC
security levels, not by ownership). Schema and access are migration `0004`.
Things that look tidyable but are not:

- **A closed event takes no write, and there is no reopen** (EVT-26). Every
  mutating service method starts with `assertEventWritable` and the write is
  itself conditional on the status. The one exception is a payment webhook that
  arrives after close: the money was taken, so it settles and is audited.
- **`events:create` is not held by `admin`** — only the three Secretaries and
  `super_admin` (EVT-16). `PermissionsGuard` has no admin bypass; do not "fix"
  the 403.
- **An event document has no level of its own.** `eventDocumentLevel()` reads
  the event's status: level 4 while open, level 5 (Finance and General
  Secretaries, `super_admin`) once closed. `events:documents.read` only opens
  the route; `doc-level-rules.ts` decides.
- **Seats and slots move by conditional `UPDATE`**, not row locks (SQLite has
  none). Zero rows affected is `EVENT_FULL` / `SLOT_FULL`.
- **Prices are locked on the attendee row at registration**; editing a ticket
  never reprices an existing registration. `paidCents` is recomputed from
  settled `event_payments`, never incremented.
- **The scheduler is safe on two instances because of the unique index on
  `event_notification_log`**, not the timer: a row is claimed before the send.
  Delivery is at-most-once. `JOBS_ENABLED=false` turns the timer off.
- **Path ids go through `IdPipe`.** Postgres rejects a non-uuid outright, so
  `/events/new` would otherwise be a 500 rather than a 404.
- The frontend paths `/events/:id` and `/events/:id/registration` are written
  into the backend's mail templates and checkout return URL.

`MAIL_TRANSPORT` defaults to `console`, which sends nothing over the network and
captures each message at `GET /api/dev/outbox` — that is where verification,
password-setup and reset links are read locally.

`PAYMENT_PROVIDER` works the same way. `console` (the default, refused under
`NODE_ENV=production`) takes no money: the dues checkout URL is
`GET /api/dev/payments/:ref/complete`, which settles on the spot. `stripe` opens
a Stripe Checkout Session and closes the payment gate **only on the signed
webhook** at `POST /api/payments/stripe/webhook`, never on the browser's return
to the success URL. Locally, forward it with
`stripe listen --forward-to localhost:3001/api/payments/stripe/webhook` and put
the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`. Settlement is idempotent — a
conditional `pending → settled` update — so replayed webhooks are harmless. A
tier priced at `$0` (Youth) is recorded as `waived` and closes the gate without
a checkout.

**Access ships in the migrations.** The framework's `0001` creates the four
`*:manage` permissions its controllers check and the `user` role, and its
`0002` the four `documents:*` permissions, granted to nobody; this app's
`0001_baseline.sql` adds the other 13 permissions and 12 roles the code
checks, every grant, and `0003_documents_access.sql` gives `member` and the
staff roles `documents:read|write|share` (plus `documents:manage` for `admin`
and `super_admin`). `0001` also creates two administrators with published passwords: `admin@example.com` / `Password!1`
and `superadmin@example.com` / `ChangeMe!123`. Anything the portal needs to
work after a first install belongs in a migration, never a script. Only
**staff** roles (`STAFF_ROLES`) can sign in without a member record, which is
why only those two accounts exist.

**Granting yourself permissions takes a sign-out.** Grant a role in the admin
UI, or with the one-liner in `apps/backend/migrations/README.md`. Roles and
permissions are baked into the JWT at login and there is no refresh flow, so a
live session will not see the grant — sign out and back in.


### The recorded peer exception

One remains, and it is **recorded rather than fixed**: `typeorm>better-sqlite3`.
See [Deprecated subdependencies](#deprecated-subdependencies) for why.

```json
"peerDependencyRules": {
  "allowedVersions": {
    "typeorm>better-sqlite3": "13"
  }
}
```

Use `peerDependencyRules` for this, never `overrides`. A rule silences the
warning while leaving the installed tree alone; an override would change what is
actually installed, which is how you break a working build to quiet a message.

The demo also carries an `@hono/node-ws>@hono/node-server` rule. It is **not**
here and should not be copied back: it exists only for the LangGraph agents
server, which this repo does not run.

## Deprecated subdependencies

One remains, and it is **recorded rather than fixed**. `prebuild-install` is
gone; `glob@10.5.0` is blocked upstream, and not only by TypeORM:

| Package | Comes from | Status |
| --- | --- | --- |
| `glob@10.5.0` | `typeorm@0.3.31` (prod) **and** `test-exclude@7` via `jest`→`babel-plugin-istanbul@8` (dev) | Stays — both paths blocked, warning silenced |

`glob` needs *both* paths to clear, and neither can move here:

- TypeORM 1.x drops `glob` (it uses `tinyglobby`), and 1.1.1 is now the `latest`
  tag — but every `@helix-x/*` library peers `typeorm: ^0.3.0`. Bumping TypeORM
  here without moving those first only trades this warning for peer errors — and
  that is a `helix-x-backend` change.
- `test-exclude@8` does move to `glob@^13`, but nothing reaches it:
  `babel-plugin-istanbul` is at `8.0.2` and every 8.x still asks for
  `test-exclude@^7`, which pins `glob@^10.4.1`. It arrives through
  `@jest/transform` and `babel-jest`, so it is not removable from here either.

Because both ends are genuinely blocked, the root `package.json` records the
judgement instead of leaving a warning everyone learns to scroll past:

```json
"allowedDeprecatedVersions": {
  "glob": "10.5.0"
}
```

This is the deprecation counterpart of `peerDependencyRules` and follows the same
rule: **it silences the message and leaves the installed tree alone.** The version
is pinned exactly, not to a range, so if either path resolves a different `glob`
the warning comes back and the entry is re-examined rather than quietly widened.

**Do not force it with `overrides`.** Upgrading the direct dependency is still the
only honest fix, and there is no such upgrade available yet. When TypeORM moves in
`helix-x-backend` *and* `babel-plugin-istanbul` picks up `test-exclude@8`, delete
the entry — do not let it outlive the blockage it documents.

### How `prebuild-install` was cleared

`better-sqlite3@13` drops both `prebuild-install` and `bindings`: it ships
per-platform binaries in `prebuilds/` inside the tarball, so there is no download
step and no native build. Its `engines` are `node >= 22`, which this repo already
requires, and the constructor options TypeORM passes (`readonly`, `fileMustExist`,
`timeout`, `verbose`, `nativeBinding`) are unchanged from v12 — the TypeORM driver
only ever calls the constructor plus `.pragma()`, `.prepare()` and `.close()`.

The catch is that TypeORM 0.3.x peers `better-sqlite3` on
`^8 \|\| ^9 \|\| ^10 \|\| ^11 \|\| ^12`, and TypeORM **1.x still caps it at `^12`** —
so this does not fix itself with a TypeORM upgrade. The peer is declared
*optional*, so pnpm never auto-installs it; it resolves whatever version is in
scope. `apps/backend` therefore declares `better-sqlite3: ^13.0.3` directly, and a
`peerDependencyRules.allowedVersions` entry (`"typeorm>better-sqlite3": "13"`)
records that v13 satisfies that peer in practice. A rule, not an `override` — the
tree is left alone.

Two things to know if you touch this:

- **pnpm will not re-resolve a frozen peer edge incrementally.** Neither
  `pnpm install` nor `pnpm update -r better-sqlite3` revisits it; the lockfile
  keeps the old resolution and the warning persists. It takes deleting
  `pnpm-lock.yaml` and `node_modules`.


## Secrets

- `JWT_SECRET` signs application JWTs. The demo has to keep it identical across
  two `.env` files; here only `apps/backend/.env` has it, because there is no
  MCP server to keep in step.
- `OAUTH_JWT_SECRET` signs OAuth tokens and **must differ** from `JWT_SECRET`.
- `DOCUMENTS_SIGNING_SECRET` signs document view and download links. A third
  value, at least 32 characters.

## Test reality

Two suites, and they are not equally interesting.

`apps/backend` has one trivial controller spec. The real one is
`apps/frontend/test/plugins.test.ts`, which boots the registry from
`src/plugins.ts` under the same `permissionMode: 'strict'` `main.tsx` uses,
activates every plugin, and asserts that none ends up `failed`. It exists
because `PluginContext` checks permissions **at the call site**, so an undeclared
capability surfaces only when that line runs — a source-scanning audit reported
clean while `plugin-auth` was crashing on an undeclared `settings:read`. It also
pins the layout of each route (`/` is `app.full`, `/login` is `app.focused`) and
asserts that a backend outage during startup still leaves the app usable.

**Run it after changing `plugins.ts`, and after any `helix-x-web` change that
touches a manifest** — it is the cheapest signal in this repo that the linked
libraries and this host still agree.

Beyond that there is no regression net here; the libraries carry the tests.
**`pnpm build` plus booting the apps is the real check**:

```bash
pnpm build
pnpm dev:backend  && curl -s localhost:3001/api/health
pnpm dev:frontend && curl -s localhost:5173/ -o /dev/null -w '%{http_code}\n'
```

Before regenerating the SDK, confirm the backend is what is answering:

```bash
curl -s localhost:3001/docs-json | head -c 40    # must start {"openapi":"3.0.0"
```

Anything else bound to :3001 returns its own 200 for every path, and codegen will
overwrite the whole SDK with garbage. The regeneration itself runs in
`packages/client-sdk` — see [The generated client](#the-generated-client).
