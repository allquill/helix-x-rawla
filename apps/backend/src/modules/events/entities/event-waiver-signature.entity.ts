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
import { EventAttendee } from './event-attendee.entity';
import { PortalEvent } from './portal-event.entity';
import { WaiverTemplate } from './waiver-template.entity';

/**
 * A signed waiver for one attendee (EVT-05).
 *
 * The "signed artefact" is this row plus the immutable template row it points
 * at: who typed which name, when, from where, against which version and hash.
 * A parent signs for a child — `signedByMemberId` is the signer, not the
 * attendee.
 */
@Entity('event_waiver_signatures')
export class EventWaiverSignature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventAttendee, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attendee_id' })
  attendee: EventAttendee;

  @Index({ unique: true })
  @Column({ type: uuidRef(), name: 'attendee_id' })
  attendeeId: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @ManyToOne(() => WaiverTemplate, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'waiver_template_id' })
  waiverTemplate: WaiverTemplate;

  @Column({ type: uuidRef(), name: 'waiver_template_id' })
  waiverTemplateId: string;

  @Column({ type: 'integer' })
  templateVersion: number;

  @Column({ type: 'text' })
  bodySha256: string;

  /** The full name the signer typed. */
  @Column({ type: 'text' })
  signedName: string;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'signed_by_member_id' })
  signedByMember: Member | null;

  @Column({ type: uuidRef(), nullable: true, name: 'signed_by_member_id' })
  signedByMemberId: string | null;

  @Column({ type: 'integer' })
  signedByUserId: number;

  @Column({ type: Date })
  signedAt: Date;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
