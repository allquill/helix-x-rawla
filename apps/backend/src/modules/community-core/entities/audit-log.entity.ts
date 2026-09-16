import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * The append-only change log (AUD / ADM-02 / REG-11).
 *
 * No `updatedAt` and no update or delete method on the service that owns it —
 * an audit trail that can be rewritten proves nothing. Entity ids are stored as
 * plain text with no foreign key, deliberately: a row must survive the deletion
 * of the thing it describes, which is exactly when it matters most.
 */
@Index(['entityType', 'entityId'])
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'integer', nullable: true })
  actorUserId: number | null;

  @Column({ type: 'simple-json', nullable: true })
  actorRoles: string[] | null;

  /** Set when the action was taken through an impersonated session (IAM-11). */
  @Column({ type: 'integer', nullable: true })
  impersonatedByUserId: number | null;

  /** e.g. `registration.approve`, `member.payment_status.override`. */
  @Index()
  @Column({ type: 'text' })
  action: string;

  @Column({ type: 'text' })
  entityType: string;

  @Column({ type: 'text', nullable: true })
  entityId: string | null;

  @Column({ type: 'simple-json', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'simple-json', nullable: true })
  after: Record<string, unknown> | null;

  /** Mandatory for payment and email overrides (REG-16, REG-23). */
  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ type: 'text', nullable: true })
  ip: string | null;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
