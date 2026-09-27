import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Stripe from 'stripe';
import { type AuthenticatedUser } from '@helix-x/backend';
import { TERMINAL_STATUSES } from '../constants';
import { Member } from '../entities/member.entity';
import { MembershipPayment } from '../entities/membership-payment.entity';
import { AuditService } from './audit.service';
import { MemberActivationService } from './member-activation.service';
import { PortalSettingsService } from './portal-settings.service';
import { ReferenceDataService } from './reference-data.service';

export type PaymentProvider = 'console' | 'stripe';

/**
 * Self-serve dues payment — the member's half of gate 3 (REG-16).
 *
 * `PAYMENT_PROVIDER` picks how money moves, mirroring `MAIL_TRANSPORT`:
 *
 * - `console` (dev default) takes no money. The checkout URL is a backend dev
 *   route that settles on the spot, so the whole flow runs with no account and
 *   no network. It refuses to load under `NODE_ENV=production`.
 * - `stripe` creates a hosted Checkout Session. The gate closes only when the
 *   signed webhook arrives — never on the browser's return to the success URL,
 *   which anyone can type.
 *
 * Either way the settlement is the same `settle()`, and it is idempotent: a
 * webhook delivered three times settles the dues once.
 */
@Injectable()
export class DuesPaymentService implements OnModuleInit {
  private readonly logger = new Logger(DuesPaymentService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(MembershipPayment)
    private readonly paymentRepo: Repository<MembershipPayment>,
    private readonly activation: MemberActivationService,
    private readonly settings: PortalSettingsService,
    private readonly referenceData: ReferenceDataService,
    private readonly audit: AuditService,
  ) {}

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
      // "settles" dues without taking money must fail loudly at boot.
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

  private get portalUrl(): string {
    return this.config.get<string>('PORTAL_PUBLIC_URL', 'http://localhost:5173').replace(/\/+$/, '');
  }

  /** Where the member lands after checkout, successful or not. */
  statusUrl(outcome: 'success' | 'cancelled'): string {
    return `${this.portalUrl}/join/status?payment=${outcome}`;
  }

