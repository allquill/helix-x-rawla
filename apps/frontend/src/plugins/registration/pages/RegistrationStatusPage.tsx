import { forwardRef } from 'react';
import type { RouteViewProps } from '@helix-x/web';
import { Link } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
} from '@helix-x/design-system';
import { GateChecklist } from '../components/GateChecklist';
import { useMembershipStatus } from '../hooks/useMembershipStatus';

export type RegistrationStatusPageProps = RouteViewProps & { className?: string };

const money = (cents?: number, currency = 'USD') =>
  cents === undefined
    ? ''
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

/**
 * Where an applicant sees what is outstanding (REG-13).
 *
 * Reachable while the account is still gated — it is one of the few routes
 * IAM-14 exempts, precisely because a blocked member has nowhere else to go.
 */
export const RegistrationStatusPage = forwardRef<HTMLDivElement, RegistrationStatusPageProps>(
  ({ className = '' }, ref) => {
    const { status, loading, error } = useMembershipStatus();

    return (
      <div ref={ref} className={className}>
            <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
              Your membership
            </h1>

            {loading && (
              <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                Loading…
              </p>
            )}
            {error && <Alert variant="error">{error}</Alert>}

            {status && (
              <div className="flex flex-col gap-4">
                {status.rejectionReason && (
                  <Alert variant="error">
                    <strong>Your application was not approved.</strong>
                    <br />
                    {status.rejectionReason}
                  </Alert>
                )}

                {status.infoRequest && (
                  <Alert variant="warning">
                    <strong>More information needed.</strong>
                    <br />
                    {status.infoRequest}
                  </Alert>
                )}

                {status.isActive && (
                  <Alert variant="success">
                    Your membership is active
                    {status.publicMemberId ? ` — Member ID ${status.publicMemberId}` : ''}.
                  </Alert>
                )}

                <Card>
                  <CardHeader>
                    <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                      Activation steps
                    </h2>
                  </CardHeader>
                  <CardBody>
                    <GateChecklist gates={status.gates} blockedBy={status.blockedBy} />

                    {status.blockedBy === 'EMAIL_NOT_VERIFIED' && (
                      <div className="mt-5">
                        <Link to="/verify-email">
                          <Button>Resend the confirmation email</Button>
                        </Link>
                      </div>
                    )}

                    {status.blockedBy === 'PAYMENT_REQUIRED' && (
                      <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Dues for the {status.membershipTier} tier:{' '}
                          <strong>{money(status.duesCents)}</strong>
                        </p>
                        {/* Online payment is not wired up yet; the Finance
                            Secretary records offline payments by hand, which is
                            an audited override rather than a silent edit. */}
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          Online payment is not available yet. Please contact the
                          Finance Secretary to settle your dues — your membership
                          activates as soon as they record it.
                        </p>
                      </div>
                    )}

                    {status.blockedBy === 'ACCOUNT_PENDING_APPROVAL' && (
                      <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
                        Nothing further is needed from you right now. We will email
                        you when the Membership Secretary has reviewed your
                        application.
                      </p>
                    )}
                  </CardBody>
                </Card>
              </div>
            )}
          </div>
        </div>
    );
  },
);

RegistrationStatusPage.displayName = 'RegistrationStatusPage';
