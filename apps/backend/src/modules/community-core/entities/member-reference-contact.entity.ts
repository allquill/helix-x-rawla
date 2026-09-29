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
import { uuidRef } from '../../../database/db-type';

/**
 * A Rawla member who vouches for an applicant (REG-05, `Member profile!E33`).
 *
 * Its own table rather than four columns on `member`, because REG-09 gives the
 * reviewer a checkbox per reference — a verification state that inline columns
 * have nowhere to put.
 */
@Index(['memberId', 'sequence'], { unique: true })
@Entity('member_reference_contacts')
export class MemberReferenceContact {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: uuidRef(), name: 'member_id' })
  memberId: string;

  /** 1 or 2 — the workbook asks for exactly two vouching members. */
  @Column({ type: 'integer' })
  sequence: number;

  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  phone: string;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'integer', nullable: true })
  verifiedByUserId: number | null;

  @Column({ type: Date, nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
