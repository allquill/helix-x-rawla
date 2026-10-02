import { randomUUID } from 'crypto';
import { ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { CheckoutGatewayService } from '../../payments/checkout-gateway.service';
import {
  DUES_PAYMENT_KIND,
  PaymentSettlementRegistry,
} from '../../payments/payment-settlement.registry';
import { TERMINAL_STATUSES } from '../constants';
import { Member } from '../entities/member.entity';
import { MembershipPayment } from '../entities/membership-payment.entity';
import { AuditService } from './audit.service';
import { MemberActivationService } from './member-activation.service';
import { PortalSettingsService } from './portal-settings.service';
import { ReferenceDataService } from './reference-data.service';

/**
 * Self-serve dues payment — the member's half of gate 3 (REG-16).
 *
 * How money moves is `CheckoutGatewayService`'s business (`PAYMENT_PROVIDER`:
 * `console` or `stripe`). This service owns what is dues-specific: who may
 * pay, how much, the `membership_payments` row and closing the gate.
 *
 * Whichever provider is in use the settlement is the same `settle()`, and it
 * is idempotent: a webhook delivered three times settles the dues once.
 */
@Injectable()
export class DuesPaymentService implements OnModuleInit {
  constructor(
    private readonly gateway: CheckoutGatewayService,
    private readonly settlements: PaymentSettlementRegistry,
    private readonly dataSource: DataSource,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(MembershipPayment)
    private readonly paymentRepo: Repository<MembershipPayment>,
    private readonly activation: MemberActivationService,
    private readonly settings: PortalSettingsService,
    private readonly referenceData: ReferenceDataService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit(): void {
    this.settlements.register(DUES_PAYMENT_KIND, {
      settle: (providerRef) => this.settle(providerRef),
      returnUrl: (_providerRef, outcome) => this.statusUrl(outcome),
    });
  }

  /** Where the member lands after checkout, successful or not. */
  statusUrl(outcome: 'success' | 'cancelled'): string {
    return `${this.gateway.portalUrl}/join/status?payment=${outcome}`;
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

    const { provider, providerRef, checkoutUrl } = await this.gateway.createCheckout({
      kind: DUES_PAYMENT_KIND,
      amountCents: duesCents,
      currency,
      description: `Membership dues — ${member.membershipTier}`,
      customerEmail: viewer.email,
      clientReferenceId: member.id,
      metadata: { memberId: member.id, tier: member.membershipTier },
      successUrl: this.statusUrl('success'),
      cancelUrl: this.statusUrl('cancelled'),
    });

    await this.paymentRepo.save(
      this.paymentRepo.create({
        memberId: member.id,
        tier: member.membershipTier,
        amountCents: duesCents,
        currency,
        status: 'pending',
        provider,
        providerRef,
      }),
    );

    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'member.payment.checkout_started',
      entityType: 'member',
      entityId: member.id,
      after: { provider, providerRef, amountCents: duesCents, currency },
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
}
