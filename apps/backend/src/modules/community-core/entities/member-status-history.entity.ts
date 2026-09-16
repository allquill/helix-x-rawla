import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { MemberStatus } from '../constants';
import { Member } from './member.entity';

/**
 * Every transition of the registration status machine (§5.1).
 *
 * Append-only, like {@link AuditLog}, and therefore carries no `updatedAt`: a
 * history row that can be edited is not a history. Kept separate from the audit
 * log because reviewers read this constantly and it must stay cheap to query by
 * member, while the audit log is a wide, write-heavy forensic record.
 */
@Entity('member_status_history')
export class MemberStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: 'text', name: 'member_id' })
  memberId: string;

  @Column({ type: 'text', nullable: true })
  fromStatus: MemberStatus | null;

  @Column({ type: 'text' })
  toStatus: MemberStatus;

  /** Null when the transition was made by the system, not a person. */
  @Column({ type: 'integer', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
