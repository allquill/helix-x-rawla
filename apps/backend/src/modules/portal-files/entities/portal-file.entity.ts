import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A file the portal stores on a feature's behalf: an event flyer, a bill, a
 * volunteer certificate.
 *
 * Deliberately not the framework's `documents` table. That one answers "who
 * owns or was shared this file"; these are governed by the DOC security levels
 * of §20.4, which depend on the row that points here (an event's status, a
 * certificate's member). So this row carries no level and no owner — the
 * feature that references it decides who may read it.
 */
@Entity('portal_files')
export class PortalFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Key in the document store, under the `portal/` prefix. */
  @Index({ unique: true })
  @Column({ type: 'text' })
  storageKey: string;

  /** The name the uploader gave it; what a download is saved as. */
  @Column({ type: 'text' })
  name: string;

  @Column({ type: 'text' })
  mimeType: string;

  @Column({ type: 'integer' })
  sizeBytes: number;

  @Column({ type: 'text' })
  checksumSha256: string;

  @Column({ type: 'integer', nullable: true })
  uploadedByUserId: number | null;

  @CreateDateColumn()
  createdAt: Date;
}
