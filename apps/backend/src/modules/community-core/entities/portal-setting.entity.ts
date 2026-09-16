import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * One admin-editable configuration value (ADM-09 / ADM-11 / ADM-12).
 *
 * Stored as text with a declared type rather than a typed column per setting,
 * so adding a lever is a seed row rather than a migration. Changes are audited
 * and take effect on the next use — never retroactively (ADM-09: raising the
 * minimum age must not deactivate existing members).
 */
@Entity('portal_settings')
export class PortalSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'text', unique: true })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ type: 'text', default: 'string' })
  valueType: 'string' | 'number' | 'boolean';

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'integer', nullable: true })
  updatedByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
