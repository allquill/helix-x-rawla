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
import type { NotificationChannel, NotificationKind, NotificationStatus } from '../constants';
import { PortalEvent } from './portal-event.entity';

/**
 * One invitation or reminder to one recipient (EVT-07 / EVT-22).
 *
 * The unique index is what makes the scheduler safe on two instances: a
 * runner inserts the row as `claimed` before it sends, and the instance that
 * loses the insert skips that recipient. A message therefore goes out at most
 * once — a crash between claim and send leaves a `claimed` row to look at,
 * never a duplicate.
 */
@Index(['eventId', 'kind', 'scheduleKey', 'channel', 'recipientKey'], { unique: true })
@Entity('event_notification_log')
export class EventNotificationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'text' })
  kind: NotificationKind;

  /** `publish` for the invitation; `d7`, `d1`… for a reminder. */
  @Column({ type: 'text' })
  scheduleKey: string;

  @Column({ type: 'text' })
  channel: NotificationChannel;

  /** The lower-cased address or number the message went to. */
  @Column({ type: 'text' })
  recipientKey: string;

  @Column({ type: 'text', default: 'claimed' })
  status: NotificationStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: Date, nullable: true })
  sentAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
