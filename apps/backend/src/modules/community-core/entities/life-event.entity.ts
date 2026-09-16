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
import type { LifeEventType } from '../constants';
import { Member } from './member.entity';

/** Births, weddings and anniversaries feeding the recognition engine (MP-05). */
@Entity('life_events')
export class LifeEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: 'text', name: 'member_id' })
  memberId: string;

  @Column({ type: 'text' })
  type: LifeEventType;

  @Index()
  @Column({ type: 'date' })
  eventDate: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'datetime', nullable: true })
  recognisedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
