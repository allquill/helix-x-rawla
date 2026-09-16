import type { GateCode, MemberStatus } from '../constants';
import { TERMINAL_STATUSES } from '../constants';

/** The three activation gates, as the API reports them (§6.1). */
export type Gates = {
  emailVerified: boolean;
  approved: boolean;
  paymentMade: boolean;
};

export type GateInput = {
  status: MemberStatus;
  isEmailVerified: boolean;
  isApproved: boolean;
  isPaymentMade: boolean;
  /** The framework's own account switch — an archived account fails regardless. */
  userIsActive: boolean;
  /** ADM-11 kill-switch: when false the payment gate counts as satisfied. */
  paymentRequired: boolean;
};

/**
 * The activation conjunction (MP-22 / REG-15).
 *
 * Pure on purpose: this is the one rule the whole portal hangs off, and it is
 * far easier to trust when it can be exhaustively tested without a database.
 *
 * The gates may close in any order — the account activates when the last one
 * closes. Clearing any of them on a live member drops activation immediately.
 */
export function computeIsActive(input: GateInput): boolean {
  if (!input.userIsActive) return false;
  if (TERMINAL_STATUSES.includes(input.status)) return false;
  if (!input.isEmailVerified) return false;
  if (!input.isApproved) return false;
  if (input.paymentRequired && !input.isPaymentMade) return false;
  return true;
}

export function gatesOf(input: GateInput): Gates {
  return {
    emailVerified: input.isEmailVerified,
    approved: input.isApproved,
    // With the kill-switch off, the payment gate genuinely is satisfied — say so
    // rather than showing the member an outstanding step they cannot action.
    paymentMade: input.isPaymentMade || !input.paymentRequired,
  };
}

/**
 * The first failing gate, in the precedence order of §6.1.
 *
 * Returns the one thing that actually unblocks the member next, rather than the
 * full list — a member who is both unverified and unpaid can only act on the
 * verification, so that is what they are told.
 *
 * `INVALID_CREDENTIALS` and `ACCOUNT_LOCKED` sit above these but are raised by
 * the framework's `AuthService` before any of this runs.
 */
export function firstFailingGate(input: GateInput): GateCode | null {
  if (!input.userIsActive) return 'ACCOUNT_ARCHIVED';
  if (input.status === 'archived') return 'ACCOUNT_ARCHIVED';
  if (input.status === 'rejected') return 'REGISTRATION_REJECTED';
  if (!input.isEmailVerified) return 'EMAIL_NOT_VERIFIED';
  if (input.status === 'info_requested') return 'INFO_REQUESTED';
  if (!input.isApproved) return 'ACCOUNT_PENDING_APPROVAL';
  if (input.paymentRequired && !input.isPaymentMade) return 'PAYMENT_REQUIRED';
  return null;
}

type Remediation = { action: string; href: string };

const REMEDIATIONS: Record<GateCode, Remediation> = {
  INVALID_CREDENTIALS: { action: 'retry_or_reset', href: '/forgot-password' },
  ACCOUNT_LOCKED: { action: 'wait_or_contact_admin', href: '/forgot-password' },
  ACCOUNT_ARCHIVED: { action: 'contact_membership_secretary', href: '/join/status' },
  REGISTRATION_REJECTED: { action: 'reapply', href: '/join/status' },
  EMAIL_NOT_VERIFIED: { action: 'resend_verification', href: '/verify-email' },
  INFO_REQUESTED: { action: 'open_info_request', href: '/join/status' },
  ACCOUNT_PENDING_APPROVAL: { action: 'view_status', href: '/join/status' },
  PAYMENT_REQUIRED: { action: 'pay_dues', href: '/join/status' },
};

const MESSAGES: Record<GateCode, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  ACCOUNT_LOCKED:
    'Too many failed sign-in attempts. Try again later, or contact an administrator.',
  ACCOUNT_ARCHIVED:
    'This account is no longer active. Please contact the Membership Secretary.',
  REGISTRATION_REJECTED: 'Your membership application was not approved.',
  EMAIL_NOT_VERIFIED: 'Verify your email address to continue.',
  INFO_REQUESTED:
    'The Membership Secretary has asked for more information before your application can proceed.',
  ACCOUNT_PENDING_APPROVAL:
    'Your application is with the Membership Secretary for review.',
  PAYMENT_REQUIRED: 'Your membership dues are outstanding.',
};

/** The §6.1 response body: stable code, human message, remediation, progress. */
export function buildGateBody(
  code: GateCode,
  input: GateInput,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    code,
    message: MESSAGES[code],
    remediation: REMEDIATIONS[code],
    gates: gatesOf(input),
    ...extra,
  };
}

/**
 * The status implied by the gates, for the transitions activation itself owns.
 *
 * Only the three activation-driven states are returned. Vetting states
 * (`pending`, `in_review`, `info_requested`, `rejected`) are set by reviewers
 * and must never be overwritten from here.
 */
export function derivedStatus(
  input: GateInput,
  current: MemberStatus,
): MemberStatus {
  if (TERMINAL_STATUSES.includes(current)) return current;
  if (computeIsActive(input)) {
    // Preserve the "secured" marker set by a completed password reset.
    return current === 'active_secured' ? 'active_secured' : 'active';
  }
  if (input.isApproved) return 'approved_awaiting_payment';
  if (!input.isEmailVerified) return 'pending_email_verification';
  return current === 'pending_email_verification' ? 'pending' : current;
}
