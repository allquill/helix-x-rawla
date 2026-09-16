import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from './member.entity';

export const CONSENT_DOCUMENTS = ['community_guidelines', 'privacy_policy'] as const;
export type ConsentDocument = (typeof CONSENT_DOCUMENTS)[number];

/**
 * What the applicant accepted, and which version of it (REG-03).
 *
 * Append-only — no `updatedAt`. The point of the record is to show what the
 * member agreed to at a moment in time; a row that can be edited afterwards
 * proves nothing, and the documents are versioned precisely so that a later
 * revision does not rewrite history.
 */
@Index(['memberId', 'document'])
@Entity('consent_records')
export class ConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'text', name: 'member_id' })
  memberId: string;

  @Column({ type: 'text' })
  document: ConsentDocument;

  @Column({ type: 'text' })
  version: string;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @CreateDateColumn()
  acceptedAt: Date;
}
