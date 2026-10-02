import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  Pagination,
  Tabs,
} from '@helix-x/design-system';
import type { EventSummaryDto } from '@helix-x-rawla/client-sdk';
import { EventThumbnail, THUMBNAIL_FRAME } from '../components/EventThumbnail';
import { useEvents, type EventScope } from '../hooks/useEvents';
import { CATEGORY_LABELS, CLOSED_REASONS, formatMoney, formatWhen } from '../lib/format';

/** Community events, upcoming and past, as a gallery of flyers (EVT-17). */
export function EventsListPage() {
  const [scope, setScope] = useState<EventScope>('upcoming');
  const { items, total, page, pageSize, setPage, loading, error } = useEvents(scope);

  return (
    <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader title="Events" description="Gatherings, chapter events and charity drives." />

      <Tabs
        aria-label="Which events"
        className="mb-6"
        value={scope}
        onChange={(id) => setScope(id as EventScope)}
        items={[
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'past', label: 'Past' },
        ]}
      />

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="bell"
          title={scope === 'upcoming' ? 'No upcoming events' : 'No past events'}
          description={
            scope === 'upcoming'
              ? 'When an event is announced it will appear here, and you will get an invitation by email.'
              : 'Events that have taken place will be listed here.'
          }
        />
      )}

      <ul
        aria-busy={loading}
        className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
      >
        {loading
          ? Array.from({ length: 6 }, (_, index) => (
              <li key={index} aria-hidden="true" className={CARD}>
                <div className={`${THUMBNAIL_FRAME} animate-pulse bg-gray-100 dark:bg-gray-800`} />
                <div className="flex flex-col gap-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                </div>
              </li>
            ))
          : items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
      </ul>
      {loading && <p className="sr-only" aria-live="polite">Loading events…</p>}

      {total > pageSize && (
        <Pagination className="mt-6" page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      )}
    </div>
  );
}

const CARD =
  'overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900';

/**
 * One event in the gallery: the flyer, then what and when.
 *
 * The whole card is the click target. The title is the one real control — a
 * button stretched over the card by its `::after` — so a keyboard or
 * screen-reader user meets a single, named link per event rather than a
 * clickable region with nothing to announce.
 */
function EventCard({ event }: { event: EventSummaryDto }) {
  const navigate = useNavigate();

  return (
    <article
      className={`${CARD} group relative flex h-full flex-col transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-amber-600`}
    >
      <EventThumbnail eventId={event.id} category={event.category} flyerMimeType={event.flyerMimeType} />
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge variant="brand">{CATEGORY_LABELS[event.category] ?? event.category}</Badge>
          {event.chapterName && <Badge>{event.chapterName}</Badge>}
          {event.status === 'closed' ? (
            <Badge>Closed</Badge>
          ) : event.registrationOpen ? (
            <Badge variant="success">Registration open</Badge>
          ) : (
            <Badge variant="warning">
              {CLOSED_REASONS[event.registrationClosedCode ?? ''] ?? 'Registration closed'}
            </Badge>
          )}
        </div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          <button
            type="button"
            onClick={() => navigate(`/events/${event.id}`)}
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:underline"
          >
            {event.title}
          </button>
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{formatWhen(event)}</p>
        {event.venue && <p className="text-sm text-gray-600 dark:text-gray-400">{event.venue}</p>}
        {event.fromPriceCents !== null && event.fromPriceCents !== undefined && (
          <p className="mt-auto pt-3 text-sm font-medium text-gray-900 dark:text-gray-100">
            {event.fromPriceCents === 0
              ? 'Free, or from free'
              : `From ${formatMoney(event.fromPriceCents, event.currency)} per person`}
          </p>
        )}
      </div>
    </article>
  );
}
