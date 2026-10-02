import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  type StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { In, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { Chapter } from '../../community-core/entities/chapter.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { type ChapterScope } from '../../community-core/providers/member.service';
import { clampPage } from '../../community-core/providers/pagination';
import { PortalSettingsService } from '../../community-core/providers/portal-settings.service';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import {
  PortalFileService,
  type UploadedPortalFile,
} from '../../portal-files/portal-file.service';
import {
  ACTIVE_REGISTRATION_STATUSES,
  EVENT_CODES,
  EVENT_SETTING_DEFAULTS,
  EVENT_SETTING_KEYS,
  type EventCategory,
} from '../constants';
import { EventAttendee } from '../entities/event-attendee.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { EventSlotBooking } from '../entities/event-slot-booking.entity';
import { EventTicketType } from '../entities/event-ticket-type.entity';
import { EventTimeSlot } from '../entities/event-time-slot.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import { WaiverTemplate } from '../entities/waiver-template.entity';
import { ID_PATTERN } from '../models/id';
import type {
  AdminEventDto,
  CreateEventDto,
  EventDetailDto,
  EventSummaryDto,
  SlotDto,
  TicketTypeDto,
  UpdateEventDto,
  UpsertSlotDto,
  UpsertTicketTypeDto,
} from '../models/event.dto';
import {
  assertEventWritable,
  localDateIn,
  priceFor,
  registrationState,
} from './event-rules';

export interface EventListFilter {
  scope?: string;
  category?: string;
  chapterId?: string;
  limit?: string | number;
  offset?: string | number;
}

/**
 * Events themselves: creating, editing, publishing, and what a member sees of
 * them (EVT-16, EVT-17, EVT-25). Registrations, money and closing each have
 * their own service.
 *
 * Two rules run through every method. A draft does not exist as far as a
 * member is concerned — the member-facing reads answer 404 for one. And a
 * closed event takes no write: each mutation starts with
 * `assertEventWritable`.
 */
@Injectable()
export class EventService {
  constructor(
    @InjectRepository(PortalEvent) private readonly eventRepo: Repository<PortalEvent>,
    @InjectRepository(EventTicketType) private readonly ticketRepo: Repository<EventTicketType>,
    @InjectRepository(EventTimeSlot) private readonly slotRepo: Repository<EventTimeSlot>,
    @InjectRepository(EventSlotBooking) private readonly bookingRepo: Repository<EventSlotBooking>,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventAttendee) private readonly attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(Chapter) private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(WaiverTemplate) private readonly waiverRepo: Repository<WaiverTemplate>,
    @InjectRepository(PortalFile) private readonly fileRepo: Repository<PortalFile>,
    private readonly settings: PortalSettingsService,
    private readonly files: PortalFileService,
    private readonly audit: AuditService,
  ) {}

  /** A portal setting of this module, falling back to what `0004` seeds. */
  setting(key: string): string {
    return this.settings.getString(key) || EVENT_SETTING_DEFAULTS[key] || '';
  }

  // ─── Lookups ──────────────────────────────────────────────────────────────

  async mustFind(id: string): Promise<PortalEvent> {
    const event = await this.eventRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  /** The event as a member may see it: a draft answers 404. */
  async mustFindVisible(id: string): Promise<PortalEvent> {
    const event = await this.mustFind(id);
    if (event.status === 'draft') throw new NotFoundException('Event not found');
    return event;
  }

  /**
   * The event for a staff screen, confined to a Chapter Lead's own chapter
   * (IAM-10). Out of scope is 404, not 403, so existence is not disclosed.
   */
  async mustFindInScope(id: string, scope: ChapterScope): Promise<PortalEvent> {
    const event = await this.mustFind(id);
    if (!scope.all && !(event.chapterId && scope.chapterIds.includes(event.chapterId))) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  // ─── Member-facing reads ──────────────────────────────────────────────────

  async listVisible(filter: EventListFilter): Promise<{ items: EventSummaryDto[]; total: number }> {
    const now = new Date();
    const qb = this.eventRepo.createQueryBuilder('e').where('e.status <> :draft', { draft: 'draft' });
    if (filter.scope === 'past') {
      qb.andWhere('e.endsAt < :now', { now }).orderBy('e.startsAt', 'DESC');
    } else {
      qb.andWhere('e.endsAt >= :now', { now }).orderBy('e.startsAt', 'ASC');
    }
    if (filter.category) qb.andWhere('e.category = :category', { category: filter.category });
    if (filter.chapterId) {
      // Not id-shaped means no chapter, so no events — not a database error.
      if (!ID_PATTERN.test(filter.chapterId)) return { items: [], total: 0 };
      qb.andWhere('e.chapterId = :chapterId', { chapterId: filter.chapterId });
    }

    const [events, total] = await qb
      .take(clampPage(filter.limit, 25, 100))
      .skip(clampPage(filter.offset, 0, Number.MAX_SAFE_INTEGER))
      .getManyAndCount();
    return { items: await this.toSummaries(events, now), total };
  }

  /**
   * The next event a member can still register for (HOM-02), or null. An
   * event whose registration has closed is not a highlight worth showing.
   */
  async nextUpcoming(): Promise<EventSummaryDto | null> {
    const now = new Date();
    const candidates = await this.eventRepo
      .createQueryBuilder('e')
      .where('e.status = :published', { published: 'published' })
      .andWhere('e.startsAt > :now', { now })
      .orderBy('e.startsAt', 'ASC')
      .take(20)
      .getMany();
    const next = candidates.find((event) => registrationState(event, now).open);
    if (!next) return null;
    return (await this.toSummaries([next], now))[0];
  }

  async detail(id: string): Promise<EventDetailDto> {
    return this.toDetail(await this.mustFindVisible(id));
  }

  async sendFlyer(id: string, response: Response): Promise<StreamableFile> {
    const event = await this.mustFindVisible(id);
    if (!event.flyerFileId) throw new NotFoundException('This event has no flyer');
    return this.files.send(event.flyerFileId, response);
  }

  async listSlots(eventId: string): Promise<SlotDto[]> {
    const slots = await this.slotRepo.find({ where: { eventId }, order: { startsAt: 'ASC' } });
    return slots.map(toSlotDto);
  }

  // ─── Staff reads ──────────────────────────────────────────────────────────

  async listAdmin(
    filter: EventListFilter & { status?: string },
    scope: ChapterScope,
  ): Promise<{ items: AdminEventDto[]; total: number }> {
    const qb = this.eventRepo.createQueryBuilder('e').orderBy('e.startsAt', 'DESC');
    if (!scope.all) {
      if (scope.chapterIds.length === 0) return { items: [], total: 0 };
      qb.andWhere('e.chapterId IN (:...chapterIds)', { chapterIds: scope.chapterIds });
    }
    if (filter.status) qb.andWhere('e.status = :status', { status: filter.status });
    if (filter.category) qb.andWhere('e.category = :category', { category: filter.category });

    const [events, total] = await qb
      .take(clampPage(filter.limit, 25, 100))
      .skip(clampPage(filter.offset, 0, Number.MAX_SAFE_INTEGER))
      .getManyAndCount();
    return { items: await Promise.all(events.map((event) => this.toAdmin(event))), total };
  }

  async adminDetail(id: string, scope: ChapterScope): Promise<AdminEventDto> {
    return this.toAdmin(await this.mustFindInScope(id, scope));
  }

  // ─── Create, edit, publish ────────────────────────────────────────────────

  async create(dto: CreateEventDto, user: AuthenticatedUser): Promise<AdminEventDto> {
    const timezone = dto.timezone?.trim() || this.setting(EVENT_SETTING_KEYS.DEFAULT_TIMEZONE);
    await this.assertReferences(dto);
    assertSchedule({
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      timezone,
      registrationClosesOn: dto.registrationClosesOn,
    });

    const event = await this.eventRepo.save(
      this.eventRepo.create({
        title: dto.title.trim(),
        description: blankToNull(dto.description),
        category: dto.category,
        chapterId: dto.chapterId || null,
        venue: blankToNull(dto.venue),
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        timezone,
        capacity: dto.capacity ?? null,
        registrationClosesOn: dto.registrationClosesOn,
        currency: (dto.currency || 'USD').toUpperCase(),
        attireGuide: blankToNull(dto.attireGuide),
        waiverTemplateId: dto.waiverTemplateId || null,
        collectTshirt: dto.collectTshirt ?? false,
        collectHotel: dto.collectHotel ?? false,
        reminderOffsetsDays: dto.reminderOffsetsDays?.length ? dto.reminderOffsetsDays : null,
        stripePaymentLink: blankToNull(dto.stripePaymentLink),
        zelleInstructions: blankToNull(dto.zelleInstructions),
        status: 'draft',
        createdByUserId: user.id,
      }),
    );

    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.created',
      entityType: 'event',
      entityId: event.id,
      after: { title: event.title, category: event.category, chapterId: event.chapterId },
    });
    return this.toAdmin(event);
  }

  async update(id: string, dto: UpdateEventDto, user: AuthenticatedUser): Promise<AdminEventDto> {
    const event = await this.mustFind(id);
    assertEventWritable(event);
    await this.assertReferences(dto);

    const next = {
      startsAt: dto.startsAt ?? event.startsAt,
      endsAt: dto.endsAt ?? event.endsAt,
      timezone: dto.timezone?.trim() || event.timezone,
      registrationClosesOn: dto.registrationClosesOn ?? event.registrationClosesOn,
    };
    assertSchedule(next);
    if (dto.capacity !== undefined && dto.capacity !== null && dto.capacity < event.attendeeCount) {
      throw new ConflictException({
        code: EVENT_CODES.EVENT_FULL,
        message: `${event.attendeeCount} people are already registered; the maximum cannot go below that.`,
      });
    }

    const patch: Partial<PortalEvent> = { ...next };
    if (dto.title !== undefined) patch.title = dto.title.trim();
    if (dto.category !== undefined) patch.category = dto.category;
    if (dto.description !== undefined) patch.description = blankToNull(dto.description);
    if (dto.chapterId !== undefined) patch.chapterId = dto.chapterId || null;
    if (dto.venue !== undefined) patch.venue = blankToNull(dto.venue);
    if (dto.capacity !== undefined) patch.capacity = dto.capacity;
    if (dto.attireGuide !== undefined) patch.attireGuide = blankToNull(dto.attireGuide);
    if (dto.waiverTemplateId !== undefined) patch.waiverTemplateId = dto.waiverTemplateId || null;
    if (dto.collectTshirt !== undefined) patch.collectTshirt = dto.collectTshirt;
    if (dto.collectHotel !== undefined) patch.collectHotel = dto.collectHotel;
    if (dto.reminderOffsetsDays !== undefined) {
      patch.reminderOffsetsDays = dto.reminderOffsetsDays?.length ? dto.reminderOffsetsDays : null;
    }
    if (dto.stripePaymentLink !== undefined) patch.stripePaymentLink = blankToNull(dto.stripePaymentLink);
    if (dto.zelleInstructions !== undefined) patch.zelleInstructions = blankToNull(dto.zelleInstructions);

    await this.updateOpen(id, patch);
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.updated',
      entityType: 'event',
      entityId: id,
      after: { ...dto } as Record<string, unknown>,
    });
    return this.toAdmin(await this.mustFind(id));
  }

  /**
   * Draft → published. From here members see the event and the scheduler
   * sends the invitation (EVT-22). It needs a ticket: a published event
   * nobody can be priced for cannot take a registration.
   */
  async publish(id: string, user: AuthenticatedUser): Promise<AdminEventDto> {
    const event = await this.mustFind(id);
    assertEventWritable(event);
    if (event.status !== 'draft') {
      throw new ConflictException({ code: 'ALREADY_PUBLISHED', message: 'This event is already published.' });
    }
    const tickets = await this.ticketRepo.count({ where: { eventId: id, isActive: true } });
    if (tickets === 0) {
      throw new ConflictException({
        code: EVENT_CODES.NO_TICKET_TYPE,
        message: 'Add at least one ticket before publishing. A free event needs a ticket priced at 0.',
      });
    }

    const moved = await this.eventRepo.update(
      { id, status: 'draft' },
      { status: 'published', publishedAt: new Date() },
    );
    if (!moved.affected) {
      throw new ConflictException({ code: 'ALREADY_PUBLISHED', message: 'This event is already published.' });
    }
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.published',
      entityType: 'event',
      entityId: id,
      before: { status: 'draft' },
      after: { status: 'published' },
    });
    return this.toAdmin(await this.mustFind(id));
  }

  /** EVT-25: the link to the photos, posted once the event is over. */
  async setPhotosLink(id: string, photosUrl: string | null, user: AuthenticatedUser): Promise<AdminEventDto> {
    const event = await this.mustFind(id);
    assertEventWritable(event);
    await this.updateOpen(id, { photosUrl: blankToNull(photosUrl) });
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.photos_link_set',
      entityType: 'event',
      entityId: id,
      before: { photosUrl: event.photosUrl },
      after: { photosUrl: blankToNull(photosUrl) },
    });
    return this.toAdmin(await this.mustFind(id));
  }

  async uploadFlyer(
    id: string,
    file: UploadedPortalFile | undefined,
    user: AuthenticatedUser,
  ): Promise<AdminEventDto> {
    const event = await this.mustFind(id);
    assertEventWritable(event);
    const stored = await this.files.store(file, 'event-flyers', user.id);
    try {
      await this.updateOpen(id, { flyerFileId: stored.id });
    } catch (error) {
      await this.files.remove(stored.id);
      throw error;
    }
    if (event.flyerFileId) await this.files.remove(event.flyerFileId);
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.flyer_uploaded',
      entityType: 'event',
      entityId: id,
      after: { fileId: stored.id, name: stored.name },
    });
    return this.toAdmin(await this.mustFind(id));
  }

  // ─── Ticket types ─────────────────────────────────────────────────────────

  async addTicketType(eventId: string, dto: UpsertTicketTypeDto, user: AuthenticatedUser): Promise<TicketTypeDto> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    assertTicketBand(dto);
    const type = await this.ticketRepo.save(
      this.ticketRepo.create({
        eventId,
        name: dto.name.trim(),
        minAge: dto.minAge ?? null,
        maxAge: dto.maxAge ?? null,
        priceCents: dto.priceCents,
        earlyBirdPriceCents: dto.earlyBirdPriceCents ?? null,
        earlyBirdEndsAt: dto.earlyBirdEndsAt ?? null,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      }),
    );
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.ticket_type.created',
      entityType: 'event',
      entityId: eventId,
      after: { ticketTypeId: type.id, ...dto } as Record<string, unknown>,
    });
    return toTicketTypeDto(type, new Date());
  }

  async updateTicketType(
    eventId: string,
    ticketTypeId: string,
    dto: UpsertTicketTypeDto,
    user: AuthenticatedUser,
  ): Promise<TicketTypeDto> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    assertTicketBand(dto);
    const type = await this.ticketRepo.findOne({ where: { id: ticketTypeId, eventId } });
    if (!type) throw new NotFoundException('Ticket not found');
    const before = { priceCents: type.priceCents, earlyBirdPriceCents: type.earlyBirdPriceCents };

    type.name = dto.name.trim();
    type.minAge = dto.minAge ?? null;
    type.maxAge = dto.maxAge ?? null;
    type.priceCents = dto.priceCents;
    type.earlyBirdPriceCents = dto.earlyBirdPriceCents ?? null;
    type.earlyBirdEndsAt = dto.earlyBirdEndsAt ?? null;
    if (dto.sortOrder !== undefined) type.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;
    await this.ticketRepo.save(type);

    // Prices already locked on attendees are untouched: a change here applies
    // to registrations made from now on.
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.ticket_type.updated',
      entityType: 'event',
      entityId: eventId,
      before,
      after: { ticketTypeId, ...dto } as Record<string, unknown>,
    });
    return toTicketTypeDto(type, new Date());
  }

  /** Removes a ticket nobody holds; one in use is retired with `isActive: false` instead. */
  async deleteTicketType(eventId: string, ticketTypeId: string, user: AuthenticatedUser): Promise<void> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    const type = await this.ticketRepo.findOne({ where: { id: ticketTypeId, eventId } });
    if (!type) throw new NotFoundException('Ticket not found');
    const used = await this.attendeeRepo.count({ where: { ticketTypeId } });
    if (used > 0) {
      throw new ConflictException({
        code: 'TICKET_IN_USE',
        message: 'People are registered on this ticket. Deactivate it instead of deleting it.',
      });
    }
    await this.ticketRepo.delete({ id: ticketTypeId });
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.ticket_type.deleted',
      entityType: 'event',
      entityId: eventId,
      before: { ticketTypeId, name: type.name },
    });
  }

  // ─── Time slots (EVT-03) ──────────────────────────────────────────────────

  async addSlot(eventId: string, dto: UpsertSlotDto, user: AuthenticatedUser): Promise<SlotDto> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    assertSlotTimes(dto);
    const slot = await this.slotRepo.save(
      this.slotRepo.create({
        eventId,
        activity: dto.activity.trim(),
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        capacity: dto.capacity,
      }),
    );
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.slot.created',
      entityType: 'event',
      entityId: eventId,
      after: { slotId: slot.id, ...dto } as Record<string, unknown>,
    });
    return toSlotDto(slot);
  }

  async updateSlot(eventId: string, slotId: string, dto: UpsertSlotDto, user: AuthenticatedUser): Promise<SlotDto> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    assertSlotTimes(dto);
    const slot = await this.slotRepo.findOne({ where: { id: slotId, eventId } });
    if (!slot) throw new NotFoundException('Time slot not found');
    if (dto.capacity < slot.bookedCount) {
      throw new ConflictException({
        code: EVENT_CODES.SLOT_FULL,
        message: `${slot.bookedCount} places are already booked; the capacity cannot go below that.`,
      });
    }
    slot.activity = dto.activity.trim();
    slot.startsAt = dto.startsAt;
    slot.endsAt = dto.endsAt;
    slot.capacity = dto.capacity;
    await this.slotRepo.save(slot);
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.slot.updated',
      entityType: 'event',
      entityId: eventId,
      after: { slotId, ...dto } as Record<string, unknown>,
    });
    return toSlotDto(slot);
  }

  async deleteSlot(eventId: string, slotId: string, user: AuthenticatedUser): Promise<void> {
    const event = await this.mustFind(eventId);
    assertEventWritable(event);
    const slot = await this.slotRepo.findOne({ where: { id: slotId, eventId } });
    if (!slot) throw new NotFoundException('Time slot not found');
    const booked = await this.bookingRepo.count({ where: { slotId } });
    if (booked > 0) {
      throw new ConflictException({
        code: 'SLOT_IN_USE',
        message: 'People have booked this time slot, so it cannot be deleted.',
      });
    }
    await this.slotRepo.delete({ id: slotId });
    await this.audit.record({
      actorUserId: user.id,
      actorRoles: user.roles,
      action: 'event.slot.deleted',
      entityType: 'event',
      entityId: eventId,
      before: { slotId, activity: slot.activity },
    });
  }

  // ─── Serialisation ────────────────────────────────────────────────────────

  async toDetail(event: PortalEvent, now = new Date()): Promise<EventDetailDto> {
    const [summary] = await this.toSummaries([event], now);
    const types = await this.ticketRepo.find({
      where: { eventId: event.id },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    const slotCount = await this.slotRepo.count({ where: { eventId: event.id } });
    const flyer = event.flyerFileId ? await this.files.get(event.flyerFileId).catch(() => null) : null;
    return {
      ...summary,
      description: event.description,
      attireGuide: event.attireGuide,
      stripePaymentLink: event.stripePaymentLink,
      zelleInstructions: event.zelleInstructions,
      photosUrl: event.photosUrl,
      flyerName: flyer?.name ?? null,
      hasWaiver: event.waiverTemplateId !== null,
      hasSlots: slotCount > 0,
      collectTshirt: event.collectTshirt,
      collectHotel: event.collectHotel,
      ticketTypes: types.map((type) => toTicketTypeDto(type, now)),
      publishedAt: event.publishedAt,
      closedAt: event.closedAt,
    };
  }

  private async toAdmin(event: PortalEvent): Promise<AdminEventDto> {
    const detail = await this.toDetail(event);
    const money = await this.registrationRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(r.totalCents), 0)', 'total')
      .addSelect('COALESCE(SUM(r.paidCents), 0)', 'paid')
      .where('r.eventId = :eventId', { eventId: event.id })
      .andWhere('r.status IN (:...statuses)', { statuses: ACTIVE_REGISTRATION_STATUSES })
      .getRawOne<{ count: string; total: string; paid: string }>();
    const volunteerCount = await this.attendeeRepo.count({
      where: { eventId: event.id, status: 'active', isVolunteer: true },
    });
    return {
      ...detail,
      waiverTemplateId: event.waiverTemplateId,
      reminderOffsetsDays: event.reminderOffsetsDays,
      createdByUserId: event.createdByUserId,
      closedByUserId: event.closedByUserId,
      invitationCompletedAt: event.invitationCompletedAt,
      registrationCount: Number(money?.count ?? 0),
      volunteerCount,
      totalCents: Number(money?.total ?? 0),
      paidCents: Number(money?.paid ?? 0),
    };
  }

  private async toSummaries(events: PortalEvent[], now: Date): Promise<EventSummaryDto[]> {
    if (events.length === 0) return [];
    const chapterIds = [...new Set(events.map((e) => e.chapterId).filter((id): id is string => !!id))];
    const chapters = chapterIds.length
      ? await this.chapterRepo.find({ where: { id: In(chapterIds) }, select: { id: true, name: true } })
      : [];
    const chapterNames = new Map(chapters.map((c) => [c.id, c.name]));
    const types = await this.ticketRepo.find({
      where: { eventId: In(events.map((e) => e.id)), isActive: true },
    });

    const flyerIds = events.map((e) => e.flyerFileId).filter((id): id is string => !!id);
    const flyers = flyerIds.length
      ? await this.fileRepo.find({ where: { id: In(flyerIds) }, select: { id: true, mimeType: true } })
      : [];
    const flyerType = new Map<string, string>(flyers.map((f) => [f.id, f.mimeType]));

    return events.map((event) => {
      const state = registrationState(event, now);
      const prices = types
        .filter((type) => type.eventId === event.id)
        .map((type) => priceFor(type, now).unitCents);
      return {
        id: event.id,
        title: event.title,
        category: event.category as EventCategory,
        chapterId: event.chapterId,
        chapterName: event.chapterId ? (chapterNames.get(event.chapterId) ?? null) : null,
        venue: event.venue,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        timezone: event.timezone,
        capacity: event.capacity,
        attendeeCount: event.attendeeCount,
        registrationClosesOn: event.registrationClosesOn,
        status: event.status,
        currency: event.currency,
        hasFlyer: event.flyerFileId !== null,
        flyerMimeType: event.flyerFileId ? (flyerType.get(event.flyerFileId) ?? null) : null,
        registrationOpen: state.open,
        registrationClosedCode: state.open ? null : state.code,
        fromPriceCents: prices.length ? Math.min(...prices) : null,
      };
    });
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  /**
   * Write to an event only while it is not closed. `assertEventWritable` read
   * the status a moment ago; this makes the write itself conditional, so a
   * close that lands in between cannot be overwritten.
   */
  private async updateOpen(id: string, patch: Partial<PortalEvent>): Promise<void> {
    const result = await this.eventRepo
      .createQueryBuilder()
      .update(PortalEvent)
      .set(patch)
      .where('id = :id AND status <> :closed', { id, closed: 'closed' })
      .execute();
    if (!result.affected) assertEventWritable({ status: 'closed' });
  }

  private async assertReferences(dto: { chapterId?: string | null; waiverTemplateId?: string | null }): Promise<void> {
    if (dto.chapterId) {
      const chapter = await this.chapterRepo.findOne({ where: { id: dto.chapterId } });
      if (!chapter) throw new BadRequestException('Unknown chapter');
    }
    if (dto.waiverTemplateId) {
      const waiver = await this.waiverRepo.findOne({ where: { id: dto.waiverTemplateId } });
      if (!waiver) throw new BadRequestException('Unknown waiver');
    }
  }
}

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

function assertSchedule(schedule: {
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  registrationClosesOn: string;
}): void {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: schedule.timezone });
  } catch {
    throw new BadRequestException(`"${schedule.timezone}" is not a time zone this server knows`);
  }
  if (schedule.endsAt.getTime() <= schedule.startsAt.getTime()) {
    throw new BadRequestException('The event must end after it starts');
  }
  if (schedule.registrationClosesOn > localDateIn(schedule.timezone, schedule.startsAt)) {
    throw new BadRequestException('Registration must close on or before the day the event starts');
  }
}

