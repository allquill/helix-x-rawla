import { ConflictException } from '@nestjs/common';
import {
  ageOn,
  assertEventWritable,
  canSelfCancel,
  capacityAllows,
  closePreconditions,
  dueReminder,
  hoursToMinutes,
  isYouthAt,
  localDateIn,
  parseReminderOffsets,
  priceFor,
  registrationState,
  ticketTypeFor,
  type EventForRules,
  type TicketTypeForRules,
} from './event-rules';

const event: EventForRules = {
  status: 'published',
  startsAt: new Date('2027-03-20T23:00:00Z'), // 18:00 in Chicago
  registrationClosesOn: '2027-03-10',
  timezone: 'America/Chicago',
};

const type = (patch: Partial<TicketTypeForRules>): TicketTypeForRules => ({
  id: 'adult',
  minAge: null,
  maxAge: null,
  priceCents: 5000,
  earlyBirdPriceCents: null,
  earlyBirdEndsAt: null,
  sortOrder: 0,
  isActive: true,
  ...patch,
});

describe('localDateIn', () => {
  it('reads the date on the event zone, not UTC', () => {
    // 03:00 UTC on the 11th is still the evening of the 10th in Chicago.
    expect(localDateIn('America/Chicago', new Date('2027-03-11T03:00:00Z'))).toBe('2027-03-10');
    expect(localDateIn('UTC', new Date('2027-03-11T03:00:00Z'))).toBe('2027-03-11');
  });
});

describe('registrationState (EVT-18)', () => {
  it('is open on a published event before the closing date', () => {
    expect(registrationState(event, new Date('2027-03-01T12:00:00Z'))).toEqual({
      open: true,
      code: null,
      message: null,
    });
  });

  it('stays open through the last minute of the closing day in the event zone', () => {
    // 23:59 on the 10th in Chicago (CST, UTC-6).
    expect(registrationState(event, new Date('2027-03-11T05:59:00Z')).open).toBe(true);
  });

  it('is refused from the first instant of the day after', () => {
    expect(registrationState(event, new Date('2027-03-11T06:00:00Z'))).toMatchObject({
      open: false,
      code: 'REGISTRATION_CLOSED',
    });
  });

  it.each([
    ['draft', 'EVENT_NOT_PUBLISHED'],
    ['closed', 'EVENT_CLOSED'],
  ] as const)('is refused on a %s event', (status, code) => {
    expect(registrationState({ ...event, status }, new Date('2027-03-01T12:00:00Z'))).toMatchObject({
      open: false,
      code,
    });
  });

  it('is refused once the event has started, even with a later closing date', () => {
    const late = { ...event, registrationClosesOn: '2027-03-25' };
    expect(registrationState(late, new Date('2027-03-20T23:00:00Z'))).toMatchObject({
      open: false,
      code: 'EVENT_STARTED',
    });
  });
});

describe('ageOn / isYouthAt', () => {
  it.each([
    ['2010-03-20', '2027-03-20', 17],
    ['2010-03-21', '2027-03-20', 16],
    ['2009-03-20', '2027-03-20', 18],
    ['2024-02-29', '2027-02-28', 2],
  ])('born %s is %i on %s', (dob, on, age) => {
    expect(ageOn(dob, on)).toBe(age);
  });

  it('is null without a usable birth date', () => {
    expect(ageOn(null, '2027-03-20')).toBeNull();
    expect(ageOn('not-a-date', '2027-03-20')).toBeNull();
  });

  it('measures youth on the day the event starts', () => {
    expect(isYouthAt('2009-03-21', event, 17)).toBe(true); // 18 the day after
    expect(isYouthAt('2009-03-20', event, 17)).toBe(false); // 18 on the day
  });

  it('treats a missing birth date as an adult', () => {
    expect(isYouthAt(null, event, 17)).toBe(false);
  });
});

