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
import type { EventPaymentMethod, EventPaymentStatus } from '../constants';
import { EventRegistration } from './event-registration.entity';
import { PortalEvent } from './portal-event.entity';

/**
 * One payment against a registration, whether settled online or recorded by
 * hand (EVT-19 / EVT-20).
 *
 * `providerRef` is unique for the same reason it is on `membership_payments`:
 * a webhook replayed three times settles the payment once.
 */
@Entity('event_payments')
export class EventPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventRegistration, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: EventRegistration;

  @Index()
  @Column({ type: uuidRef(), name: 'registration_id' })
  registrationId: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Column({ type: 'text' })
  method: EventPaymentMethod;

  @Index()
  @Column({ type: 'text', default: 'pending' })
  status: EventPaymentStatus;

  /** Checkout session id. Null for a payment recorded by hand. */
  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  providerRef: string | null;

  /** Kept so "Pay now" reopens the same checkout rather than a second one. */
  @Column({ type: 'text', nullable: true })
  checkoutUrl: string | null;

  @Column({ type: Date, nullable: true })
  checkoutExpiresAt: Date | null;

  /** Zelle confirmation number, cheque number — whatever identifies it. */
  @Column({ type: 'text', nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  /** The Admin who recorded it; null for an online payment. */
  @Column({ type: 'integer', nullable: true })
  recordedByUserId: number | null;

  @Column({ type: Date, nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
