import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from '../entities/member.entity';
import { STAFF_ROLES } from '../constants';
import { AuditService } from './audit.service';
import { MemberActivationService } from './member-activation.service';
import { MemberGateService } from './member-gate.service';
import { buildGateBody } from './gate-rules';
import { type AuthHooks, type CredentialPurpose, User } from '@helix-x/backend';

/**
 * This application's account rules, plugged into the framework's `AUTH_HOOKS`
 * seam.
 *
 * **Must not inject `AuthService`** — that is a real provider cycle
 * (`AuthService → AUTH_HOOKS → AuthService`). Anything needing `AuthService`
 * belongs in `MemberRegistrationService`, which is a different provider and may
 * inject it freely.
 */
@Injectable()
export class CommunityAuthHooksService implements AuthHooks {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly gates: MemberGateService,
    private readonly activation: MemberActivationService,
    private readonly audit: AuditService,
  ) {}

  private static isStaff(user: User): boolean {
    return (user.roles ?? []).some((role) => STAFF_ROLES.includes(role.name));
  }

  /**
   * Runs after the password has verified and the account is not locked (§6.1).
   *
   * Two things here are easy to get wrong and expensive to discover late:
   *
   * 1. **Supplying this hook disables the framework's own `!user.isActive`
   *    check** — `AuthService.login` skips its fallback whenever a hook is
   *    present. Re-asserting it here is not belt-and-braces; without it, the
   *    existing admin enable/disable switch silently stops working.
   * 2. `INVALID_CREDENTIALS` and `ACCOUNT_LOCKED` sit above these codes in the
   *    precedence ladder but are raised by `AuthService` before this runs, so
   *    they are deliberately absent below.
   */
  async assertLoginAllowed(user: User): Promise<void> {
    if (!user.isActive) {
      await this.recordBlocked(user.id, 'ACCOUNT_ARCHIVED');
      throw new ForbiddenException(
        buildGateBody('ACCOUNT_ARCHIVED', {
          status: 'archived',
          isEmailVerified: false,
          isApproved: false,
          isPaymentMade: false,
          userIsActive: false,
          paymentRequired: true,
        }),
      );
    }

    const member = await this.memberRepo.findOne({ where: { userId: user.id } });

    if (!member) {
      // Staff and service accounts legitimately hold no member record — the
      // framework's `isActive` flag alone governs them.
      if (CommunityAuthHooksService.isStaff(user)) return;

      // Anyone else without a member row reached `users` by a route that
      // bypassed the portal's registration — `POST /api/auth/register` is still
      // mounted and creates a gate-free account. Refusing them here closes that
      // hole without editing the framework.
      await this.recordBlocked(user.id, 'ACCOUNT_ARCHIVED');
      throw new ForbiddenException(
        buildGateBody('ACCOUNT_ARCHIVED', {
          status: 'archived',
          isEmailVerified: false,
          isApproved: false,
          isPaymentMade: false,
          userIsActive: true,
          paymentRequired: true,
        }),
      );
    }

    const decision = this.gates.evaluate(member, user.isActive);
    if (!decision.code) return;

    await this.recordBlocked(user.id, decision.code);
    throw new ForbiddenException(decision.body!);
  }

  /**
   * Close the email gate once a link is redeemed (§6.2).
   *
   * All three purposes prove control of the address equally, so any of them may
   * set the flag — but only for the address the account uses *now*. A token
   * issued before an email change proves control of the old mailbox; honouring
   * it would close the gate on an address nobody has demonstrated they can read.
   */
  async onTokenRedeemed(event: {
    purpose: CredentialPurpose;
    userId: number;
    destination: string;
  }): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId: event.userId } });
    if (!member || member.isEmailVerified) return;

    const user = await this.userRepo.findOne({
      where: { id: event.userId },
      select: { id: true, email: true },
    });
    if (!user || user.email !== event.destination.trim().toLowerCase()) return;

    await this.activation.markEmailVerified(member.id, { via: event.purpose });
  }

  /**
   * Record that a password now exists.
   *
   * `users.passwordHash` is `select: false` and is seeded with an unusable hash
   * at registration, so nothing else can tell whether the member ever chose one
   * — and REG-12 makes "verified address, no password set" a state reviewers
   * must be able to see.
   */
  async onPasswordChanged(event: {
    userId: number;
    via: 'reset' | 'setup' | 'change';
  }): Promise<void> {
    const member = await this.memberRepo.findOne({ where: { userId: event.userId } });
    if (!member) return;

    if (!member.passwordSetAt) {
      await this.memberRepo.update({ id: member.id }, { passwordSetAt: new Date() });
    }
    if (event.via === 'reset' && member.status === 'active') {
      await this.activation.setStatus(member.id, 'active_secured', event.userId, 'password reset');
    }

    await this.audit.record({
      actorUserId: event.userId,
      action: `member.password.${event.via}`,
      entityType: 'member',
      entityId: member.id,
    });
  }

  // `extraTokenClaims` is deliberately not implemented. Putting memberId or
  // chapterId in the JWT would freeze them for the token's lifetime, and a
  // chapter transfer or an archived membership must take effect on the next
  // request — which is exactly what the gate interceptor already reads fresh.

  private async recordBlocked(userId: number, code: string): Promise<void> {
    await this.audit.record({
      actorUserId: userId,
      action: 'auth.login_blocked',
      entityType: 'user',
      entityId: String(userId),
      after: { code },
      reason: code,
    });
  }
}
