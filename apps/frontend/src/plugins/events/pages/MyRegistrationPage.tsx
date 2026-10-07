import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import { Alert, Badge, Button, Card, CardBody, CardHeader, Modal } from '@helix-x/web/design-system';
import { useEvent, useMyRegistration } from '../hooks/useEvents';
import {
  PAYMENT_METHOD_LABELS,
  REGISTRATION_STATUS_LABELS,
  apiMessage,
  formatAmount,
  formatHours,
  formatMoney,
  formatTime,
  formatWhen,
} from '../lib/format';

const heading = 'text-base font-semibold text-gray-900 dark:text-gray-100';

/**
 * The household's registration: who is on it, what is owed, and paying.
 *
 * This is also where the checkout returns to, with `?payment=success` or
 * `cancelled`. The return proves nothing — anyone can type the URL — so the
 * page shows what the server says. With Stripe the confirming webhook can
 * arrive a moment after the browser does, hence the short wait.
 */
export function MyRegistrationPage({ params, query }: RouteViewProps) {
  const id = params?.id;
  const returned = query?.get('payment');
  const { event } = useEvent(id);
  const { registration, loading, error, noMemberRecord, refresh, checkout, cancel } = useMyRegistration(id);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const owes = (registration?.balanceCents ?? 0) > 0 && registration?.status === 'pending_payment';
  const polls = useRef(0);
  useEffect(() => {
    if (returned !== 'success' || !owes || polls.current >= 6) return;
    const timer = setTimeout(() => {
      polls.current += 1;
      refresh();
    }, 2000);
    return () => clearTimeout(timer);
  }, [returned, owes, refresh, registration]);

  const run = async (action: () => Promise<void>, failed: string) => {
    setWorking(true);
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(apiMessage(err, failed));
    } finally {
      setWorking(false);
    }
  };

  const closed = event?.status === 'closed';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {event ? `My registration — ${event.title}` : 'My registration'}
          </h1>
          {event && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{formatWhen(event)}</p>}
        </div>
        {id && (
          <Link to={`/events/${id}`}>
            <Button variant="secondary">Back to the event</Button>
          </Link>
        )}
      </div>

      {loading && !registration && (
        <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>
      )}
      {error && <Alert variant="error">{error}</Alert>}
      {noMemberRecord && <Alert variant="info">Only members can register for events.</Alert>}
      {actionError && <Alert variant="error" className="mb-4">{actionError}</Alert>}

      {!loading && !error && !noMemberRecord && !registration && (
        <Alert variant="info">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>Your household is not registered for this event.</span>
            {event?.registrationOpen && (
              <Link to={`/events/${id}/register`}>
                <Button size="sm">Register</Button>
              </Link>
            )}
          </div>
        </Alert>
      )}

      {registration && (
        <div className="flex flex-col gap-6">
          {returned === 'success' && registration.status === 'confirmed' && (
            <Alert variant="success">Payment received — your registration is confirmed.</Alert>
          )}
          {returned === 'success' && owes && (
            <Alert variant="info">We are confirming your payment. This can take a moment.</Alert>
          )}
          {returned === 'cancelled' && owes && (
            <Alert variant="warning">The payment was not completed. Your places are still held.</Alert>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={heading}>Status</h2>
                <Badge
                  variant={
                    registration.status === 'confirmed'
                      ? 'success'
                      : registration.status === 'pending_payment'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {REGISTRATION_STATUS_LABELS[registration.status] ?? registration.status}
                </Badge>
              </div>
            </CardHeader>
            <CardBody>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <Amount label="Total" value={formatAmount(registration.totalCents, registration.currency)} />
                <Amount label="Paid" value={formatAmount(registration.paidCents, registration.currency)} />
                <Amount label="Balance" value={formatAmount(registration.balanceCents, registration.currency)} />
              </dl>

              {owes && !closed && (
                <div className="mt-5 flex flex-col gap-3">
                  <div>
                    <Button
                      loading={working}
                      onClick={() => run(checkout, 'The payment page could not be opened. Please try again.')}
                    >
                      Pay {formatAmount(registration.balanceCents, registration.currency)} now
                    </Button>
                  </div>
                  {(event?.zelleInstructions || event?.stripePaymentLink) && (
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-medium">Paying another way?</p>
                      {event.zelleInstructions && (
                        <p className="mt-1 whitespace-pre-line">Zelle: {event.zelleInstructions}</p>
                      )}
                      {event.stripePaymentLink && (
                        <p className="mt-1">
                          <a
                            href={event.stripePaymentLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-medium text-amber-800 underline dark:text-amber-300"
                          >
                            Pay by card on Stripe
                          </a>
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        An administrator records these once received, and this page will update.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {registration.payments.length > 0 && (
                <ul className="mt-5 divide-y divide-gray-200 border-t border-gray-200 text-sm dark:divide-gray-800 dark:border-gray-800">
                  {registration.payments.map((payment) => (
                    <li key={payment.id} className="flex flex-wrap justify-between gap-2 py-2">
                      <span className="text-gray-700 dark:text-gray-300">
                        {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                        {payment.settledAt ? ` · ${new Date(payment.settledAt).toLocaleDateString()}` : ''}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatAmount(payment.amountCents, payment.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className={heading}>People</h2>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {registration.attendees.map((attendee) => (
                  <li key={attendee.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {attendee.fullName}
                        {attendee.isVolunteer && <Badge variant="brand" className="ml-2">Volunteer</Badge>}
                      </p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {[
                          attendee.ticketTypeName,
                          attendee.dietaryPref,
                          attendee.dietaryNotes,
                          attendee.tshirtSize && `T-shirt ${attendee.tshirtSize.toUpperCase()}`,
                          ...attendee.slots.map(
                            (slot) =>
                              `${slot.activity} ${event ? formatTime(slot.startsAt, event.timezone) : ''}`.trim(),
                          ),
                          attendee.volunteerMinutes != null && `${formatHours(attendee.volunteerMinutes)} volunteered`,
                          attendee.waiverSignedAt && 'Waiver signed',
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <span className="text-gray-900 dark:text-gray-100">
                      {formatMoney(attendee.unitPriceCents, registration.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {/* EVT-23: the server decides. A paid registration has no cancel action at all. */}
          {registration.canCancel && !closed && (
            <div>
              <Button variant="danger" disabled={working} onClick={() => setConfirmingCancel(true)}>
                Cancel registration
              </Button>
            </div>
          )}
          {!registration.canCancel && registration.cancelBlockedCode === 'ALREADY_PAID' && !closed && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              A paid registration cannot be cancelled here. If your plans change, please contact an
              administrator.
            </p>
          )}
        </div>
      )}

      <Modal
        open={confirmingCancel}
        onClose={working ? () => {} : () => setConfirmingCancel(false)}
        title="Cancel this registration?"
        description="Your household's places will be released for others."
        footer={
          <>
            <Button variant="secondary" disabled={working} onClick={() => setConfirmingCancel(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={working}
              onClick={async () => {
                await run(cancel, 'The registration could not be cancelled.');
                setConfirmingCancel(false);
              }}
            >
              Cancel registration
            </Button>
          </>
        }
      />
    </div>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-base font-semibold text-gray-900 dark:text-gray-100">{value}</dd>
    </div>
  );
}
