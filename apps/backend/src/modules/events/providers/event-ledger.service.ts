import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  type StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { In, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { Chapter } from '../../community-core/entities/chapter.entity';
import { Member } from '../../community-core/entities/member.entity';
import { AuditService } from '../../community-core/providers/audit.service';
import { type ChapterScope } from '../../community-core/providers/member.service';
import { canViewLevel, eventDocumentLevel } from '../../portal-files/doc-level-rules';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import { PortalFileService, type UploadedPortalFile } from '../../portal-files/portal-file.service';
import { ACTIVE_REGISTRATION_STATUSES, type EventDocumentKind } from '../constants';
import { EventAttendee } from '../entities/event-attendee.entity';
import { EventCostEntry } from '../entities/event-cost-entry.entity';
import { EventDocument } from '../entities/event-document.entity';
import { EventDonatedGood } from '../entities/event-donated-good.entity';
import { EventNotificationLog } from '../entities/event-notification-log.entity';
import { EventRegistration } from '../entities/event-registration.entity';
import { PortalEvent } from '../entities/portal-event.entity';
import type {
  ChapterFinanceLineDto,
  CreateDonatedGoodDto,
  CreateEventCostDto,
  DonatedGoodDto,
  EventCostDto,
  EventDocumentDto,
  EventFinanceSummaryDto,
  EventNotificationStatusDto,
  NotificationPassDto,
} from '../models/operations.dto';
import { assertEventWritable } from './event-rules';
import { EventService } from './event.service';

/**
 * What accumulates around an event: its statements and bills (EVT-24), goods
 * donated for it (EVT-06), what it cost and what it brought in by chapter
 * (EVT-11 / VOL-07), and what the scheduler has sent (EVT-07 / EVT-22).
 */
@Injectable()
export class EventLedgerService {
  constructor(
    @InjectRepository(EventDocument) private readonly documentRepo: Repository<EventDocument>,
    @InjectRepository(PortalFile) private readonly fileRepo: Repository<PortalFile>,
    @InjectRepository(EventDonatedGood) private readonly goodRepo: Repository<EventDonatedGood>,
    @InjectRepository(EventCostEntry) private readonly costRepo: Repository<EventCostEntry>,
    @InjectRepository(EventRegistration) private readonly registrationRepo: Repository<EventRegistration>,
    @InjectRepository(EventAttendee) private readonly attendeeRepo: Repository<EventAttendee>,
    @InjectRepository(EventNotificationLog) private readonly logRepo: Repository<EventNotificationLog>,
    @InjectRepository(Chapter) private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly events: EventService,
    private readonly files: PortalFileService,
    private readonly audit: AuditService,
  ) {}

  // ─── Documents (EVT-24) ───────────────────────────────────────────────────

  /**
   * The route permission only says "this person works with event documents".
   * Whether they may see *this event's* is the security level: 4 while it is
   * open, 5 once it is closed (FIN-04). A Membership Secretary who could open
   * a bill yesterday gets this 403 the moment the event closes.
   */
  private assertMayView(event: PortalEvent, viewer: AuthenticatedUser): number {
    const level = eventDocumentLevel(event);
    if (!canViewLevel(level, { roles: viewer.roles ?? [] })) {
      throw new ForbiddenException({
        code: 'DOCUMENT_LEVEL_RESTRICTED',
        level,
        message:
          level === 5
            ? 'This event is closed. Its statements and bills are visible only to the Finance and General Secretaries.'
            : 'These documents are visible only to Admins and Secretaries.',
      });
    }
    return level;
  }

  async listDocuments(
    eventId: string,
    viewer: AuthenticatedUser,
  ): Promise<{ items: EventDocumentDto[]; level: number }> {
    const event = await this.events.mustFind(eventId);
    const level = this.assertMayView(event, viewer);
    const documents = await this.documentRepo.find({ where: { eventId }, order: { createdAt: 'DESC' } });
    const files = documents.length
      ? await this.fileRepo.find({ where: { id: In(documents.map((d) => d.fileId)) } })
      : [];
    const fileById = new Map<string, PortalFile>(files.map((f) => [f.id, f]));
    return {
      level,
      items: documents.map((d) => toDocumentDto(d, fileById.get(d.fileId))),
    };
  }

  async uploadDocument(
    eventId: string,
    file: UploadedPortalFile | undefined,
    kind: EventDocumentKind | undefined,
    actor: AuthenticatedUser,
  ): Promise<EventDocumentDto> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const stored = await this.files.store(file, 'event-documents', actor.id);
    const document = await this.documentRepo.save(
      this.documentRepo.create({ eventId, fileId: stored.id, kind: kind ?? 'other', addedByUserId: actor.id }),
    );
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.document.added',
      entityType: 'event',
      entityId: eventId,
      after: { documentId: document.id, kind: document.kind, name: stored.name },
    });
    return toDocumentDto(document, stored);
  }

  async sendDocument(
    eventId: string,
    documentId: string,
    viewer: AuthenticatedUser,
    response: Response,
  ): Promise<StreamableFile> {
    const event = await this.events.mustFind(eventId);
    this.assertMayView(event, viewer);
    const document = await this.documentRepo.findOne({ where: { id: documentId, eventId } });
    if (!document) throw new NotFoundException('Document not found');
    return this.files.send(document.fileId, response);
  }

  async deleteDocument(eventId: string, documentId: string, actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const document = await this.documentRepo.findOne({ where: { id: documentId, eventId } });
    if (!document) throw new NotFoundException('Document not found');
    await this.documentRepo.delete({ id: documentId });
    await this.files.remove(document.fileId);
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.document.deleted',
      entityType: 'event',
      entityId: eventId,
      before: { documentId, kind: document.kind },
    });
  }

  // ─── Donated goods (EVT-06) ───────────────────────────────────────────────

  async listGoods(eventId: string): Promise<DonatedGoodDto[]> {
    await this.events.mustFind(eventId);
    const goods = await this.goodRepo.find({ where: { eventId }, order: { receivedAt: 'DESC' } });
    return goods.map(toGoodDto);
  }

  async addGood(eventId: string, dto: CreateDonatedGoodDto, actor: AuthenticatedUser): Promise<DonatedGoodDto> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);

    let donorName = dto.donorName?.trim() || null;
    if (dto.donorMemberId) {
      const donor = await this.memberRepo.findOne({ where: { id: dto.donorMemberId } });
      if (!donor) throw new BadRequestException('Unknown donor member');
      donorName ??= `${donor.firstName} ${donor.lastName}`;
    }
    const good = await this.goodRepo.save(
      this.goodRepo.create({
        eventId,
        item: dto.item.trim(),
        description: dto.description?.trim() || null,
        quantity: dto.quantity,
        unit: dto.unit?.trim() || null,
        estimatedValueCents: dto.estimatedValueCents ?? null,
        donorMemberId: dto.donorMemberId || null,
        donorName,
        receivedAt: dto.receivedAt ?? new Date(),
        recordedByUserId: actor.id,
      }),
    );
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.donated_good.added',
      entityType: 'event',
      entityId: eventId,
      after: { goodId: good.id, item: good.item, quantity: good.quantity, donorMemberId: good.donorMemberId },
    });
    return toGoodDto(good);
  }

  async deleteGood(eventId: string, goodId: string, actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const good = await this.goodRepo.findOne({ where: { id: goodId, eventId } });
    if (!good) throw new NotFoundException('Donated item not found');
    await this.goodRepo.delete({ id: goodId });
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.donated_good.deleted',
      entityType: 'event',
      entityId: eventId,
      before: { goodId, item: good.item, quantity: good.quantity },
    });
  }

  // ─── Costs and the chapter split (EVT-11 / VOL-07) ────────────────────────

  async listCosts(eventId: string, scope: ChapterScope): Promise<EventCostDto[]> {
    await this.events.mustFindInScope(eventId, scope);
    const costs = await this.costRepo.find({ where: { eventId }, order: { incurredOn: 'DESC' } });
    const names = await this.chapterNames(costs.map((c) => c.chapterId));
    return costs.map((c) => ({
      id: c.id,
      chapterId: c.chapterId,
      chapterName: c.chapterId ? (names.get(c.chapterId) ?? null) : null,
      category: c.category,
      description: c.description,
      amountCents: c.amountCents,
      currency: c.currency,
      incurredOn: c.incurredOn,
      recordedByUserId: c.recordedByUserId,
    }));
  }

  async addCost(eventId: string, dto: CreateEventCostDto, actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    if (dto.chapterId) {
      const chapter = await this.chapterRepo.findOne({ where: { id: dto.chapterId } });
      if (!chapter) throw new BadRequestException('Unknown chapter');
    }
    const cost = await this.costRepo.save(
      this.costRepo.create({
        eventId,
        // A cost with no chapter named falls to the event's sponsoring chapter.
        chapterId: dto.chapterId === undefined ? event.chapterId : dto.chapterId || null,
        category: dto.category,
        description: dto.description.trim(),
        amountCents: dto.amountCents,
        currency: event.currency,
        incurredOn: dto.incurredOn,
        recordedByUserId: actor.id,
      }),
    );
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.cost.added',
      entityType: 'event',
      entityId: eventId,
      after: { costId: cost.id, category: cost.category, amountCents: cost.amountCents, chapterId: cost.chapterId },
    });
  }

  async deleteCost(eventId: string, costId: string, actor: AuthenticatedUser): Promise<void> {
    const event = await this.events.mustFind(eventId);
    assertEventWritable(event);
    const cost = await this.costRepo.findOne({ where: { id: costId, eventId } });
    if (!cost) throw new NotFoundException('Cost not found');
    await this.costRepo.delete({ id: costId });
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'event.cost.deleted',
      entityType: 'event',
      entityId: eventId,
      before: { costId, category: cost.category, amountCents: cost.amountCents },
    });
  }

  /**
   * Revenue and cost by chapter. Revenue is attributed to the chapter each
   * household belonged to when it registered; a cost to the chapter it was
   * recorded against. `volunteerCostCents` is the VOL-07 line.
   */
  async financeSummary(eventId: string, scope: ChapterScope): Promise<EventFinanceSummaryDto> {
    const event = await this.events.mustFindInScope(eventId, scope);
    const registrations = await this.registrationRepo.find({
      where: { eventId, status: In([...ACTIVE_REGISTRATION_STATUSES]) },
    });
    const attendees = await this.attendeeRepo.find({
      where: { eventId, status: 'active' },
      select: { id: true, registrationId: true },
    });
    const costs = await this.costRepo.find({ where: { eventId } });
    const names = await this.chapterNames([
      ...registrations.map((r) => r.chapterId),
      ...costs.map((c) => c.chapterId),
    ]);

    const lines = new Map<string, ChapterFinanceLineDto>();
    const lineFor = (chapterId: string | null): ChapterFinanceLineDto => {
      const key = chapterId ?? '';
      let line = lines.get(key);
      if (!line) {
        line = {
          chapterId,
          chapterName: chapterId ? (names.get(chapterId) ?? 'Unknown chapter') : 'No chapter',
          registrationCount: 0,
          attendeeCount: 0,
          billedCents: 0,
          revenueCents: 0,
          costCents: 0,
          volunteerCostCents: 0,
          netCents: 0,
        };
        lines.set(key, line);
      }
      return line;
    };

    const chapterOfRegistration = new Map<string, string | null>();
    for (const registration of registrations) {
      const line = lineFor(registration.chapterId);
      line.registrationCount += 1;
      line.billedCents += registration.totalCents;
      line.revenueCents += registration.paidCents;
      chapterOfRegistration.set(registration.id, registration.chapterId);
    }
    for (const attendee of attendees) {
      if (chapterOfRegistration.has(attendee.registrationId)) {
        lineFor(chapterOfRegistration.get(attendee.registrationId) ?? null).attendeeCount += 1;
      }
    }
    for (const cost of costs) {
      const line = lineFor(cost.chapterId);
      line.costCents += cost.amountCents;
      if (cost.category === 'volunteer') line.volunteerCostCents += cost.amountCents;
    }

    const chapters = [...lines.values()]
      .map((line) => ({ ...line, netCents: line.revenueCents - line.costCents }))
      .sort((a, b) => a.chapterName.localeCompare(b.chapterName));
    const sum = (pick: (line: ChapterFinanceLineDto) => number) =>
      chapters.reduce((total, line) => total + pick(line), 0);
    return {
      currency: event.currency,
      chapters,
      billedCents: sum((l) => l.billedCents),
      revenueCents: sum((l) => l.revenueCents),
      costCents: sum((l) => l.costCents),
      netCents: sum((l) => l.netCents),
    };
  }

  // ─── What the scheduler has sent (EVT-07 / EVT-22) ────────────────────────

  async notificationStatus(eventId: string): Promise<EventNotificationStatusDto> {
    const event = await this.events.mustFind(eventId);
    const rows = await this.logRepo
      .createQueryBuilder('l')
      .select('l.kind', 'kind')
      .addSelect('l.scheduleKey', 'scheduleKey')
      .addSelect('l.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.eventId = :eventId', { eventId })
      .groupBy('l.kind')
      .addGroupBy('l.scheduleKey')
      .addGroupBy('l.status')
      .getRawMany<{ kind: string; scheduleKey: string; status: string; count: string }>();

    const passes = new Map<string, NotificationPassDto>();
    for (const row of rows) {
      const key = `${row.kind}:${row.scheduleKey}`;
      const pass =
        passes.get(key) ??
        ({ kind: row.kind, scheduleKey: row.scheduleKey, sent: 0, failed: 0, skippedOptOut: 0, claimed: 0 } as NotificationPassDto);
      const count = Number(row.count);
      if (row.status === 'sent') pass.sent += count;
      else if (row.status === 'failed') pass.failed += count;
      else if (row.status === 'skipped_opt_out') pass.skippedOptOut += count;
      else pass.claimed += count;
      passes.set(key, pass);
    }
    return { invitationCompletedAt: event.invitationCompletedAt, passes: [...passes.values()] };
  }

  private async chapterNames(ids: Array<string | null>): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((id): id is string => !!id))];
    if (unique.length === 0) return new Map();
    const chapters = await this.chapterRepo.find({ where: { id: In(unique) }, select: { id: true, name: true } });
    return new Map<string, string>(chapters.map((c) => [c.id, c.name]));
  }
}

function toDocumentDto(document: EventDocument, file: PortalFile | undefined): EventDocumentDto {
  return {
    id: document.id,
    kind: document.kind,
    name: file?.name ?? 'Missing file',
    mimeType: file?.mimeType ?? 'application/octet-stream',
    sizeBytes: file?.sizeBytes ?? 0,
    addedByUserId: document.addedByUserId,
    createdAt: document.createdAt,
  };
}

function toGoodDto(good: EventDonatedGood): DonatedGoodDto {
  return {
    id: good.id,
    item: good.item,
    description: good.description,
    quantity: good.quantity,
    unit: good.unit,
    estimatedValueCents: good.estimatedValueCents,
    donorMemberId: good.donorMemberId,
    donorName: good.donorName,
    receivedAt: good.receivedAt,
    recordedByUserId: good.recordedByUserId,
  };
}
