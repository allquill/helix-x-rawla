import { ConflictException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EmailNotificationService, User, type AuthenticatedUser } from '@helix-x/backend';
import { Member } from '../../community-core/entities/member.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { CheckoutGatewayService } from '../../payments/checkout-gateway.service';
import {
  EVENT_CONSOLE_REF_PREFIX,
  EVENT_PAYMENT_KIND,
  PaymentSettlementRegistry,
} from '../../payments/payment-settlement.registry';
import { EVENT_CODES, EVENT_TEMPLATES, type ManualPaymentMethod } from '../constants';
import { EventPayment } from '../entities/event-payment.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import type { RecordEventPaymentDto } from '../models/registration.dto';
import { formatMoney, formatWhen } from '../templates/event-templates';
import { assertEventWritable } from './event-rules';
import { EventRegistrationService } from './event-registration.service';
import { EventService } from './event.service';

/** How long a hosted checkout stays payable. Stripe's minimum is 30 minutes. */
const CHECKOUT_MINUTES = 30;

const refuse = (code: string, message: string) => new ConflictException({ code, message });

/**
 * Money for an event registration (EVT-19 / EVT-20).
 *
 * Two ways in, one ledger. A member pays the balance through the shared
 * checkout gateway (`console` locally, Stripe in production), and the payment
 * settles only on the signed webhook. An Admin records a Zelle or other
 * offline payment by hand. Either way it is one `event_payments` row, and the
 * registration's `paidCents` is recomputed from the settled rows — never
 * incremented — so a replayed webhook cannot count twice.
 */
@Injectable()
export class EventPaymentService implements OnModuleInit {
  private readonly logger = new Logger(EventPaymentService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly gateway: CheckoutGatewayService,
    private readonly settlements: PaymentSettlementRegistry,
    @InjectRepository(EventPayment) private readonly paymentRepo: Repository<EventPayment>,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(PortalEvent) private readonly eventRepo: Repository<PortalEvent>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly events: EventService,
    private readonly registrations: EventRegistrationService,
    private readonly audit: AuditService,
    private readonly email: EmailNotificationService,
  ) {}

  onModuleInit(): void {
    this.settlements.register(EVENT_PAYMENT_KIND, {
      settle: (providerRef) => this.settle(providerRef),
      returnUrl: (providerRef, outcome) => this.returnUrlFor(providerRef, outcome),
    });
  }

  /** Where the payer lands after checkout. The page reads `payment` and re-fetches. */
  registrationUrl(eventId: string, outcome: 'success' | 'cancelled'): string {
    return `${this.gateway.portalUrl}/events/${eventId}/registration?payment=${outcome}`;
  }

  private async returnUrlFor(providerRef: string, outcome: 'success' | 'cancelled'): Promise<string> {
    const payment = await this.paymentRepo.findOne({ where: { providerRef } });
    if (!payment) throw new NotFoundException(`No checkout recorded for ${providerRef}`);
    return this.registrationUrl(payment.eventId, outcome);
  }

