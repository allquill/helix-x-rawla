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

## Testing dues payment

The payment gate closes through a dues checkout, opened from **Pay $… now** on
`/join/status` (`POST /api/members/me/payments/checkout`). `PAYMENT_PROVIDER` in
`apps/backend/.env` decides how money moves, and there are three ways to run it
locally, from cheapest to most realistic:

| Mode | Needs | Checkout page | Gate closes on |
| --- | --- | --- | --- |
| `console` | nothing | a backend dev route | visiting that route |
| stripe-mock | Docker | none (fixture URL) | a webhook you sign and send |
| Stripe test mode | a Stripe account + Stripe CLI | Stripe's real hosted page | Stripe's real webhook |

Whichever mode you use, the member must have a **verified email**, the portal
setting that requires dues must be on, and their tier must cost more than $0 — a
$0 tier (Youth) is recorded as `waived` and closes the gate with no checkout.
With the [sample data](#sample-data) loaded, `bhavani.gehlot@example.test` /
`Rawla!Demo1` is waiting on exactly this gate. Restart the backend after changing
`.env`; it reads it only at boot.

After a successful payment, check the result:

```bash
sqlite3 apps/backend/data/helix_x.db \
  "select provider, providerRef, status, amountCents from membership_payments order by createdAt desc limit 3;"
```

The newest row should be `settled`, and the member's status page should show the
payment gate as done (and the member as active if it was the last open gate).

### 1. `console` — no Stripe at all

The default. No money moves and no network calls are made.

```bash
PAYMENT_PROVIDER=console
```

Click **Pay now**: the browser goes to `GET /api/dev/payments/console_…/complete`,
which settles the payment immediately and redirects to
`/join/status?payment=success`. Use this for UI work and for running the whole
join → approve → pay → active flow. It is refused under `NODE_ENV=production`.

### 2. stripe-mock — the Stripe code path, offline

Runs the real `stripe` SDK calls against
[stripe/stripe-mock](https://github.com/stripe/stripe-mock), which checks every
request against Stripe's API spec. Good for catching bad `checkout.sessions.create`
parameters without a Stripe account.

```bash
cd docker/stripe-mock && docker compose up -d      # :12111
curl -s localhost:12111/v1/balance -u sk_test_123: | head -c 80
```

```bash
# apps/backend/.env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_123
STRIPE_WEBHOOK_SECRET=whsec_local_mock
STRIPE_API_BASE=http://localhost:12111
```

Keep comments on their own lines, not after a value. `STRIPE_API_BASE` is what
sends the SDK to the mock. Without it the SDK calls the real API, which rejects
`sk_test_123`, and the portal shows "The payment service is unavailable". It is
refused under `NODE_ENV=production`.

stripe-mock stores nothing and **never sends webhooks**, so you play Stripe's
part yourself:

1. Click **Pay now**. The backend records a `pending` row and tries to send you to
   the session URL, but that URL is a fixture and there is nothing to pay on.
   Come back to the portal.
2. Find the session id the backend stored:

   ```bash
   sqlite3 apps/backend/data/helix_x.db \
     "select providerRef, status from membership_payments order by createdAt desc limit 1;"
   ```

3. Send the signed `checkout.session.completed` Stripe would have sent:

   ```bash
   node docker/stripe-mock/send-webhook.mjs cs_test_…   # → 200 {"received":true}
   ```

   It signs with `STRIPE_WEBHOOK_SECRET` from `apps/backend/.env`. Send it
   again to check idempotency: it still answers 200 and settles nothing new.

stripe-mock may return the **same session id every time**, and `providerRef` is
unique, so a second checkout can fail. Delete the old `pending` row, or start
from a fresh database, between runs. `docker compose down` stops the mock.
[`docker/stripe-mock/README.md`](docker/stripe-mock/README.md) has more detail.

### 3. Stripe test mode — end to end

The real hosted Checkout page, real webhooks, no real money. You need a Stripe
account in **test mode** and the [Stripe CLI](https://docs.stripe.com/stripe-cli).

```bash
stripe login
stripe listen --forward-to localhost:3001/api/payments/stripe/webhook
# prints: Ready! Your webhook signing secret is whsec_…
```

Leave `stripe listen` running. It is what delivers the webhooks to your machine.

```bash
# apps/backend/.env
PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_…        # Dashboard → Developers → API keys (test mode)
STRIPE_WEBHOOK_SECRET=whsec_…      # the secret `stripe listen` printed
STRIPE_API_BASE=                   # must be empty, or calls go to the mock
```

Click **Pay now** and pay on Stripe's page with a
[test card](https://docs.stripe.com/testing):

| Card | Result |
| --- | --- |
| `4242 4242 4242 4242` | succeeds |
| `4000 0000 0000 9995` | declined (insufficient funds) |
| `4000 0025 0000 3155` | asks for 3-D Secure authentication |

Use any future expiry, any CVC and any postcode. `stripe listen` should log
`checkout.session.completed` → `200`. Stripe then redirects to
`/join/status?payment=success`.

The **redirect alone does not close the gate**. Only the signed webhook does, so
anyone typing the success URL cannot fake a payment. The status page shows
"Payment received — confirming with the payment provider…" and checks again
every 2 s for about 20 s. If it never turns settled, look at `stripe listen`:
a `400` there means `STRIPE_WEBHOOK_SECRET` does not match the secret it
printed. Copy it again, restart the backend, and replay the delivery with
`stripe events resend evt_…`.

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
