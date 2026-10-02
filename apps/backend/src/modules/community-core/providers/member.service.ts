import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { User, type AuthenticatedUser } from '@helix-x/backend';
import { Member } from '../entities/member.entity';
import { MemberReferenceContact } from '../entities/member-reference-contact.entity';
import { SpouseProfile } from '../entities/spouse-profile.entity';
import { ChildProfile } from '../entities/child-profile.entity';
import { CHAPTER_LEAD_ROLE, PORTAL_PERMISSIONS, STAFF_ROLES } from '../constants';
import type { MemberDetailDto, MemberSummaryDto } from '../models/member-response.dto';
import type { UpdateMemberDto } from '../models/member-update.dto';
import type { MemberStatusDto } from '../models/registration-response.dto';
import { AuditService } from './audit.service';
import { clampPage } from './pagination';
import { MemberGateService } from './member-gate.service';
import { ProfileVisibilityService } from './profile-visibility.service';
import { ReferenceDataService } from './reference-data.service';

export type MemberListFilter = {
  status?: string;
  isActive?: boolean;
  chapterId?: string;
  gotra?: string;
  caste?: string;
  membershipTier?: string;
  search?: string;
  /** May arrive as a raw query string; `clampPage` coerces it. */
  limit?: number | string;
  offset?: number | string;
};

/**
 * Chapter tenancy (IAM-10 / CHP-03).
 *
 * Threaded through every query as an explicit argument rather than hidden in a
 * repository interceptor: Nest would need request-scoped providers for that,
 * which cascades scope through the whole injection chain. Explicit and
 * testable beats implicit and slow.
 */
export type ChapterScope = {
  /** True for global staff; false confines the caller to `chapterIds`. */
  all: boolean;
  chapterIds: string[];
};

