import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AuthService, CredentialFlowService, Role, User } from '@helix-x/backend';
import { ChildProfile } from '../entities/child-profile.entity';
import { ConsentRecord } from '../entities/consent-record.entity';
import { Household } from '../entities/household.entity';
import { Member } from '../entities/member.entity';
import { MemberReferenceContact } from '../entities/member-reference-contact.entity';
import { MemberStatusHistory } from '../entities/member-status-history.entity';
import { SpouseProfile } from '../entities/spouse-profile.entity';
import { APPLICANT_ROLE } from '../constants';
import type { SubmitRegistrationDto } from '../models/registration.dto';
import { AuditService } from './audit.service';
import { ChapterService } from './chapter.service';
import { PortalSettingsService } from './portal-settings.service';
import { ReferenceDataService } from './reference-data.service';
import { isUniqueViolation } from '../../../database/db-type';

/** Whole years elapsed, evaluated in UTC so the answer is not timezone-dependent. */
export function ageInYears(isoDate: string, asOf: Date = new Date()): number {
  const dob = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return Number.NaN;

  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDelta = asOf.getUTCMonth() - dob.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Turns a public form submission into an applicant account (module REG).
 *
 * Deliberately does not call `AuthService.register`: that returns a live access
 * token and sends no verification mail, which is the opposite of what REG-21
 * and IAM-01 require. It may, however, inject `AuthService` — only the
 * `AuthHooks` implementation is barred from doing so.
 */
@Injectable()
export class MemberRegistrationService {
  private readonly logger = new Logger(MemberRegistrationService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly credentialFlow: CredentialFlowService,
    private readonly settings: PortalSettingsService,
    private readonly chapters: ChapterService,
    private readonly referenceData: ReferenceDataService,
    private readonly audit: AuditService,
  ) {}

  /**
   * A structurally valid bcrypt hash of randomness nobody holds.
   *
   * `users.passwordHash` is `NOT NULL`, but an applicant must not have a
   * password until they follow the emailed link (IAM-01). A cheap sentinel
   * string would also never match — but it would return in microseconds where a
   * real hash takes ~250 ms, making "registered, no password yet"
   * distinguishable from "never registered" by response time alone. That is
   * precisely the oracle `AuthService.login` burns CPU to avoid, so pay the
   * same cost here.
   */
  private static async unusablePasswordHash(): Promise<string> {
    return bcrypt.hash(randomBytes(32).toString('base64'), 12);
  }

  /** REG-02: probe without committing. Email blocks; phone only warns. */
  async probeDuplicate(input: { email?: string; phone?: string }): Promise<{
    emailTaken: boolean;
    phoneSeen: boolean;
    action: 'proceed' | 'recover' | 'acknowledge';
  }> {
    const emailTaken = input.email
      ? (await this.userRepo.findOne({
          where: { email: AuthService.normaliseEmail(input.email) },
          select: { id: true },
        })) !== null
      : false;

    const phoneSeen = input.phone
      ? (await this.memberRepo.findOne({
          where: { phone: input.phone.trim() },
          select: { id: true },
        })) !== null
      : false;

    return {
      emailTaken,
      phoneSeen,
      action: emailTaken ? 'recover' : phoneSeen ? 'acknowledge' : 'proceed',
    };
  }

  async submit(
    dto: SubmitRegistrationDto,
    context: { ip?: string | null } = {},
  ): Promise<{ memberId: string; status: string }> {
    const email = AuthService.normaliseEmail(dto.email);

    // ── REG-17 / IAM-15: the age gate, server-side and before any write ──────
    //
    // A decorator cannot express this: the threshold is admin-configurable
    // (ADM-09) and read at submission time.
    const minimumAge = this.settings.minimumAge;
    const age = ageInYears(dto.dateOfBirth);
    if (!Number.isFinite(age)) {
      throw new BadRequestException({
        code: 'INVALID_DATE_OF_BIRTH',
        message: 'Enter a valid date of birth.',
      });
    }
    if (age < minimumAge) {
      throw new BadRequestException({
        code: 'UNDER_MINIMUM_AGE',
        message: `You must be at least ${minimumAge} to create an account.`,
        minimumAge,
      });
    }

    // ── REG-03: consent, with the version that was accepted ─────────────────
    if (!dto.acceptCommunityGuidelines || !dto.acceptPrivacyPolicy) {
      throw new BadRequestException({
        code: 'CONSENT_REQUIRED',
        message: 'You must accept the Community Guidelines and the Privacy Policy.',
      });
    }
    const consentVersion = this.settings.consentVersion;

    // ── REG-02 / REG-20: duplicates ─────────────────────────────────────────
    const duplicate = await this.probeDuplicate({ email, phone: dto.phone });
    if (duplicate.emailTaken) {
      throw new ConflictException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'You may already be registered. Try signing in, or reset your password.',
        remediation: { action: 'recover', href: '/forgot-password' },
      });
    }
    if (duplicate.phoneSeen && !dto.acknowledgeDuplicatePhone) {
      throw new ConflictException({
        code: 'POSSIBLE_DUPLICATE',
        message:
          'That phone number is already on file. If you share it with another household member, you can continue.',
        remediation: { action: 'acknowledge', href: '/join' },
      });
    }

    if (!dto.offlineVerification && (dto.references?.length ?? 0) < 2) {
      throw new BadRequestException({
        code: 'REFERENCES_REQUIRED',
        message:
          'Provide two Rawla members who can vouch for you, or mark that references will follow offline.',
      });
    }

    await this.referenceData.assertValid('gotra', dto.gotra);
    await this.referenceData.assertValid('caste', dto.caste);
    await this.referenceData.assertValid('membership_tier', dto.membershipTier);
    await this.referenceData.assertValid('honorific', dto.honorific);

    const chapterId = await this.chapters.resolveForState(dto.stateCode);
    const passwordHash = await MemberRegistrationService.unusablePasswordHash();
    const applicantRole = await this.roleRepo.findOne({ where: { name: APPLICANT_ROLE } });

    let memberId!: string;

    try {
      await this.dataSource.transaction(async (em) => {
        const user = await em.save(
          em.create(User, {
            email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            // The framework flag is the platform kill-switch, not an activation
            // gate — the portal's three gates live on the member row.
            isActive: true,
            roles: applicantRole ? [applicantRole] : [],
          }),
        );

        const household = await em.save(
          em.create(Household, {
            publicHouseholdId: `HH-${randomBytes(4).toString('hex').toUpperCase()}`,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2 ?? null,
            city: dto.city,
            state: dto.stateCode.trim().toUpperCase(),
            postalCode: dto.postalCode,
            country: 'US',
            chapterId,
            anniversaryDate: dto.weddingDate ?? null,
          }),
        );

        const member = await em.save(
          em.create(Member, {
            userId: user.id,
            firstName: dto.firstName,
            middleName: dto.middleName ?? null,
            lastName: dto.lastName,
            honorific: dto.honorific ?? null,
            gender: dto.gender,
            dateOfBirth: dto.dateOfBirth.slice(0, 10),
            thikana: dto.thikana,
            gotra: dto.gotra,
            caste: dto.caste,
            sasural: dto.sasural ?? null,
            nanihal: dto.nanihal ?? null,
            languages: dto.languages ?? null,
            familyHistory: dto.familyHistory ?? null,
            phone: dto.phone,
            whatsappPhone: dto.whatsappPhone ?? null,
            householdId: household.id,
            relationship: 'head_of_house',
            chapterId,
            weddingDate: dto.weddingDate?.slice(0, 10) ?? null,
            industry: dto.industry ?? null,
            jobTitle: dto.jobTitle ?? null,
            skills: dto.skills ?? null,
            education: dto.education ?? null,
            membershipTier: dto.membershipTier,
            volunteerInterests: dto.volunteerInterests ?? null,
            status: 'pending_email_verification',
            offlineVerification: dto.offlineVerification ?? false,
          }),
        );

        household.headMemberId = member.id;
        await em.save(Household, household);

        if (dto.spouse) {
          await em.save(
            em.create(SpouseProfile, {
              memberId: member.id,
              householdId: household.id,
              firstName: dto.spouse.firstName,
              middleName: dto.spouse.middleName ?? null,
              lastName: dto.spouse.lastName,
              caste: dto.spouse.caste ?? null,
              gotra: dto.spouse.gotra ?? null,
              thikana: dto.spouse.thikana ?? null,
              nanihal: dto.spouse.nanihal ?? null,
              email: dto.spouse.email ?? null,
              phone: dto.spouse.phone ?? null,
              dateOfBirth: dto.spouse.dateOfBirth?.slice(0, 10) ?? null,
              industry: dto.spouse.industry ?? null,
              education: dto.spouse.education ?? null,
            }),
          );
        }

        for (const child of dto.children ?? []) {
          await em.save(
            em.create(ChildProfile, {
              memberId: member.id,
              householdId: household.id,
              firstName: child.firstName,
              middleName: child.middleName ?? null,
              lastName: child.lastName,
              gender: child.gender ?? null,
              dateOfBirth: child.dateOfBirth.slice(0, 10),
              sequence: child.sequence,
              educationLevel: child.educationLevel ?? null,
              achievements: child.achievements ?? null,
              // Youth tier follows from the date of birth (`Child!D12`).
              membershipTier: ageInYears(child.dateOfBirth) < 18 ? 'youth' : 'associate',
            }),
          );
        }

        let sequence = 1;
        for (const reference of dto.references ?? []) {
          await em.save(
            em.create(MemberReferenceContact, {
              memberId: member.id,
              sequence: sequence++,
              name: reference.name,
              phone: reference.phone,
            }),
          );
        }

        for (const document of ['community_guidelines', 'privacy_policy'] as const) {
          await em.save(
            em.create(ConsentRecord, {
              memberId: member.id,
              document,
              version: consentVersion,
              ip: context.ip ?? null,
            }),
          );
        }

        await em.save(
          em.create(MemberStatusHistory, {
            memberId: member.id,
            fromStatus: null,
            toStatus: 'pending_email_verification',
            reason: 'application submitted',
          }),
        );

        memberId = member.id;
      });
    } catch (error) {
      // The pre-check above cannot stop two simultaneous submissions; the unique
      // index can, and does. Report it as the same conflict either way.
      if (error instanceof QueryFailedError && isUniqueViolation(error)) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'You may already be registered. Try signing in, or reset your password.',
          remediation: { action: 'recover', href: '/forgot-password' },
        });
      }
      throw error;
    }

    await this.audit.record({
      action: 'registration.submitted',
      entityType: 'member',
      entityId: memberId,
      after: { email, status: 'pending_email_verification' },
      ip: context.ip ?? null,
    });

    // ── REG-21: the verification link ───────────────────────────────────────
    //
    // Outside the transaction, and never inside it: a rollback after the mail
    // was queued would leave a live token pointing at an application that no
    // longer exists. A send failure must not undo a committed application
    // either, so the applicant can always ask for a fresh link.
    try {
      await this.credentialFlow.requestLink({
        destination: email,
        purpose: 'email_verification',
        userId: (await this.userRepo.findOne({ where: { email }, select: { id: true } }))!.id,
        ip: context.ip ?? null,
      });
    } catch (error) {
      this.logger.error(
        `Registration ${memberId} committed but the verification link could not be sent: ${(error as Error).message}`,
      );
    }

    return { memberId, status: 'pending_email_verification' };
  }
}
