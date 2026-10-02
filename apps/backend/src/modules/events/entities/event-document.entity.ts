import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { uuidRef } from '../../../database/db-type';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import type { EventDocumentKind } from '../constants';
import { PortalEvent } from './portal-event.entity';

/**
 * A financial statement or bill attached to an event (EVT-24).
 *
 * It carries no security level of its own: it is DOC level 4 while the event
 * is open and level 5 once it is closed, so the level is read from the event.
 */
@Entity('event_documents')
export class EventDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @ManyToOne(() => PortalFile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: PortalFile;

  @Column({ type: uuidRef(), name: 'file_id' })
  fileId: string;

  @Column({ type: 'text', default: 'other' })
  kind: EventDocumentKind;

  @Column({ type: 'integer' })
  addedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
