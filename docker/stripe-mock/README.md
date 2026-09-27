# stripe-mock

A local Stripe API for exercising `PAYMENT_PROVIDER=stripe` without a Stripe
account, using [stripe/stripe-mock](https://github.com/stripe/stripe-mock).

```bash
docker compose up -d                                   # :12111 HTTP, :12112 HTTPS
curl -s localhost:12111/v1/balance -u sk_test_123: | head -c 80
docker compose down
```

Ports are overridable: `STRIPE_MOCK_HTTP_PORT=13111 docker compose up -d`.

## What it is, and what it is not

stripe-mock is built from Stripe's own OpenAPI spec, so it **validates every
request** — a bad parameter in `checkout.sessions.create` fails here exactly as
it would against Stripe. That is what it is good for.

It is **stateless**: every response is a canned fixture, nothing is stored, and
**it never sends webhooks**. Three consequences for the dues flow:

- The `url` on the returned Checkout Session is a fixture, not a page you can pay
  on. Opening it does nothing useful.
- The gate only closes on a signed webhook, so you deliver one yourself with
  `send-webhook.mjs` (below).
- The session `id` may be the same fixture for every call. `membership_payments.providerRef`
  is unique, so a second checkout can fail with a constraint error. Delete the
  pending row, or use a fresh database, between runs.

For the real hosted page and real webhooks, use Stripe test mode with
`stripe listen` instead (see `apps/backend/.env.example`).

## Pointing the backend at it

`apps/backend/.env`:

```bash
PAYMENT_PROVIDER=stripe
# stripe-mock accepts any sk_test_ key
STRIPE_SECRET_KEY=sk_test_123
# Any string; send-webhook.mjs signs with the same value
STRIPE_WEBHOOK_SECRET=whsec_local_mock
STRIPE_API_BASE=http://localhost:12111  # send Stripe calls to the mock, not api.stripe.com
```

Without `STRIPE_API_BASE` the SDK calls the real API, which rejects `sk_test_123`
with a 401 and the portal shows "The payment service is unavailable" (the
backend log has the underlying `StripeAuthenticationError`).

## Completing a payment

1. Sign in as a member with a verified email and start the dues checkout.
2. Find the session id the backend stored:

   ```bash
   sqlite3 ../../apps/backend/data/helix_x.db \
     "select providerRef, status from membership_payments order by createdAt desc limit 1;"
   ```

3. Deliver the webhook Stripe would have sent:

   ```bash
   node send-webhook.mjs cs_test_…     # → 200 {"received":true}
   ```

Run it twice to see idempotency: the second delivery also answers 200 and
settles nothing.
