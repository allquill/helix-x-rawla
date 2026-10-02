import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, MoreThan, Repository } from 'typeorm';
import { User } from '@helix-x/backend';
import { isUniqueViolation } from '../../../database/db-type';
import { Member } from '../../community-core/entities/member.entity';
import { SpouseProfile } from '../../community-core/entities/spouse-profile.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import {
  ACTIVE_REGISTRATION_STATUSES,
  EVENT_SETTING_KEYS,
  EVENT_TEMPLATES,
  INVITATION_SCHEDULE_KEY,
  type NotificationKind,
} from '../constants';
import { EventNotificationLog } from '../entities/event-notification-log.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { EventSlotBooking } from '../entities/event-slot-booking.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import { formatMoney, formatWhen } from '../templates/event-templates';
import {
  EmailBroadcastChannel,
  SmsBroadcastChannel,
  type BroadcastChannel,
  type BroadcastRecipient,
} from './broadcast-channel';
import { dueReminder, parseReminderOffsets, registrationState } from './event-rules';
import { EventService } from './event.service';

const TICK_MS = 5 * 60 * 1000;

type Outcome = 'sent' | 'failed' | 'skipped' | 'taken';

/**
 * Sends event invitations (EVT-22) and reminders (EVT-07) on a timer.
 *
 * **What makes this safe on two instances is the database, not the timer.**
 * Before a message goes out, the runner inserts its row into
 * `event_notification_log` as `claimed`; the unique index lets exactly one
 * instance win, and the loser skips that recipient. Delivery is therefore
 * at-most-once: a crash between the claim and the send leaves a `claimed` row
 * for someone to look at on the event's notification panel, never a second
 * copy in a member's inbox.
 *
 * `JOBS_ENABLED=false` switches the timer off — for a second instance that
 * should only serve requests, or to quiet a local run.
 */
