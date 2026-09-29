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
import { uuidRef } from '../../../database/db-type';

/**
 * A household — one physical address linking several profiles (§3.3).
 *
 * First-class rather than an address string copied onto each member, because
 * family event registration, anniversary recognition, chapter attribution and
 * the mailing address of record all pivot on it.
 */
@Entity('households')
export class Household {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-facing identifier shown in the UI and on correspondence. */
  @Index()
  @Column({ type: 'text', unique: true })
  publicHouseholdId: string;

  /**
   * The head of house. Nullable only during creation — the member row is
   * inserted immediately after the household inside the same transaction.
   */
  @Column({ type: 'text', nullable: true })
  headMemberId: string | null;

  @Column({ type: 'text', nullable: true })
  addressLine1: string | null;

  @Column({ type: 'text', nullable: true })
  addressLine2: string | null;

  @Column({ type: 'text', nullable: true })
  city: string | null;

  @Column({ type: 'text', nullable: true })
  state: string | null;

  @Column({ type: 'text', nullable: true })
  postalCode: string | null;

  @Column({ type: 'text', default: 'US' })
  country: string;

  @ManyToOne(() => Chapter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'chapter_id' })
  chapterId: string | null;

  @Column({ type: 'date', nullable: true })
  anniversaryDate: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
