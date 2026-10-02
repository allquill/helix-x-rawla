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
import { EventAttendee } from './event-attendee.entity';
import { EventTimeSlot } from './event-time-slot.entity';
import { PortalEvent } from './portal-event.entity';

/** An attendee's place in a time slot (EVT-03). */
@Index(['slotId', 'attendeeId'], { unique: true })
@Entity('event_slot_bookings')
export class EventSlotBooking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventTimeSlot, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'slot_id' })
  slot: EventTimeSlot;

  @Column({ type: uuidRef(), name: 'slot_id' })
  slotId: string;

  @ManyToOne(() => EventAttendee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendee_id' })
  attendee: EventAttendee;

  @Index()
  @Column({ type: uuidRef(), name: 'attendee_id' })
  attendeeId: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @CreateDateColumn()
  createdAt: Date;
}