@Injectable()
export class EventNotificationRunner {
  private readonly logger = new Logger(EventNotificationRunner.name);
  private readonly channels: BroadcastChannel[];
  private running = false;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(PortalEvent) private readonly eventRepo: Repository<PortalEvent>,
    @InjectRepository(EventNotificationLog) private readonly logRepo: Repository<EventNotificationLog>,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventSlotBooking) private readonly bookingRepo: Repository<EventSlotBooking>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(SpouseProfile) private readonly spouseRepo: Repository<SpouseProfile>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly events: EventService,
    private readonly audit: AuditService,
    email: EmailBroadcastChannel,
    sms: SmsBroadcastChannel,
  ) {
    this.channels = [email, sms];
  }

  @Interval(TICK_MS)
  async tick(): Promise<void> {
    if (this.config.get<string>('JOBS_ENABLED') === 'false') return;
    // One pass at a time in this process; a slow mail server must not stack ticks.
    if (this.running) return;
    this.running = true;
    try {
      await this.runOnce();
    } catch (error) {
      this.logger.error(`Event notification pass failed: ${(error as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  /** One pass over every published, not-yet-started event. */
  async runOnce(now = new Date()): Promise<void> {
    const upcoming = await this.eventRepo.find({
      where: { status: 'published', startsAt: MoreThan(now) },
      order: { startsAt: 'ASC' },
    });
    for (const event of upcoming) {
      // One event failing must not hold up the rest.
      try {
        // An invitation to an event nobody can register for any more is noise.
        if (!event.invitationCompletedAt && registrationState(event, now).open) {
          await this.sendInvitations(event);
        }
        await this.sendReminders(event, now);
      } catch (error) {
        this.logger.error(`Notifications for event ${event.id} failed: ${(error as Error).message}`);
      }
    }
  }

  // ─── Invitations (EVT-22) ─────────────────────────────────────────────────

  /**
   * Invite the next batch of the community to a newly published event.
   *
   * A pass handles at most `events.broadcast_batch_size` recipients, so one
   * large broadcast cannot starve the reminders behind it; the event is
   * marked complete on the pass that finds nobody left.
   */
  private async sendInvitations(event: PortalEvent): Promise<void> {
    const batchSize = Number(this.events.setting(EVENT_SETTING_KEYS.BROADCAST_BATCH_SIZE)) || 50;
    const recipients = await this.communityRecipients();
    const variables = {
      title: event.title,
      when: formatWhen(event),
      venue: event.venue,
      description: event.description,
      closesOn: event.registrationClosesOn,
      eventId: event.id,
    };

    let budget = batchSize;
    let leftOver = false;
    for (const channel of this.channels.filter((c) => c.isConfigured())) {
      const done = await this.loggedKeys(event.id, 'invitation', INVITATION_SCHEDULE_KEY, channel.key);
      const pending = recipients.filter((r) => {
        const address = channel.addressOf(r);
        return address !== null && !done.has(address);
      });
      const batch = pending.slice(0, budget);
      for (const recipient of batch) {
        await this.deliver(
          event.id,
          'invitation',
          INVITATION_SCHEDULE_KEY,
          channel,
          recipient,
          EVENT_TEMPLATES.INVITATION,
          variables,
        );
      }
      budget -= batch.length;
      if (pending.length > batch.length) leftOver = true;
    }
    // More to do: the next pass picks up where this one stopped.
    if (leftOver) return;

    const completed = await this.eventRepo.update(
      { id: event.id, invitationCompletedAt: IsNull() },
      { invitationCompletedAt: new Date() },
    );
    if (!completed.affected) return;
    const counts = await this.logRepo
      .createQueryBuilder('l')
      .select('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.eventId = :eventId AND l.kind = :kind', { eventId: event.id, kind: 'invitation' })
      .groupBy('l.status')
      .getRawMany<{ status: string; count: string }>();
    await this.audit.record({
      action: 'event.invitation.broadcast_completed',
      entityType: 'event',
      entityId: event.id,
      after: Object.fromEntries(counts.map((c) => [c.status, Number(c.count)])),
    });
  }

  /**
   * Every address the invitation goes to: each active member's login email,
   * and the spouse's email on file for an active member's household. One
   * entry per address — a couple sharing an inbox is invited once, and a
   * member's own entry wins over the same address on a spouse profile.
   */
  private async communityRecipients(): Promise<BroadcastRecipient[]> {
    const members = await this.memberRepo
      .createQueryBuilder('m')
      .innerJoin(User, 'u', 'u.id = m.user_id')
      .select('m.id', 'id')
      .addSelect('m.firstName', 'firstName')
      .addSelect('m.phone', 'phone')
      .addSelect('m.eventEmailOptIn', 'optedIn')
      .addSelect('u.email', 'email')
      .where('m.isActive = :active', { active: true })
      .andWhere('u.isActive = :active', { active: true })
      .orderBy('m.id', 'ASC')
      .getRawMany<{ id: string; firstName: string; phone: string | null; optedIn: boolean | number; email: string }>();

    const byAddress = new Map<string, BroadcastRecipient>();
    const optInOf = new Map<string, boolean>();
    for (const row of members) {
      const optedIn = row.optedIn === true || row.optedIn === 1;
      optInOf.set(row.id, optedIn);
      const address = row.email?.trim().toLowerCase();
      if (!address || byAddress.has(address)) continue;
      byAddress.set(address, { email: address, phone: row.phone, firstName: row.firstName, optedIn });
    }

    if (optInOf.size > 0) {
      const spouses = await this.spouseRepo.find({
        where: { memberId: In([...optInOf.keys()]) },
        select: { id: true, memberId: true, firstName: true, email: true, phone: true },
        order: { id: 'ASC' },
      });
      for (const spouse of spouses) {
        const address = spouse.email?.trim().toLowerCase();
        if (!address || byAddress.has(address)) continue;
        // A spouse has no settings of their own and follows the member's.
        byAddress.set(address, {
          email: address,
          phone: spouse.phone,
          firstName: spouse.firstName,
          optedIn: optInOf.get(spouse.memberId) ?? false,
        });
      }
    }
    return [...byAddress.values()];
  }

  // ─── Reminders (EVT-07) ───────────────────────────────────────────────────

  /**
   * Remind the households registered for the event, on the configured days
   * before it starts. A household that registered after a reminder fell due
   * is not sent that one — they have only just been told everything in it.
   */
  private async sendReminders(event: PortalEvent, now: Date): Promise<void> {
    const offsets = parseReminderOffsets(
      event.reminderOffsetsDays ?? this.events.setting(EVENT_SETTING_KEYS.REMINDER_OFFSETS_DAYS),
    );
    const due = dueReminder(event, offsets, now);
    if (!due) return;

    const registrations = (
      await this.registrationRepo.find({
        where: { eventId: event.id, status: In([...ACTIVE_REGISTRATION_STATUSES]) },
      })
    ).filter((r) => r.createdAt.getTime() <= due.dueAt.getTime());
    if (registrations.length === 0) return;

    const purchasers = await this.memberRepo.find({
      where: { id: In(registrations.map((r) => r.purchaserMemberId)) },
    });
    const users = purchasers.length
      ? await this.userRepo.find({ where: { id: In(purchasers.map((p) => p.userId)) } })
      : [];
    const purchaserById = new Map<string, Member>(purchasers.map((p) => [p.id, p]));
    const emailByUserId = new Map<number, string>(users.map((u) => [u.id, u.email]));
    const bookings = await this.bookingRepo.find({
      where: { eventId: event.id },
      relations: { slot: true, attendee: true },
    });
    const slotTime = new Intl.DateTimeFormat('en-US', { timeZone: event.timezone, timeStyle: 'short' });

    for (const channel of this.channels.filter((c) => c.isConfigured())) {
      const done = await this.loggedKeys(event.id, 'reminder', due.key, channel.key);
      for (const registration of registrations) {
        const purchaser = purchaserById.get(registration.purchaserMemberId);
        if (!purchaser) continue;
        const recipient: BroadcastRecipient = {
          email: emailByUserId.get(purchaser.userId) ?? null,
          phone: purchaser.phone,
          firstName: purchaser.firstName,
          optedIn: purchaser.eventEmailOptIn,
        };
        const address = channel.addressOf(recipient);
        if (!address || done.has(address)) continue;

        const balance = registration.totalCents - registration.paidCents;
        const slots = bookings
          .filter((b) => b.attendee.registrationId === registration.id)
          .map((b) => `${b.attendee.fullName}: ${b.slot.activity}, ${slotTime.format(b.slot.startsAt)}`)
          .join('\n');
        await this.deliver(event.id, 'reminder', due.key, channel, recipient, EVENT_TEMPLATES.REMINDER, {
          firstName: purchaser.firstName,
          title: event.title,
          when: formatWhen(event),
          venue: event.venue,
          attireGuide: event.attireGuide,
          slots: slots || null,
          balance: balance > 0 ? formatMoney(balance, registration.currency) : null,
          eventId: event.id,
        });
      }
    }
  }

  // ─── Shared ───────────────────────────────────────────────────────────────

  private async loggedKeys(
    eventId: string,
    kind: NotificationKind,
    scheduleKey: string,
    channel: BroadcastChannel['key'],
  ): Promise<Set<string>> {
    const rows = await this.logRepo.find({
      where: { eventId, kind, scheduleKey, channel },
      select: { recipientKey: true },
    });
    return new Set(rows.map((row) => row.recipientKey));
  }

  /**
   * Claim, then send. Each recipient is isolated: one bad address is logged
   * as `failed` with its error and the loop moves on.
   */
  private async deliver(
    eventId: string,
    kind: NotificationKind,
    scheduleKey: string,
    channel: BroadcastChannel,
    recipient: BroadcastRecipient,
    template: string,
    variables: Record<string, unknown>,
  ): Promise<Outcome> {
    const recipientKey = channel.addressOf(recipient)!;
    let log: EventNotificationLog;
    try {
      log = await this.logRepo.save(
        this.logRepo.create({
          eventId,
          kind,
          scheduleKey,
          channel: channel.key,
          recipientKey,
          // An opted-out member is recorded, so the panel can say how many.
          status: recipient.optedIn ? 'claimed' : 'skipped_opt_out',
        }),
      );
    } catch (error) {
      // Another instance claimed this recipient first.
      if (isUniqueViolation(error)) return 'taken';
      throw error;
    }
    if (!recipient.optedIn) return 'skipped';

    try {
      await channel.send(recipientKey, template, variables);
      await this.logRepo.update({ id: log.id }, { status: 'sent', sentAt: new Date() });
      return 'sent';
    } catch (error) {
      await this.logRepo.update(
        { id: log.id },
        { status: 'failed', error: (error as Error).message.slice(0, 1000) },
      );
      return 'failed';
    }
  }
}
