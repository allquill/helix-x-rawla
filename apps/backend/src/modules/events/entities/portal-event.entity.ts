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
import { uuidRef } from '../../../database/db-type';
import { Chapter } from '../../community-core/entities/chapter.entity';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import type { EventCategory, EventStatus } from '../constants';
import { WaiverTemplate } from './waiver-template.entity';

/**
 * A community event (module EVT).
 *
 * Named `PortalEvent` because `Event` is a DOM global; the table is `events`.
 * Prices live on `event_ticket_types`, not here — an event has one or more
 * age-banded tickets.
 */
@Entity('events')
export class PortalEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  title: string;

  /** Optional for smaller events (EVT-17). */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Index()
  @Column({ type: 'text' })
  category: EventCategory;

  /** The sponsoring chapter; null for a national event. */
  @ManyToOne(() => Chapter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'chapter_id' })
  chapterId: string | null;

  @Column({ type: 'text', nullable: true })
  venue: string | null;

  @Index()
  @Column({ type: Date })
  startsAt: Date;

  @Column({ type: Date })
  endsAt: Date;

  /** IANA zone the closing date is evaluated in and times are shown in. */
  @Column({ type: 'text', default: 'America/Chicago' })
  timezone: string;

  /** Null is "No maximum" (EVT-17). */
  @Column({ type: 'integer', nullable: true })
  capacity: number | null;

  /**
   * Seats held by active registrations. Moved only by a conditional UPDATE
   * that also checks `capacity` and `status`, so two concurrent registrations
   * cannot both take the last seat.
   */
  @Column({ type: 'integer', default: 0 })
  attendeeCount: number;

  /** The last day to register, in `timezone` (EVT-18). */
  @Column({ type: 'date' })
  registrationClosesOn: string;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @ManyToOne(() => PortalFile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'flyer_file_id' })
  flyerFile: PortalFile | null;

  @Column({ type: uuidRef(), nullable: true, name: 'flyer_file_id' })
  flyerFileId: string | null;

  @Column({ type: 'text', nullable: true })
  attireGuide: string | null;

  /** The waiver version attendees sign; null means no waiver (EVT-05). */
  @ManyToOne(() => WaiverTemplate, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'waiver_template_id' })
  waiverTemplate: WaiverTemplate | null;

  @Column({ type: uuidRef(), nullable: true, name: 'waiver_template_id' })
  waiverTemplateId: string | null;

  @Column({ type: 'boolean', default: false })
  collectTshirt: boolean;

  @Column({ type: 'boolean', default: false })
  collectHotel: boolean;

  /** Days before the start a reminder goes out; null uses the portal setting. */
  @Column({ type: 'simple-json', nullable: true })
  reminderOffsetsDays: number[] | null;

  /** Shown as a fallback beside the integrated checkout (EVT-19). */
  @Column({ type: 'text', nullable: true })
  stripePaymentLink: string | null;

  @Column({ type: 'text', nullable: true })
  zelleInstructions: string | null;

  /** Posted once the event is over (EVT-25). */
  @Column({ type: 'text', nullable: true })
  photosUrl: string | null;

  @Index()
  @Column({ type: 'text', default: 'draft' })
  status: EventStatus;

  @Column({ type: Date, nullable: true })
  publishedAt: Date | null;

  /** Set when the invitation broadcast has reached every recipient (EVT-22). */
  @Column({ type: Date, nullable: true })
  invitationCompletedAt: Date | null;

  @Column({ type: Date, nullable: true })
  closedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  closedByUserId: number | null;

  @Column({ type: 'integer' })
  createdByUserId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
