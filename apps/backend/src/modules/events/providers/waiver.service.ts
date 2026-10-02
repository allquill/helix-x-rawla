import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { type AuthenticatedUser } from '@helix-x/backend';
import { isUniqueViolation } from '../../../database/db-type';
import { AuditService } from '../../community-core/providers/audit.service';
import { WaiverTemplate } from '../entities/waiver-template.entity';
import type { CreateWaiverTemplateDto, PublishWaiverVersionDto } from '../models/operations.dto';
import { sha256 } from './event-registration.service';

/**
 * Liability waivers (EVT-05).
 *
 * A waiver is never edited. Changing its text publishes the next version as a
 * new row, so every signature still points at exactly what was agreed to.
 * Events already pointing at an older version keep it until someone attaches
 * the new one.
 */
@Injectable()
export class WaiverService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(WaiverTemplate) private readonly waiverRepo: Repository<WaiverTemplate>,
    private readonly audit: AuditService,
  ) {}

  list(): Promise<WaiverTemplate[]> {
    return this.waiverRepo.find({ order: { key: 'ASC', version: 'DESC' } });
  }

  async create(dto: CreateWaiverTemplateDto, actor: AuthenticatedUser): Promise<WaiverTemplate> {
    const existing = await this.waiverRepo.findOne({ where: { key: dto.key } });
    if (existing) {
      throw new ConflictException({
        code: 'WAIVER_KEY_TAKEN',
        message: 'A waiver with this key already exists. Publish a new version of it instead.',
      });
    }
    try {
      const waiver = await this.waiverRepo.save(
        this.waiverRepo.create({
          key: dto.key,
          version: 1,
          title: dto.title.trim(),
          body: dto.body,
          bodySha256: sha256(dto.body),
          isCurrent: true,
          createdByUserId: actor.id,
        }),
      );
      await this.record(actor, 'waiver.created', waiver);
      return waiver;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException({ code: 'WAIVER_KEY_TAKEN', message: 'A waiver with this key already exists.' });
      }
      throw error;
    }
  }

  async publishVersion(key: string, dto: PublishWaiverVersionDto, actor: AuthenticatedUser): Promise<WaiverTemplate> {
    const waiver = await this.dataSource.transaction(async (em) => {
      const latest = await em.findOne(WaiverTemplate, { where: { key }, order: { version: 'DESC' } });
      if (!latest) throw new NotFoundException('Waiver not found');
      await em.update(WaiverTemplate, { key, isCurrent: true }, { isCurrent: false });
      return em.save(
        em.create(WaiverTemplate, {
          key,
          version: latest.version + 1,
          title: dto.title.trim(),
          body: dto.body,
          bodySha256: sha256(dto.body),
          isCurrent: true,
          createdByUserId: actor.id,
        }),
      );
    });
    await this.record(actor, 'waiver.version_published', waiver);
    return waiver;
  }

  private async record(actor: AuthenticatedUser, action: string, waiver: WaiverTemplate): Promise<void> {
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action,
      entityType: 'waiver_template',
      entityId: waiver.id,
      after: { key: waiver.key, version: waiver.version, bodySha256: waiver.bodySha256 },
    });
  }
}
