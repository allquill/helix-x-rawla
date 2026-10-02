/** Display helpers shared by the event screens. */

export const CATEGORY_LABELS: Record<string, string> = {
  mel: 'Mel',
  annual_chapter: 'Annual chapter event',
  local_charity: 'Local charity event',
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

export const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  removed_by_admin: 'Removed',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  stripe: 'Card',
  console: 'Card (test)',
  zelle: 'Zelle',
  other: 'Other',
};

/** Why registration is not open, in the member's words. */
export const CLOSED_REASONS: Record<string, string> = {
  REGISTRATION_CLOSED: 'Registration has closed.',
  EVENT_CLOSED: 'This event is closed.',
  EVENT_STARTED: 'This event has already started.',
  EVENT_NOT_PUBLISHED: 'This event is not open for registration.',
  EVENT_FULL: 'This event is full.',
};

export function formatMoney(cents: number | null | undefined, currency = 'USD'): string {
  if (cents === null || cents === undefined) return '—';
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

/** An amount that is a sum, where zero should read `$0.00` rather than "Free". */
export function formatAmount(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
}

type Timed = { startsAt: string; endsAt: string; timezone: string };

/** "Saturday, March 20, 2027 · 6:00 PM – 10:00 PM CDT", in the event's own zone. */
export function formatWhen(event: Timed): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: event.timezone, dateStyle: 'full' });
  const time = new Intl.DateTimeFormat('en-US', { timeZone: event.timezone, timeStyle: 'short' });
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZone: event.timezone, timeZoneName: 'short' })
      .formatToParts(start)
      .find((part) => part.type === 'timeZoneName')?.value ?? '';
  const sameDay = day.format(start) === day.format(end);
  return sameDay
    ? `${day.format(start)} · ${time.format(start)} – ${time.format(end)} ${zone}`
    : `${day.format(start)}, ${time.format(start)} – ${day.format(end)}, ${time.format(end)} ${zone}`;
}

/** "4 hours", "1 day 2 hours" — the duration EVT-17 asks the page to show. */
export function formatDuration(event: Pick<Timed, 'startsAt' | 'endsAt'>): string {
  const minutes = Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'}`;
  return [days && plural(days, 'day'), hours && plural(hours, 'hour'), rest && plural(rest, 'minute')]
    .filter(Boolean)
    .join(' ') || '—';
}

export function formatTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: timezone, timeStyle: 'short' }).format(new Date(iso));
}

/** A `YYYY-MM-DD` day, read as a calendar date rather than a UTC instant. */
export function formatDay(isoDay: string): string {
  const [y = 1970, m = 1, d = 1] = isoDay.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long' }).format(new Date(y, m - 1, d));
}

export function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(2).replace(/0$/, '')} h`;
}

/** `datetime-local` value for an instant, as a wall clock in `timezone`. */
export function toLocalInput(iso: string | null | undefined, timezone: string): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

/**
 * The instant a `datetime-local` wall clock names in `timezone`.
 *
 * The browser would read the value in its own zone; an organiser in New York
 * setting up a Texas event means Texas time. Found by correcting a UTC guess
 * with the zone's offset at that moment.
 */
export function fromLocalInput(value: string, timezone: string): string | null {
  if (!value) return null;
  const guess = new Date(`${value}:00Z`);
  if (Number.isNaN(guess.getTime())) return null;
  const shown = new Date(`${toLocalInput(guess.toISOString(), timezone)}:00Z`);
  return new Date(guess.getTime() - (shown.getTime() - guess.getTime())).toISOString();
}

type ApiError = { status?: number; body?: { message?: string | string[]; code?: string } };

/** The server's own message for a failed call, else the fallback. */
export function apiMessage(error: unknown, fallback: string): string {
  const message = (error as ApiError)?.body?.message;
  if (Array.isArray(message)) return message.join(' ');
  return message || fallback;
}

export function apiCode(error: unknown): string | undefined {
  return (error as ApiError)?.body?.code;
}

export function apiStatus(error: unknown): number | undefined {
  return (error as ApiError)?.status;
}
