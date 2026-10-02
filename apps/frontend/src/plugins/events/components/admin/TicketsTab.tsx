import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  FormField,
  Modal,
  Switch,
  type DataTableColumn,
} from '@helix-x/design-system';
import type { AdminEventDto, SlotDto, TicketTypeDto, UpsertSlotDto, UpsertTicketTypeDto } from '@helix-x-rawla/client-sdk';
import { useEventSlots } from '../../hooks/useEventAdmin';
import { apiMessage, formatMoney, formatTime, fromLocalInput, toLocalInput } from '../../lib/format';

const toCents = (value: string): number | null => {
  if (value.trim() === '') return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : NaN;
};
const fromCents = (cents: number | null | undefined) => (cents == null ? '' : (cents / 100).toFixed(2));
const toAge = (value: string) => (value.trim() === '' ? null : Number(value));

export type TicketsTabProps = {
  event: AdminEventDto;
  editable: boolean;
  onSave: (body: UpsertTicketTypeDto, ticketTypeId?: string) => Promise<unknown>;
  onDelete: (ticketTypeId: string) => Promise<unknown>;
};

/**
 * Age-banded tickets (EVT-02). An attendee gets the first ticket, in order,
 * whose age band holds their age on the day — members never choose one.
 */
export function TicketsTab({ event, editable, onSave, onDelete }: TicketsTabProps) {
  const [editing, setEditing] = useState<TicketTypeDto | 'new' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<TicketTypeDto>[]>(
    () => [
      {
        key: 'name',
        header: 'Ticket',
        render: (t) => (
          <span className="font-medium">
            {t.name} {!t.isActive && <Badge className="ml-1">Inactive</Badge>}
          </span>
        ),
      },
      {
        key: 'ages',
        header: 'Ages',
        render: (t) => (
          <span className="text-sm">
            {t.minAge == null && t.maxAge == null
              ? 'All'
              : t.minAge == null
                ? `≤ ${t.maxAge}`
                : t.maxAge == null
                  ? `${t.minAge}+`
                  : `${t.minAge}–${t.maxAge}`}
          </span>
        ),
      },
      { key: 'price', header: 'Price', render: (t) => <span className="text-sm">{formatMoney(t.priceCents, event.currency)}</span> },
      {
        key: 'early',
        header: 'Early bird',
        hideOnMobile: true,
        render: (t) =>
          t.earlyBirdPriceCents != null && t.earlyBirdEndsAt ? (
            <span className="text-sm">
              {formatMoney(t.earlyBirdPriceCents, event.currency)} until{' '}
              {new Date(t.earlyBirdEndsAt).toLocaleString('en-US', { timeZone: event.timezone, dateStyle: 'medium', timeStyle: 'short' })}
              {t.currentTier === 'early_bird' && <Badge variant="success" className="ml-2">In force</Badge>}
            </span>
          ) : (
            <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
          ),
      },
      {
        key: 'actions',
        header: '',
        width: '170px',
        render: (t) =>
          editable ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(t)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  setError(null);
                  try {
                    await onDelete(t.id);
                  } catch (err) {
                    setError(apiMessage(err, 'The ticket could not be deleted.'));
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ) : null,
      },
    ],
    [event.currency, event.timezone, editable, onDelete],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Each person is given the first ticket, in this order, that fits their age on the day of the
          event. An event needs at least one ticket before it can be published; a free event needs one
          priced at 0.
        </p>
        {editable && <Button onClick={() => setEditing('new')}>Add ticket</Button>}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <DataTable columns={columns} data={event.ticketTypes} rowKey={(t) => t.id} emptyState="No tickets yet." />

      <TicketDialog
        open={editing !== null}
        ticket={editing === 'new' ? null : editing}
        timezone={event.timezone}
        nextOrder={event.ticketTypes.length}
        onClose={() => setEditing(null)}
        onSave={(body) => onSave(body, editing && editing !== 'new' ? editing.id : undefined)}
      />
    </div>
  );
}

