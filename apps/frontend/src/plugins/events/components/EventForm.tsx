import { useState } from 'react';
import {
  Alert,
  Button,
  DateField,
  FormField,
  Select,
  Switch,
  TextareaField,
} from '@helix-x/web/design-system';
import type { AdminEventDto } from '@helix-x-rawla/client-sdk';
import { useEventFormOptions } from '../hooks/useEventAdmin';
import { CATEGORY_OPTIONS, apiMessage, fromLocalInput, toLocalInput } from '../lib/format';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
];

const label = 'text-sm font-medium text-gray-700 dark:text-gray-300';

/** What the form submits. `null` clears an optional field on an edit. */
export type EventFormValues = {
  title: string;
  category: string;
  chapterId: string | null;
  venue: string | null;
  startsAt: string;
  endsAt: string;
  timezone: string;
  registrationClosesOn: string;
  capacity: number | null;
  description: string | null;
  attireGuide: string | null;
  waiverTemplateId: string | null;
  collectTshirt: boolean;
  collectHotel: boolean;
  reminderOffsetsDays: number[] | null;
  stripePaymentLink: string | null;
  zelleInstructions: string | null;
};

export type EventFormProps = {
  /** The event being edited; omit to create one. */
  event?: AdminEventDto;
  disabled?: boolean;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void>;
};

/**
 * The fields of an event (EVT-16 / EVT-17), for creating and editing.
 *
 * Times are entered as a wall clock in the event's own time zone, not the
 * browser's: an organiser in New York setting up a Texas event means Texas
 * time, and the closing date is evaluated in that zone too.
 */
