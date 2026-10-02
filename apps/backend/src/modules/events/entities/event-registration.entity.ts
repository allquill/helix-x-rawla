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
import { Household } from '../../community-core/entities/household.entity';
import { Member } from '../../community-core/entities/member.entity';
import type { RegistrationStatus } from '../constants';
import { PortalEvent } from './portal-event.entity';

/**
 * One household's registration for one event (EVT-01): a single transaction
 * and a single payment covering every family member attending.
 *
 * The partial unique index is the rule "one live registration per household
 * per event" — a cancelled or removed one does not block registering again.
 */
@Index('UQ_event_registrations_active_household', ['eventId', 'householdId'], {
  unique: true,
  where: `"status" IN ('pending_payment', 'confirmed')`,
})
@Entity('event_registrations')
export class EventRegistration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @ManyToOne(() => Household, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Index()
  @Column({ type: uuidRef(), name: 'household_id' })
  householdId: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchaser_member_id' })
  purchaser: Member;

  @Index()
  @Column({ type: uuidRef(), name: 'purchaser_member_id' })
  purchaserMemberId: string;

  /**
   * The purchaser's chapter when they registered. Revenue stays attributed to
   * the chapter that earned it even if the member later transfers (EVT-11).
   */
  @ManyToOne(() => Chapter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'chapter_id' })
  chapterId: string | null;

  @Index()
  @Column({ type: 'text', default: 'pending_payment' })
  status: RegistrationStatus;

  /** Sum of the attendees' locked unit prices, in minor units. */
  @Column({ type: 'integer', default: 0 })
  totalCents: number;

  /** Sum of this registration's settled payments. */
  @Column({ type: 'integer', default: 0 })
  paidCents: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ type: 'integer', nullable: true })
  removedByUserId: number | null;

  /** Mandatory on an admin removal (EVT-23). */
  @Column({ type: 'text', nullable: true })
  removedReason: string | null;

  @Column({ type: Date, nullable: true })
  removedAt: Date | null;

  @Column({ type: Date, nullable: true })
  cancelledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
