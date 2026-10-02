import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { Member } from '../../community-core/entities/member.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { type ChapterScope } from '../../community-core/providers/member.service';
import { ACTIVE_REGISTRATION_STATUSES, EVENT_CODES } from '../constants';
import { EventAttendee } from '../entities/event-attendee.entity';
import { EventDocument } from '../entities/event-document.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import type {
  ClosePreviewDto,
  EventVolunteerDto,
  VolunteerHoursEntryDto,
} from '../models/operations.dto';
import { assertEventWritable, closePreconditions } from './event-rules';
import { EventService } from './event.service';

/**
 * Volunteer hours and closing an event (VOL-12 / EVT-26).
 *
 * Closing is terminal. It needs hours for every volunteer on the event —
 * adults and children, and zero counts — and from that moment every write to
 * the event answers 409 and its statements and bills become finance-restricted
 * (see `eventDocumentLevel`). There is no reopen, here or anywhere.
 */
@Injectable()
export class EventCloseService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(EventAttendee) private readonly attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventDocument) private readonly documentRepo: Repository<EventDocument>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly events: EventService,
    private readonly audit: AuditService,
  ) {}

  /** Everyone who ticked "volunteer" on a live registration, with their hours so far. */
  async listVolunteers(eventId: string, scope: ChapterScope): Promise<EventVolunteerDto[]> {
    await this.events.mustFindInScope(eventId, scope);
    const volunteers = await this.attendeeRepo.find({
      where: { eventId, status: 'active', isVolunteer: true },
      order: { fullName: 'ASC' },
    });
    if (volunteers.length === 0) return [];

    const registrations = await this.registrationRepo.find({
      where: { id: In([...new Set(volunteers.map((v) => v.registrationId))]) },
    });
    const purchasers = await this.memberRepo.find({
      where: { id: In(registrations.map((r) => r.purchaserMemberId)) },
      select: { id: true, firstName: true, lastName: true },
    });
    const purchaserName = new Map<string, string>(
      purchasers.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
    );
    const householdName = new Map<string, string>(
      registrations.map((r) => [r.id, purchaserName.get(r.purchaserMemberId) ?? 'Unknown household']),
    );

    return volunteers.map((v) => ({
      attendeeId: v.id,
      fullName: v.fullName,
      isYouth: v.isYouth,
      registrationId: v.registrationId,
      householdName: householdName.get(v.registrationId) ?? 'Unknown household',
      volunteerMinutes: v.volunteerMinutes,
    }));
  }

  /** Enter or correct hours before the event closes. Corrections are audited (VOL-08). */
  async saveHours(eventId: string, entries: VolunteerHoursEntryDto[], actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const changes = await this.dataSource.transaction((em) => this.applyHours(em, eventId, entries, actor));
    if (changes.length > 0) await this.auditHours(eventId, changes, actor);
  }

  async preview(eventId: string): Promise<ClosePreviewDto> {
    const event = await this.events.mustFind(eventId);
    const volunteers = await this.attendeeRepo.find({
      where: { eventId, status: 'active', isVolunteer: true },
      select: { id: true, volunteerMinutes: true },
    });
    const check = closePreconditions(event, volunteers);
    const owing = await this.registrationRepo
      .createQueryBuilder('r')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(r.totalCents - r.paidCents), 0)', 'cents')
      .where('r.eventId = :eventId', { eventId })
      .andWhere('r.status IN (:...live)', { live: ACTIVE_REGISTRATION_STATUSES })
      .andWhere('r.paidCents < r.totalCents')
      .getRawOne<{ count: string; cents: string }>();
    return {
      canClose: check.ok,
      code: check.code ?? null,
      missingHoursAttendeeIds: check.missingHoursAttendeeIds,
      volunteerCount: volunteers.length,
      unpaidRegistrationCount: Number(owing?.count ?? 0),
      outstandingCents: Number(owing?.cents ?? 0),
      documentCount: await this.documentRepo.count({ where: { eventId } }),
    };
  }

  /**
   * Close the event. Any hours sent with the request are saved in the same
   * transaction, so "enter the last hours and close" cannot half-happen.
   */
  async close(eventId: string, hours: VolunteerHoursEntryDto[] | undefined, actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);

    const result = await this.dataSource.transaction(async (em) => {
      const changes = hours?.length ? await this.applyHours(em, eventId, hours, actor) : [];
      const volunteers = await em.find(EventAttendee, {
        where: { eventId, status: 'active', isVolunteer: true },
        select: { id: true, volunteerMinutes: true },
      });
      const check = closePreconditions(event, volunteers);
      if (!check.ok) {
        throw new ConflictException({
          code: check.code,
          message:
            check.code === EVENT_CODES.HOURS_MISSING
              ? `Enter the hours for every volunteer before closing — ${check.missingHoursAttendeeIds.length} still missing. Zero is allowed.`
              : 'Only a published event can be closed.',
          missingHoursAttendeeIds: check.missingHoursAttendeeIds,
        });
      }

      const closed = await em.update(
        PortalEvent,
        { id: eventId, status: 'published' },
        { status: 'closed', closedAt: new Date(), closedByUserId: actor.id },
      );
      // Someone else closed it between the read and here.
      if (!closed.affected) assertEventWritable({ status: 'closed' });
      return { changes, volunteerCount: volunteers.length };
    });

    if (result.changes.length > 0) await this.auditHours(eventId, result.changes, actor);
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.closed',
      entityType: 'event',
      entityId: eventId,
      before: { status: 'published' },
      after: {
        status: 'closed',
        volunteers: result.volunteerCount,
        // These are the rows that just became DOC level 5.
        documentsNowFinanceRestricted: await this.documentRepo.count({ where: { eventId } }),
      },
    });
  }

  private async applyHours(
    em: EntityManager,
    eventId: string,
    entries: VolunteerHoursEntryDto[],
    actor: AuthenticatedUser,
  ): Promise<Array<{ attendeeId: string; before: number | null; after: number }>> {
    const ids = entries.map((e) => e.attendeeId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Each volunteer can appear only once');
    }
    if (ids.length === 0) return [];
    const volunteers = await em.find(EventAttendee, {
      where: { id: In(ids), eventId, status: 'active', isVolunteer: true },
    });
    const byId = new Map<string, EventAttendee>(volunteers.map((v) => [v.id, v]));
    const now = new Date();
    const changes: Array<{ attendeeId: string; before: number | null; after: number }> = [];
    for (const entry of entries) {
      const volunteer = byId.get(entry.attendeeId);
      if (!volunteer) throw new BadRequestException('That person is not a volunteer on this event');
      if (volunteer.volunteerMinutes === entry.minutes) continue;
      await em.update(
        EventAttendee,
        { id: volunteer.id },
        { volunteerMinutes: entry.minutes, hoursRecordedByUserId: actor.id, hoursRecordedAt: now },
      );
      changes.push({ attendeeId: volunteer.id, before: volunteer.volunteerMinutes, after: entry.minutes });
    }
    return changes;
  }

  private async auditHours(
    eventId: string,
    changes: Array<{ attendeeId: string; before: number | null; after: number }>,
    actor: AuthenticatedUser,
  ): Promise<void> {
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.volunteer_hours.recorded',
      entityType: 'event',
      entityId: eventId,
      before: { minutes: Object.fromEntries(changes.map((c) => [c.attendeeId, c.before])) },
      after: { minutes: Object.fromEntries(changes.map((c) => [c.attendeeId, c.after])) },
    });
  }
}
