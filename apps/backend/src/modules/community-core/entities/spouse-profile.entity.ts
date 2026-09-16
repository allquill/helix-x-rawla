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
import { Household } from './household.entity';
import { Member } from './member.entity';

/**
 * A spouse, as a linked profile rather than an account (`Spouse profile` tab).
 *
 * Gap #1 in the requirements is still open — whether a spouse should hold their
 * own login. Modelled here as a linked record because the source tab has email
 * and phone but no password field; promoting one to a full member later is an
 * insert into `members`, not a schema change.
 */
@Entity('spouse_profiles')
export class SpouseProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index({ unique: true })
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

  /** May legitimately differ from the member's own (`Spouse!D5`). */
  @Column({ type: 'text', nullable: true })
  caste: string | null;

  @Column({ type: 'text', nullable: true })
  gotra: string | null;

  @Column({ type: 'text', nullable: true })
  thikana: string | null;

  @Column({ type: 'text', nullable: true })
  nanihal: string | null;

  @Column({ type: 'text', nullable: true })
  familyHistory: string | null;

  @Column({ type: 'text', nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  phone: string | null;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: string | null;

  @Column({ type: 'text', nullable: true })
  industry: string | null;

  @Column({ type: 'text', nullable: true })
  education: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
