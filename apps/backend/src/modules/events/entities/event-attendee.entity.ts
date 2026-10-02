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
import { uuidRef } from '../../../database/db-type';
import { ChildProfile } from '../../community-core/entities/child-profile.entity';
import { Member } from '../../community-core/entities/member.entity';
import { SpouseProfile } from '../../community-core/entities/spouse-profile.entity';
import type { AttendeePersonType, AttendeeStatus, PricingTier } from '../constants';
import { EventRegistration } from './event-registration.entity';
import { EventTicketType } from './event-ticket-type.entity';
import { PortalEvent } from './portal-event.entity';

/**
 * One person attending under a registration.
 *
 * A person is a member, a spouse profile or a child profile of the purchaser's
 * household — never a guest (non-member tickets are out of scope). The three
 * person FKs are `SET NULL` and the name is a snapshot, so removing a family
 * member later (MP-26) leaves the attendance and volunteer history intact.
 *
 * Volunteering lives here (VOL-10/11/12): a flag ticked at sign-up and the
 * minutes entered when the event closes. There are no roles or shifts.
 */
@Index('UQ_event_attendees_active_person', ['eventId', 'personKey'], {
  unique: true,
  where: `"status" = 'active'`,
})
@Entity('event_attendees')
export class EventAttendee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => EventRegistration, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'registration_id' })
  registration: EventRegistration;

  @Index()
  @Column({ type: uuidRef(), name: 'registration_id' })
  registrationId: string;

  @ManyToOne(() => PortalEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: PortalEvent;

  @Index()
  @Column({ type: uuidRef(), name: 'event_id' })
  eventId: string;

  @Column({ type: 'text' })
  personType: AttendeePersonType;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Column({ type: uuidRef(), nullable: true, name: 'member_id' })
  memberId: string | null;

  @ManyToOne(() => SpouseProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'spouse_profile_id' })
  spouseProfile: SpouseProfile | null;

  @Column({ type: uuidRef(), nullable: true, name: 'spouse_profile_id' })
  spouseProfileId: string | null;

  @ManyToOne(() => ChildProfile, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'child_profile_id' })
  childProfile: ChildProfile | null;

  @Column({ type: uuidRef(), nullable: true, name: 'child_profile_id' })
  childProfileId: string | null;

  /**
   * The member whose privacy settings govern this person: themselves for a
   * member, the profile's member for a spouse or child. Listings read their
   * directory opt-out through this.
   */
  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_member_id' })
  ownerMember: Member | null;

  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'owner_member_id' })
  ownerMemberId: string | null;

  /** `member:<id>`, `spouse:<id>` or `child:<id>` — stable across registrations. */
  @Index()
  @Column({ type: 'text' })
  personKey: string;

  @Column({ type: 'text' })
  fullName: string;

  /** Youth on the day the event starts — the leaderboard's youth/adult split. */
  @Column({ type: 'boolean', default: false })
  isYouth: boolean;

  @ManyToOne(() => EventTicketType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ticket_type_id' })
  ticketType: EventTicketType | null;

  @Column({ type: uuidRef(), nullable: true, name: 'ticket_type_id' })
  ticketTypeId: string | null;

  @Column({ type: 'text' })
  ticketTypeName: string;

  /** The price locked when the registration was submitted. */
  @Column({ type: 'integer', default: 0 })
  unitPriceCents: number;

  @Column({ type: 'text', default: 'standard' })
  pricingTier: PricingTier;

  // ─── Preferences (EVT-04) ─────────────────────────────────────────────────

  /** A `dietary_preference` reference value. */
  @Column({ type: 'text', nullable: true })
  dietaryPref: string | null;

  /** Allergies and anything the list does not cover. */
  @Column({ type: 'text', nullable: true })
  dietaryNotes: string | null;

  /** A `tshirt_size` reference value. */
  @Column({ type: 'text', nullable: true })
  tshirtSize: string | null;

  @Column({ type: 'text', nullable: true })
  hotelDetails: string | null;

  // ─── Volunteering (VOL-10 / VOL-12) ───────────────────────────────────────

  @Index()
  @Column({ type: 'boolean', default: false })
  isVolunteer: boolean;

  /** Entered at close. Null is "not entered yet"; zero is a valid entry. */
  @Column({ type: 'integer', nullable: true })
  volunteerMinutes: number | null;

  @Column({ type: 'integer', nullable: true })
  hoursRecordedByUserId: number | null;

  @Column({ type: Date, nullable: true })
  hoursRecordedAt: Date | null;

  /** Mirrors the registration: `released` once it is cancelled or removed. */
  @Index()
  @Column({ type: 'text', default: 'active' })
  status: AttendeeStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