describe('ticketTypeFor', () => {
  const types = [
    type({ id: 'infant', maxAge: 4, priceCents: 0, sortOrder: 0 }),
    type({ id: 'child', minAge: 5, maxAge: 12, priceCents: 2000, sortOrder: 1 }),
    type({ id: 'adult', minAge: 13, priceCents: 5000, sortOrder: 2 }),
  ];

  it.each([
    [0, 'infant'],
    [4, 'infant'],
    [5, 'child'],
    [12, 'child'],
    [13, 'adult'],
    [70, 'adult'],
  ])('age %i gets the %s ticket', (age, id) => {
    expect(ticketTypeFor(types, age)?.id).toBe(id);
  });

  it('gives someone with no age on file the ticket that is open at the top', () => {
    expect(ticketTypeFor(types, null)?.id).toBe('adult');
  });

  it('skips inactive types and answers null when no band fits', () => {
    const adultsOnly = [type({ id: 'adult', minAge: 18 }), type({ id: 'child', maxAge: 17, isActive: false })];
    expect(ticketTypeFor(adultsOnly, 10)).toBeNull();
  });

  it('prefers the lower sortOrder when bands overlap', () => {
    const overlapping = [type({ id: 'general', sortOrder: 5 }), type({ id: 'senior', minAge: 65, sortOrder: 1 })];
    expect(ticketTypeFor(overlapping, 70)?.id).toBe('senior');
    expect(ticketTypeFor(overlapping, 30)?.id).toBe('general');
  });
});

describe('priceFor (EVT-02)', () => {
  const earlyBird = type({ earlyBirdPriceCents: 4000, earlyBirdEndsAt: new Date('2027-02-01T06:00:00Z') });

  it('charges the early-bird price strictly before the cut-over', () => {
    expect(priceFor(earlyBird, new Date('2027-02-01T05:59:59.999Z'))).toEqual({
      unitCents: 4000,
      tier: 'early_bird',
    });
  });

  it('charges the standard price from the cut-over instant, with no admin action', () => {
    expect(priceFor(earlyBird, new Date('2027-02-01T06:00:00Z'))).toEqual({
      unitCents: 5000,
      tier: 'standard',
    });
  });

  it('ignores a half-configured early bird', () => {
    const now = new Date('2027-01-01T00:00:00Z');
    expect(priceFor(type({ earlyBirdPriceCents: 4000 }), now).tier).toBe('standard');
    expect(priceFor(type({ earlyBirdEndsAt: new Date('2027-02-01T06:00:00Z') }), now).tier).toBe('standard');
  });

  it('keeps a free early bird free', () => {
    const free = type({ earlyBirdPriceCents: 0, earlyBirdEndsAt: new Date('2027-02-01T06:00:00Z') });
    expect(priceFor(free, new Date('2027-01-01T00:00:00Z')).unitCents).toBe(0);
  });
});

describe('capacityAllows', () => {
  it.each([
    [null, 500, 5, true],
    [10, 5, 5, true],
    [10, 6, 5, false],
    [10, 10, 1, false],
  ])('capacity %s with %i held, adding %i → %s', (capacity, current, adding, expected) => {
    expect(capacityAllows(capacity, current, adding)).toBe(expected);
  });
});

describe('canSelfCancel (EVT-23)', () => {
  it('allows an unpaid registration to be cancelled', () => {
    expect(canSelfCancel({ status: 'pending_payment', paidCents: 0 }, event)).toEqual({ allowed: true, code: null });
    // A free event confirms with nothing paid.
    expect(canSelfCancel({ status: 'confirmed', paidCents: 0 }, event)).toEqual({ allowed: true, code: null });
  });

  it('refuses once anything has been paid', () => {
    expect(canSelfCancel({ status: 'confirmed', paidCents: 12000 }, event)).toEqual({
      allowed: false,
      code: 'ALREADY_PAID',
    });
    expect(canSelfCancel({ status: 'pending_payment', paidCents: 1 }, event)).toEqual({
      allowed: false,
      code: 'ALREADY_PAID',
    });
  });

  it.each(['cancelled', 'removed_by_admin'] as const)('refuses a %s registration', (status) => {
    expect(canSelfCancel({ status, paidCents: 0 }, event)).toEqual({ allowed: false, code: 'NOT_ACTIVE' });
  });

  it('refuses on a closed event whatever was paid', () => {
    expect(canSelfCancel({ status: 'pending_payment', paidCents: 0 }, { status: 'closed' })).toEqual({
      allowed: false,
      code: 'EVENT_CLOSED',
    });
  });
});

