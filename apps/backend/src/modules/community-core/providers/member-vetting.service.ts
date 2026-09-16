import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Member } from '../entities/member.entity';
import { MembershipPayment } from '../entities/membership-payment.entity';
import { APPLICANT_ROLE, MEMBER_ROLE, PORTAL_TEMPLATES } from '../constants';
import type { MemberStatus } from '../constants';
import { AuditService } from './audit.service';
import { MemberActivationService } from './member-activation.service';
import { ReferenceDataService } from './reference-data.service';
import { type AuthenticatedUser, EmailNotificationService, Role, User } from '@helix-x/backend';

/** The Membership Secretary's queue and decisions (REG-09 … REG-16). */
@Injectable()
export class MemberVettingService {
  private readonly logger = new Logger(MemberVettingService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(MembershipPayment)
    private readonly paymentRepo: Repository<MembershipPayment>,
    private readonly activation: MemberActivationService,
    private readonly referenceData: ReferenceDataService,
    private readonly audit: AuditService,
    private readonly email: EmailNotificationService,
  ) {}

  private async mustFind(id: string): Promise<Member> {
    const member = await this.memberRepo.findOne({ where: { id } });
    if (!member) throw new NotFoundException(`Member ${id} not found`);
    return member;
  }

  private async emailFor(member: Member): Promise<string | null> {
    const user = await this.userRepo.findOne({
      where: { id: member.userId },
      select: { id: true, email: true },
    });
    return user?.email ?? null;
  }

