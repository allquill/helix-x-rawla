import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from '../entities/chapter.entity';
import { StateChapterMap } from '../entities/state-chapter-map.entity';

/** Chapter registry and the state→chapter mapping (CHP-01 / CHP-02). */
@Injectable()
export class ChapterService {
  constructor(
    @InjectRepository(Chapter) private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(StateChapterMap)
    private readonly mapRepo: Repository<StateChapterMap>,
  ) {}

  list(includeInactive = false): Promise<Chapter[]> {
    return this.chapterRepo.find({
      where: includeInactive ? {} : { isActive: true },
      order: { name: 'ASC' },
    });
  }

  /**
   * Derive the chapter from a state code (MP-08).
   *
   * Returns null when the state is unmapped rather than guessing — an
   * unassigned member is visible and fixable, whereas one silently filed under
   * the wrong chapter is neither.
   */
  async resolveForState(stateCode: string): Promise<string | null> {
    if (!stateCode) return null;
    const row = await this.mapRepo.findOne({
      where: { stateCode: stateCode.trim().toUpperCase() },
    });
    return row?.chapterId ?? null;
  }

  async create(input: Partial<Chapter>): Promise<Chapter> {
    return this.chapterRepo.save(
      this.chapterRepo.create({ ...input, isActive: input.isActive ?? true }),
    );
  }

  async update(id: string, input: Partial<Chapter>): Promise<Chapter> {
    const chapter = await this.chapterRepo.findOne({ where: { id } });
    if (!chapter) throw new NotFoundException(`Chapter ${id} not found`);
    Object.assign(chapter, input);
    return this.chapterRepo.save(chapter);
  }

  listStateMap(): Promise<StateChapterMap[]> {
    return this.mapRepo.find({ order: { stateCode: 'ASC' } });
  }

  async upsertStateMapping(stateCode: string, chapterId: string): Promise<StateChapterMap> {
    const code = stateCode.trim().toUpperCase();
    const existing = await this.mapRepo.findOne({ where: { stateCode: code } });
    if (existing) {
      existing.chapterId = chapterId;
      return this.mapRepo.save(existing);
    }
    return this.mapRepo.save(this.mapRepo.create({ stateCode: code, chapterId }));
  }
}
