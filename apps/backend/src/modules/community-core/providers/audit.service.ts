import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { clampPage } from './pagination';

export type AuditEntry = {
  actorUserId?: number | null;
  actorRoles?: string[] | null;
  impersonatedByUserId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  ip?: string | null;
};

/**
 * Append-only change log (AUD / ADM-02 / REG-11).
 *
 * Deliberately exposes no update or delete: the guarantee this table offers is
 * only as strong as the narrowest API onto it.
 */
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async record(entry: AuditEntry): Promise<AuditLog> {
    return this.auditRepo.save(
      this.auditRepo.create({
        actorUserId: entry.actorUserId ?? null,
        actorRoles: entry.actorRoles ?? null,
        impersonatedByUserId: entry.impersonatedByUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        before: entry.before ?? null,
        after: entry.after ?? null,
        reason: entry.reason ?? null,
        ip: entry.ip ?? null,
      }),
    );
  }

  async list(filter: {
    entityType?: string;
    entityId?: string;
    actorUserId?: number;
    action?: string;
    limit?: number | string;
    offset?: number | string;
  }): Promise<{ items: AuditLog[]; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (filter.entityType) where.entityType = filter.entityType;
    if (filter.entityId) where.entityId = filter.entityId;
    if (filter.actorUserId) where.actorUserId = filter.actorUserId;
    if (filter.action) where.action = filter.action;

    const [items, total] = await this.auditRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: clampPage(filter.limit, 50, 200),
      skip: clampPage(filter.offset, 0, Number.MAX_SAFE_INTEGER),
    });
    return { items, total };
  }
}
