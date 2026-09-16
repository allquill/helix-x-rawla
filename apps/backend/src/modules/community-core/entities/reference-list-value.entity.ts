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
import { ReferenceList } from './reference-list.entity';

/**
 * One option within a reference list.
 *
 * Values are deactivated, never deleted (ADM-01: "deactivating a value must not
 * orphan existing records"). A member who chose a since-retired Gotra keeps it;
 * the value simply stops appearing in new dropdowns.
 */
@Index(['listId', 'value'], { unique: true })
@Entity('reference_list_values')
export class ReferenceListValue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ReferenceList, (list) => list.values, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'list_id' })
  list: ReferenceList;

  @Index()
  @Column({ type: 'text', name: 'list_id' })
  listId: string;

  /** Stable machine value stored on member rows. Never renamed. */
  @Column({ type: 'text' })
  value: string;

  /** Display label. Safe to rename without touching member rows. */
  @Column({ type: 'text' })
  label: string;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Free-form extras. For `membership_tier` this carries the dues amount and
   * currency (ADM-10), which is why dues are configuration rather than code.
   */
  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
