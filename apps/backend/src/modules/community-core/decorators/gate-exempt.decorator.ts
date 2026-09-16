import { SetMetadata } from '@nestjs/common';

export const GATE_EXEMPT_KEY = 'community:gate-exempt';

/**
 * Let a route through the activation gates for an authenticated but inactive
 * member.
 *
 * IAM-14 confines such a member to a specific, small set: their own status
 * page, their own profile, email verification and the dues payment flow. Adding
 * this to anything else hands portal access to someone who has not been
 * approved — so keep the set exactly as the requirement lists it.
 */
export const GateExempt = () => SetMetadata(GATE_EXEMPT_KEY, true);