  /**
   * Allocate the public Member ID (`Registration!D18`).
   *
   * Sequential from the count of already-issued ids, retried on collision — the
   * unique index is the real arbiter, so two reviewers approving at the same
   * moment cannot mint the same number.
   */
  private async allocateMemberId(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const issued = await this.memberRepo
        .createQueryBuilder('m')
        .where('m.publicMemberId IS NOT NULL')
        .getCount();
      const candidate = `RRA-${String(issued + 1 + attempt).padStart(5, '0')}`;
      const clash = await this.memberRepo.findOne({
        where: { publicMemberId: candidate },
        select: { id: true },
      });
      if (!clash) return candidate;
    }
    throw new Error('Could not allocate a Member ID after 10 attempts');
  }

  /**
   * Approve an application (REG-09).
   *
   * Approval closes one gate; it does **not** activate the account. If dues are
   * already settled the member becomes active in the same call, otherwise they
   * sit in `approved_awaiting_payment` until the second gate closes — which is
   * what makes the welcome mail fire exactly once, on whichever gate is last.
   */
  async approve(id: string, actor: AuthenticatedUser): Promise<Member> {
    const member = await this.mustFind(id);
    if (member.isApproved) return member;
    if (!member.isEmailVerified) {
      throw new BadRequestException({
        code: 'EMAIL_NOT_VERIFIED',
        message:
          'This applicant has not confirmed their email address yet, so the application is not ready for review.',
      });
    }

    const publicMemberId = member.publicMemberId ?? (await this.allocateMemberId());
    const memberRole = await this.roleRepo.findOne({ where: { name: MEMBER_ROLE } });

    await this.dataSource.transaction(async (em) => {
      const row = await em.findOne(Member, { where: { id } });
      if (!row) throw new NotFoundException(`Member ${id} not found`);

      row.isApproved = true;
      row.approvedByUserId = actor.id;
      row.approvedAt = new Date();
      row.publicMemberId = publicMemberId;
      row.joinDate = new Date().toISOString().slice(0, 10);
      row.rejectionReason = null;
      row.rejectedAt = null;
      await em.save(Member, row);

      // Swap `applicant` for `member` so the JWT carries the right role on the
      // member's next sign-in.
      const user = await em.findOne(User, { where: { id: row.userId }, relations: { roles: true } });
      if (user && memberRole) {
        user.roles = [
          ...(user.roles ?? []).filter((r) => r.name !== APPLICANT_ROLE),
          ...((user.roles ?? []).some((r) => r.name === MEMBER_ROLE) ? [] : [memberRole]),
        ];
        await em.save(User, user);
      }

      await this.activation.setStatus(id, 'approved_awaiting_payment', actor.id, 'approved', em);
    });

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'registration.approved',
      entityType: 'member',
      entityId: id,
      before: { isApproved: false },
      after: { isApproved: true, publicMemberId },
    });

    // Notifications live outside the transaction on purpose: a failure in a
    // downstream notification step must not roll back the approval.
    const { member: updated } = await this.activation.recompute(id);
    return updated;
  }

  /** Reject with a mandatory reason (REG-09). */
  async reject(id: string, reason: string, actor: AuthenticatedUser): Promise<Member> {
    if (!reason?.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A rejection reason is required.',
      });
    }
    const member = await this.mustFind(id);

    member.isApproved = false;
    member.rejectionReason = reason.trim();
    member.rejectedAt = new Date();
    await this.memberRepo.save(member);
    await this.activation.setStatus(id, 'rejected', actor.id, reason.trim());

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'registration.rejected',
      entityType: 'member',
      entityId: id,
      after: { status: 'rejected' },
      reason: reason.trim(),
    });

    const to = await this.emailFor(member);
    if (to) {
      await this.email.send({
        to,
        template: PORTAL_TEMPLATES.APPLICATION_REJECTED,
        variables: { firstName: member.firstName, reason: reason.trim() },
      });
    }
    const { member: updated } = await this.activation.recompute(id);
    return updated;
  }

  /** Ask the applicant for more information (REG-09). */
  async requestInfo(id: string, message: string, actor: AuthenticatedUser): Promise<Member> {
    if (!message?.trim()) {
      throw new BadRequestException({
        code: 'MESSAGE_REQUIRED',
        message: 'Describe what the applicant needs to provide.',
      });
    }
    const member = await this.mustFind(id);
    member.infoRequestMessage = message.trim();
    member.infoRequestedAt = new Date();
    await this.memberRepo.save(member);
    await this.activation.setStatus(id, 'info_requested', actor.id, 'information requested');

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'registration.info_requested',
      entityType: 'member',
      entityId: id,
      reason: message.trim(),
    });

    const to = await this.emailFor(member);
    if (to) {
      await this.email.send({
        to,
        template: PORTAL_TEMPLATES.INFO_REQUESTED,
        variables: { firstName: member.firstName, message: message.trim() },
      });
    }
    return this.mustFind(id);
  }

  /** Move an application into review, so the queue shows who is looking at it. */
  async startReview(id: string, actor: AuthenticatedUser): Promise<Member> {
    const member = await this.mustFind(id);
    if (member.status === 'pending') {
      await this.activation.setStatus(id, 'in_review', actor.id, 'review started');
    }
    return this.mustFind(id);
  }

  /**
   * Set or clear the payment gate by hand (REG-16).
   *
   * For cheque, Zelle, cash, waived dues, honorary and complimentary
   * memberships. The reason is mandatory — a gate moved without one is
   * unauditable, and clearing this flag deactivates a live member.
   */
  async setPaymentStatus(
    id: string,
    input: { isPaymentMade: boolean; reason: string },
    actor: AuthenticatedUser,
  ): Promise<Member> {
    if (!input.reason?.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required when setting or clearing the payment status.',
      });
    }

    const member = await this.mustFind(id);
    const before = member.isPaymentMade;
    if (before === input.isPaymentMade) return member;

    const { duesCents, currency } = await this.referenceData.duesForTier(member.membershipTier);

    member.isPaymentMade = input.isPaymentMade;
    member.paymentOverrideByUserId = actor.id;
    member.paymentOverrideReason = input.reason.trim();
    member.paymentOverrideAt = new Date();
    member.paymentSettledAt = input.isPaymentMade ? new Date() : null;
    await this.memberRepo.save(member);

    await this.paymentRepo.save(
      this.paymentRepo.create({
        memberId: id,
        tier: member.membershipTier,
        amountCents: duesCents,
        currency,
        status: input.isPaymentMade ? 'admin_override' : 'refunded',
        reason: input.reason.trim(),
        recordedByUserId: actor.id,
        settledAt: input.isPaymentMade ? new Date() : null,
      }),
    );

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'member.payment_status.override',
      entityType: 'member',
      entityId: id,
      before: { isPaymentMade: before },
      after: { isPaymentMade: input.isPaymentMade },
      reason: input.reason.trim(),
    });

    const { member: updated } = await this.activation.recompute(id);
    return updated;
  }

  /** Mark an address verified by hand (REG-23) — in-person onboarding, mail filters. */
  async overrideEmailVerification(
    id: string,
    reason: string,
    actor: AuthenticatedUser,
  ): Promise<Member> {
    if (!reason?.trim()) {
      throw new BadRequestException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required to mark an address verified manually.',
      });
    }
    await this.mustFind(id);
    await this.activation.markEmailVerified(id, {
      via: 'admin_override',
      actorUserId: actor.id,
      reason: reason.trim(),
    });
    return this.mustFind(id);
  }

  /** Archive without clearing the gates, so reinstatement needs no re-payment. */
  async archive(id: string, actor: AuthenticatedUser, reason?: string): Promise<Member> {
    const member = await this.mustFind(id);
    member.archivedAt = new Date();
    member.archivedByUserId = actor.id;
    await this.memberRepo.save(member);
    await this.activation.setStatus(id, 'archived', actor.id, reason ?? 'archived');

    await this.userRepo.update({ id: member.userId }, { isActive: false });
    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'member.archived',
      entityType: 'member',
      entityId: id,
      reason: reason ?? null,
    });
    const { member: updated } = await this.activation.recompute(id);
    return updated;
  }

  async reinstate(id: string, actor: AuthenticatedUser): Promise<Member> {
    const member = await this.mustFind(id);
    member.archivedAt = null;
    member.archivedByUserId = null;
    await this.memberRepo.save(member);
    await this.userRepo.update({ id: member.userId }, { isActive: true });

    // The gates were never cleared, so `recompute` restores whichever state
    // they actually justify — active if all three still hold.
    const nextStatus: MemberStatus = member.isApproved ? 'approved_awaiting_payment' : 'pending';
    await this.activation.setStatus(id, nextStatus, actor.id, 'reinstated');

    await this.audit.record({
      actorUserId: actor.id,
      actorRoles: actor.roles,
      action: 'member.reinstated',
      entityType: 'member',
      entityId: id,
    });
    const { member: updated } = await this.activation.recompute(id);
    return updated;
  }
}
