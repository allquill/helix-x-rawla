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
import type { Gender } from '../constants';
import { Household } from './household.entity';
import { Member } from './member.entity';

/**
 * A child in the household (`Child profile` tab).
 *
 * A dependant record, never an account: IAM-13 bars under-13s from independent
 * credentials, and MP-23 bars anyone under the configured minimum age from
 * creating a member account at all. The source form supports three children;
 * that is a form limit, so nothing here encodes a cap (gap #3).
 */
@Entity('child_profiles')
export class ChildProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: 'text', name: 'member_id' })
  memberId: string;

  @ManyToOne(() => Household, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Index()
  @Column({ type: 'text', name: 'household_id' })
  householdId: string;

  @Column({ type: 'text' })
  firstName: string;

  @Column({ type: 'text', nullable: true })
  middleName: string | null;

  @Column({ type: 'text' })
  lastName: string;

  @Column({ type: 'text', nullable: true })
  gender: Gender | null;

  @Column({ type: 'date' })
  dateOfBirth: string;

  /** Order among siblings (`Child!D9`). */
  @Column({ type: 'integer', default: 1 })
  sequence: number;

  @Column({ type: 'text', nullable: true })
  educationLevel: string | null;

  /** Feeds auto-generated certificates (`Child!D11`). */
  @Column({ type: 'text', nullable: true })
  achievements: string | null;

  /** Derived from date of birth at write time (`Child!D12`). */
  @Column({ type: 'text', default: 'youth' })
  membershipTier: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
