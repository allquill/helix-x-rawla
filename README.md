# `helix-x-rawla`

The **Rajputana Rawla of America** member portal, built on the Helix-X platform.

Two hosts — a React frontend and a NestJS backend — plus a generated API client.
No framework code lives here: the platform is consumed from three sibling repos,
and everything in this repository is this product's own wiring, screens, domain
logic and schema.

| App | Port | What it is |
| --- | --- | --- |
| `apps/frontend` | 5173 | React host: `createApplication`, the plugin registry, five portal plugins |
| `apps/backend` | 3001 | NestJS host: composes `@helix-x/backend` and owns the `community-core` module |
| `packages/client-sdk` | — | The TypeScript API client, **generated from this backend** |

## Layout — where things live

```
apps/frontend/src/plugins/          the portal's screens, one plugin each
  home/            /                          public landing page
  registration/    /join, /join/status        apply, and watch the gates
  members/         /members …                 directory, profile, privacy
  chapters/        /admin/chapters            chapter registry + state map
  membership-admin/ /admin/registrations …    vetting queue, master data,
                                              portal settings, audit log
apps/backend/src/modules/community-core/   the member domain
  controllers/ providers/ entities/ models/
```

A plugin is `manifest.ts` (plain data: routes, nav items, slots, commands) plus
`index.tsx` (`activate()`, which binds components to what the manifest declared).
Adding one means writing that folder and adding a line to `src/plugins.ts` —
nothing else in the app changes.

## Quick start

The three library repos must be checked out **beside** this one, and the backend
packed at least once. Every `@helix-x/*` dependency is a relative path, so the
directory layout is load-bearing:

```
Work/helix-x/
  helix-x-web/          React kernel, shell, design system, first-party plugins
  helix-x-backend/      NestJS modules  (needs `pnpm run pack`)
  helix-x-core-sdk/   the demo's client — not used here
  helix-x-rawla/        this repo
```

```bash
# from the helix-x/ root
cd framework/helix-x-backend  && pnpm install && pnpm run pack
cd ../helix-x-web             && pnpm install
cd ../helix-x-core-sdk        && pnpm install && pnpm build
cd ../../example/helix-x-rawla && pnpm install

cp apps/backend/.env.example  apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

pnpm --filter @helix-x-rawla/backend migration:run
pnpm dev:backend     # :3001
pnpm dev:frontend    # :5173
```

`pnpm run pack` — not `pnpm pack`, which is a built-in command that shadows the
script and exits 0 without repacking.

## Generating the client

`packages/client-sdk/src/` is **generated**, not written. It is produced from
this backend's own OpenAPI document, so it carries the framework's services
(`AuthenticationService`, `NavigationService`, `OAuth*`) *and* the portal's four
(`PortalMembers`, `PortalRegistration`, `PortalRegistrations`,
`PortalAdministration`) in one client.

With the backend running:

```bash
curl -s localhost:3001/docs-json | head -c 40   # must start {"openapi":"3.0.0"
pnpm generate:sdk
```

Check that first line. Anything else bound to `:3001` answers 200 with its own
HTML for every path, and the generator will overwrite the whole SDK with
garbage; in the browser that surfaces as `x.map is not a function`.

Handler names become OpenAPI operationIds and must be unique across the whole
app — a collision silently drops an endpoint from the client. `pnpm generate:sdk`
checks this before it writes anything.

## Seeding an administrator

Register a user, point the seed script at them, run it, then **sign out and back
in** — roles and permissions are baked into the JWT at login and there is no
refresh flow, so a live session never sees a new grant.

```bash
# edit `.parameter set :admin_email` at the top of the file first
sqlite3 apps/backend/data/helix_x.db < apps/backend/sql/admin-seed.sql
```

The ten portal roles and their grants arrive automatically with the
`CommunityCoreSeed` migration; `admin-seed.sql` only adds the `admin` role
itself and hands it the same permissions.

## Sample data

With the backend running:

```bash
pnpm seed:sample              # refuses to run over an existing dataset
pnpm seed:sample -- --reset   # replace it
```

21 members spread across the five chapters and **all eight statuses**, with
households, spouses, children, reference contacts, life events, a full audit
trail and real reference data for the four lists that ship empty.

It drives the **HTTP API**, not SQL, and that is the point: members carry
derived state only the application knows how to produce — bcrypt hashes, the
`is_active` arithmetic a CHECK constraint enforces, allocated `RRA-` ids, status
history and audit rows. Hand-written INSERTs look right and are wrong, or trip
the constraint. Each applicant is walked through the real transitions, so the
queue and the audit log read like a system that has been used.

| Sign in as | Password | Gets |
| --- | --- | --- |
| `admin@rawla.test` | `Str0ng!Admin1` | the `admin` role, all 13 portal permissions |
| `vikram.singh@example.test` | `Rawla!Demo1` | an active member (household, spouse, two children) |
| `bhavani.gehlot@example.test` | `Rawla!Demo1` | blocked: `PAYMENT_REQUIRED` |
| `ajay.parmar@example.test` | `Rawla!Demo1` | blocked: `ACCOUNT_PENDING_APPROVAL` |
| `uma.shekhawat@example.test` | `Rawla!Demo1` | blocked: `ACCOUNT_ARCHIVED` |

[`apps/backend/sql/README.md`](apps/backend/sql/README.md) has the full picture:
the three seeding layers, every sample account and the gate code it demonstrates,
how to read a verification link out of the dev outbox, and the inspection queries.

`--reset` clears the sample rows but **not `audit_logs`** — two triggers make
that table append-only, and a convenience script is the last thing that should
be dropping them. For a genuinely empty database, stop the backend, delete
`apps/backend/data/helix_x.db`, re-run the migrations and seed again.

## The three activation gates

A member is active only when all three are true, and `is_active` is derived —
never set by hand:

```
is_active = is_email_verified AND is_approved AND is_payment_made
            AND status NOT IN ('rejected', 'archived')
```

A blocked login answers with a machine-readable `code`, a `remediation` link and
the full `gates` snapshot, in a fixed precedence — except on a wrong password,
which always answers `INVALID_CREDENTIALS` with no gate detail, so the endpoint
cannot be used to enumerate accounts.

## Commands

```bash
pnpm build        # the repo-wide gate
pnpm typecheck
pnpm test
pnpm lint

pnpm --filter @helix-x-rawla/backend migration:generate src/database/migrations/<Name>
pnpm --filter @helix-x-rawla/backend migration:run
```

`apps/frontend/test/plugins.test.ts` is the real regression net: it boots the
kernel with `permissionMode: 'strict'` and activates every registered plugin.
A missing capability declaration only throws at the call site, so running the
plugins is the only thing that catches it.
