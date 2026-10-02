import { ConflictException } from '@nestjs/common';
import {
  EVENT_CODES,
  type EventCode,
  type EventStatus,
  type PricingTier,
  type RegistrationStatus,
} from '../constants';

/**
 * Every decision the events module makes about *whether* something is
 * allowed, as pure functions.
 *
 * They are pure so they can be pinned down exhaustively in the spec: each is
 * consulted from more than one place (the options a member is shown, and the
 * write that follows), the two must never disagree, and the acceptance
 * criteria — early bird stops by itself, registration is refused the day
 * after the closing date, a closed event takes no write — are all here.
 */

export interface EventForRules {
  status: EventStatus;
  startsAt: Date;
  /** `YYYY-MM-DD`, the last day to register, in `timezone`. */
  registrationClosesOn: string;
  timezone: string;
}

export interface TicketTypeForRules {
  id: string;
  minAge: number | null;
  maxAge: number | null;
  priceCents: number;
  earlyBirdPriceCents: number | null;
  earlyBirdEndsAt: Date | null;
  sortOrder: number;
  isActive: boolean;
}

/** `YYYY-MM-DD` as a clock in `timezone` reads at `now`. */
export function localDateIn(timezone: string, now: Date): string {
  // en-CA formats as ISO year-month-day.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** `code` and `message` are set exactly when `open` is false. */
export interface RegistrationState {
  open: boolean;
  code: EventCode | null;
  message: string | null;
}

/**
 * Whether the event is taking registrations right now (EVT-18).
 *
 * The closing date is a whole day in the event's own time zone: registration
 * is open through the end of that day and refused from the first instant of
 * the next, whatever the server's clock or the member's browser says.
 */
export function registrationState(event: EventForRules, now: Date): RegistrationState {
  if (event.status === 'closed') {
    return { open: false, code: EVENT_CODES.EVENT_CLOSED, message: 'This event is closed.' };
  }
  if (event.status !== 'published') {
    return {
      open: false,
      code: EVENT_CODES.EVENT_NOT_PUBLISHED,
      message: 'This event is not open for registration.',
    };
  }
  if (localDateIn(event.timezone, now) > event.registrationClosesOn) {
    return {
      open: false,
      code: EVENT_CODES.REGISTRATION_CLOSED,
      message: 'Registration for this event has closed.',
    };
  }
  if (now.getTime() >= event.startsAt.getTime()) {
    return { open: false, code: EVENT_CODES.EVENT_STARTED, message: 'This event has already started.' };
  }
  return { open: true, code: null, message: null };
}

/** Whole years between a `YYYY-MM-DD` birth date and a `YYYY-MM-DD` day. */
export function ageOn(dateOfBirth: string | null | undefined, onDate: string): number | null {
  if (!dateOfBirth) return null;
  const [by, bm, bd] = dateOfBirth.slice(0, 10).split('-').map(Number);
  const [oy, om, od] = onDate.slice(0, 10).split('-').map(Number);
  if (![by, bm, bd, oy, om, od].every(Number.isFinite)) return null;
  let age = oy - by;
  if (om < bm || (om === bm && od < bd)) age -= 1;
  return age;
}

/**
 * Youth on the day the event starts (VOL-06). Someone with no birth date on
 * file is an adult — only spouse profiles may lack one.
 */
export function isYouthAt(
  dateOfBirth: string | null | undefined,
  event: Pick<EventForRules, 'startsAt' | 'timezone'>,
  youthMaxAge: number,
): boolean {
  const age = ageOn(dateOfBirth, localDateIn(event.timezone, event.startsAt));
  return age !== null && age <= youthMaxAge;
}

/**
 * The ticket an attendee of this age gets: the first active type, by
 * `sortOrder`, whose inclusive band holds the age. The member never chooses.
 *
 * With no age on file the attendee takes the first type that is open at the
 * top — the adult ticket in any sensible set.
 */
export function ticketTypeFor<T extends TicketTypeForRules>(types: readonly T[], age: number | null): T | null {
  const active = types
    .filter((type) => type.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (age === null) return active.find((type) => type.maxAge === null) ?? null;
  return (
    active.find(
      (type) =>
        (type.minAge === null || age >= type.minAge) && (type.maxAge === null || age <= type.maxAge),
    ) ?? null
  );
}

/**
 * The price in force at `now` (EVT-02). The early-bird price applies strictly
 * before `earlyBirdEndsAt`, so the cut-over needs no admin action.
 */
export function priceFor(
  type: Pick<TicketTypeForRules, 'priceCents' | 'earlyBirdPriceCents' | 'earlyBirdEndsAt'>,
  now: Date,
): { unitCents: number; tier: PricingTier } {
  if (
    type.earlyBirdPriceCents !== null &&
    type.earlyBirdEndsAt !== null &&
    now.getTime() < type.earlyBirdEndsAt.getTime()
  ) {
    return { unitCents: type.earlyBirdPriceCents, tier: 'early_bird' };
  }
  return { unitCents: type.priceCents, tier: 'standard' };
}

/** Whether `adding` more people fit. A null capacity is "No maximum". */
export function capacityAllows(capacity: number | null, current: number, adding: number): boolean {
  return capacity === null || current + adding <= capacity;
}

/** `code` is set exactly when `allowed` is false. */
export interface CancelDecision {
  allowed: boolean;
  code: EventCode | null;
}

/**
 * Whether the member may cancel their own registration (EVT-23).
 *
 * Once any payment has settled they cannot: an Admin removes them instead,
 * with a reason, and refunds are handled outside the portal.
 */
export function canSelfCancel(
  registration: { status: RegistrationStatus; paidCents: number },
  event: Pick<EventForRules, 'status'>,
): CancelDecision {
  if (event.status === 'closed') return { allowed: false, code: EVENT_CODES.EVENT_CLOSED };
  if (registration.status !== 'pending_payment' && registration.status !== 'confirmed') {
    return { allowed: false, code: EVENT_CODES.NOT_ACTIVE };
  }
  if (registration.paidCents > 0) return { allowed: false, code: EVENT_CODES.ALREADY_PAID };
  return { allowed: true, code: null };
}

/**
 * EVT-26: a closed event is read-only. Every mutating path calls this first,
 * and answers 409 — there is no reopen.
 */
export function assertEventWritable(event: Pick<EventForRules, 'status'>): void {
  if (event.status === 'closed') {
    throw new ConflictException({
      code: EVENT_CODES.EVENT_CLOSED,
      message: 'This event is closed and can no longer be changed.',
    });
  }
}

export interface ClosePreconditions {
  ok: boolean;
  code?: EventCode;
  /** Volunteers whose hours have not been entered (VOL-12). */
  missingHoursAttendeeIds: string[];
}

/**
 * Whether the event may be closed. Only a published event closes, and only
 * once every volunteer on it has hours — zero is a valid entry, absent is not.
 */
export function closePreconditions(
  event: Pick<EventForRules, 'status'>,
  volunteers: ReadonlyArray<{ id: string; volunteerMinutes: number | null }>,
): ClosePreconditions {
  if (event.status === 'closed') {
    return { ok: false, code: EVENT_CODES.EVENT_CLOSED, missingHoursAttendeeIds: [] };
  }
  if (event.status !== 'published') {
    return { ok: false, code: EVENT_CODES.EVENT_NOT_PUBLISHED, missingHoursAttendeeIds: [] };
  }
  const missing = volunteers.filter((v) => v.volunteerMinutes === null).map((v) => v.id);
  if (missing.length > 0) {
    return { ok: false, code: EVENT_CODES.HOURS_MISSING, missingHoursAttendeeIds: missing };
  }
  return { ok: true, missingHoursAttendeeIds: [] };
}

/** `"7,1"` → `[7, 1]`: positive whole days, largest first, no repeats. */
export function parseReminderOffsets(raw: string | readonly number[] | null | undefined): number[] {
  const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  const days = values
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isInteger(value) && value > 0);
  return [...new Set(days)].sort((a, b) => b - a);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The reminder that is due now, if any (EVT-07).
 *
 * Only the *latest* due offset is returned: an event published three days out
 * with offsets 7 and 1 sends nothing for the missed 7-day mark — it waits for
 * the 1-day one rather than firing a burst. `dueAt` is when that reminder
 * became due, so a household that registered after it is not reminded
 * straight away.
 */
export function dueReminder(
  event: Pick<EventForRules, 'status' | 'startsAt'>,
  offsetsDays: readonly number[],
  now: Date,
): { key: string; dueAt: Date } | null {
  if (event.status !== 'published' || now.getTime() >= event.startsAt.getTime()) return null;
  const due = [...offsetsDays]
    .sort((a, b) => a - b)
    .find((days) => now.getTime() >= event.startsAt.getTime() - days * DAY_MS);
  if (due === undefined) return null;
  return { key: `d${due}`, dueAt: new Date(event.startsAt.getTime() - due * DAY_MS) };
}

/** Hours as entered at close (steps of a quarter) to stored minutes. */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}
