import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Member } from '../entities/member.entity';
import { MemberStatusHistory } from '../entities/member-status-history.entity';
import type { MemberStatus, VerificationProvenance } from '../constants';
import {
  CHAPTER_LEAD_ROLE,
  MEMBER_ROLE,
  MEMBERSHIP_SECRETARY_ROLE,
  TERMINAL_STATUSES,
  PORTAL_TEMPLATES,
} from '../constants';
import { AuditService } from './audit.service';
import { PortalSettingsService } from './portal-settings.service';
import { computeIsActive, derivedStatus, type GateInput } from './gate-rules';
import { EmailNotificationService, User } from '@helix-x/backend';

/**
 * The **only** code permitted to write `isActive`, `activatedAt`, the three
 * gate booleans or an activation-driven status transition.
 *
 * Concentrating those writes here is what makes the derived-flag model safe:
 * every path that can move a gate ends in `recompute`, so the conjunction can
 * never be half-applied. The `CHK_member_active_implies_gates` constraint on
 * the table is the backstop — if some future code writes a gate directly and
 * skips this service, the database rejects the row rather than quietly leaving
 * a rejected applicant in the directory.
 */
@Injectable()
export class MemberActivationService {
  private readonly logger = new Logger(MemberActivationService.name);

  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly settings: PortalSettingsService,
    private readonly audit: AuditService,
    private readonly email: EmailNotificationService,
  ) {}

  private async gateInput(
    member: Member,
    manager: EntityManager,
  ): Promise<GateInput> {
    const user = await manager.findOne(User, {
      where: { id: member.userId },
      select: { id: true, isActive: true },
    });
    return {
      status: member.status,
      isEmailVerified: member.isEmailVerified,
      isApproved: member.isApproved,
      isPaymentMade: member.isPaymentMade,
      userIsActive: user?.isActive ?? false,
      paymentRequired: this.settings.paymentRequired,
    };
  }

  /**
   * Re-derive `isActive` and the activation-driven status, and stamp
   * `activatedAt` on the first false→true edge only.
   *
   * Returns whether this call is the one that activated the member, so the
   * caller can fire the welcome mail exactly once (REG-10) — "the account flips
   * to Active exactly once, on whichever gate closes second, in either order".
   */
  async recompute(
    memberId: string,
    manager?: EntityManager,
  ): Promise<{ member: Member; justActivated: boolean }> {
    const run = async (em: EntityManager) => {
      const member = await em.findOne(Member, { where: { id: memberId } });
      if (!member) throw new Error(`Member ${memberId} not found`);

      const input = await this.gateInput(member, em);
      const nextActive = computeIsActive(input);
      const nextStatus = derivedStatus(input, member.status);

      const wasActive = member.isActive;
      const previousStatus = member.status;
      const justActivated = nextActive && !wasActive;

      member.isActive = nextActive;
      member.status = nextStatus;
      if (justActivated && !member.activatedAt) {
        member.activatedAt = new Date();
      }

      await em.save(Member, member);

      if (previousStatus !== nextStatus) {
        await em.save(
          em.create(MemberStatusHistory, {
            memberId: member.id,
            fromStatus: previousStatus,
            toStatus: nextStatus,
            actorUserId: null,
            reason: 'activation gates re-evaluated',
          }),
        );
      }

      return { member, justActivated, previousStatus, nextStatus };
    };

    const result = manager
      ? await run(manager)
      : await this.dataSource.transaction(run);

    // Outside the transaction: a mail failure must never roll back a state
    // change the member has already earned.
    if (
      result.previousStatus === 'pending_email_verification' &&
      result.nextStatus === 'pending'
    ) {
      await this.onEnteredVettingQueue(result.member);
    }
    if (result.justActivated) {
      await this.onActivated(result.member);
    }
    return { member: result.member, justActivated: result.justActivated };
  }

  /**
   * REG-04, REG-08 and REG-14, fired when the application first becomes
   * reviewable.
   *
   * Deliberately here rather than at submission. Until the address is verified
   * the application is invisible to the vetting queue, so alerting a reviewer
   * then would be asking them to look at something they cannot see — and the
   * applicant would receive two emails where the spec allows one.
   */
  private async onEnteredVettingQueue(member: Member): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: member.userId } });
      if (user) {
        await this.email.send({
          to: user.email,
          template: PORTAL_TEMPLATES.APPLICATION_RECEIVED,
          variables: { firstName: member.firstName },
        });
      }

      for (const recipient of await this.reviewerRecipients(member)) {
        await this.email.send({
          to: recipient,
          template: PORTAL_TEMPLATES.NEW_APPLICATION_ALERT,
          variables: {
            applicantName: `${member.firstName} ${member.lastName}`,
            memberId: member.id,
            tier: member.membershipTier,
            chapter: member.chapterId ?? 'Unassigned',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Application ${member.id} entered the queue but alerts failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * The Membership Secretary, plus the Chapter Lead for the applicant's state
   * (REG-08 / REG-14).
   */
  private async reviewerRecipients(member: Member): Promise<string[]> {
    const reviewers = await this.userRepo
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role')
      .where('role.name IN (:...names)', {
        names: [MEMBERSHIP_SECRETARY_ROLE, ...(member.chapterId ? [CHAPTER_LEAD_ROLE] : [])],
      })
      .andWhere('user.isActive = :active', { active: true })
      .getMany();
    return [...new Set(reviewers.map((r) => r.email))];
  }

  /** REG-10: the official welcome, carrying the assigned Member ID. */
  private async onActivated(member: Member): Promise<void> {
    try {
      const user = await this.userRepo.findOne({ where: { id: member.userId } });
      if (!user) return;
      await this.email.send({
        to: user.email,
        template: PORTAL_TEMPLATES.APPLICATION_APPROVED,
        variables: {
          firstName: member.firstName,
          memberId: member.publicMemberId ?? '',
        },
      });
      await this.audit.record({
        action: 'member.activated',
        entityType: 'member',
        entityId: member.id,
        after: { isActive: true, activatedAt: member.activatedAt },
      });
    } catch (error) {
      this.logger.error(
        `Activated member ${member.id} but could not send the welcome mail: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Close the email gate (§6.2).
   *
   * Every purpose proves control of the address equally — verification, first
   * password setup and password reset all require reading the mailbox — so any
   * of them may set the flag. The provenance is recorded so the audit row can
   * name the flow that closed it.
   */
  async markEmailVerified(
    memberId: string,
    options: { via: VerificationProvenance; actorUserId?: number | null; reason?: string },
  ): Promise<void> {
    await this.dataSource.transaction(async (em) => {
      const member = await em.findOne(Member, { where: { id: memberId } });
      if (!member || member.isEmailVerified) return;

      member.isEmailVerified = true;
      member.emailVerifiedAt = new Date();
      member.emailVerificationProvenance = options.via;
      if (options.via === 'admin_override') {
        member.emailOverrideByUserId = options.actorUserId ?? null;
        member.emailOverrideReason = options.reason ?? null;
        member.emailOverrideAt = new Date();
      }
      await em.save(Member, member);

      await this.audit.record({
        actorUserId: options.actorUserId ?? null,
        action: 'member.email_verified',
        entityType: 'member',
        entityId: member.id,
        before: { isEmailVerified: false },
        after: { isEmailVerified: true, via: options.via },
        reason: options.reason ?? options.via,
      });
    });

    await this.recompute(memberId);
  }

  /**
   * Reopen the email gate after an address change (MP-24).
   *
   * Deactivates immediately: an address that has not been proven reachable is
   * not a valid destination for anything, including the mail that would tell
   * the member their account is in trouble.
   */
  async clearEmailVerification(
    memberId: string,
    actorUserId: number | null,
  ): Promise<void> {
    await this.memberRepo.update(
      { id: memberId },
      {
        isEmailVerified: false,
        emailVerifiedAt: null,
        emailVerificationProvenance: null,
      },
    );
    await this.audit.record({
      actorUserId,
      action: 'member.email_verification_cleared',
      entityType: 'member',
      entityId: memberId,
      after: { isEmailVerified: false },
      reason: 'email address changed',
    });
    await this.recompute(memberId);
  }

  /**
   * Record a reviewer-driven status move.
   *
   * Vetting states are the reviewer's to set; `recompute` never overwrites them.
   */
  async setStatus(
    memberId: string,
    toStatus: MemberStatus,
    actorUserId: number | null,
    reason?: string,
    manager?: EntityManager,
  ): Promise<void> {
    const em = manager ?? this.dataSource.manager;
    const member = await em.findOne(Member, { where: { id: memberId } });
    if (!member || member.status === toStatus) return;

    const fromStatus = member.status;
    member.status = toStatus;

    // `isActive` and `status` are coupled by CHK_member_active_implies_gates,
    // which SQLite evaluates on every row write — not at the end of the
    // request. Moving a live member into a terminal status therefore has to
    // clear the flag in the *same* save, or the UPDATE is rejected and the
    // caller gets a 500. `recompute()` would settle it a moment later, but it
    // never gets the chance.
    //
    // This is not a second opinion about activation: `computeIsActive()` already
    // treats a terminal status as inactive, so this only writes what the next
    // recompute would have written anyway.
    if (TERMINAL_STATUSES.includes(toStatus)) member.isActive = false;

    await em.save(Member, member);
    await em.save(
      em.create(MemberStatusHistory, {
        memberId,
        fromStatus,
        toStatus,
        actorUserId,
        reason: reason ?? null,
      }),
    );
  }

  /** The role name a member should hold for their current status. */
  static roleForStatus(status: MemberStatus): string | null {
    return status === 'active' || status === 'active_secured' ? MEMBER_ROLE : null;
  }
}
