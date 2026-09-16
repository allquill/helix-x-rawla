import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReferenceList } from '../entities/reference-list.entity';
import { ReferenceListValue } from '../entities/reference-list-value.entity';
import type { ReferenceListKey } from '../constants';

/**
 * Admin-maintained dropdown lists (ADM-01 / MDM).
 *
 * Member rows store the stable `value` code rather than a foreign key to the
 * option row. ADM-01 requires that deactivating an option must not orphan
 * existing records, and a foreign key makes that impossible without soft-delete
 * gymnastics; codes also survive a merge and read sensibly in a CSV export.
 * The trade is no database-level referential integrity, bought back by
 * validating on write here.
 */
@Injectable()
export class ReferenceDataService {
  constructor(
    @InjectRepository(ReferenceList)
    private readonly listRepo: Repository<ReferenceList>,
    @InjectRepository(ReferenceListValue)
    private readonly valueRepo: Repository<ReferenceListValue>,
  ) {}

  async listAll(): Promise<ReferenceList[]> {
    return this.listRepo.find({ order: { key: 'ASC' } });
  }

  async valuesFor(
    key: ReferenceListKey | string,
    includeInactive = false,
  ): Promise<ReferenceListValue[]> {
    const list = await this.listRepo.findOne({ where: { key } });
    if (!list) throw new NotFoundException(`Unknown reference list "${key}"`);
    return this.valueRepo.find({
      where: includeInactive ? { listId: list.id } : { listId: list.id, isActive: true },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });
  }

  /** Map of list key → active options, for the public registration form. */
  async optionsFor(
    keys: readonly string[],
  ): Promise<Record<string, Array<{ value: string; label: string; metadata: Record<string, unknown> | null }>>> {
    const lists = await this.listRepo.find();
    const byId = new Map(lists.map((l) => [l.id, l.key]));
    const wanted = new Set(keys);
    const values = await this.valueRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', label: 'ASC' },
    });

    const out: Record<string, Array<{ value: string; label: string; metadata: Record<string, unknown> | null }>> = {};
    for (const key of keys) out[key] = [];
    for (const v of values) {
      const key = byId.get(v.listId);
      if (!key || !wanted.has(key)) continue;
      out[key].push({ value: v.value, label: v.label, metadata: v.metadata });
    }
    return out;
  }

  /**
   * Reject a code that is not a live option on the named list.
   *
   * Called on every write path that accepts one, because there is no foreign
   * key to catch a typo for us.
   */
  async assertValid(key: ReferenceListKey, value: string | null | undefined): Promise<void> {
    if (value === null || value === undefined || value === '') return;
    const list = await this.listRepo.findOne({ where: { key } });
    if (!list) throw new NotFoundException(`Unknown reference list "${key}"`);

    // An empty list is one nobody has curated yet — Gotra and Thikana ship
    // unpopulated because only the community can supply them. Validating
    // against nothing would reject every registration, so an empty list accepts
    // anything and starts enforcing the moment it has its first value.
    const curated = await this.valueRepo.count({ where: { listId: list.id, isActive: true } });
    if (curated === 0) return;

    const exists = await this.valueRepo.findOne({
      where: { listId: list.id, value, isActive: true },
    });
    if (!exists) {
      throw new BadRequestException({
        code: 'INVALID_REFERENCE_VALUE',
        message: `"${value}" is not a valid ${key}.`,
        list: key,
      });
    }
  }

  /** Dues for a tier, from the tier option's metadata (ADM-10). */
  async duesForTier(tier: string): Promise<{ duesCents: number; currency: string }> {
    const list = await this.listRepo.findOne({ where: { key: 'membership_tier' } });
    if (!list) return { duesCents: 0, currency: 'USD' };
    const option = await this.valueRepo.findOne({ where: { listId: list.id, value: tier } });
    const meta = (option?.metadata ?? {}) as { duesCents?: number; currency?: string };
    return { duesCents: Number(meta.duesCents ?? 0), currency: String(meta.currency ?? 'USD') };
  }
}
