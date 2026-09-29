import { User } from '@helix-x/backend';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  Gender,
  HouseholdRelationship,
  MemberStatus,
  VerificationProvenance,
} from '../constants';
import { Chapter } from './chapter.entity';
import { Household } from './household.entity';
import { memberActiveCheck, uuidRef } from '../../../database/db-type';

/**
 * The system of record for a person in the community (module MP).
 *
 * Deliberately a separate table from the framework's `users`, joined 1:1. The
 * framework owns identity — email, password, roles, sessions — and must stay
 * reusable by the next Helix X application; everything below is this product's
 * domain and would be dead weight anywhere else.
 */
/**
 * Database-level backstop for the single-writer rule on `isActive`.
 *
 * `MemberActivationService.recompute` is the only code that should ever write
 * the gate columns; this constraint means that if some future path writes one
 * directly and skips it, SQLite rejects the row instead of quietly leaving a
 * rejected applicant marked active.
 *
 * The payment gate is deliberately absent: the ADM-11 kill-switch can make a
 * member active with `isPaymentMade = 0`, and a CHECK cannot read a setting.
 * Column names are the camelCase ones TypeORM actually emits — a snake_case
 * expression here refers to columns that do not exist and fails at CREATE TABLE.
 */
@Check('CHK_member_active_implies_gates', memberActiveCheck())
@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ─── Identity link ────────────────────────────────────────────────────────

  @OneToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * FK to `users.id`, which is an autoincrement integer — not a uuid like the
   * PKs in this module. Getting this type wrong produces a join that silently
   * matches nothing in SQLite.
   */
  @Index({ unique: true })
  @Column({ type: 'integer', name: 'user_id' })
  userId: number;

  /** Public Member ID, allocated on approval (`Registration!D18`). */
  @Index()
  @Column({ type: 'text', unique: true, nullable: true })
  publicMemberId: string | null;

  // ─── Biographical ─────────────────────────────────────────────────────────

  @Column({ type: 'text' })
  firstName: string;

  @Column({ type: 'text', nullable: true })
  middleName: string | null;

  @Column({ type: 'text' })
  lastName: string;

  /** Kunwar / Baisa / Banna — a `honorific` reference value. */
  @Column({ type: 'text', nullable: true })
  honorific: string | null;

  @Column({ type: 'text' })
  gender: Gender;

  @Index()
  @Column({ type: 'date' })
  dateOfBirth: string;

  // ─── Cultural (§3.4 — do not genericise these) ────────────────────────────

  /** Ancestral village in Rajasthan. */
  @Index()
  @Column({ type: 'text' })
  thikana: string;

  /** Lineage classification. Drives badge printing and audience segmenting. */
  @Index()
  @Column({ type: 'text' })
  gotra: string;

  /** Rajput caste / sub-clan — Sengar, Shaktawat, Rathore… Distinct from Gotra. */
  @Index()
  @Column({ type: 'text' })
  caste: string;

  /** Spouse's ancestral thikana. Only meaningful once married. */
  @Column({ type: 'text', nullable: true })
  sasural: string | null;

  /** Mother's ancestral place. */
  @Column({ type: 'text', nullable: true })
  nanihal: string | null;

  @Column({ type: 'simple-json', nullable: true })
  languages: string[] | null;

  @Column({ type: 'text', nullable: true })
  familyHistory: string | null;

  // ─── Contact ──────────────────────────────────────────────────────────────

  /**
   * The login identifier and verification destination lives on `users.email`.
   * This column is the WhatsApp/SMS broadcast target only.
   */
  @Column({ type: 'text' })
  phone: string;

  @Column({ type: 'text', nullable: true })
  whatsappPhone: string | null;

  @Column({ type: 'boolean', default: false })
  isPhoneVerified: boolean;

  // ─── Household and chapter ────────────────────────────────────────────────

  @ManyToOne(() => Household, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'household_id' })
  household: Household;

  @Index()
  @Column({ type: uuidRef(), name: 'household_id' })
  householdId: string;

  @Column({ type: 'text', default: 'head_of_house' })
  relationship: HouseholdRelationship;

  @ManyToOne(() => Chapter, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter | null;

  /** Auto-derived from the household's state; an admin may override (MP-08). */
  @Index()
  @Column({ type: uuidRef(), nullable: true, name: 'chapter_id' })
  chapterId: string | null;

  /** True once an admin has overridden the state-derived chapter (MP-08). */
  @Column({ type: 'boolean', default: false })
  chapterIsOverridden: boolean;

  @Column({ type: 'date', nullable: true })
  weddingDate: string | null;

  // ─── Professional ─────────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  industry: string | null;

  @Column({ type: 'text', nullable: true })
  jobTitle: string | null;

  @Column({ type: 'simple-json', nullable: true })
  skills: string[] | null;

  @Column({ type: 'text', nullable: true })
  education: string | null;

  @Column({ type: 'text', nullable: true })
  linkedinUrl: string | null;

  @Column({ type: 'text', nullable: true })
  facebookUrl: string | null;

  /** Social links are shown only with the member's explicit approval (MP-09). */
  @Column({ type: 'boolean', default: false })
  socialLinksApproved: boolean;

  // ─── Membership ───────────────────────────────────────────────────────────

  /** A `membership_tier` reference value: annual / lifetime / youth / associate. */
  @Column({ type: 'text' })
  membershipTier: string;

  @Column({ type: 'date', nullable: true })
  joinDate: string | null;

  @Column({ type: 'simple-json', nullable: true })
  volunteerInterests: string[] | null;

  // ─── Status and the three activation gates ────────────────────────────────

  @Index()
  @Column({ type: 'text', default: 'pending_email_verification' })
  status: MemberStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: Date, nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  infoRequestMessage: string | null;

  @Column({ type: Date, nullable: true })
  infoRequestedAt: Date | null;

  @Column({ type: Date, nullable: true })
  archivedAt: Date | null;

  @Column({ type: 'integer', nullable: true })
  archivedByUserId: number | null;

  /**
   * When the member first set a password.
   *
   * `users.passwordHash` is `select: false` and is seeded with an unusable
   * hash at registration, so this module cannot tell from the user row whether
   * a password was ever chosen. REG-12 needs exactly that — "verified address,
   * no password set" is a distinct state in the admin queue — so the
   * `onPasswordChanged` hook records it here.
   */
  @Column({ type: Date, nullable: true })
  passwordSetAt: Date | null;

  /** Gate 1. Set only by the verification flow or an admin override (REG-23). */
  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: Date, nullable: true })
  emailVerifiedAt: Date | null;

  /** Which flow closed the email gate — the audit row names it (§6.2). */
  @Column({ type: 'text', nullable: true })
  emailVerificationProvenance: VerificationProvenance | null;

  @Column({ type: 'integer', nullable: true })
  emailOverrideByUserId: number | null;

  @Column({ type: 'text', nullable: true })
  emailOverrideReason: string | null;

  @Column({ type: Date, nullable: true })
  emailOverrideAt: Date | null;

  /** Gate 2. Set only by an admin approval decision (REG-09). Never self-served. */
  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'integer', nullable: true })
  approvedByUserId: number | null;

  @Column({ type: Date, nullable: true })
  approvedAt: Date | null;

  /** Gate 3. Settled dues, or an admin override with a mandatory reason (REG-16). */
  @Column({ type: 'boolean', default: false })
  isPaymentMade: boolean;

  @Column({ type: 'integer', nullable: true })
  paymentOverrideByUserId: number | null;

  @Column({ type: 'text', nullable: true })
  paymentOverrideReason: string | null;

  @Column({ type: Date, nullable: true })
  paymentOverrideAt: Date | null;

  @Column({ type: Date, nullable: true })
  paymentSettledAt: Date | null;

  /**
   * The conjunction of the three gates, the status, and the framework's own
   * `users.isActive`.
   *
   * Persisted rather than computed per query so directory and admin filters can
   * index it — but **write it only through `MemberActivationService.recompute`**.
   * Every request DTO omits it, and the global whitelisting `ValidationPipe`
   * strips it, so no API path can set it directly.
   */
  @Index()
  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  /** Stamped once, on the first false→true edge of `isActive` (REG-10). */
  @Column({ type: Date, nullable: true })
  activatedAt: Date | null;

  // ─── Vetting ──────────────────────────────────────────────────────────────
  //
  // The two vouching contacts live in `member_reference_contact`, because
  // REG-09 requires a per-reference "checked" flag that inline columns cannot
  // carry.

  /** References will be supplied offline via the membership secretary (REG-06). */
  @Column({ type: 'boolean', default: false })
  offlineVerification: boolean;

  @Column({ type: 'text', nullable: true })
  reviewerNotes: string | null;

  // ─── Privacy (§3.2) ───────────────────────────────────────────────────────

  @Column({ type: 'boolean', default: true })
  directoryOptIn: boolean;

  /** Per-field overrides, e.g. `{ "phone": "hidden" }` (MP-19). */
  @Column({ type: 'simple-json', nullable: true })
  fieldVisibility: Record<string, 'visible' | 'hidden'> | null;

  // Consent lives in `consent_record`: REG-03 wants the version of each
  // document that was accepted, and there is more than one document.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