describe('assertEventWritable (EVT-26)', () => {
  it.each(['draft', 'published'] as const)('passes a %s event', (status) => {
    expect(() => assertEventWritable({ status })).not.toThrow();
  });

  it('answers 409 EVENT_CLOSED on a closed event', () => {
    try {
      assertEventWritable({ status: 'closed' });
      throw new Error('expected a refusal');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getStatus()).toBe(409);
      expect((error as ConflictException).getResponse()).toMatchObject({ code: 'EVENT_CLOSED' });
    }
  });
});

describe('closePreconditions (EVT-26 / VOL-12)', () => {
  it('passes with no volunteers at all', () => {
    expect(closePreconditions(event, [])).toEqual({ ok: true, missingHoursAttendeeIds: [] });
  });

  it('accepts zero hours', () => {
    expect(closePreconditions(event, [{ id: 'a', volunteerMinutes: 0 }]).ok).toBe(true);
  });

  it('names every volunteer still without hours', () => {
    expect(
      closePreconditions(event, [
        { id: 'a', volunteerMinutes: 180 },
        { id: 'b', volunteerMinutes: null },
        { id: 'c', volunteerMinutes: null },
      ]),
    ).toEqual({ ok: false, code: 'HOURS_MISSING', missingHoursAttendeeIds: ['b', 'c'] });
  });

  it('refuses a draft, and refuses to close twice', () => {
    expect(closePreconditions({ status: 'draft' }, [])).toMatchObject({ ok: false, code: 'EVENT_NOT_PUBLISHED' });
    expect(closePreconditions({ status: 'closed' }, [])).toMatchObject({ ok: false, code: 'EVENT_CLOSED' });
  });
});

describe('parseReminderOffsets', () => {
  it.each([
    ['7,1', [7, 1]],
    [' 1 , 7 ,7', [7, 1]],
    ['', []],
    ['0,-2,x,3.5,2', [2]],
    [[1, 14], [14, 1]],
    [null, []],
  ] as const)('%p → %p', (raw, expected) => {
    expect(parseReminderOffsets(raw as never)).toEqual(expected);
  });
});

describe('dueReminder (EVT-07)', () => {
  const start = event.startsAt.getTime();
  const days = (n: number) => n * 24 * 60 * 60 * 1000;

  it('is nothing before the first offset', () => {
    expect(dueReminder(event, [7, 1], new Date(start - days(8)))).toBeNull();
  });

  it('is the 7-day reminder inside the week', () => {
    expect(dueReminder(event, [7, 1], new Date(start - days(6)))).toEqual({
      key: 'd7',
      dueAt: new Date(start - days(7)),
    });
  });

  it('is only the 1-day reminder inside the last day — no burst for a late publish', () => {
    expect(dueReminder(event, [7, 1], new Date(start - days(0.5)))?.key).toBe('d1');
  });

  it('is nothing once the event has started, or unless it is published', () => {
    expect(dueReminder(event, [7, 1], new Date(start))).toBeNull();
    expect(dueReminder({ ...event, status: 'draft' }, [7, 1], new Date(start - days(1)))).toBeNull();
    expect(dueReminder({ ...event, status: 'closed' }, [7, 1], new Date(start - days(1)))).toBeNull();
  });
});

describe('hoursToMinutes', () => {
  it.each([
    [0, 0],
    [3, 180],
    [4.5, 270],
    [0.25, 15],
  ])('%p hours is %i minutes', (hours, minutes) => {
    expect(hoursToMinutes(hours)).toBe(minutes);
  });
});
