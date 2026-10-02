import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export type PaymentProvider = 'console' | 'stripe';

export interface CheckoutRequest {
  /** Which settlement handler owns this checkout — see `PaymentSettlementRegistry`. */
  kind: string;
  /** Inserted after `console_` in a console reference, so the dev route can route it. */
  refPrefix?: string;
  amountCents: number;
  currency: string;
  /** The line shown on the hosted checkout page. */
  description: string;
  customerEmail?: string;
  clientReferenceId: string;
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
  /** Stripe only, and at least 30: how long the hosted page stays payable. */
  expiresInMinutes?: number;
}

export interface CheckoutResult {
  provider: PaymentProvider;
  providerRef: string;
  checkoutUrl: string;
  expiresAt: Date | null;
}

export interface PaidCheckout {
  sessionId: string;
  /** `metadata.kind` of the session; absent on sessions opened before kinds existed. */
  kind: string | undefined;
}

/**
 * The provider half of every checkout this portal opens.
 *
 * `PAYMENT_PROVIDER` picks how money moves, mirroring `MAIL_TRANSPORT`:
 *
 * - `console` (dev default) takes no money. The checkout URL is a backend dev
 *   route that settles on the spot, so the whole flow runs with no account and
 *   no network. It refuses to load under `NODE_ENV=production`.
 * - `stripe` creates a hosted Checkout Session. Settlement happens only when
 *   the signed webhook arrives — never on the browser's return to the success
 *   URL, which anyone can type.
 *
 * It knows nothing about what is being paid for: dues and event registrations
 * each keep their own payment rows and register a settlement handler.
 */
@Injectable()
export class CheckoutGatewayService implements OnModuleInit {
  private readonly logger = new Logger(CheckoutGatewayService.name);
  private stripeClient: Stripe | null = null;

  constructor(private readonly config: ConfigService) {}

  get provider(): PaymentProvider {
    const value = this.config.get<string>('PAYMENT_PROVIDER', 'console');
    return value === 'stripe' ? 'stripe' : 'console';
  }

  /** Whether the dev-only settle route may answer. */
  get consoleEnabled(): boolean {
    return this.provider === 'console' && this.config.get('NODE_ENV') !== 'production';
  }

  onModuleInit(): void {
    const raw = this.config.get<string>('PAYMENT_PROVIDER', 'console');
    if (raw !== 'console' && raw !== 'stripe') {
      throw new Error(`PAYMENT_PROVIDER must be "console" or "stripe", got "${raw}".`);
    }
    if (this.provider === 'console' && this.config.get('NODE_ENV') === 'production') {
      // Same stance as MAIL_TRANSPORT=console: a production portal that
      // "settles" payments without taking money must fail loudly at boot.
      throw new Error('PAYMENT_PROVIDER=console is not allowed when NODE_ENV=production.');
    }
    if (this.provider === 'stripe') {
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY');
      this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
      const base = this.config.get<string>('STRIPE_API_BASE')?.trim();
      if (base) {
        if (this.config.get('NODE_ENV') === 'production') {
          throw new Error('STRIPE_API_BASE is for stripe-mock and is not allowed when NODE_ENV=production.');
        }
        new URL(base); // throws on a malformed value, at boot rather than at checkout
        this.logger.warn(`Stripe API redirected to ${base} (STRIPE_API_BASE)`);
      }
    }
  }

  private get stripe(): Stripe {
    this.stripeClient ??= new Stripe(
      this.config.getOrThrow<string>('STRIPE_SECRET_KEY'),
      this.stripeEndpoint(),
    );
    return this.stripeClient;
  }

  /**
   * `STRIPE_API_BASE` points the SDK somewhere other than `api.stripe.com` —
   * in practice `http://localhost:12111` for `docker/stripe-mock`. Without it
   * the SDK calls the real API, which rejects a mock key like `sk_test_123`
   * with a 401.
   */
  private stripeEndpoint(): Stripe.StripeConfig {
    const base = this.config.get<string>('STRIPE_API_BASE')?.trim();
    if (!base) return {};
    const url = new URL(base);
    const protocol = url.protocol === 'http:' ? 'http' : 'https';
    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : protocol === 'http' ? 80 : 443,
      protocol,
    };
  }

  /** The portal's public origin, without a trailing slash. */
  get portalUrl(): string {
    return this.config.get<string>('PORTAL_PUBLIC_URL', 'http://localhost:5173').replace(/\/+$/, '');
  }

  /** Open a checkout for a positive amount. The caller records the payment row. */
  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    if (this.provider !== 'stripe') {
      const providerRef = `console_${request.refPrefix ?? ''}${randomUUID()}`;
      const apiUrl = this.config
        .get<string>('API_PUBLIC_URL', `http://localhost:${this.config.get('PORT', '3001')}`)
        .replace(/\/+$/, '');
      return {
        provider: 'console',
        providerRef,
        checkoutUrl: `${apiUrl}/api/dev/payments/${providerRef}/complete`,
        expiresAt: null,
      };
    }

    const expiresAt = request.expiresInMinutes
      ? new Date(Date.now() + request.expiresInMinutes * 60_000)
      : null;
    let session: Stripe.Checkout.Session;
    try {
      session = await this.stripe.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: request.clientReferenceId,
        customer_email: request.customerEmail,
        metadata: { ...request.metadata, kind: request.kind },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: request.currency.toLowerCase(),
              unit_amount: request.amountCents,
              product_data: { name: request.description },
            },
          },
        ],
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        ...(expiresAt ? { expires_at: Math.floor(expiresAt.getTime() / 1000) } : {}),
      });
    } catch (err) {
      const e = err as { type?: string; statusCode?: number; message?: string };
      this.logger.error(
        `Stripe checkout failed for ${request.kind} ${request.clientReferenceId}: ${e.type ?? 'Error'} ` +
          `${e.statusCode ?? ''} ${e.message ?? String(err)}`,
      );
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'The payment service is unavailable. Please try again shortly.',
      });
    }
    if (!session.url) {
      throw new ServiceUnavailableException({
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'The payment service did not return a checkout page.',
      });
    }
    return { provider: 'stripe', providerRef: session.id, checkoutUrl: session.url, expiresAt };
  }

  /**
   * Verify a Stripe webhook and report the checkout it says was paid.
   *
   * Every other event type answers `null`, so it is acknowledged and Stripe
   * does not retry deliveries this portal has no use for.
   */
  verifyStripeEvent(rawBody: Buffer | undefined, signature: string | undefined): PaidCheckout | null {
    if (this.provider !== 'stripe') {
      // Not listening for Stripe: say so, rather than fail verification
      // against a key that was never configured.
      throw new NotFoundException();
    }
    if (!rawBody || !signature) {
      throw new BadRequestException({ code: 'INVALID_WEBHOOK', message: 'Missing webhook signature.' });
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'),
      );
    } catch {
      throw new BadRequestException({ code: 'INVALID_WEBHOOK', message: 'Webhook signature did not verify.' });
    }

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'checkout.session.async_payment_succeeded'
    ) {
      return null;
    }

    const session = event.data.object;
    if (session.payment_status !== 'paid') return null;
    return { sessionId: session.id, kind: session.metadata?.kind || undefined };
  }
}
