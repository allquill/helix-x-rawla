import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@helix-x/backend';
import { Member } from '../entities/member.entity';
import type { GateCode } from '../constants';
import { PortalSettingsService } from './portal-settings.service';
import {
  buildGateBody,
  firstFailingGate,
  gatesOf,
  type GateInput,
  type Gates,
} from './gate-rules';

export type GateDecision = {
  /** Null when the account holds no member record — staff and service accounts. */
  member: Member | null;
  gates: Gates;
  /** Null when nothing blocks the caller. */
  code: GateCode | null;
  body: Record<string, unknown> | null;
};

/**
 * Evaluates the activation gates for one account.
 *
 * Shared by the login hook and the per-request interceptor, deliberately: those
 * are the two callers that must never disagree, and the surest way to keep them
 * consistent is to give them one implementation rather than two.
 */
@Injectable()
export class MemberGateService {
  constructor(
    @InjectRepository(Member) private readonly memberRepo: Repository<Member>,
    private readonly settings: PortalSettingsService,
  ) {}

  /** Build the evaluator input from a member row and the framework's user flag. */
  toInput(member: Member, userIsActive: boolean): GateInput {
    return {
      status: member.status,
      isEmailVerified: member.isEmailVerified,
      isApproved: member.isApproved,
      isPaymentMade: member.isPaymentMade,
      userIsActive,
      paymentRequired: this.settings.paymentRequired,
    };
  }

  evaluate(member: Member, userIsActive: boolean): GateDecision {
    const input = this.toInput(member, userIsActive);
    const code = firstFailingGate(input);
    return {
      member,
      gates: gatesOf(input),
      code,
      body: code
        ? buildGateBody(
            code,
            input,
            code === 'REGISTRATION_REJECTED' && member.rejectionReason
              ? { reason: member.rejectionReason }
              : code === 'INFO_REQUESTED' && member.infoRequestMessage
                ? { request: member.infoRequestMessage }
                : undefined,
          )
        : null,
    };
  }

  /**
   * Per-request read: one row on a unique index.
   *
   * Deliberately uncached. A cache would reintroduce exactly the staleness
   * IAM-14 exists to remove — "a session issued while active must not survive a
   * later deactivation, refund, email change or approval revocation" — and on
   * better-sqlite3 this lookup costs tens of microseconds.
   */
  async forUser(userId: number, userIsActive: boolean): Promise<GateDecision> {
    const member = await this.memberRepo.findOne({ where: { userId } });
    if (!member) {
      return {
        member: null,
        gates: { emailVerified: false, approved: false, paymentMade: false },
        code: null,
        body: null,
      };
    }
    return this.evaluate(member, userIsActive);
  }

  /** Lookup used by the interceptor, which only holds the JWT's user id. */
  async loadUserIsActive(
    userRepo: Repository<User>,
    userId: number,
  ): Promise<boolean> {
    const user = await userRepo.findOne({
      where: { id: userId },
      select: { id: true, isActive: true },
    });
    return user?.isActive ?? false;
  }
}
