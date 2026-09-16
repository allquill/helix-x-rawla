import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PortalSetting } from '../entities/portal-setting.entity';
import { SETTING_DEFAULTS, SETTING_KEYS } from '../constants';

/**
 * The admin-editable levers of ADM-09, ADM-11 and ADM-12.
 *
 * Values are cached in memory because the age gate and the payment kill-switch
 * are read on paths that run per request; the cache is refreshed on every write,
 * which is the only way a value changes.
 */
@Injectable()
export class PortalSettingsService implements OnModuleInit {
  private readonly logger = new Logger(PortalSettingsService.name);
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(PortalSetting)
    private readonly settingRepo: Repository<PortalSetting>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.reload();
  }

  /** Read-through of the whole table into the cache, defaults filling any gap. */
  async reload(): Promise<void> {
    const rows = await this.settingRepo.find();
    const next = new Map<string, string>(Object.entries(SETTING_DEFAULTS));
    for (const row of rows) next.set(row.key, row.value);
    this.cache = next;
  }

  getString(key: string): string {
    return this.cache.get(key) ?? SETTING_DEFAULTS[key] ?? '';
  }

  getNumber(key: string): number {
    const parsed = Number(this.getString(key));
    return Number.isFinite(parsed) ? parsed : Number(SETTING_DEFAULTS[key] ?? 0);
  }

  getBoolean(key: string): boolean {
    return this.getString(key) === 'true';
  }

  /** Minimum age for creating an account (ADM-09). */
  get minimumAge(): number {
    return this.getNumber(SETTING_KEYS.MINIMUM_AGE);
  }

  /**
   * ADM-11's kill-switch. When false the payment gate counts as satisfied for
   * everyone — for a dues-free period or the community's first cohort.
   *
   * There is deliberately no equivalent for email verification: that is a
   * security control, not a policy lever.
   */
  get paymentRequired(): boolean {
    return this.getBoolean(SETTING_KEYS.PAYMENT_REQUIRED);
  }

  get consentVersion(): string {
    return this.getString(SETTING_KEYS.CONSENT_VERSION);
  }

  async list(): Promise<PortalSetting[]> {
    return this.settingRepo.find({ order: { key: 'ASC' } });
  }

  /**
   * Upsert a batch of settings, then re-apply anything downstream depends on.
   *
   * Returns the rows that actually changed so the caller can write one audit
   * row per real change rather than one per submitted field.
   */
  async setMany(
    values: Record<string, string>,
    actorUserId: number | null,
  ): Promise<Array<{ key: string; before: string | null; after: string }>> {
    const changes: Array<{ key: string; before: string | null; after: string }> = [];

    for (const [key, value] of Object.entries(values)) {
      const existing = await this.settingRepo.findOne({ where: { key } });
      const before = existing?.value ?? null;
      if (before === value) continue;

      if (existing) {
        existing.value = value;
        existing.updatedByUserId = actorUserId;
        await this.settingRepo.save(existing);
      } else {
        await this.settingRepo.save(
          this.settingRepo.create({ key, value, updatedByUserId: actorUserId }),
        );
      }
      changes.push({ key, before, after: value });
    }

    if (changes.length > 0) await this.reload();
    return changes;
  }
}
