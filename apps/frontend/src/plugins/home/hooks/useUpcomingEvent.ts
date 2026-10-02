import { useEffect, useState } from 'react';
import { PortalEventsService, type EventSummaryDto } from '@helix-x-rawla/client-sdk';

/**
 * The next event a member can still register for (HOM-02), or null.
 *
 * Only asked when `enabled` — the caller passes whether the visitor is signed
 * in and may read events, so a signed-out visitor to the public landing page
 * makes no request at all. Any failure reads as "nothing to show": the
 * landing page must never break on this.
 */
export function useUpcomingEvent(enabled: boolean): EventSummaryDto | null {
  const [event, setEvent] = useState<EventSummaryDto | null>(null);

  useEffect(() => {
    if (!enabled) {
      setEvent(null);
      return;
    }
    let cancelled = false;
    PortalEventsService.getNextUpcomingEvent()
      .then((result) => !cancelled && setEvent(result.event ?? null))
      .catch(() => !cancelled && setEvent(null));
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return event;
}
