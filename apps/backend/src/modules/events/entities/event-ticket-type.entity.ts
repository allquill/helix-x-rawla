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

/**
 * An age-banded ticket for one event: "Adult", "Child 5–12", "Under 5".
 *
 * The band is inclusive at both ends and either end may be open. An attendee
 * gets the first active ticket, by `sortOrder`, whose band holds their age on
 * the day the event starts — the member does not choose (EVT-02).
 */
@Entity('event_ticket_types')
export class EventTicketType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'integer', nullable: true })
  minAge: number | null;

  @Column({ type: 'integer', nullable: true })
  maxAge: number | null;

  /** Minor units. Zero is a free ticket. */
  @Column({ type: 'integer', default: 0 })
  priceCents: number;

  @Column({ type: 'integer', nullable: true })
  earlyBirdPriceCents: number | null;

  /** The early-bird price applies strictly before this instant. */
  @Column({ type: Date, nullable: true })
  earlyBirdEndsAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
