import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { EmailNotificationService, User, type AuthenticatedUser } from '@helix-x/backend';
import { isUniqueViolation } from '../../../database/db-type';
import { Chapter } from '../../community-core/entities/chapter.entity';
import { ChildProfile } from '../../community-core/entities/child-profile.entity';
import { Member } from '../../community-core/entities/member.entity';
import { SpouseProfile } from '../../community-core/entities/spouse-profile.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { type ChapterScope } from '../../community-core/providers/member.service';
import { clampPage } from '../../community-core/providers/pagination';
import { ProfileVisibilityService } from '../../community-core/providers/profile-visibility.service';
import { ReferenceDataService } from '../../community-core/providers/reference-data.service';
import {
  ACTIVE_REGISTRATION_STATUSES,
  DIETARY_PREFERENCE_LIST,
  EVENT_CODES,
  EVENT_SETTING_KEYS,
  EVENT_TEMPLATES,
  TSHIRT_SIZE_LIST,
  type AttendeePersonType,
  type PricingTier,
  type RegistrationStatus,
} from '../constants';
import { EventAttendee } from '../entities/event-attendee.entity';
import { EventPayment } from '../entities/event-payment.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { EventSlotBooking } from '../entities/event-slot-booking.entity';
import { EventTicketType } from '../entities/event-ticket-type.entity';
import { EventTimeSlot } from '../entities/event-time-slot.entity';
import { EventWaiverSignature } from '../entities/event-waiver-signature.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import { WaiverTemplate } from '../entities/waiver-template.entity';
import type {
  AdminEventRegistrationDto,
  AttendeeDto,
  AttendeeInputDto,
  CreateRegistrationDto,
  EventParticipantDto,
  EventRegistrationDto,
  RegistrationOptionsDto,
  RegistrationPersonDto,
  UpdatePreferencesDto,
} from '../models/registration.dto';
import { formatMoney, formatWhen } from '../templates/event-templates';
import {
  ageOn,
  assertEventWritable,
  canSelfCancel,
  isYouthAt,
  localDateIn,
  priceFor,
  registrationState,
  ticketTypeFor,
} from './event-rules';
import { EventService, toSlotDto } from './event.service';

/** Someone in the purchaser's household who can be registered. */
interface HouseholdPerson {
  personKey: string;
  personType: AttendeePersonType;
  fullName: string;
  dateOfBirth: string | null;
  memberId: string | null;
  spouseProfileId: string | null;
  childProfileId: string | null;
  /** The member whose privacy settings govern this person. */
  ownerMemberId: string;
}

export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

const refuse = (code: string, message: string) => new ConflictException({ code, message });

/**
 * Household registration (EVT-01), preferences (EVT-04), waivers (EVT-05),
 * time slots (EVT-03), the volunteer tick (VOL-10), cancellation and removal
 * (EVT-23), and the participant list (EVT-21).
 *
 * The household is rebuilt server-side on every call. A `personKey` the
 * client sends is only ever a selection from that set — it cannot name someone
 * in another household, and non-member guests are out of scope.
 */
