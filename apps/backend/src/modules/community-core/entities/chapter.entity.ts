import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * A US regional chapter (CHP-01).
 *
 * Chapters are the tenancy boundary: a Chapter Lead manages only their own
 * region's members, events and finances, enforced server-side on every query.
 */
@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'text', unique: true })
  name: string;

  @Column({ type: 'text', unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * The chapter lead's user id, not member id — the lead is identified by the
   * account that authenticates, and a lead may be appointed before their own
   * member record finishes activating.
   */
  @Column({ type: 'integer', nullable: true })
  leadUserId: number | null;

  @Column({ type: 'text', nullable: true })
  contactEmail: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
