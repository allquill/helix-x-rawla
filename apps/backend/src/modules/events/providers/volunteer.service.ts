import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { Chapter } from '../../community-core/entities/chapter.entity';
import { Member } from '../../community-core/entities/member.entity';
import { clampPage } from '../../community-core/providers/pagination';
import { ProfileVisibilityService } from '../../community-core/providers/profile-visibility.service';
import { EVENT_SETTING_KEYS } from '../constants';
import { EventAttendee } from '../entities/event-attendee.entity';
import { ID_PATTERN } from '../models/id';
import type { TopVolunteerDto } from '../models/operations.dto';
import { EventService } from './event.service';

export interface TopVolunteersFilter {
  metric?: string;
  chapterId?: string;
  group?: string;
  limit?: string | number;
}

export interface VolunteerRow {
  personKey: string;
  fullName: string;
  ownerMemberId: string | null;
  isYouth: boolean;
  minutes: number;
  /** When the hours were served, to pick a person's most recent name and group. */
  startsAt: Date;
}

export interface VolunteerTotal {
  personKey: string;
  fullName: string;
  ownerMemberId: string | null;
  isYouth: boolean;
  minutes: number;
  eventCount: number;
}

/**
 * Add up each person's volunteering and rank it (VOL-06).
 *
 * An event counts towards "events" only if hours were actually served there:
 * a volunteer entered as zero at close turned up on the list but did not
 * serve. Someone with no hours anywhere is not a top volunteer and is left
 * out. Ties fall to the other metric, then to the name, so the order is stable.
 */
export function rankVolunteers(rows: readonly VolunteerRow[], metric: 'hours' | 'events'): VolunteerTotal[] {
  const totals = new Map<string, VolunteerTotal & { latest: number }>();
  for (const row of rows) {
    const total = totals.get(row.personKey) ?? {
      personKey: row.personKey,
      fullName: row.fullName,
      ownerMemberId: row.ownerMemberId,
      isYouth: row.isYouth,
      minutes: 0,
      eventCount: 0,
      latest: -Infinity,
    };
    total.minutes += row.minutes;
    if (row.minutes > 0) total.eventCount += 1;
    if (row.startsAt.getTime() >= total.latest) {
      total.latest = row.startsAt.getTime();
      total.fullName = row.fullName;
      total.ownerMemberId = row.ownerMemberId;
      total.isYouth = row.isYouth;
    }
    totals.set(row.personKey, total);
  }
  return [...totals.values()]
    .filter((total) => total.minutes > 0)
    .sort((a, b) =>
      metric === 'events'
        ? b.eventCount - a.eventCount || b.minutes - a.minutes || a.fullName.localeCompare(b.fullName)
        : b.minutes - a.minutes || b.eventCount - a.eventCount || a.fullName.localeCompare(b.fullName),
    )
    .map(({ latest: _latest, ...total }) => total);
}

/** Top Volunteers — the Volunteers part of the Wall of Fame (VOL-06 / VOL-13). */
@Injectable()
export class VolunteerService {
  constructor(
    @InjectRepository(EventAttendee) private readonly attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(Chapter) private readonly chapterRepo: Repository<Chapter>,
    private readonly events: EventService,
    private readonly visibility: ProfileVisibilityService,
  ) {}

  /**
   * Hours count once the event that earned them is closed — that is when they
   * are final (VOL-12). The chapter filter uses the chapter the household
   * registered under, and youth or adult is as of each event's start.
   *
   * Tier 2 (§3.2): a name, a chapter and the totals. Someone who has opted
   * out of the directory keeps their place and their hours, unnamed.
   */
  async top(filter: TopVolunteersFilter, viewer: AuthenticatedUser): Promise<TopVolunteerDto[]> {
    const metric = filter.metric === 'events' ? 'events' : 'hours';
    const qb = this.attendeeRepo
      .createQueryBuilder('a')
      .innerJoin('a.event', 'e')
      .innerJoin('a.registration', 'r')
      .select('a.personKey', 'personKey')
      .addSelect('a.fullName', 'fullName')
      .addSelect('a.ownerMemberId', 'ownerMemberId')
      .addSelect('a.isYouth', 'isYouth')
      .addSelect('a.volunteerMinutes', 'minutes')
      .addSelect('e.startsAt', 'startsAt')
      .where('a.status = :active', { active: 'active' })
      .andWhere('a.isVolunteer = :yes', { yes: true })
      .andWhere('a.volunteerMinutes IS NOT NULL')
      .andWhere('e.status = :closed', { closed: 'closed' });
    if (filter.chapterId) {
      if (!ID_PATTERN.test(filter.chapterId)) return [];
      qb.andWhere('r.chapterId = :chapterId', { chapterId: filter.chapterId });
    }
    if (filter.group === 'youth') qb.andWhere('a.isYouth = :youth', { youth: true });
    if (filter.group === 'adult') qb.andWhere('a.isYouth = :youth', { youth: false });

    const raw = await qb.getRawMany<{
      personKey: string;
      fullName: string;
      ownerMemberId: string | null;
      isYouth: boolean | number;
      minutes: number | string;
      startsAt: Date | string;
    }>();
    const size = clampPage(
      filter.limit,
      Number(this.events.setting(EVENT_SETTING_KEYS.LEADERBOARD_SIZE)) || 25,
      200,
    );
    const ranked = rankVolunteers(
      raw.map((row) => ({
        personKey: row.personKey,
        fullName: row.fullName,
        ownerMemberId: row.ownerMemberId,
        // SQLite hands booleans back as 0/1 in a raw row.
        isYouth: row.isYouth === true || row.isYouth === 1,
        minutes: Number(row.minutes),
        startsAt: new Date(row.startsAt),
      })),
      metric,
    ).slice(0, size || 25);
    if (ranked.length === 0) return [];

    const ownerIds = [...new Set(ranked.map((r) => r.ownerMemberId).filter((id): id is string => !!id))];
    const owners = ownerIds.length ? await this.memberRepo.find({ where: { id: In(ownerIds) } }) : [];
    const ownerById = new Map<string, Member>(owners.map((owner) => [owner.id, owner]));
    const chapterIds = [...new Set(owners.map((o) => o.chapterId).filter((id): id is string => !!id))];
    const chapters = chapterIds.length ? await this.chapterRepo.find({ where: { id: In(chapterIds) } }) : [];
    const chapterName = new Map<string, string>(chapters.map((c) => [c.id, c.name]));
    const self = await this.memberRepo.findOne({
      where: { userId: viewer.id },
      select: { id: true, householdId: true },
    });

    return ranked.map((total, index): TopVolunteerDto => {
      const owner = total.ownerMemberId ? (ownerById.get(total.ownerMemberId) ?? null) : null;
      const identity = this.visibility.toListingIdentity(
        viewer,
        self?.householdId ?? null,
        owner,
        total.fullName,
        'Private volunteer',
      );
      return {
        rank: index + 1,
        displayName: identity.displayName,
        isPrivate: identity.isPrivate,
        isYouth: total.isYouth,
        chapterName: identity.isPrivate || !owner?.chapterId ? null : (chapterName.get(owner.chapterId) ?? null),
        minutes: total.minutes,
        eventCount: total.eventCount,
      };
    });
  }
}