@Injectable()
export class EventRegistrationService {
  private readonly logger = new Logger(EventRegistrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventAttendee) private readonly attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(EventTicketType) private readonly ticketRepo: Repository<EventTicketType>,
    @InjectRepository(EventTimeSlot) private readonly slotRepo: Repository<EventTimeSlot>,
    @InjectRepository(EventSlotBooking) private readonly bookingRepo: Repository<EventSlotBooking>,
    @InjectRepository(EventWaiverSignature) private readonly signatureRepo: Repository<EventWaiverSignature>,
    @InjectRepository(EventPayment) private readonly paymentRepo: Repository<EventPayment>,
    @InjectRepository(WaiverTemplate) private readonly waiverRepo: Repository<WaiverTemplate>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(SpouseProfile) private readonly spouseRepo: Repository<SpouseProfile>,
    @InjectRepository(ChildProfile) private readonly childRepo: Repository<ChildProfile>,
    @InjectRepository(Chapter) private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly events: EventService,
    private readonly referenceData: ReferenceDataService,
    private readonly visibility: ProfileVisibilityService,
    private readonly audit: AuditService,
    private readonly email: EmailNotificationService,
  ) {}

  // ─── What the member can register ─────────────────────────────────────────

  async options(eventId: string, viewer: AuthenticatedUser): Promise<RegistrationOptionsDto> {
    const event = await this.events.mustFindVisible(eventId);
    const member = await this.mustFindMember(viewer);
    const now = new Date();
    const state = registrationState(event, now);

    const types = await this.ticketRepo.find({ where: { eventId } });
    const people = await this.householdPeople(member);
    const youthMaxAge = Number(this.events.setting(EVENT_SETTING_KEYS.YOUTH_MAX_AGE));
    const eventDay = localDateIn(event.timezone, event.startsAt);

    const existing = await this.registrationRepo.findOne({
      where: { eventId, householdId: member.householdId, status: In([...ACTIVE_REGISTRATION_STATUSES]) },
    });
    const waiver = event.waiverTemplateId
      ? await this.waiverRepo.findOne({ where: { id: event.waiverTemplateId } })
      : null;
    const options = await this.referenceData.optionsFor([DIETARY_PREFERENCE_LIST, TSHIRT_SIZE_LIST]);

    return {
      event: await this.events.toDetail(event, now),
      registrationOpen: state.open,
      registrationClosedCode: state.open ? null : state.code,
      registrationClosedMessage: state.open ? null : state.message,
      remainingCapacity: event.capacity === null ? null : Math.max(0, event.capacity - event.attendeeCount),
      people: people.map((person): RegistrationPersonDto => {
        const type = ticketTypeFor(types, ageOn(person.dateOfBirth, eventDay));
        const price = type ? priceFor(type, now) : null;
        return {
          personKey: person.personKey,
          personType: person.personType,
          fullName: person.fullName,
          isYouth: isYouthAt(person.dateOfBirth, event, youthMaxAge),
          ticketTypeId: type?.id ?? null,
          ticketTypeName: type?.name ?? null,
          unitPriceCents: price?.unitCents ?? null,
          pricingTier: price?.tier ?? null,
        };
      }),
      waiver: waiver ? { id: waiver.id, title: waiver.title, body: waiver.body, version: waiver.version } : null,
      slots: (await this.slotRepo.find({ where: { eventId }, order: { startsAt: 'ASC' } })).map(toSlotDto),
      dietaryOptions: options[DIETARY_PREFERENCE_LIST].map(({ value, label }) => ({ value, label })),
      tshirtOptions: options[TSHIRT_SIZE_LIST].map(({ value, label }) => ({ value, label })),
      existingRegistrationId: existing?.id ?? null,
    };
  }

  // ─── Register ─────────────────────────────────────────────────────────────

  /**
   * Register the household in one transaction (EVT-01).
   *
   * Everything that can refuse is checked against the server's own clock and
   * data — the closing date (EVT-18), the price tier (EVT-02), capacity — and
   * the seats are taken by a conditional UPDATE, so two households racing for
   * the last place cannot both get it. Prices are locked here: paying after
   * the early-bird cut-over still pays the early-bird price.
   */
  async create(
    eventId: string,
    dto: CreateRegistrationDto,
    viewer: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<EventRegistrationDto> {
    const event = await this.events.mustFindVisible(eventId);
    const member = await this.mustFindMember(viewer);
    const now = new Date();

    const state = registrationState(event, now);
    if (!state.open) throw refuse(state.code!, state.message!);

    // Said plainly up front; the partial unique index is what actually holds
    // the rule when two requests race.
    const existing = await this.registrationRepo.findOne({
      where: { eventId, householdId: member.householdId, status: In([...ACTIVE_REGISTRATION_STATUSES]) },
    });
    if (existing) {
      throw refuse(EVENT_CODES.ALREADY_REGISTERED, 'Your household is already registered for this event.');
    }

    const keys = dto.attendees.map((a) => a.personKey);
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException('Each person can be registered only once');
    }
    const people = new Map<string, HouseholdPerson>(
      (await this.householdPeople(member)).map((p) => [p.personKey, p]),
    );
    const types = await this.ticketRepo.find({ where: { eventId } });
    const eventDay = localDateIn(event.timezone, event.startsAt);
    const youthMaxAge = Number(this.events.setting(EVENT_SETTING_KEYS.YOUTH_MAX_AGE));

    const lines: Array<{
      input: AttendeeInputDto;
      person: HouseholdPerson;
      type: EventTicketType;
      price: { unitCents: number; tier: PricingTier };
    }> = [];
    for (const input of dto.attendees) {
      const person = people.get(input.personKey);
      if (!person) {
        throw new BadRequestException('Only members of your own household can be registered');
      }
      const type = ticketTypeFor(types, ageOn(person.dateOfBirth, eventDay));
      if (!type) {
        throw refuse(EVENT_CODES.NO_TICKET_TYPE, `This event has no ticket for ${person.fullName}.`);
      }
      await this.referenceData.assertValid(DIETARY_PREFERENCE_LIST, input.dietaryPref);
      await this.referenceData.assertValid(TSHIRT_SIZE_LIST, input.tshirtSize);
      lines.push({ input, person, type, price: priceFor(type, now) });
    }

    const waiver = event.waiverTemplateId
      ? await this.waiverRepo.findOne({ where: { id: event.waiverTemplateId } })
      : null;
    if (waiver && !(dto.waiverAccepted === true && dto.waiverSignedName?.trim())) {
      throw refuse(
        EVENT_CODES.WAIVER_REQUIRED,
        'The liability waiver must be accepted and signed before registering.',
      );
    }

    const totalCents = lines.reduce((sum, line) => sum + line.price.unitCents, 0);
    const requestedSlots = lines.flatMap((line) => [...new Set(line.input.slotIds ?? [])]);

    let registrationId: string;
    try {
      registrationId = await this.dataSource.transaction(async (em) => {
        // Seats first: this is the statement that enforces capacity, the
        // closing of the event and its publication, all at once.
        const seated = await em
          .createQueryBuilder()
          .update(PortalEvent)
          .set({ attendeeCount: () => `"attendeeCount" + ${lines.length}` })
          .where(
            `id = :id AND status = :published AND (capacity IS NULL OR "attendeeCount" + :n <= capacity)`,
            { id: eventId, published: 'published', n: lines.length },
          )
          .execute();
        if (!seated.affected) {
          const fresh = await em.findOne(PortalEvent, { where: { id: eventId } });
          assertEventWritable(fresh ?? { status: 'closed' });
          throw refuse(EVENT_CODES.EVENT_FULL, 'There are not enough places left for everyone selected.');
        }

        const registration = await em.save(
          em.create(EventRegistration, {
            eventId,
            householdId: member.householdId,
            purchaserMemberId: member.id,
            chapterId: member.chapterId,
            // Nothing to pay means nothing to wait for.
            status: totalCents === 0 ? 'confirmed' : 'pending_payment',
            totalCents,
            paidCents: 0,
            currency: event.currency,
          }),
        );

        const attendeeIdByKey = new Map<string, string>();
        for (const { input, person, type, price } of lines) {
          const attendee = await em.save(
            em.create(EventAttendee, {
              registrationId: registration.id,
              eventId,
              personType: person.personType,
              memberId: person.memberId,
              spouseProfileId: person.spouseProfileId,
              childProfileId: person.childProfileId,
              ownerMemberId: person.ownerMemberId,
              personKey: person.personKey,
              fullName: person.fullName,
              isYouth: isYouthAt(person.dateOfBirth, event, youthMaxAge),
              ticketTypeId: type.id,
              ticketTypeName: type.name,
              unitPriceCents: price.unitCents,
              pricingTier: price.tier,
              dietaryPref: input.dietaryPref || null,
              dietaryNotes: input.dietaryNotes?.trim() || null,
              tshirtSize: event.collectTshirt ? input.tshirtSize || null : null,
              hotelDetails: event.collectHotel ? input.hotelDetails?.trim() || null : null,
              isVolunteer: input.isVolunteer === true,
              status: 'active',
            }),
          );
          attendeeIdByKey.set(person.personKey, attendee.id);

          if (waiver) {
            await em.save(
              em.create(EventWaiverSignature, {
                attendeeId: attendee.id,
                eventId,
                waiverTemplateId: waiver.id,
                templateVersion: waiver.version,
                bodySha256: waiver.bodySha256,
                signedName: dto.waiverSignedName!.trim(),
                signedByMemberId: member.id,
                signedByUserId: viewer.id,
                signedAt: now,
                ip: meta.ip,
                userAgent: meta.userAgent?.slice(0, 500) ?? null,
              }),
            );
          }
        }

        if (requestedSlots.length > 0) {
          const slots = await em.find(EventTimeSlot, { where: { eventId, id: In(requestedSlots) } });
          const known = new Set(slots.map((slot) => slot.id));
          for (const { input, person } of lines) {
            for (const slotId of new Set(input.slotIds ?? [])) {
              if (!known.has(slotId)) throw new BadRequestException('Unknown time slot');
              await this.bookSlot(em, eventId, slotId, attendeeIdByKey.get(person.personKey)!);
            }
          }
        }
        return registration.id;
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw refuse(
          EVENT_CODES.ALREADY_REGISTERED,
          'Your household, or someone in it, is already registered for this event.',
        );
      }
      throw error;
    }

    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'event.registration.created',
      entityType: 'event_registration',
      entityId: registrationId,
      after: {
        eventId,
        attendees: lines.length,
        volunteers: lines.filter((line) => line.input.isVolunteer === true).length,
        totalCents,
        waiverVersion: waiver?.version ?? null,
      },
    });

    const registration = await this.registrationRepo.findOneOrFail({ where: { id: registrationId } });
    await this.sendQuietly(viewer.email, EVENT_TEMPLATES.REGISTRATION_RECEIVED, {
      firstName: member.firstName,
      title: event.title,
      when: formatWhen(event),
      eventId,
      attendeeCount: lines.length,
      total: formatMoney(totalCents, event.currency),
      owes: totalCents > 0,
    });
    return this.toDto(registration, event);
  }

  // ─── The member's own registration ────────────────────────────────────────

  /** The household's live registration, else its most recent one, else null. */
  async mine(eventId: string, viewer: AuthenticatedUser): Promise<EventRegistrationDto | null> {
    const event = await this.events.mustFindVisible(eventId);
    const member = await this.mustFindMember(viewer);
    const registration = await this.findForHousehold(eventId, member.householdId);
    return registration ? this.toDto(registration, event) : null;
  }

  async updatePreferences(
    eventId: string,
    dto: UpdatePreferencesDto,
    viewer: AuthenticatedUser,
  ): Promise<EventRegistrationDto> {
    const event = await this.events.mustFindVisible(eventId);
    assertEventWritable(event);
    const member = await this.mustFindMember(viewer);
    const registration = await this.mustFindLive(eventId, member.householdId);

    const attendees = await this.attendeeRepo.find({
      where: { registrationId: registration.id, status: 'active' },
    });
    const byId = new Map(attendees.map((a) => [a.id, a]));
    for (const input of dto.attendees) {
      const attendee = byId.get(input.attendeeId);
      if (!attendee) throw new BadRequestException('That person is not on your registration');
      await this.referenceData.assertValid(DIETARY_PREFERENCE_LIST, input.dietaryPref);
      await this.referenceData.assertValid(TSHIRT_SIZE_LIST, input.tshirtSize);
      if (input.dietaryPref !== undefined) attendee.dietaryPref = input.dietaryPref || null;
      if (input.dietaryNotes !== undefined) attendee.dietaryNotes = input.dietaryNotes?.trim() || null;
      if (input.tshirtSize !== undefined && event.collectTshirt) attendee.tshirtSize = input.tshirtSize || null;
      if (input.hotelDetails !== undefined && event.collectHotel) {
        attendee.hotelDetails = input.hotelDetails?.trim() || null;
      }
      await this.attendeeRepo.save(attendee);
    }
    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'event.registration.preferences_updated',
      entityType: 'event_registration',
      entityId: registration.id,
      after: { attendees: dto.attendees.length },
    });
    return this.toDto(registration, event);
  }

  /** EVT-23: a member may cancel only while nothing has been paid. */
  async cancel(eventId: string, viewer: AuthenticatedUser): Promise<EventRegistrationDto> {
    const event = await this.events.mustFindVisible(eventId);
    const member = await this.mustFindMember(viewer);
    const registration = await this.mustFindLive(eventId, member.householdId);

    const decision = canSelfCancel(registration, event);
    if (!decision.allowed) {
      throw refuse(
        decision.code!,
        decision.code === EVENT_CODES.ALREADY_PAID
          ? 'A paid registration cannot be cancelled in the portal. Please contact an administrator.'
          : 'This registration can no longer be cancelled.',
      );
    }

    const released = await this.dataSource.transaction((em) =>
      // `paidCents = 0` again, in the write: a payment that settles between
      // the check above and here must win.
      this.release(em, registration, 'cancelled', { cancelledAt: new Date() }, { requireUnpaid: true }),
    );
    if (!released) {
      throw refuse(
        EVENT_CODES.ALREADY_PAID,
        'A paid registration cannot be cancelled in the portal. Please contact an administrator.',
      );
    }
    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: 'event.registration.cancelled',
      entityType: 'event_registration',
      entityId: registration.id,
      before: { status: registration.status },
      after: { status: 'cancelled' },
    });
    return this.toDto(await this.registrationRepo.findOneOrFail({ where: { id: registration.id } }), event);
  }

  // ─── Staff ────────────────────────────────────────────────────────────────

  async listForEvent(
    eventId: string,
    filter: { status?: string; q?: string; limit?: string | number; offset?: string | number },
    scope: ChapterScope,
  ): Promise<{ items: AdminEventRegistrationDto[]; total: number }> {
    const event = await this.events.mustFindInScope(eventId, scope);
    const qb = this.registrationRepo
      .createQueryBuilder('r')
      .innerJoin(Member, 'm', 'm.id = r.purchaser_member_id')
      .where('r.eventId = :eventId', { eventId })
      .orderBy('r.createdAt', 'DESC');
    if (filter.status) qb.andWhere('r.status = :status', { status: filter.status });
    if (filter.q?.trim()) {
      qb.andWhere('(LOWER(m.firstName) LIKE :q OR LOWER(m.lastName) LIKE :q)', {
        q: `%${filter.q.trim().toLowerCase()}%`,
      });
    }
    const [registrations, total] = await qb
      .take(clampPage(filter.limit, 25, 200))
      .skip(clampPage(filter.offset, 0, Number.MAX_SAFE_INTEGER))
      .getManyAndCount();
    return {
      items: await Promise.all(registrations.map((r) => this.toAdminDto(r, event))),
      total,
    };
  }

  async getForEvent(eventId: string, registrationId: string, scope: ChapterScope): Promise<AdminEventRegistrationDto> {
    const event = await this.events.mustFindInScope(eventId, scope);
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId, eventId } });
    if (!registration) throw new NotFoundException('Registration not found');
    return this.toAdminDto(registration, event);
  }

  /**
   * EVT-23: an Admin removes a household from an event, whatever it has paid.
   * The reason is mandatory and the removal writes exactly one audit row.
   * Refunds are handled outside the portal — the payments stay on record.
   */
  async remove(
    eventId: string,
    registrationId: string,
    reason: string,
    actor: AuthenticatedUser,
  ): Promise<AdminEventRegistrationDto> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const registration = await this.registrationRepo.findOne({ where: { id: registrationId, eventId } });
    if (!registration) throw new NotFoundException('Registration not found');

    const released = await this.dataSource.transaction((em) =>
      this.release(em, registration, 'removed_by_admin', {
        removedByUserId: actor.id,
        removedReason: reason.trim(),
        removedAt: new Date(),
      }),
    );
    if (!released) throw refuse(EVENT_CODES.NOT_ACTIVE, 'This registration is no longer active.');

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.registration.removed',
      entityType: 'event_registration',
      entityId: registrationId,
      before: { status: registration.status, paidCents: registration.paidCents },
      after: { status: 'removed_by_admin' },
      reason: reason.trim(),
    });

    const purchaser = await this.memberRepo.findOne({ where: { id: registration.purchaserMemberId } });
    const user = purchaser ? await this.userRepo.findOne({ where: { id: purchaser.userId } }) : null;
    if (purchaser && user) {
      await this.sendQuietly(user.email, EVENT_TEMPLATES.REGISTRATION_REMOVED, {
        firstName: purchaser.firstName,
        title: event.title,
        reason: reason.trim(),
      });
    }
    return this.toAdminDto(
      await this.registrationRepo.findOneOrFail({ where: { id: registrationId } }),
      event,
    );
  }

  // ─── Participant list (EVT-21) ────────────────────────────────────────────

  /**
   * Who is taking part, for every signed-in member. Tier 2 (§3.2): a name and
   * a chapter. Someone who has opted out of the directory is counted but not
   * named, and no amount, payment state or preference is ever in the payload.
   */
  async participants(
    eventId: string,
    viewer: AuthenticatedUser,
  ): Promise<{ items: EventParticipantDto[]; total: number }> {
    await this.events.mustFindVisible(eventId);
    const attendees = await this.attendeeRepo.find({
      where: { eventId, status: 'active' },
      order: { registrationId: 'ASC', fullName: 'ASC' },
    });
    if (attendees.length === 0) return { items: [], total: 0 };

    const ownerIds = [...new Set(attendees.map((a) => a.ownerMemberId).filter((id): id is string => !!id))];
    const owners = ownerIds.length ? await this.memberRepo.find({ where: { id: In(ownerIds) } }) : [];
    const ownerById = new Map(owners.map((owner) => [owner.id, owner]));
    const chapterIds = [...new Set(owners.map((o) => o.chapterId).filter((id): id is string => !!id))];
    const chapters = chapterIds.length ? await this.chapterRepo.find({ where: { id: In(chapterIds) } }) : [];
    const chapterName = new Map(chapters.map((c) => [c.id, c.name]));
    const self = await this.memberRepo.findOne({
      where: { userId: viewer.id },
      select: { id: true, householdId: true },
    });

    // Registration ids are internal; a household is grouped by its position.
    const householdKeys = new Map<string, string>();
    const items = attendees.map((attendee): EventParticipantDto => {
      const owner = attendee.ownerMemberId ? (ownerById.get(attendee.ownerMemberId) ?? null) : null;
      const identity = this.visibility.toListingIdentity(
        viewer,
        self?.householdId ?? null,
        owner,
        attendee.fullName,
        'Private member',
      );
      if (!householdKeys.has(attendee.registrationId)) {
        householdKeys.set(attendee.registrationId, `h${householdKeys.size + 1}`);
      }
      return {
        displayName: identity.displayName,
        isPrivate: identity.isPrivate,
        chapterName: identity.isPrivate || !owner?.chapterId ? null : (chapterName.get(owner.chapterId) ?? null),
        isVolunteer: attendee.isVolunteer,
        householdKey: householdKeys.get(attendee.registrationId)!,
      };
    });
    return { items, total: items.length };
  }

  // ─── Shared ───────────────────────────────────────────────────────────────

  async mustFindMember(viewer: AuthenticatedUser): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { userId: viewer.id } });
    if (!member) {
      throw refuse('NO_MEMBER_RECORD', 'Only members can register for events.');
    }
    return member;
  }

  private async findForHousehold(eventId: string, householdId: string): Promise<EventRegistration | null> {
    const all = await this.registrationRepo.find({
      where: { eventId, householdId },
      order: { createdAt: 'DESC' },
    });
    return (
      all.find((r) => ACTIVE_REGISTRATION_STATUSES.includes(r.status)) ?? all[0] ?? null
    );
  }

  async mustFindLive(eventId: string, householdId: string): Promise<EventRegistration> {
    const registration = await this.registrationRepo.findOne({
      where: { eventId, householdId, status: In([...ACTIVE_REGISTRATION_STATUSES]) },
    });
    if (!registration) throw new NotFoundException('You have no registration for this event');
    return registration;
  }

  /** Everyone in the purchaser's household: its active members, the spouse, the children. */
  private async householdPeople(member: Member): Promise<HouseholdPerson[]> {
    const [members, spouses, children] = await Promise.all([
      this.memberRepo.find({ where: { householdId: member.householdId, isActive: true } }),
      this.spouseRepo.find({ where: { householdId: member.householdId } }),
      this.childRepo.find({ where: { householdId: member.householdId }, order: { sequence: 'ASC' } }),
    ]);
    // The purchaser is always offered, first, even if another query hid them.
    const ordered = [member, ...members.filter((m) => m.id !== member.id)];
    const name = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`.trim();
    return [
      ...ordered.map((m): HouseholdPerson => ({
        personKey: `member:${m.id}`,
        personType: 'member',
        fullName: name(m),
        dateOfBirth: m.dateOfBirth,
        memberId: m.id,
        spouseProfileId: null,
        childProfileId: null,
        ownerMemberId: m.id,
      })),
      ...spouses.map((s): HouseholdPerson => ({
        personKey: `spouse:${s.id}`,
        personType: 'spouse',
        fullName: name(s),
        dateOfBirth: s.dateOfBirth,
        memberId: null,
        spouseProfileId: s.id,
        childProfileId: null,
        ownerMemberId: s.memberId,
      })),
      ...children.map((c): HouseholdPerson => ({
        personKey: `child:${c.id}`,
        personType: 'child',
        fullName: name(c),
        dateOfBirth: c.dateOfBirth,
        memberId: null,
        spouseProfileId: null,
        childProfileId: c.id,
        ownerMemberId: c.memberId,
      })),
    ];
  }

  private async bookSlot(em: EntityManager, eventId: string, slotId: string, attendeeId: string): Promise<void> {
    const booked = await em
      .createQueryBuilder()
      .update(EventTimeSlot)
      .set({ bookedCount: () => `"bookedCount" + 1` })
      .where(`id = :slotId AND event_id = :eventId AND "bookedCount" < capacity`, { slotId, eventId })
      .execute();
    if (!booked.affected) {
      throw refuse(EVENT_CODES.SLOT_FULL, 'One of the time slots you chose has just filled up.');
    }
    await em.save(em.create(EventSlotBooking, { slotId, attendeeId, eventId }));
  }

  /**
   * Take a live registration out of the event: its seats and time slots go
   * back, its attendees are released, and any checkout still open is expired
   * so it can no longer be paid. Answers false if it was not live (or, with
   * `requireUnpaid`, had been paid) by the time the write ran.
   */
  private async release(
    em: EntityManager,
    registration: EventRegistration,
    status: Extract<RegistrationStatus, 'cancelled' | 'removed_by_admin'>,
    patch: Partial<EventRegistration>,
    options: { requireUnpaid?: boolean } = {},
  ): Promise<boolean> {
    const moved = await em
      .createQueryBuilder()
      .update(EventRegistration)
      .set({ ...patch, status })
      .where(
        `id = :id AND status IN (:...live)${options.requireUnpaid ? ' AND "paidCents" = 0' : ''}`,
        { id: registration.id, live: [...ACTIVE_REGISTRATION_STATUSES] },
      )
      .execute();
    if (!moved.affected) return false;

    const attendees = await em.find(EventAttendee, {
      where: { registrationId: registration.id, status: 'active' },
    });
    if (attendees.length > 0) {
      const attendeeIds = attendees.map((a) => a.id);
      const bookings = await em.find(EventSlotBooking, { where: { attendeeId: In(attendeeIds) } });
      for (const booking of bookings) {
        await em
          .createQueryBuilder()
          .update(EventTimeSlot)
          .set({ bookedCount: () => `"bookedCount" - 1` })
          .where(`id = :id AND "bookedCount" > 0`, { id: booking.slotId })
          .execute();
      }
      if (bookings.length > 0) await em.delete(EventSlotBooking, { attendeeId: In(attendeeIds) });
      await em.update(EventAttendee, { id: In(attendeeIds) }, { status: 'released' });
      await em
        .createQueryBuilder()
        .update(PortalEvent)
        .set({ attendeeCount: () => `"attendeeCount" - ${attendees.length}` })
        .where(`id = :id AND "attendeeCount" >= :n`, { id: registration.eventId, n: attendees.length })
        .execute();
    }
    await em.update(
      EventPayment,
      { registrationId: registration.id, status: 'pending' },
      { status: 'expired' },
    );
    return true;
  }

  // ─── Serialisation ────────────────────────────────────────────────────────

  async toDto(registration: EventRegistration, event: PortalEvent): Promise<EventRegistrationDto> {
    // A removed or cancelled registration still shows who was on it.
    const attendees = await this.attendeeRepo.find({
      where: { registrationId: registration.id },
      order: { createdAt: 'ASC' },
    });
    const attendeeIds = attendees.map((a) => a.id);
    const [bookings, signatures, payments] = await Promise.all([
      attendeeIds.length
        ? this.bookingRepo.find({ where: { attendeeId: In(attendeeIds) }, relations: { slot: true } })
        : ([] as EventSlotBooking[]),
      attendeeIds.length
        ? this.signatureRepo.find({ where: { attendeeId: In(attendeeIds) } })
        : ([] as EventWaiverSignature[]),
      this.paymentRepo.find({ where: { registrationId: registration.id }, order: { createdAt: 'ASC' } }),
    ]);
    const signedAt = new Map<string, Date>(signatures.map((s) => [s.attendeeId, s.signedAt]));
    const cancel = canSelfCancel(registration, event);

    return {
      id: registration.id,
      eventId: registration.eventId,
      status: registration.status,
      totalCents: registration.totalCents,
      paidCents: registration.paidCents,
      balanceCents: Math.max(0, registration.totalCents - registration.paidCents),
      currency: registration.currency,
      canCancel: cancel.allowed,
      cancelBlockedCode: cancel.allowed ? null : cancel.code,
      attendees: attendees.map((a): AttendeeDto => ({
        id: a.id,
        personKey: a.personKey,
        personType: a.personType,
        fullName: a.fullName,
        isYouth: a.isYouth,
        ticketTypeName: a.ticketTypeName,
        unitPriceCents: a.unitPriceCents,
        pricingTier: a.pricingTier,
        dietaryPref: a.dietaryPref,
        dietaryNotes: a.dietaryNotes,
        tshirtSize: a.tshirtSize,
        hotelDetails: a.hotelDetails,
        isVolunteer: a.isVolunteer,
        volunteerMinutes: a.volunteerMinutes,
        waiverSignedAt: signedAt.get(a.id) ?? null,
        slots: bookings
          .filter((b) => b.attendeeId === a.id)
          .map((b) => ({
            slotId: b.slotId,
            activity: b.slot.activity,
            startsAt: b.slot.startsAt,
            endsAt: b.slot.endsAt,
          })),
      })),
      // A checkout that was opened and never paid is noise to the reader.
      payments: payments
        .filter((p) => p.status === 'settled')
        .map((p) => ({
          id: p.id,
          amountCents: p.amountCents,
          currency: p.currency,
          method: p.method,
          status: p.status,
          reference: p.reference,
          note: p.note,
          recordedByUserId: p.recordedByUserId,
          settledAt: p.settledAt,
          createdAt: p.createdAt,
        })),
      createdAt: registration.createdAt,
    };
  }

  async toAdminDto(registration: EventRegistration, event: PortalEvent): Promise<AdminEventRegistrationDto> {
    const base = await this.toDto(registration, event);
    const purchaser = await this.memberRepo.findOne({ where: { id: registration.purchaserMemberId } });
    const user = purchaser ? await this.userRepo.findOne({ where: { id: purchaser.userId } }) : null;
    return {
      ...base,
      householdId: registration.householdId,
      purchaserMemberId: registration.purchaserMemberId,
      purchaserName: purchaser ? `${purchaser.firstName} ${purchaser.lastName}` : 'Unknown member',
      purchaserEmail: user?.email ?? null,
      chapterId: registration.chapterId,
      removedReason: registration.removedReason,
      removedAt: registration.removedAt,
      removedByUserId: registration.removedByUserId,
    };
  }

  /** A mail failure must never fail the registration it reports on. */
  private async sendQuietly(to: string, template: string, variables: Record<string, unknown>): Promise<void> {
    try {
      await this.email.send({ to, template, variables });
    } catch (error) {
      this.logger.error(`Could not send ${template} to ${to}: ${(error as Error).message}`);
    }
  }
}

/** Hash of a waiver body, as stored on the template and each signature. */
export const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
