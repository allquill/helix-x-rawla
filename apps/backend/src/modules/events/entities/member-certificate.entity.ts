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
import { ChildProfile } from '../../community-core/entities/child-profile.entity';
import { Member } from '../../community-core/entities/member.entity';
import { PortalFile } from '../../portal-files/entities/portal-file.entity';
import { PortalEvent } from './portal-event.entity';

/**
 * A certificate prepared outside the portal and uploaded to a member's
 * profile, or to their child's section of it (REC-07). DOC level 2: the
 * member — the parent, for a child — and the people who upload them.
 */
@Entity('member_certificates')
export class MemberCertificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** The profile it is filed under; the parent, when it is a child's. */
  @ManyToOne(() => Member, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Index()
  @Column({ type: uuidRef(), name: 'member_id' })
  memberId: string;

  @ManyToOne(() => ChildProfile, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'child_profile_id' })
  childProfile: ChildProfile | null;

  @Column({ type: uuidRef(), nullable: true, name: 'child_profile_id' })
  childProfileId: string | null;

  @ManyToOne(() => PortalEvent, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent | null;

  @Column({ type: uuidRef(), nullable: true, name: 'event_id' })
  eventId: string | null;

  @Column({ type: 'text' })
  title: string;

  @ManyToOne(() => PortalFile, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: PortalFile;

  @Column({ type: uuidRef(), name: 'file_id' })
  fileId: string;

  @Column({ type: 'integer' })
  uploadedByUserId: number;

  @CreateDateColumn()
  createdAt: Date;
}
