import { useCallback, useEffect, useState } from 'react';
import {
  PortalEventsService,
  type CreateRegistrationDto,
  type EventDetailDto,
  type EventParticipantDto,
  type EventRegistrationDto,
  type EventSummaryDto,
  type RegistrationOptionsDto,
  type UpdatePreferencesDto,
} from '@helix-x-rawla/client-sdk';
import { apiStatus } from '../lib/format';

export type EventScope = 'upcoming' | 'past';

const PAGE_SIZE = 12;

/** Published events, upcoming or past, server-paged. */
export function useEvents(scope: EventScope) {
  const [items, setItems] = useState<EventSummaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setPage(1), [scope]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    PortalEventsService.listPortalEvents({
      scope,
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
    })
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setTotal(result.total);
      })
      .catch(() => !cancelled && setError('Could not load the events.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [scope, page]);

  return { items, total, page, pageSize: PAGE_SIZE, setPage, loading, error };
}

/** One event, with who is taking part (EVT-17 / EVT-21). */
export function useEvent(id: string | undefined) {
  const [event, setEvent] = useState<EventDetailDto | null>(null);
  const [participants, setParticipants] = useState<EventParticipantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, people] = await Promise.all([
        PortalEventsService.getPortalEvent({ id }),
        PortalEventsService.listEventParticipants({ id }),
      ]);
      setEvent(detail);
      setParticipants(people.items);
    } catch (err) {
      setError(apiStatus(err) === 404 ? 'This event does not exist.' : 'Could not load the event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { event, participants, loading, error, refresh };
}

/**
 * The household's registration for an event, and what it may do with it.
 *
 * A member role without a member record (staff) cannot register; the API
 * answers 409 `NO_MEMBER_RECORD`, surfaced here as `noMemberRecord` so the
 * screens can say so instead of showing an error.
 */
export function useMyRegistration(eventId: string | undefined) {
  const [registration, setRegistration] = useState<EventRegistrationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noMemberRecord, setNoMemberRecord] = useState(false);

  const refresh = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await PortalEventsService.getMyEventRegistration({ id: eventId });
      setRegistration(result.registration ?? null);
    } catch (err) {
      // 403 is a signed-in role that cannot register at all; neither is an error to show.
      if (apiStatus(err) === 409 || apiStatus(err) === 403) setNoMemberRecord(true);
      else setError('Could not load your registration.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkout = useCallback(async () => {
    const { checkoutUrl } = await PortalEventsService.startEventCheckout({ id: eventId! });
    // A full navigation: the checkout is on the payment provider's origin.
    window.location.assign(checkoutUrl);
  }, [eventId]);

  const cancel = useCallback(async () => {
    setRegistration(await PortalEventsService.cancelMyEventRegistration({ id: eventId! }));
  }, [eventId]);

  const savePreferences = useCallback(
    async (body: UpdatePreferencesDto) => {
      setRegistration(
        await PortalEventsService.updateMyEventPreferences({ id: eventId!, requestBody: body }),
      );
    },
    [eventId],
  );

  return { registration, loading, error, noMemberRecord, refresh, checkout, cancel, savePreferences };
}

/** Everything the registration form needs, in one read. */
export function useRegistrationOptions(eventId: string | undefined) {
  const [options, setOptions] = useState<RegistrationOptionsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    PortalEventsService.getEventRegistrationOptions({ id: eventId })
      .then((result) => !cancelled && setOptions(result))
      .catch((err) => {
        if (cancelled) return;
        setError(
          apiStatus(err) === 409
            ? 'Only members can register for events.'
            : apiStatus(err) === 404
              ? 'This event does not exist.'
              : 'Could not load the registration form.',
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const register = useCallback(
    (body: CreateRegistrationDto) =>
      PortalEventsService.createEventRegistration({ id: eventId!, requestBody: body }),
    [eventId],
  );

  const checkout = useCallback(async () => {
    const { checkoutUrl } = await PortalEventsService.startEventCheckout({ id: eventId! });
    window.location.assign(checkoutUrl);
  }, [eventId]);

  return { options, loading, error, register, checkout };
}