function assertTicketBand(dto: UpsertTicketTypeDto): void {
  if (dto.minAge != null && dto.maxAge != null && dto.minAge > dto.maxAge) {
    throw new BadRequestException('The minimum age cannot be above the maximum age');
  }
  const hasPrice = dto.earlyBirdPriceCents != null;
  const hasEnd = dto.earlyBirdEndsAt != null;
  if (hasPrice !== hasEnd) {
    throw new BadRequestException('An early-bird price needs an end time, and an end time needs a price');
  }
}

function assertSlotTimes(dto: UpsertSlotDto): void {
  if (dto.endsAt.getTime() <= dto.startsAt.getTime()) {
    throw new BadRequestException('A time slot must end after it starts');
  }
}

export function toTicketTypeDto(type: EventTicketType, now: Date): TicketTypeDto {
  const current = priceFor(type, now);
  return {
    id: type.id,
    name: type.name,
    minAge: type.minAge,
    maxAge: type.maxAge,
    priceCents: type.priceCents,
    earlyBirdPriceCents: type.earlyBirdPriceCents,
    earlyBirdEndsAt: type.earlyBirdEndsAt,
    sortOrder: type.sortOrder,
    isActive: type.isActive,
    currentPriceCents: current.unitCents,
    currentTier: current.tier,
  };
}

export function toSlotDto(slot: EventTimeSlot): SlotDto {
  return {
    id: slot.id,
    activity: slot.activity,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    remaining: Math.max(0, slot.capacity - slot.bookedCount),
  };
}
