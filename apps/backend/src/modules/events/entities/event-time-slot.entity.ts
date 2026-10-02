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
import { PortalEvent } from './portal-event.entity';

/** A bookable block within an event, e.g. a blood-donation appointment (EVT-03). */
@Entity('event_time_slots')
export class EventTimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'text' })
  activity: string;

  @Column({ type: Date })
  startsAt: Date;

  @Column({ type: Date })
  endsAt: Date;

  @Column({ type: 'integer' })
  capacity: number;

  /** Moved only by a conditional UPDATE against `capacity`. */
  @Column({ type: 'integer', default: 0 })
  bookedCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