@Injectable()
export class MemberService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(MemberReferenceContact)
    private readonly referenceRepo: Repository<MemberReferenceContact>,
    @InjectRepository(SpouseProfile) private readonly spouseRepo: Repository<SpouseProfile>,
    @InjectRepository(ChildProfile) private readonly childRepo: Repository<ChildProfile>,
    private readonly visibility: ProfileVisibilityService,
    private readonly gates: MemberGateService,
    private readonly referenceData: ReferenceDataService,
    private readonly audit: AuditService,
  ) {}

  /**
   * What this caller may see.
   *
   * Chapter scoping is a restriction on **Chapter Leads specifically**
   * (IAM-10 / CHP-03) — they administer one region and must not see another's.
   * It is not a restriction on ordinary members: §3.2's Tier 2 makes every
   * non-financial field readable by every authenticated member, so scoping the
   * directory by chapter would silently empty it for the whole community.
   *
   * A lead who also holds a global role (say a Chapter Lead who is also
   * General Secretary) is not scoped — the wider grant wins.
   */
  async scopeFor(viewer: AuthenticatedUser): Promise<ChapterScope> {
    const roles = viewer.roles ?? [];
    const isChapterLead = roles.includes(CHAPTER_LEAD_ROLE);
    const hasWiderRole = roles.some(
      (role) => STAFF_ROLES.includes(role) && role !== CHAPTER_LEAD_ROLE,
    );
    if (!isChapterLead || hasWiderRole) return { all: true, chapterIds: [] };

    const own = await this.memberRepo.findOne({
      where: { userId: viewer.id },
      select: { id: true, chapterId: true },
    });
    return { all: false, chapterIds: own?.chapterId ? [own.chapterId] : [] };
  }

  async list(
    filter: MemberListFilter,
    scope: ChapterScope,
    viewer: AuthenticatedUser,
  ): Promise<{ items: MemberSummaryDto[]; total: number }> {
    const qb = this.memberRepo
      .createQueryBuilder('m')
      .innerJoin(User, 'u', 'u.id = m.user_id')
      .addSelect('u.email', 'u_email');

    if (!scope.all) {
      if (scope.chapterIds.length === 0) return { items: [], total: 0 };
      qb.andWhere('m.chapterId IN (:...chapterIds)', { chapterIds: scope.chapterIds });
    }
    // DIR-09: the directory lists only active members. Pending, rejected,
    // archived and approved-but-unpaid records are administrative, so a viewer
    // without a reviewing permission never sees them — enforced here rather
    // than left to a query parameter the client could simply omit.
    const canSeeInactive =
      viewer.permissions?.includes(PORTAL_PERMISSIONS.REGISTRATION_READ) === true ||
      viewer.permissions?.includes(PORTAL_PERMISSIONS.MEMBERS_WRITE) === true;

    if (!canSeeInactive) {
      qb.andWhere('m.isActive = :onlyActive', { onlyActive: true });
    } else {
      if (filter.status) qb.andWhere('m.status = :status', { status: filter.status });
      if (filter.isActive !== undefined) {
        qb.andWhere('m.isActive = :isActive', { isActive: filter.isActive });
      }
    }
    if (filter.chapterId) qb.andWhere('m.chapterId = :chapterId', { chapterId: filter.chapterId });
    if (filter.gotra) qb.andWhere('m.gotra = :gotra', { gotra: filter.gotra });
    if (filter.caste) qb.andWhere('m.caste = :caste', { caste: filter.caste });
    if (filter.membershipTier) qb.andWhere('m.membershipTier = :tier', { tier: filter.membershipTier });
    if (filter.search) {
      const term = `%${filter.search.toLowerCase()}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('LOWER(m.firstName) LIKE :term', { term })
            .orWhere('LOWER(m.lastName) LIKE :term', { term })
            .orWhere('LOWER(u.email) LIKE :term', { term })
            .orWhere('m.phone LIKE :term', { term })
            .orWhere('LOWER(m.publicMemberId) LIKE :term', { term });
        }),
      );
    }

    const total = await qb.getCount();
    const rows = await qb
      .orderBy('m.createdAt', 'DESC')
      .take(clampPage(filter.limit, 25, 200))
      .skip(clampPage(filter.offset, 0, Number.MAX_SAFE_INTEGER))
      .getRawAndEntities();

    const emails = new Map<string, string>();
    rows.raw.forEach((raw: Record<string, unknown>, index: number) => {
      const entity = rows.entities[index];
      if (entity) emails.set(entity.id, String(raw.u_email ?? ''));
    });

    return {
      items: rows.entities.map((m) => this.visibility.toSummary(m, emails.get(m.id) ?? '')),
      total,
    };
  }

  private async mustFind(id: string): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return member;
  }

  private assertInScope(member: Member, scope: ChapterScope): void {
    if (scope.all) return;
    if (!member.chapterId || !scope.chapterIds.includes(member.chapterId)) {
      // 404 rather than 403: telling a Chapter Lead that a member exists in a
      // region they cannot see is itself a disclosure.
      throw new NotFoundException(`Member ${member.id} not found`);
    }
  }

  async detail(
    id: string,
    viewer: AuthenticatedUser,
    scope: ChapterScope,
  ): Promise<MemberDetailDto> {
    const member = await this.mustFind(id);
    if (member.userId !== viewer.id) this.assertInScope(member, scope);

    const user = await this.userRepo.findOne({
      where: { id: member.userId },
      select: { id: true, email: true },
    });
    const [references, spouse, children] = await Promise.all([
      this.referenceRepo.find({ where: { memberId: id }, order: { sequence: 'ASC' } }),
      this.spouseRepo.findOne({ where: { memberId: id } }),
      this.childRepo.find({ where: { memberId: id }, order: { sequence: 'ASC' } }),
    ]);

    return this.visibility.toDetail(member, user?.email ?? '', viewer, {
      references: references.map((r) => ({
        sequence: r.sequence,
        name: r.name,
        phone: r.phone,
        isVerified: r.isVerified,
      })),
      spouse: spouse
        ? {
            firstName: spouse.firstName,
            middleName: spouse.middleName,
            lastName: spouse.lastName,
            caste: spouse.caste,
            gotra: spouse.gotra,
            thikana: spouse.thikana,
            nanihal: spouse.nanihal,
            email: spouse.email,
            phone: spouse.phone,
            dateOfBirth: spouse.dateOfBirth,
            industry: spouse.industry,
            education: spouse.education,
          }
        : null,
      children: children.map((c) => ({
        id: c.id,
        sequence: c.sequence,
        firstName: c.firstName,
        middleName: c.middleName,
        lastName: c.lastName,
        gender: c.gender,
        dateOfBirth: c.dateOfBirth,
        educationLevel: c.educationLevel,
        achievements: c.achievements,
        membershipTier: c.membershipTier,
      })),
    });
  }

  async byUserId(userId: number): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) throw new NotFoundException('No member record for this account');
    return member;
  }

  /**
   * The member's own view of the three gates (REG-13).
   *
   * Returns the same shape as the 403 body so the status page and a blocked API
   * call cannot describe the same situation differently.
   */
  async statusFor(viewer: AuthenticatedUser): Promise<MemberStatusDto> {
    const member = await this.byUserId(viewer.id);
    const user = await this.userRepo.findOne({
      where: { id: viewer.id },
      select: { id: true, isActive: true },
    });
    const decision = this.gates.evaluate(member, user?.isActive ?? false);
    const { duesCents } = await this.referenceData.duesForTier(member.membershipTier);

    return {
      memberId: member.id,
      status: member.status,
      isActive: member.isActive,
      gates: decision.gates,
      blockedBy: decision.code,
      message: decision.body ? String(decision.body.message) : null,
      infoRequest: member.infoRequestMessage,
      rejectionReason: member.rejectionReason,
      publicMemberId: member.publicMemberId,
      membershipTier: member.membershipTier,
      duesCents,
    };
  }

  /** Self-service privacy controls (MP-19). */
  async updatePrivacy(
    viewer: AuthenticatedUser,
    input: {
      directoryOptIn?: boolean;
      fieldVisibility?: Record<string, 'visible' | 'hidden'>;
      eventEmailOptIn?: boolean;
    },
  ): Promise<MemberStatusDto> {
    const member = await this.byUserId(viewer.id);
    if (input.directoryOptIn !== undefined) member.directoryOptIn = input.directoryOptIn;
    if (input.fieldVisibility) member.fieldVisibility = input.fieldVisibility;
    if (input.eventEmailOptIn !== undefined) member.eventEmailOptIn = input.eventEmailOptIn;
    await this.memberRepo.save(member);
    return this.statusFor(viewer);
  }

  /**
   * Apply a profile edit (MP-01 / MP-14).
   *
   * Administrative fields are stripped for a caller without `members:write`, so
   * the same method serves both the self-service and the admin route without a
   * second code path that could drift.
   */
  async applyProfileUpdate(
    id: string,
    dto: UpdateMemberDto,
    viewer: AuthenticatedUser,
  ): Promise<Member> {
    const member = await this.mustFind(id);
    const isAdmin = viewer.permissions?.includes(PORTAL_PERMISSIONS.MEMBERS_WRITE) === true;

    if (member.userId !== viewer.id && !isAdmin) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You may only edit your own profile.',
      });
    }

    const patch: Record<string, unknown> = { ...dto };
    if (!isAdmin) {
      delete patch.membershipTier;
      delete patch.chapterId;
      delete patch.reviewerNotes;
    }

    // No foreign key protects these, so validate them here (see
    // ReferenceDataService for why codes are stored rather than FKs).
    await this.referenceData.assertValid('gotra', patch.gotra as string);
    await this.referenceData.assertValid('caste', patch.caste as string);
    await this.referenceData.assertValid('honorific', patch.honorific as string);
    if (isAdmin) {
      await this.referenceData.assertValid('membership_tier', patch.membershipTier as string);
    }

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      const current = (member as unknown as Record<string, unknown>)[key];
      if (current === value) continue;
      before[key] = current;
      after[key] = value;
      (member as unknown as Record<string, unknown>)[key] = value;
    }

    // An explicit chapter beats the state-derived one from then on (MP-08).
    if (after.chapterId !== undefined) member.chapterIsOverridden = true;

    if (Object.keys(after).length === 0) return member;

    await this.memberRepo.save(member);
    await this.audit.record({
      actorUserId: viewer.id,
      actorRoles: viewer.roles,
      action: member.userId === viewer.id ? 'member.profile.self_edit' : 'member.profile.admin_edit',
      entityType: 'member',
      entityId: member.id,
      before,
      after,
    });
    return member;
  }

  /** Members in a given set of statuses — the admin cohort views (REG-19). */
  async cohort(statuses: string[], scope: ChapterScope): Promise<Member[]> {
    const where: Record<string, unknown> = { status: In(statuses) };
    if (!scope.all) {
      if (scope.chapterIds.length === 0) return [];
      where.chapterId = In(scope.chapterIds);
    }
    return this.memberRepo.find({ where: where as never, order: { createdAt: 'ASC' } });
  }

  static assertCanOverridePayment(viewer: AuthenticatedUser): void {
    if (!viewer.permissions?.includes(PORTAL_PERMISSIONS.REGISTRATION_PAYMENT_OVERRIDE)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to change payment status.',
      });
    }
  }
}
