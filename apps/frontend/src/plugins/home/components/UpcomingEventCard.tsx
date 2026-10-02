import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button } from '@helix-x/design-system';
import { useUser } from '@helix-x/web';
import { useUpcomingEvent } from '../hooks/useUpcomingEvent';

export type UpcomingEventCardProps = { className?: string };

/**
 * A highlight of the next upcoming open event, for signed-in members (HOM-02).
 *
 * It renders nothing at all — no empty card — when the visitor is signed out,
 * may not read events, the Events feature is switched off, or nothing is
 * coming up. `/events/:id` belongs to the `events` plugin; this only links to
 * it, and reads the event through the shared client.
 */
export const UpcomingEventCard = forwardRef<HTMLElement, UpcomingEventCardProps>(
  ({ className = '' }, ref) => {
    const user = useUser();
    const enabled =
      import.meta.env.VITE_FEATURE_EVENTS !== 'false' &&
      user?.permissions?.includes('events:read') === true;
    const event = useUpcomingEvent(enabled);
    if (!event) return null;

    const when = new Intl.DateTimeFormat('en-US', {
      timeZone: event.timezone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(event.startsAt));
    const [y = 1970, m = 1, d = 1] = event.registrationClosesOn.split('-').map(Number);
    const closes = new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(y, m - 1, d));

    return (
      <section
        ref={ref}
        aria-labelledby="upcoming-event-title"
        className={['bg-white py-10 dark:bg-gray-950', className].join(' ')}
      >
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50 dark:bg-gray-900">
            <div>
              <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Coming up
                {event.chapterName && <Badge>{event.chapterName}</Badge>}
              </p>
              <h2 id="upcoming-event-title" className="mt-1 text-xl font-semibold text-gray-900 dark:text-gray-100">
                {event.title}
              </h2>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                {when}
                {event.venue ? ` · ${event.venue}` : ''}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Register by {closes}.</p>
            </div>
            <Link to={`/events/${event.id}`} className="shrink-0">
              <Button>View and register</Button>
            </Link>
          </div>
        </div>
      </section>
    );
  },
);

UpcomingEventCard.displayName = 'UpcomingEventCard';
