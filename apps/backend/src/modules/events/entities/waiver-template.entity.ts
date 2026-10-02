import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A liability waiver, one row per version (EVT-05).
 *
 * Rows are immutable: editing a waiver inserts version n+1 and moves
 * `isCurrent`. A signature points at the exact row it agreed to, so the text
 * someone signed can always be produced.
 */
@Index(['key', 'version'], { unique: true })
@Entity('waiver_templates')
export class WaiverTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Stable name of the waiver across its versions, e.g. `general_liability`. */
  @Column({ type: 'text' })
  key: string;

  @Column({ type: 'integer', default: 1 })
  version: number;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /** Hash of `body`, copied onto each signature. */
  @Column({ type: 'text' })
  bodySha256: string;

  /** The version new events attach and new signatures use. */
  @Column({ type: 'boolean', default: true })
  isCurrent: boolean;

  @Column({ type: 'integer', nullable: true })
  createdByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