export function EventForm({ event, disabled, submitLabel, onSubmit }: EventFormProps) {
  const { chapters, waivers } = useEventFormOptions();
  const [timezone, setTimezone] = useState(event?.timezone ?? 'America/Chicago');
  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState<string>(event?.category ?? 'annual_chapter');
  const [chapterId, setChapterId] = useState(event?.chapterId ?? '');
  const [venue, setVenue] = useState(event?.venue ?? '');
  const [startsAt, setStartsAt] = useState(toLocalInput(event?.startsAt, timezone));
  const [endsAt, setEndsAt] = useState(toLocalInput(event?.endsAt, timezone));
  const [closesOn, setClosesOn] = useState(event?.registrationClosesOn ?? '');
  const [capacity, setCapacity] = useState(event?.capacity != null ? String(event.capacity) : '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [attireGuide, setAttireGuide] = useState(event?.attireGuide ?? '');
  const [waiverTemplateId, setWaiverTemplateId] = useState(event?.waiverTemplateId ?? '');
  const [collectTshirt, setCollectTshirt] = useState(event?.collectTshirt ?? false);
  const [collectHotel, setCollectHotel] = useState(event?.collectHotel ?? false);
  const [reminders, setReminders] = useState(event?.reminderOffsetsDays?.join(', ') ?? '');
  const [stripePaymentLink, setStripePaymentLink] = useState(event?.stripePaymentLink ?? '');
  const [zelleInstructions, setZelleInstructions] = useState(event?.zelleInstructions ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const busy = disabled || submitting;

  const submit = async () => {
    const start = fromLocalInput(startsAt, timezone);
    const end = fromLocalInput(endsAt, timezone);
    if (title.trim().length < 3) return setError('Give the event a title.');
    if (!start || !end) return setError('Enter when the event starts and ends.');
    if (!closesOn) return setError('Enter the last day to register.');
    if (capacity && !(Number(capacity) >= 1)) return setError('The maximum must be a whole number, or left empty.');
    const offsets = reminders
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((days) => Number.isInteger(days) && days > 0);

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        title: title.trim(),
        category,
        chapterId: chapterId || null,
        venue: venue.trim() || null,
        startsAt: start,
        endsAt: end,
        timezone,
        registrationClosesOn: closesOn,
        capacity: capacity ? Number(capacity) : null,
        description: description.trim() || null,
        attireGuide: attireGuide.trim() || null,
        waiverTemplateId: waiverTemplateId || null,
        collectTshirt,
        collectHotel,
        reminderOffsetsDays: offsets.length ? offsets : null,
        stripePaymentLink: stripePaymentLink.trim() || null,
        zelleInstructions: zelleInstructions.trim() || null,
      });
    } catch (err) {
      setError(apiMessage(err, 'The event could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  // A waiver the event already points at stays selectable after a newer version is published.
  const waiverOptions = waivers.map((w) => ({ value: w.id, label: `${w.title} (v${w.version})` }));
  if (waiverTemplateId && !waiverOptions.some((o) => o.value === waiverTemplateId)) {
    waiverOptions.push({ value: waiverTemplateId, label: 'Current waiver (earlier version)' });
  }

  return (
    <div className="flex flex-col gap-5">
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Title" value={title} disabled={busy} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
        <Field id="event-category" label="Category">
          <Select id="event-category" value={category} disabled={busy} options={CATEGORY_OPTIONS} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field id="event-chapter" label="Chapter">
          <Select
            id="event-chapter"
            value={chapterId}
            disabled={busy}
            placeholder="National (no chapter)"
            options={chapters.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setChapterId(e.target.value)}
          />
        </Field>
        <FormField label="Location" value={venue} disabled={busy} maxLength={300} onChange={(e) => setVenue(e.target.value)} />
        <Field id="event-timezone" label="Time zone">
          <Select
            id="event-timezone"
            value={timezone}
            disabled={busy}
            options={[...new Set([...TIMEZONES, timezone])].map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }))}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </Field>
        <FormField
          label="Maximum participants"
          helperText="Leave empty for no maximum."
          type="number"
          min={1}
          value={capacity}
          disabled={busy}
          onChange={(e) => setCapacity(e.target.value)}
        />
        <FormField label="Starts" type="datetime-local" value={startsAt} disabled={busy} onChange={(e) => setStartsAt(e.target.value)} />
        <FormField label="Ends" type="datetime-local" value={endsAt} disabled={busy} onChange={(e) => setEndsAt(e.target.value)} />
        <Field id="event-closes" label="Last day to register">
          <DateField id="event-closes" value={closesOn} disabled={busy} onChange={(e) => setClosesOn(e.target.value)} />
        </Field>
        <FormField
          label="Reminder days"
          helperText="Days before the start, e.g. 7, 1. Empty uses the portal setting."
          value={reminders}
          disabled={busy}
          onChange={(e) => setReminders(e.target.value)}
        />
      </div>

      <TextareaField label="Description" helperText="Optional for smaller events." rows={5} value={description} disabled={busy} onChange={(e) => setDescription(e.target.value)} />
      <TextareaField label="What to wear" helperText="Included in the reminder email." rows={2} value={attireGuide} disabled={busy} onChange={(e) => setAttireGuide(e.target.value)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="event-waiver" label="Liability waiver">
          <Select
            id="event-waiver"
            value={waiverTemplateId}
            disabled={busy}
            placeholder="No waiver"
            options={waiverOptions}
            onChange={(e) => setWaiverTemplateId(e.target.value)}
          />
        </Field>
        <div className="flex flex-col justify-end gap-3">
          <Toggle label="Ask for T-shirt sizes" checked={collectTshirt} disabled={busy} onChange={setCollectTshirt} />
          <Toggle label="Ask for hotel details" checked={collectHotel} disabled={busy} onChange={setCollectHotel} />
        </div>
        <FormField
          label="Stripe payment link"
          helperText="Optional. Shown beside the portal checkout."
          placeholder="https://buy.stripe.com/…"
          value={stripePaymentLink}
          disabled={busy}
          onChange={(e) => setStripePaymentLink(e.target.value)}
        />
        <TextareaField
          label="Zelle instructions"
          helperText="Optional. For one-time event payments only."
          rows={2}
          value={zelleInstructions}
          disabled={busy}
          onChange={(e) => setZelleInstructions(e.target.value)}
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} loading={submitting} disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({ id, label: text, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={label}>
        {text}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label: text,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={label}>{text}</span>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={text} />
    </div>
  );
}
