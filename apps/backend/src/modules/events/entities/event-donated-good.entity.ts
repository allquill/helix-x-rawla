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
import { Member } from '../../community-core/entities/member.entity';
import { PortalEvent } from './portal-event.entity';

/**
 * Goods donated for an event (EVT-06). The donor is attributed so in-kind
 * receipting (TAX) has something to read once it exists.
 */
@Entity('event_donated_goods')
export class EventDonatedGood {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'text' })
  item: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  unit: string | null;

  @Column({ type: 'integer', nullable: true })
  estimatedValueCents: number | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'donor_member_id' })
  donorMember: Member | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'donor_member_id' })
  donorMemberId: string | null;

  /** The donor as written down; kept when the member row is gone or absent. */
  @Column({ type: 'text', nullable: true })
  donorName: string | null;

  @Column({ type: Date })
  receivedAt: Date;

  @Column({ type: 'integer' })
  recordedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
