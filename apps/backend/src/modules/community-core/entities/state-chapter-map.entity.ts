import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chapter } from './chapter.entity';

/**
 * State → chapter mapping driving auto-assignment (CHP-02, MP-08).
 *
 * A maintainable table rather than a hard-coded switch, because the chapter
 * boundaries are the customer's to redraw and doing so must not need a deploy.
 */
@Entity('state_chapter_map')
export class StateChapterMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Two-letter USPS state code, upper-cased on write. */
  @Index({ unique: true })
  @Column({ type: 'text' })
  stateCode: string;

  @ManyToOne(() => Chapter, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Index()
  @Column({ type: 'text', name: 'chapter_id' })
  chapterId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