  /**
   * Open a checkout for whatever the household still owes.
   *
   * A checkout that is still open is handed back rather than replaced, so
   * pressing "Pay now" twice cannot produce two sessions that are both paid.
   */
  async startCheckout(eventId: string, viewer: AuthenticatedUser): Promise<{ checkoutUrl: string }> {
    const event = await this.events.mustFindVisible(eventId);
    assertEventWritable(event);
    const member = await this.registrations.mustFindMember(viewer);
    const registration = await this.registrations.mustFindLive(eventId, member.householdId);

    const balance = registration.totalCents - registration.paidCents;
    if (balance <= 0) throw refuse(EVENT_CODES.NOTHING_TO_PAY, 'This registration is already paid.');

    const open = await this.paymentRepo.findOne({
      where: { registrationId: registration.id, status: 'pending' },
      order: { createdAt: 'DESC' },
    });
    if (open?.checkoutUrl && open.amountCents === balance) {
      const stillOpen = !open.checkoutExpiresAt || open.checkoutExpiresAt.getTime() > Date.now() + 60_000;
      if (stillOpen) return { checkoutUrl: open.checkoutUrl };
    }
    if (open) await this.paymentRepo.update({ id: open.id, status: 'pending' }, { status: 'expired' });

    const checkout = await this.gateway.createCheckout({
      kind: EVENT_PAYMENT_KIND,
      refPrefix: EVENT_CONSOLE_REF_PREFIX,
      amountCents: balance,
      currency: registration.currency,
      description: `${event.title} — event registration`,
      customerEmail: viewer.email,
      clientReferenceId: registration.id,
      metadata: { registrationId: registration.id, eventId },
      successUrl: this.registrationUrl(eventId, 'success'),
      cancelUrl: this.registrationUrl(eventId, 'cancelled'),
      expiresInMinutes: CHECKOUT_MINUTES,
    });

    await this.paymentRepo.save(
      this.paymentRepo.create({
        registrationId: registration.id,
        eventId,
        amountCents: balance,
        currency: registration.currency,
        method: checkout.provider,
        status: 'pending',
        providerRef: checkout.providerRef,
        checkoutUrl: checkout.checkoutUrl,
        checkoutExpiresAt: checkout.expiresAt,
      }),
    );
    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'event.payment.checkout_started',
      entityType: 'event_registration',
      entityId: registration.id,
      after: { provider: checkout.provider, providerRef: checkout.providerRef, amountCents: balance },
    });
    return { checkoutUrl: checkout.checkoutUrl };
  }

  /**
   * Settle a completed checkout. Idempotent by a conditional update, exactly
   * as dues are: only the call that moves the row out of `pending` goes on to
   * touch the registration.
   *
   * This is the one write a closed event still takes. The money has already
   * left the member's account, so refusing it would only lose the record; it
   * is audited as having arrived after the close.
   */
  async settle(providerRef: string): Promise<boolean> {
    const settled = await this.dataSource.transaction(async (em) => {
      const payment = await em.findOne(EventPayment, { where: { providerRef } });
      if (!payment) throw new NotFoundException(`No checkout recorded for ${providerRef}`);

      // `expired` settles too: the checkout was superseded or its registration
      // released, but if the provider says it was paid, it was paid.
      const moved = await em
        .createQueryBuilder()
        .update(EventPayment)
        .set({ status: 'settled', settledAt: new Date() })
        .where('id = :id AND status <> :settled', { id: payment.id, settled: 'settled' })
        .execute();
      if (!moved.affected) return null;

      const registration = await this.recompute(em, payment.registrationId);
      return { payment, registration };
    });
    if (!settled) return false;

    const { payment, registration } = settled;
    const event = await this.eventRepo.findOne({ where: { id: payment.eventId } });
    await this.audit.record({
      action: event?.status === 'closed' ? 'event.payment.settled_after_close' : 'event.payment.settled',
      entityType: 'event_registration',
      entityId: payment.registrationId,
      after: {
        providerRef,
        method: payment.method,
        amountCents: payment.amountCents,
        paidCents: registration.paidCents,
        status: registration.status,
      },
    });
    if (event) await this.notifyPaid(registration, event, payment.amountCents);
    return true;
  }

  /**
   * EVT-20: an Admin records money received outside the checkout — Zelle, a
   * cheque, cash. The actor, the time and the reference are kept on the row,
   * and one audit row is written.
   */
  async recordManual(
    eventId: string,
    registrationId: string,
    dto: RecordEventPaymentDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);

    const registration = await this.dataSource.transaction(async (em) => {
      const current = await em.findOne(EventRegistration, { where: { id: registrationId, eventId } });
      if (!current) throw new NotFoundException('Registration not found');
      if (current.status !== 'pending_payment' && current.status !== 'confirmed') {
        throw refuse(EVENT_CODES.NOT_ACTIVE, 'A payment can only be recorded on a live registration.');
      }
      await em.save(
        em.create(EventPayment, {
          registrationId,
          eventId,
          amountCents: dto.amountCents,
          currency: current.currency,
          method: dto.method as ManualPaymentMethod,
          status: 'settled',
          reference: dto.reference?.trim() || null,
          note: dto.note?.trim() || null,
          recordedByUserId: actor.id,
          settledAt: new Date(),
        }),
      );
      return this.recompute(em, registrationId);
    });

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.payment.recorded',
      entityType: 'event_registration',
      entityId: registrationId,
      after: {
        method: dto.method,
        amountCents: dto.amountCents,
        reference: dto.reference ?? null,
        paidCents: registration.paidCents,
        status: registration.status,
      },
      reason: dto.note ?? null,
    });
    await this.notifyPaid(registration, event, dto.amountCents);
  }

  /** `paidCents` is the sum of the settled rows; a live registration paid in full is confirmed. */
  private async recompute(em: EntityManager, registrationId: string): Promise<EventRegistration> {
    const sum = await em
      .createQueryBuilder(EventPayment, 'p')
      .select('COALESCE(SUM(p.amountCents), 0)', 'paid')
      .where('p.registrationId = :registrationId AND p.status = :settled', {
        registrationId,
        settled: 'settled',
      })
      .getRawOne<{ paid: string }>();
    const paidCents = Number(sum?.paid ?? 0);
    const registration = await em.findOneOrFail(EventRegistration, { where: { id: registrationId } });

    registration.paidCents = paidCents;
    if (registration.status === 'pending_payment' && paidCents >= registration.totalCents) {
      registration.status = 'confirmed';
    }
    await em.update(
      EventRegistration,
      { id: registrationId },
      { paidCents: registration.paidCents, status: registration.status },
    );
    return registration;
  }

  private async notifyPaid(registration: EventRegistration, event: PortalEvent, amountCents: number): Promise<void> {
    if (registration.status !== 'confirmed') return;
    try {
      const purchaser = await this.memberRepo.findOne({ where: { id: registration.purchaserMemberId } });
      const user = purchaser ? await this.userRepo.findOne({ where: { id: purchaser.userId } }) : null;
      if (!purchaser || !user) return;
      await this.email.send({
        to: user.email,
        template: EVENT_TEMPLATES.REGISTRATION_CONFIRMED,
        variables: {
          firstName: purchaser.firstName,
          title: event.title,
          when: formatWhen(event),
          eventId: event.id,
          paid: formatMoney(amountCents, registration.currency),
        },
      });
    } catch (error) {
      this.logger.error(
        `Registration ${registration.id} was paid but the confirmation failed: ${(error as Error).message}`,
      );
    }
  }
}
