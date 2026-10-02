import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { uuidRef } from '../../../database/db-type';
import { Chapter } from '../../community-core/entities/chapter.entity';
import type { EventCostCategory } from '../constants';
import { PortalEvent } from './portal-event.entity';

/** A cost of running an event, attributed to a chapter (EVT-11 / VOL-07). */
@Entity('event_cost_entries')
export class EventCostEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  /** The chapter that bears the cost; null is the national pool. */
  @ManyToOne(() => Chapter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'chapter_id' })
  chapterId: string | null;

  @Column({ type: 'text' })
  category: EventCostCategory;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ type: 'date' })
  incurredOn: string;

  @Column({ type: 'integer' })
  recordedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
