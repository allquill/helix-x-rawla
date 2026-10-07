import { forwardRef, useEffect, useState } from 'react';
import type { RouteViewProps } from '@helix-x/web';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
} from '@helix-x/web/design-system';
import { GateChecklist } from '../components/GateChecklist';
import { useDuesCheckout } from '../hooks/useDuesCheckout';
import { useMembershipStatus } from '../hooks/useMembershipStatus';

export type RegistrationStatusPageProps = RouteViewProps & { className?: string };

const money = (cents?: number, currency = 'USD') =>
  cents === undefined
    ? ''
    : new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);

/** How long to wait for the provider's webhook after the browser comes back. */
const CONFIRM_POLL_MS = 2_000;
const CONFIRM_POLL_ATTEMPTS = 10;

/**
 * Where an applicant sees what is outstanding (REG-13).
 *
 * Reachable while the account is still gated — it is one of the few routes
 * IAM-14 exempts, precisely because a blocked member has nowhere else to go.
 */
export const RegistrationStatusPage = forwardRef<HTMLDivElement, RegistrationStatusPageProps>(
  ({ className = '' }, ref) => {
    const { status, loading, error, refresh } = useMembershipStatus();
    const { startCheckout, starting, error: checkoutError } = useDuesCheckout();
    const location = useLocation();
    const navigate = useNavigate();

    // Read the checkout outcome once, then drop it from the URL so a reload
    // does not re-announce a payment that happened an hour ago.
    const [outcome] = useState(
      () => new URLSearchParams(location.search).get('payment') as 'success' | 'cancelled' | null,
    );
    useEffect(() => {
      if (outcome) navigate(location.pathname, { replace: true });
    }, [outcome, navigate, location.pathname]);

    // The browser returns from checkout before the provider's webhook has
    // necessarily landed, and the gate closes on the webhook, not the return.
    // Poll briefly so the checklist catches up without a manual reload.
    const [confirmAttempts, setConfirmAttempts] = useState(0);
    const paymentMade = status?.gates.paymentMade ?? false;
    const confirming = outcome === 'success' && !paymentMade && confirmAttempts < CONFIRM_POLL_ATTEMPTS;
    useEffect(() => {
      if (!confirming || loading) return;
      const timer = setTimeout(() => {
        setConfirmAttempts((n) => n + 1);
        refresh();
      }, CONFIRM_POLL_MS);
      return () => clearTimeout(timer);
    }, [confirming, loading, refresh]);

    // Dues can be paid as soon as the address is verified — approval and
    // payment close in either order, and the account activates on the last.
    const canPay =
      status !== null &&
      status.gates.emailVerified &&
      !status.gates.paymentMade &&
      status.blockedBy !== 'REGISTRATION_REJECTED' &&
      status.blockedBy !== 'ACCOUNT_ARCHIVED';

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

            {outcome === 'success' && (
              <div className="mb-4">
                {paymentMade ? (
                  <Alert variant="success">Thank you — your dues payment has been received.</Alert>
                ) : confirming ? (
                  <Alert variant="info">Payment received — confirming with the payment provider…</Alert>
                ) : (
                  <Alert variant="warning">
                    We have not had confirmation of your payment yet. It can take a few minutes;
                    refresh this page shortly. If you were charged and this does not update,
                    contact the Finance Secretary.
                  </Alert>
                )}
              </div>
            )}
            {outcome === 'cancelled' && !paymentMade && (
              <div className="mb-4">
                <Alert variant="info">Payment cancelled — you have not been charged.</Alert>
              </div>
            )}

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

                    {canPay && (
                      <div className="mt-5 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Dues for the {status.membershipTier} tier:{' '}
                          <strong>{money(status.duesCents)}</strong>
                        </p>
                        {checkoutError && (
                          <div className="mt-3">
                            <Alert variant="error">{checkoutError}</Alert>
                          </div>
                        )}
                        <div className="mt-4">
                          <Button onClick={startCheckout} disabled={starting || confirming}>
                            {starting
                              ? 'Opening checkout…'
                              : status.duesCents
                                ? `Pay ${money(status.duesCents)} now`
                                : 'Confirm — no dues for this tier'}
                          </Button>
                        </div>
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          You will be taken to a secure payment page and brought back here afterwards.
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
