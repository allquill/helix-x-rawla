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
import { Member } from './member.entity';

export const PAYMENT_STATUSES = [
  'pending',
  'settled',
  'refunded',
  'waived',
  'admin_override',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * A membership dues record (REG-16 / REG-18).
 *
 * One row per checkout the member opens (`DuesPaymentService`), plus every admin
 * override — an override is still a payment event and must be as auditable as a
 * card charge. `providerRef` is unique so a provider webhook replayed three times
 * settles the dues once — the idempotency the spec asks for is a database
 * constraint here rather than application bookkeeping.
 */
@Entity('membership_payments')
export class MembershipPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: 'text', name: 'member_id' })
  memberId: string;

  @Column({ type: 'text' })
  tier: string;

  /** Minor units, to keep money out of floating point. */
  @Column({ type: 'integer', default: 0 })
  amountCents: number;

  @Column({ type: 'text', default: 'USD' })
  currency: string;

  @Index()
  @Column({ type: 'text', default: 'pending' })
  status: PaymentStatus;

  @Column({ type: 'text', nullable: true })
  provider: string | null;

  /** Provider event/charge id. Unique so replayed webhooks settle dues once. */
  @Index({ unique: true })
  @Column({ type: 'text', nullable: true })
  providerRef: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'integer', nullable: true })
  recordedByUserId: number | null;

  @Column({ type: 'datetime', nullable: true })
  settledAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
