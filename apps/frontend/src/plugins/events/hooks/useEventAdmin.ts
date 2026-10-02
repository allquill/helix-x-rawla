import { useCallback, useEffect, useState } from 'react';
import {
  PortalAdministrationService,
  PortalEventAdministrationService as Admin,
  PortalEventDocumentsService,
  PortalWaiversService,
  type AdminEventDto,
  type AdminEventRegistrationDto,
  type ChapterDto,
  type ClosePreviewDto,
  type CreateDonatedGoodDto,
  type CreateEventCostDto,
  type CreateEventDto,
  type CreateWaiverTemplateDto,
  type DonatedGoodDto,
  type EventCostDto,
  type EventDocumentDto,
  type EventFinanceSummaryDto,
  type EventNotificationStatusDto,
  type EventVolunteerDto,
  type PublishWaiverVersionDto,
  type RecordEventPaymentDto,
  type SlotDto,
  type UpdateEventDto,
  type UpsertSlotDto,
  type UpsertTicketTypeDto,
  type VolunteerHoursEntryDto,
  type WaiverTemplateDto,
} from '@helix-x-rawla/client-sdk';
import { apiCode, apiStatus } from '../lib/format';

const PAGE_SIZE = 25;

/** Every event, drafts included, for the people running them. */
export function useAdminEvents() {
  const [items, setItems] = useState<AdminEventDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Admin.listAdminEvents({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) })
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
  }, [page]);

  return { items, total, page, pageSize: PAGE_SIZE, setPage, loading, error };
}

/** Chapters and current waivers, for the event form's two dropdowns. */
export function useEventFormOptions() {
  const [chapters, setChapters] = useState<ChapterDto[]>([]);
  const [waivers, setWaivers] = useState<WaiverTemplateDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    PortalAdministrationService.listPortalChapters()
      .then((list) => !cancelled && setChapters(list.filter((c) => c.isActive)))
      .catch(() => undefined);
    // Needs events:waivers.manage; without it the event simply has no waiver to pick.
    PortalWaiversService.listWaiverTemplates()
      .then((list) => !cancelled && setWaivers(list.filter((w) => w.isCurrent)))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { chapters, waivers };
}

export function createEvent(body: CreateEventDto): Promise<AdminEventDto> {
  return Admin.createPortalEvent({ requestBody: body });
}

/**
 * One event and every action on it.
 *
 * Each mutation refreshes the event afterwards, so the totals, the status and
 * — once it is closed — the read-only state come from the server, not from a
 * local guess.
 */
