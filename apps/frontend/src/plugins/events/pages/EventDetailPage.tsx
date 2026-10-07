import { Link } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DescriptionList,
} from '@helix-x/web/design-system';
import type { EventDetailDto, EventParticipantDto, EventRegistrationDto } from '@helix-x-rawla/client-sdk';
import { EventFlyer } from '../components/EventFlyer';
import { useEvent, useMyRegistration } from '../hooks/useEvents';
import {
  CATEGORY_LABELS,
  CLOSED_REASONS,
  REGISTRATION_STATUS_LABELS,
  formatDay,
  formatDuration,
  formatMoney,
  formatWhen,
} from '../lib/format';

const heading = 'text-base font-semibold text-gray-900 dark:text-gray-100';

/**
 * One event (EVT-17): dates, duration, place, maximum participants, flyer,
 * fee and description — and who is taking part (EVT-21).
 *
 * `id` arrives as a prop, not from `useParams()`; see `MemberDetailPage`.
 */
export function EventDetailPage({ params }: RouteViewProps) {
  const id = params?.id;
  const { event, participants, loading, error } = useEvent(id);
  const { registration, noMemberRecord } = useMyRegistration(id);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{event?.title ?? 'Event'}</h1>
          {event && (
            <p className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="brand">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
              {event.chapterName && <Badge>{event.chapterName}</Badge>}
              {event.status === 'closed' && <Badge>Closed</Badge>}
            </p>
          )}
        </div>
        <Link to="/events">
          <Button variant="secondary">All events</Button>
        </Link>
      </div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {error && <Alert variant="error">{error}</Alert>}

      {event && (
        <div className="flex flex-col gap-6">
          <RegistrationCallout event={event} registration={registration} noMemberRecord={noMemberRecord} />

          <Card>
            <CardHeader>
              <h2 className={heading}>Details</h2>
            </CardHeader>
            <CardBody>
              <DescriptionList
                columns={2}
                items={[
                  { term: 'When', description: formatWhen(event) },
                  { term: 'Duration', description: formatDuration(event) },
                  { term: 'Location', description: event.venue },
                  {
                    term: 'Maximum participants',
                    description:
                      event.capacity === null || event.capacity === undefined
                        ? 'No maximum'
                        : `${event.capacity} (${Math.max(0, event.capacity - event.attendeeCount)} places left)`,
                  },
                  { term: 'Register by', description: formatDay(event.registrationClosesOn) },
                  { term: 'Registered so far', description: String(event.attendeeCount) },
                ]}
              />
              {event.description && (
                <p className="mt-5 whitespace-pre-line text-sm leading-6 text-gray-700 dark:text-gray-300">
                  {event.description}
                </p>
              )}
              {event.attireGuide && (
                <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">What to wear: </span>
                  <span className="whitespace-pre-line">{event.attireGuide}</span>
                </p>
              )}
              {event.photosUrl && (
                <p className="mt-4">
                  <a
                    href={event.photosUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-medium text-amber-800 underline dark:text-amber-300"
                  >
                    View the event photos
                  </a>
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h2 className={heading}>Attendance fee</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Each person is charged the ticket for their age on the day of the event.
              </p>
            </CardHeader>
            <CardBody>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {event.ticketTypes
                  .filter((type) => type.isActive)
                  .map((type) => (
                    <li key={type.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="text-gray-900 dark:text-gray-100">
                        {type.name}
                        <span className="ml-2 text-gray-500 dark:text-gray-400">{ageBand(type.minAge, type.maxAge)}</span>
                      </span>
                      <span className="flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                        {formatMoney(type.currentPriceCents, event.currency)}
                        {type.currentTier === 'early_bird' && (
                          <Badge variant="success">
                            Early bird · then {formatMoney(type.priceCents, event.currency)}
                          </Badge>
                        )}
                      </span>
                    </li>
                  ))}
              </ul>
              {(event.zelleInstructions || event.stripePaymentLink) && (
                <div className="mt-4 text-sm text-gray-700 dark:text-gray-300">
                  <p className="font-medium">Other ways to pay</p>
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
                    A payment made this way is recorded by an administrator once it is received.
                  </p>
                </div>
              )}
            </CardBody>
          </Card>

          {event.hasFlyer && event.flyerName && event.flyerMimeType && (
            <Card>
              <CardHeader>
                <h2 className={heading}>Flyer</h2>
              </CardHeader>
              <CardBody>
                <EventFlyer eventId={event.id} name={event.flyerName} mimeType={event.flyerMimeType} />
              </CardBody>
            </Card>
          )}

          <Participants participants={participants} />
        </div>
      )}
    </div>
  );
}

function ageBand(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'All ages';
  if (min == null) return `${max} and under`;
  if (max == null) return `${min} and over`;
  return `Ages ${min}–${max}`;
}

function RegistrationCallout({
  event,
  registration,
  noMemberRecord,
}: {
  event: EventDetailDto;
  registration: EventRegistrationDto | null;
  noMemberRecord: boolean;
}) {
  const live = registration && (registration.status === 'pending_payment' || registration.status === 'confirmed');

  if (live) {
    return (
      <Alert variant={registration.status === 'confirmed' ? 'success' : 'warning'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>
            Your household is registered — {REGISTRATION_STATUS_LABELS[registration.status]?.toLowerCase()}.
          </span>
          <Link to={`/events/${event.id}/registration`}>
            <Button size="sm">{registration.balanceCents > 0 ? 'View and pay' : 'View my registration'}</Button>
          </Link>
        </div>
      </Alert>
    );
  }
  if (noMemberRecord) return null;
  if (!event.registrationOpen) {
    return (
      <Alert variant="info">
        {CLOSED_REASONS[event.registrationClosedCode ?? ''] ?? 'Registration is not open.'}
      </Alert>
    );
  }
  const full =
    event.capacity !== null && event.capacity !== undefined && event.attendeeCount >= event.capacity;
  return (
    <Alert variant={full ? 'warning' : 'info'}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          {full
            ? 'This event is full.'
            : `Registration is open until ${formatDay(event.registrationClosesOn)}. Register your whole household in one go.`}
        </span>
        {!full && (
          <Link to={`/events/${event.id}/register`}>
            <Button size="sm">Register</Button>
          </Link>
        )}
      </div>
    </Alert>
  );
}

/** EVT-21: names only, grouped by household. Nothing about money is ever here. */
function Participants({ participants }: { participants: EventParticipantDto[] }) {
  const households = new Map<string, EventParticipantDto[]>();
  for (const person of participants) {
    households.set(person.householdKey, [...(households.get(person.householdKey) ?? []), person]);
  }

  return (
    <Card>
      <CardHeader>
        <h2 className={heading}>Who is taking part</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {participants.length === 0
            ? 'Nobody has registered yet.'
            : `${participants.length} ${participants.length === 1 ? 'person' : 'people'} from ${households.size} ${
                households.size === 1 ? 'household' : 'households'
              }. Members who are not in the directory are counted but not named.`}
        </p>
      </CardHeader>
      {participants.length > 0 && (
        <CardBody>
          <ul className="grid gap-3 sm:grid-cols-2">
            {[...households.entries()].map(([key, people]) => (
              <li key={key} className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-800">
                <ul className="flex flex-col gap-1">
                  {people.map((person, index) => (
                    <li key={index} className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          person.isPrivate
                            ? 'italic text-gray-500 dark:text-gray-400'
                            : 'text-gray-900 dark:text-gray-100'
                        }
                      >
                        {person.displayName}
                      </span>
                      {person.isVolunteer && <Badge variant="brand">Volunteer</Badge>}
                    </li>
                  ))}
                </ul>
                {people[0]?.chapterName && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{people[0].chapterName}</p>
                )}
              </li>
            ))}
          </ul>
        </CardBody>
      )}
    </Card>
  );
}
