#!/usr/bin/env node
// Deliver a signed `checkout.session.completed` to the rawla backend.
//
// stripe-mock never sends webhooks, and DuesPaymentService closes the payment
// gate only on a verified one — so this plays Stripe's part. It signs exactly
// as Stripe does (HMAC-SHA256 over `${timestamp}.${body}`, keyed by the whole
// `whsec_…` string), so `stripe.webhooks.constructEvent` accepts it.
//
//   node send-webhook.mjs <checkout_session_id> [event_type]
//
// The session id is the `providerRef` on the pending `membership_payments` row.
// STRIPE_WEBHOOK_SECRET and WEBHOOK_URL come from the environment; the secret
// falls back to apps/backend/.env.

import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const [sessionId, type = 'checkout.session.completed'] = process.argv.slice(2);
if (!sessionId) {
  console.error('usage: node send-webhook.mjs <checkout_session_id> [event_type]');
  process.exit(1);
}

function secretFromBackendEnv() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/backend/.env');
  try {
    // parseEnv follows dotenv's rules (inline `# comments`, quotes), so this
    // reads the same secret the backend verifies with.
    return parseEnv(readFileSync(envPath, 'utf8')).STRIPE_WEBHOOK_SECRET;
  } catch {
    return undefined;
  }
}

const secret = process.env.STRIPE_WEBHOOK_SECRET || secretFromBackendEnv();
if (!secret) {
  console.error('STRIPE_WEBHOOK_SECRET is not set (env or apps/backend/.env).');
  process.exit(1);
}
const url = process.env.WEBHOOK_URL || 'http://localhost:3001/api/payments/stripe/webhook';

const now = Math.floor(Date.now() / 1000);
const body = JSON.stringify({
  id: `evt_mock_${now}`,
  object: 'event',
  api_version: '2025-01-27.acacia',
  created: now,
  livemode: false,
  type,
  data: {
    object: {
      id: sessionId,
      object: 'checkout.session',
      mode: 'payment',
      status: 'complete',
      payment_status: 'paid',
    },
  },
});

const signature = createHmac('sha256', secret).update(`${now}.${body}`).digest('hex');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'stripe-signature': `t=${now},v1=${signature}` },
  body,
});
console.log(`${res.status} ${await res.text()}`);
process.exit(res.ok ? 0 : 1);