  /**
   * Open a checkout for the signed-in member's dues.
   *
   * Offered as soon as the address is verified, whatever the approval state —
   * the gates close in any order, and the member activates on whichever closes
   * last.
   */
  async startCheckout(viewer: AuthenticatedUser): Promise<{ checkoutUrl: string }> {
    const member = await this.memberRepo.findOne({ where: { userId: viewer.id } });
    if (!member) throw new NotFoundException('No member record for this account');

    const refuse = (code: string, message: string) => new ConflictException({ code, message });
    if (TERMINAL_STATUSES.includes(member.status)) {
      throw refuse('PAYMENT_NOT_ALLOWED', 'This membership cannot take a payment.');
    }
    if (!member.isEmailVerified) {
      throw refuse('EMAIL_NOT_VERIFIED', 'Verify your email address before paying dues.');
    }
    if (!this.settings.paymentRequired) {
      throw refuse('PAYMENT_NOT_REQUIRED', 'Membership dues are not currently required.');
    }
    if (member.isPaymentMade) {
      throw refuse('PAYMENT_ALREADY_MADE', 'Your dues are already settled.');
    }

    const { duesCents, currency } = await this.referenceData.duesForTier(member.membershipTier);
    if (duesCents <= 0) {
      // A tier priced at zero (Youth) owes nothing, so there is nothing to
      // collect — record the waiver and close the gate now. Without this the
      // member could never activate: there is no checkout for $0.
      const providerRef = `waived_${randomUUID()}`;
      await this.paymentRepo.save(
        this.paymentRepo.create({
          memberId: member.id,
          tier: member.membershipTier,
          amountCents: 0,
          currency,
          status: 'pending',
          provider: 'waived',
          providerRef,
          reason: `No dues for the ${member.membershipTier} tier`,
        }),
      );
      await this.settle(providerRef, 'waived');
      return { checkoutUrl: this.statusUrl('success') };
    }

    let providerRef: string;
    let checkoutUrl: string;

    if (this.provider === 'stripe') {
      let session: Stripe.Checkout.Session;
      try {
        session = await this.stripe.checkout.sessions.create({
          mode: 'payment',
          client_reference_id: member.id,
          customer_email: viewer.email,
          metadata: { memberId: member.id, tier: member.membershipTier },
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: currency.toLowerCase(),
                unit_amount: duesCents,
                product_data: { name: `Membership dues — ${member.membershipTier}` },
              },
            },
          ],
          success_url: this.statusUrl('success'),
          cancel_url: this.statusUrl('cancelled'),
        });
      } catch (err) {
        const e = err as { type?: string; statusCode?: number; message?: string };
        this.logger.error(
          `Stripe checkout failed for member ${member.id}: ${e.type ?? 'Error'} ` +
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
      providerRef = session.id;
      checkoutUrl = session.url;
    } else {
      providerRef = `console_${randomUUID()}`;
      const apiUrl = this.config
        .get<string>('API_PUBLIC_URL', `http://localhost:${this.config.get('PORT', '3001')}`)
        .replace(/\/+$/, '');
      checkoutUrl = `${apiUrl}/api/dev/payments/${providerRef}/complete`;
    }

    await this.paymentRepo.save(
      this.paymentRepo.create({
        memberId: member.id,
        tier: member.membershipTier,
        amountCents: duesCents,
        currency,
        status: 'pending',
        provider: this.provider,
        providerRef,
      }),
    );

    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'member.payment.checkout_started',
      entityType: 'member',
      entityId: member.id,
      after: { provider: this.provider, providerRef, amountCents: duesCents, currency },
    });

    return { checkoutUrl };
  }

  /**
   * Close the payment gate for a completed checkout.
   *
   * Idempotent by a conditional update: only the call that moves the row from
   * `pending` to `settled` goes on to touch the member, so a replayed webhook
   * finds nothing to do. Activation is re-derived after the commit, exactly as
   * the admin override does — a welcome-mail failure must never roll back
   * money the member has already paid.
   *
   * Returns whether this call was the one that settled it.
   */
  async settle(providerRef: string, outcome: 'settled' | 'waived' = 'settled'): Promise<boolean> {
    const memberId = await this.dataSource.transaction(async (em) => {
      const payment = await em.findOne(MembershipPayment, { where: { providerRef } });
      if (!payment) {
        throw new NotFoundException(`No checkout recorded for ${providerRef}`);
      }

      const now = new Date();
      const moved = await em.update(
        MembershipPayment,
        { id: payment.id, status: 'pending' },
        { status: outcome, settledAt: now },
      );
      if (!moved.affected) return null;

      await em.update(Member, { id: payment.memberId }, { isPaymentMade: true, paymentSettledAt: now });
      return payment.memberId;
    });

    if (!memberId) return false;

    await this.audit.record({
      action: `member.payment.${outcome}`,
      entityType: 'member',
      entityId: memberId,
      before: { isPaymentMade: false },
      after: { isPaymentMade: true, outcome, providerRef },
    });

    await this.activation.recompute(memberId);
    return true;
  }

  /**
   * Verify a Stripe webhook and settle it when it reports a paid checkout.
   *
   * Every other event type is acknowledged and ignored, so Stripe does not
   * retry deliveries this portal has no use for.
   */
  async handleStripeEvent(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
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
      return;
    }

    const session = event.data.object;
    if (session.payment_status !== 'paid') return;

    try {
      await this.settle(session.id);
    } catch (err) {
      if (err instanceof NotFoundException) {
        // A session this portal did not open — another app on the same Stripe
        // account. Acknowledge it so Stripe stops retrying.
        this.logger.warn(`Ignoring checkout ${session.id}: no matching payment record`);
        return;
      }
      throw err;
    }
  }
}
