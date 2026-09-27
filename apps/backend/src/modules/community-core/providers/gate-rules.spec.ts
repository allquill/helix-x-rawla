import {
  blocksLogin,
  computeIsActive,
  derivedStatus,
  firstFailingGate,
  gatesOf,
  type GateInput,
} from './gate-rules';

/**
 * The activation conjunction and the §6.1 precedence ladder.
 *
 * These are pure functions precisely so they can be pinned down exhaustively
 * here: they are the one rule the whole portal hangs off, they are consulted by
 * two separate callers (the login hook and the request interceptor) that must
 * never disagree, and a mistake in either direction is severe — an unapproved
 * applicant admitted, or a paid-up member locked out.
 */
const base: GateInput = {
  status: 'active',
  isEmailVerified: true,
  isApproved: true,
  isPaymentMade: true,
  userIsActive: true,
  paymentRequired: true,
};

describe('computeIsActive', () => {
  it('is true only when every gate is closed', () => {
    expect(computeIsActive(base)).toBe(true);
  });

  it.each([
    ['email unverified', { isEmailVerified: false }],
    ['not approved', { isApproved: false }],
    ['unpaid', { isPaymentMade: false }],
    ['account disabled', { userIsActive: false }],
    ['rejected', { status: 'rejected' as const }],
    ['archived', { status: 'archived' as const }],
  ])('is false when %s', (_label, patch) => {
    expect(computeIsActive({ ...base, ...patch })).toBe(false);
  });

  it('treats the payment gate as satisfied when dues are switched off (ADM-11)', () => {
    const noDues = { ...base, isPaymentMade: false, paymentRequired: false };
    expect(computeIsActive(noDues)).toBe(true);
    expect(gatesOf(noDues).paymentMade).toBe(true);
  });

  it('closes in any order — the last gate activates the account', () => {
    const approvedFirst = { ...base, isPaymentMade: false };
    const paidFirst = { ...base, isApproved: false };
    expect(computeIsActive(approvedFirst)).toBe(false);
    expect(computeIsActive(paidFirst)).toBe(false);
    expect(computeIsActive({ ...approvedFirst, isPaymentMade: true })).toBe(true);
    expect(computeIsActive({ ...paidFirst, isApproved: true })).toBe(true);
  });
});

describe('firstFailingGate — §6.1 precedence', () => {
  it('returns null when nothing blocks', () => {
    expect(firstFailingGate(base)).toBeNull();
  });

  it('reports the FIRST failure, not all of them', () => {
    // Unverified *and* unpaid: the member can only act on the verification.
    const both = { ...base, isEmailVerified: false, isPaymentMade: false };
    expect(firstFailingGate(both)).toBe('EMAIL_NOT_VERIFIED');
  });

  it('ranks archived above every application state', () => {
    expect(
      firstFailingGate({ ...base, status: 'archived', isEmailVerified: false }),
    ).toBe('ACCOUNT_ARCHIVED');
  });

  it('ranks a disabled account above its member status', () => {
    expect(firstFailingGate({ ...base, userIsActive: false })).toBe('ACCOUNT_ARCHIVED');
  });

  it('ranks rejection above verification', () => {
    expect(
      firstFailingGate({ ...base, status: 'rejected', isEmailVerified: false }),
    ).toBe('REGISTRATION_REJECTED');
  });

  it('ranks an information request above pending approval', () => {
    expect(
      firstFailingGate({ ...base, status: 'info_requested', isApproved: false }),
    ).toBe('INFO_REQUESTED');
  });

  it('ranks pending approval above unpaid dues', () => {
    expect(
      firstFailingGate({ ...base, isApproved: false, isPaymentMade: false }),
    ).toBe('ACCOUNT_PENDING_APPROVAL');
  });

  it('reports unpaid dues last', () => {
    expect(firstFailingGate({ ...base, isPaymentMade: false })).toBe('PAYMENT_REQUIRED');
  });

  it('does not block on dues when the kill-switch is off', () => {
    expect(
      firstFailingGate({ ...base, isPaymentMade: false, paymentRequired: false }),
    ).toBeNull();
  });
});

describe('derivedStatus', () => {
  it('never overwrites a reviewer-owned state', () => {
    for (const status of ['rejected', 'archived'] as const) {
      expect(derivedStatus({ ...base, status }, status)).toBe(status);
    }
  });

  it('moves an approved but unpaid member to awaiting payment', () => {
    const input = { ...base, isPaymentMade: false, status: 'pending' as const };
    expect(derivedStatus(input, 'pending')).toBe('approved_awaiting_payment');
  });

  it('moves a verified applicant into the vetting queue', () => {
    const input = {
      ...base,
      isApproved: false,
      isPaymentMade: false,
      status: 'pending_email_verification' as const,
    };
    expect(derivedStatus(input, 'pending_email_verification')).toBe('pending');
  });

  it('keeps an unverified applicant out of the vetting queue', () => {
    const input = {
      ...base,
      isEmailVerified: false,
      isApproved: false,
      isPaymentMade: false,
      status: 'pending' as const,
    };
    expect(derivedStatus(input, 'pending')).toBe('pending_email_verification');
  });

  it('does not revoke an approval when an active member changes their email', () => {
    // MP-24 clears `isEmailVerified`, which drops `isActive` — but the approval
    // itself still stands, so the member must not be thrown back into the
    // vetting queue. The closed gate is what blocks them, and §6.1 reports it.
    const emailChanged = { ...base, isEmailVerified: false };
    expect(derivedStatus(emailChanged, 'active')).toBe('approved_awaiting_payment');
    expect(computeIsActive(emailChanged)).toBe(false);
    expect(firstFailingGate(emailChanged)).toBe('EMAIL_NOT_VERIFIED');
  });

  it('preserves the secured marker set by a password reset', () => {
    expect(derivedStatus({ ...base, status: 'active_secured' }, 'active_secured')).toBe(
      'active_secured',
    );
  });
});

describe('blocksLogin', () => {
  it.each(['ACCOUNT_ARCHIVED', 'REGISTRATION_REJECTED', 'EMAIL_NOT_VERIFIED'] as const)(
    'refuses a session for %s',
    (code) => {
      expect(blocksLogin(code)).toBe(true);
    },
  );

  it.each(['PAYMENT_REQUIRED', 'ACCOUNT_PENDING_APPROVAL', 'INFO_REQUESTED'] as const)(
    'lets %s sign in, to be worked through on the exempt routes',
    (code) => {
      expect(blocksLogin(code)).toBe(false);
    },
  );

  it('lets an active member in', () => {
    expect(blocksLogin(null)).toBe(false);
  });

  it('lets a verified, unpaid, unapproved applicant in', () => {
    const applicant = { ...base, status: 'pending' as const, isApproved: false, isPaymentMade: false };
    expect(blocksLogin(firstFailingGate(applicant))).toBe(false);
  });
});