export function useAdminEvent(id: string | undefined) {
  const [event, setEvent] = useState<AdminEventDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      setEvent(await Admin.getAdminEvent({ id }));
      setError(null);
    } catch (err) {
      setError(apiStatus(err) === 404 ? 'This event does not exist.' : 'Could not load the event.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  const then = useCallback(
    async <T,>(work: Promise<T>): Promise<T> => {
      try {
        return await work;
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  return {
    event,
    loading,
    error,
    refresh,
    update: (body: UpdateEventDto) => then(Admin.updatePortalEvent({ id: id!, requestBody: body })),
    publish: () => then(Admin.publishPortalEvent({ id: id! })),
    uploadFlyer: (file: File) => then(Admin.uploadEventFlyer({ id: id!, formData: { file } })),
    setPhotosLink: (photosUrl: string | null) =>
      then(Admin.setEventPhotosLink({ id: id!, requestBody: { photosUrl } })),
    saveTicketType: (body: UpsertTicketTypeDto, ticketTypeId?: string) =>
      then(
        ticketTypeId
          ? Admin.updateEventTicketType({ id: id!, ticketTypeId, requestBody: body })
          : Admin.createEventTicketType({ id: id!, requestBody: body }),
      ),
    deleteTicketType: (ticketTypeId: string) => then(Admin.deleteEventTicketType({ id: id!, ticketTypeId })),
    close: (hours: VolunteerHoursEntryDto[]) =>
      then(Admin.closePortalEvent({ id: id!, requestBody: { hours } })),
  };
}

/** A list that belongs to an event, reloaded on demand. */
function useEventList<T>(id: string | undefined, load: (id: string) => Promise<T>, empty: T, failed: string) {
  const [data, setData] = useState<T>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Set when the API refused the read itself: `code` of a 403, else null. */
  const [forbidden, setForbidden] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setForbidden(null);
    try {
      setData(await load(id));
    } catch (err) {
      if (apiStatus(err) === 403) setForbidden(apiCode(err) ?? 'FORBIDDEN');
      else setError(failed);
    } finally {
      setLoading(false);
    }
    // `load` is a stable module-level call in every use below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, forbidden, refresh };
}

export function useEventSlots(id: string | undefined) {
  const list = useEventList<SlotDto[]>(
    id,
    // The staff read: the member one answers 404 for a draft.
    (eventId) => Admin.listAdminEventSlots({ id: eventId }),
    [],
    'Could not load the time slots.',
  );
  const save = async (body: UpsertSlotDto, slotId?: string) => {
    await (slotId
      ? Admin.updateEventSlot({ id: id!, slotId, requestBody: body })
      : Admin.createEventSlot({ id: id!, requestBody: body }));
    await list.refresh();
  };
  const remove = async (slotId: string) => {
    await Admin.deleteEventSlot({ id: id!, slotId });
    await list.refresh();
  };
  return { ...list, slots: list.data, save, remove };
}

export function useEventRegistrations(id: string | undefined) {
  const [items, setItems] = useState<AdminEventRegistrationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await Admin.listEventRegistrations({
        id,
        q: q.trim() || undefined,
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      setItems(result.items);
      setTotal(result.total);
    } catch {
      setError('Could not load the registrations.');
    } finally {
      setLoading(false);
    }
  }, [id, page, q]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordPayment = async (registrationId: string, body: RecordEventPaymentDto) => {
    await Admin.recordEventPayment({ id: id!, registrationId, requestBody: body });
    await refresh();
  };
  const remove = async (registrationId: string, reason: string) => {
    await Admin.removeEventRegistration({ id: id!, registrationId, requestBody: { reason } });
    await refresh();
  };

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    setPage,
    q,
    setQ: (next: string) => {
      setPage(1);
      setQ(next);
    },
    loading,
    error,
    refresh,
    recordPayment,
    remove,
  };
}

export function useEventDocuments(id: string | undefined) {
  const list = useEventList<{ items: EventDocumentDto[]; level: number }>(
    id,
    (eventId) => PortalEventDocumentsService.listEventDocuments({ id: eventId }),
    { items: [], level: 4 },
    'Could not load the documents.',
  );
  const upload = async (file: File, kind: string) => {
    await PortalEventDocumentsService.uploadEventDocument({
      id: id!,
      formData: { file, kind: kind as never },
    });
    await list.refresh();
  };
  const remove = async (documentId: string) => {
    await PortalEventDocumentsService.deleteEventDocument({ id: id!, documentId });
    await list.refresh();
  };
  return { ...list, documents: list.data.items, level: list.data.level, upload, remove };
}

export function useEventGoods(id: string | undefined) {
  const list = useEventList<DonatedGoodDto[]>(
    id,
    (eventId) => Admin.listEventDonatedGoods({ id: eventId }),
    [],
    'Could not load the donated goods.',
  );
  const add = async (body: CreateDonatedGoodDto) => {
    await Admin.addEventDonatedGood({ id: id!, requestBody: body });
    await list.refresh();
  };
  const remove = async (goodId: string) => {
    await Admin.deleteEventDonatedGood({ id: id!, goodId });
    await list.refresh();
  };
  return { ...list, goods: list.data, add, remove };
}

export function useEventFinance(id: string | undefined) {
  const list = useEventList<{ costs: EventCostDto[]; summary: EventFinanceSummaryDto | null }>(
    id,
    async (eventId) => {
      const [costs, summary] = await Promise.all([
        Admin.listEventCosts({ id: eventId }),
        Admin.getEventFinanceSummary({ id: eventId }),
      ]);
      return { costs, summary };
    },
    { costs: [], summary: null },
    'Could not load the costs.',
  );
  const add = async (body: CreateEventCostDto) => {
    await Admin.addEventCost({ id: id!, requestBody: body });
    await list.refresh();
  };
  const remove = async (costId: string) => {
    await Admin.deleteEventCost({ id: id!, costId });
    await list.refresh();
  };
  return { ...list, costs: list.data.costs, summary: list.data.summary, add, remove };
}

export function useEventClose(id: string | undefined) {
  const list = useEventList<{ volunteers: EventVolunteerDto[]; preview: ClosePreviewDto | null }>(
    id,
    async (eventId) => {
      const [volunteers, preview] = await Promise.all([
        Admin.listEventVolunteers({ id: eventId }),
        Admin.getEventClosePreview({ id: eventId }),
      ]);
      return { volunteers, preview };
    },
    { volunteers: [], preview: null },
    'Could not load the volunteers.',
  );
  const saveHours = async (entries: VolunteerHoursEntryDto[]) => {
    await Admin.saveEventVolunteerHours({ id: id!, requestBody: { entries } });
    await list.refresh();
  };
  return { ...list, volunteers: list.data.volunteers, preview: list.data.preview, saveHours };
}

export function useEventNotifications(id: string | undefined) {
  const list = useEventList<EventNotificationStatusDto | null>(
    id,
    (eventId) => Admin.getEventNotificationStatus({ id: eventId }),
    null,
    'Could not load the notification status.',
  );
  return { ...list, status: list.data };
}

/** Liability waivers and their versions (EVT-05). */
export function useWaiverTemplates() {
  const [waivers, setWaivers] = useState<WaiverTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWaivers(await PortalWaiversService.listWaiverTemplates());
    } catch {
      setError('Could not load the waivers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = async (body: CreateWaiverTemplateDto) => {
    await PortalWaiversService.createWaiverTemplate({ requestBody: body });
    await refresh();
  };
  const publishVersion = async (key: string, body: PublishWaiverVersionDto) => {
    await PortalWaiversService.publishWaiverTemplateVersion({ key, requestBody: body });
    await refresh();
  };

  return { waivers, loading, error, create, publishVersion };
}