function TicketDialog({
  open,
  ticket,
  timezone,
  nextOrder,
  onClose,
  onSave,
}: {
  open: boolean;
  ticket: TicketTypeDto | null;
  timezone: string;
  nextOrder: number;
  onClose: () => void;
  onSave: (body: UpsertTicketTypeDto) => Promise<unknown>;
}) {
  const [name, setName] = useState('');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [price, setPrice] = useState('');
  const [earlyPrice, setEarlyPrice] = useState('');
  const [earlyEnds, setEarlyEnds] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(ticket?.name ?? '');
    setMinAge(ticket?.minAge != null ? String(ticket.minAge) : '');
    setMaxAge(ticket?.maxAge != null ? String(ticket.maxAge) : '');
    setPrice(fromCents(ticket?.priceCents ?? 0));
    setEarlyPrice(fromCents(ticket?.earlyBirdPriceCents));
    setEarlyEnds(toLocalInput(ticket?.earlyBirdEndsAt, timezone));
    setIsActive(ticket?.isActive ?? true);
    setError(null);
  }, [open, ticket, timezone]);

  const save = async () => {
    const priceCents = toCents(price);
    const earlyBirdPriceCents = toCents(earlyPrice);
    if (!name.trim()) return setError('Give the ticket a name.');
    if (priceCents === null || Number.isNaN(priceCents) || Number.isNaN(earlyBirdPriceCents)) {
      return setError('Prices must be amounts such as 25 or 25.00.');
    }
    if ((earlyBirdPriceCents === null) !== (earlyEnds === '')) {
      return setError('An early-bird price needs an end time, and an end time needs a price.');
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        minAge: toAge(minAge),
        maxAge: toAge(maxAge),
        priceCents,
        earlyBirdPriceCents,
        earlyBirdEndsAt: fromLocalInput(earlyEnds, timezone),
        sortOrder: ticket?.sortOrder ?? nextOrder,
        isActive,
      });
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The ticket could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={ticket ? `Edit ${ticket.name}` : 'Add ticket'}
      description={ticket ? 'Prices already locked on registrations do not change.' : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Save ticket
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Name" placeholder="Adult" value={name} disabled={submitting} onChange={(e) => setName(e.target.value)} />
        </div>
        <FormField label="Youngest age" helperText="Empty for no lower limit." type="number" min={0} value={minAge} disabled={submitting} onChange={(e) => setMinAge(e.target.value)} />
        <FormField label="Oldest age" helperText="Empty for no upper limit." type="number" min={0} value={maxAge} disabled={submitting} onChange={(e) => setMaxAge(e.target.value)} />
        <FormField label="Price" helperText="0 for a free ticket." inputMode="decimal" value={price} disabled={submitting} onChange={(e) => setPrice(e.target.value)} />
        <FormField label="Early-bird price" helperText="Optional." inputMode="decimal" value={earlyPrice} disabled={submitting} onChange={(e) => setEarlyPrice(e.target.value)} />
        <div className="sm:col-span-2">
          <FormField
            label="Early bird ends"
            helperText="In the event's time zone. The standard price applies from this moment."
            type="datetime-local"
            value={earlyEnds}
            disabled={submitting}
            onChange={(e) => setEarlyEnds(e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between sm:col-span-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
          <Switch checked={isActive} onCheckedChange={setIsActive} aria-label="Ticket is active" />
        </div>
      </div>
    </Modal>
  );
}

/** Bookable time slots within the event (EVT-03). */
export function SlotsTab({ event, editable }: { event: AdminEventDto; editable: boolean }) {
  const { slots, loading, error, save, remove } = useEventSlots(event.id);
  const [editing, setEditing] = useState<SlotDto | 'new' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const columns = useMemo<DataTableColumn<SlotDto>[]>(
    () => [
      { key: 'activity', header: 'Activity', render: (s) => <span className="font-medium">{s.activity}</span> },
      {
        key: 'time',
        header: 'Time',
        render: (s) => (
          <span className="text-sm">
            {new Date(s.startsAt).toLocaleDateString('en-US', { timeZone: event.timezone, dateStyle: 'medium' })} ·{' '}
            {formatTime(s.startsAt, event.timezone)}–{formatTime(s.endsAt, event.timezone)}
          </span>
        ),
      },
      { key: 'booked', header: 'Booked', width: '110px', render: (s) => <span className="text-sm">{s.bookedCount} / {s.capacity}</span> },
      {
        key: 'actions',
        header: '',
        width: '170px',
        render: (s) =>
          editable ? (
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={() => setEditing(s)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  setActionError(null);
                  try {
                    await remove(s.id);
                  } catch (err) {
                    setActionError(apiMessage(err, 'The time slot could not be deleted.'));
                  }
                }}
              >
                Delete
              </Button>
            </div>
          ) : null,
      },
    ],
    // `remove` is recreated each render; the table only needs the latest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [event.timezone, editable],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Appointments within the event, such as blood-donation times. Members book them while registering.
        </p>
        {editable && <Button onClick={() => setEditing('new')}>Add time slot</Button>}
      </div>
      {(error || actionError) && <Alert variant="error">{error ?? actionError}</Alert>}
      <DataTable columns={columns} data={slots} rowKey={(s) => s.id} loading={loading} emptyState="No time slots." />
      <SlotDialog
        open={editing !== null}
        slot={editing === 'new' ? null : editing}
        event={event}
        onClose={() => setEditing(null)}
        onSave={(body) => save(body, editing && editing !== 'new' ? editing.id : undefined)}
      />
    </div>
  );
}

function SlotDialog({
  open,
  slot,
  event,
  onClose,
  onSave,
}: {
  open: boolean;
  slot: SlotDto | null;
  event: AdminEventDto;
  onClose: () => void;
  onSave: (body: UpsertSlotDto) => Promise<unknown>;
}) {
  const [activity, setActivity] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActivity(slot?.activity ?? '');
    setStartsAt(toLocalInput(slot?.startsAt ?? event.startsAt, event.timezone));
    setEndsAt(toLocalInput(slot?.endsAt ?? event.endsAt, event.timezone));
    setCapacity(slot ? String(slot.capacity) : '');
    setError(null);
  }, [open, slot, event]);

  const save = async () => {
    const start = fromLocalInput(startsAt, event.timezone);
    const end = fromLocalInput(endsAt, event.timezone);
    if (!activity.trim() || !start || !end || !(Number(capacity) >= 1)) {
      return setError('An activity, a start, an end and a capacity are all required.');
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSave({ activity: activity.trim(), startsAt: start, endsAt: end, capacity: Number(capacity) });
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The time slot could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={slot ? 'Edit time slot' : 'Add time slot'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Save time slot
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Activity" placeholder="Blood donation" value={activity} disabled={submitting} onChange={(e) => setActivity(e.target.value)} />
        </div>
        <FormField label="Starts" type="datetime-local" value={startsAt} disabled={submitting} onChange={(e) => setStartsAt(e.target.value)} />
        <FormField label="Ends" type="datetime-local" value={endsAt} disabled={submitting} onChange={(e) => setEndsAt(e.target.value)} />
        <FormField label="Places" type="number" min={1} value={capacity} disabled={submitting} onChange={(e) => setCapacity(e.target.value)} />
      </div>
    </Modal>
  );
}
