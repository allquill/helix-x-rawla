import { forwardRef } from 'react';
import { Badge } from '@helix-x/design-system';

export type GateBadgesProps = {
  isEmailVerified: boolean;
  isApproved: boolean;
  isPaymentMade: boolean;
  isActive: boolean;
  className?: string;
};

/**
 * The three gates at a glance, for a queue row (MP §4.4).
 *
 * Shows all three rather than only the overall state, because "approved but
 * unpaid" and "paid but unapproved" need different actions from the reviewer
 * and are indistinguishable from a single Active/Inactive badge.
 */
export const GateBadges = forwardRef<HTMLDivElement, GateBadgesProps>(
  ({ isEmailVerified, isApproved, isPaymentMade, isActive, className = '' }, ref) => (
    <div ref={ref} className={['flex flex-wrap gap-1', className].join(' ')}>
      <Badge variant={isEmailVerified ? 'success' : 'default'}>
        {isEmailVerified ? 'Verified' : 'Unverified'}
      </Badge>
      <Badge variant={isApproved ? 'success' : 'default'}>
        {isApproved ? 'Approved' : 'Unapproved'}
      </Badge>
      <Badge variant={isPaymentMade ? 'success' : 'default'}>
        {isPaymentMade ? 'Paid' : 'Unpaid'}
      </Badge>
      {isActive && <Badge variant="brand">Active</Badge>}
    </div>
  ),
);

GateBadges.displayName = 'GateBadges';
