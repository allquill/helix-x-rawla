import { EVENT_TEMPLATES } from '../constants';
import type { BroadcastChannel } from './broadcast-channel';
import { EventNotificationRunner } from './event-notification.runner';

/**
 * Invitations and reminders (EVT-22 / EVT-07).
 *
 * What matters here is what must never happen: a message sent twice, one bad
 * address stopping a broadcast, an opted-out member being mailed. The log
 * table's unique index is faked faithfully — a second insert of the same key
 * fails exactly as the database's would.
 */
const NOW = new Date('2027-03-01T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

function build(options: {
  members?: Array<{ id: string; firstName: string; email: string; optedIn?: boolean }>;
  spouses?: Array<{ id: string; memberId: string; firstName: string; email: string | null }>;
  registrations?: Array<{ id: string; purchaserMemberId: string; createdAt: Date; totalCents: number; paidCents: number }>;
  startsInDays?: number;
  batchSize?: string;
  failFor?: string[];
}) {
  const event = {
    id: 'evt-1',
    title: 'Holi Milan',
    status: 'published',
    startsAt: new Date(NOW.getTime() + (options.startsInDays ?? 30) * DAY),
    timezone: 'America/Chicago',
    venue: 'Community Hall',
    description: null,
    attireGuide: 'White kurta',
    registrationClosesOn: '2027-03-20',
    reminderOffsetsDays: null as number[] | null,
    invitationCompletedAt: null as Date | null,
  };
  const members = options.members ?? [];
  const log: Array<Record<string, unknown>> = [];
  const sent: Array<{ to: string; template: string; variables: Record<string, unknown> }> = [];

  const keyOf = (row: Record<string, unknown>) =>
    [row.eventId, row.kind, row.scheduleKey, row.channel, row.recipientKey].join('|');
  const logRepo = {
    create: (row: Record<string, unknown>) => ({ id: `log-${log.length + 1}`, ...row }),
    save: jest.fn(async (row: Record<string, unknown>) => {
      if (log.some((existing) => keyOf(existing) === keyOf(row))) {
        throw new Error('UNIQUE constraint failed: event_notification_log');
      }
      log.push(row);
      return row;
    }),
    update: jest.fn(async ({ id }: { id: string }, patch: Record<string, unknown>) => {
      Object.assign(log.find((row) => row.id === id) ?? {}, patch);
    }),
    find: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
      log.filter((row) => Object.entries(where).every(([k, v]) => row[k] === v)),
    ),
    createQueryBuilder: () => {
      const qb = {
        select: () => qb,
        addSelect: () => qb,
        where: () => qb,
        groupBy: () => qb,
        getRawMany: async () => [],
      };
      return qb;
    },
  };
  const memberQb = {
    innerJoin: () => memberQb,
    select: () => memberQb,
    addSelect: () => memberQb,
    where: () => memberQb,
    andWhere: () => memberQb,
    orderBy: () => memberQb,
    getRawMany: async () =>
      members.map((m) => ({ ...m, phone: null, optedIn: m.optedIn ?? true })),
  };
  const eventRepo = {
    find: jest.fn(async () => [event]),
    update: jest.fn(async (_criteria: unknown, patch: Partial<typeof event>) => {
      if (event.invitationCompletedAt) return { affected: 0 };
      Object.assign(event, patch);
      return { affected: 1 };
    }),
  };
  const email: BroadcastChannel = {
    key: 'email',
    isConfigured: () => true,
    addressOf: (r) => r.email?.trim().toLowerCase() || null,
    send: jest.fn(async (to, template, variables) => {
      if (options.failFor?.includes(to)) throw new Error('mailbox unavailable');
      sent.push({ to, template, variables });
    }),
  };
  const sms: BroadcastChannel = {
    key: 'sms',
    isConfigured: () => false,
    addressOf: () => null,
    send: jest.fn(),
  };
  const audit = { record: jest.fn(async () => ({})) };
  const settings: Record<string, string> = {
    'events.broadcast_batch_size': options.batchSize ?? '50',
    'events.reminder_offsets_days': '7,1',
  };

  const runner = new EventNotificationRunner(
    { get: () => undefined } as never,
    eventRepo as never,
    logRepo as never,
    { find: async () => options.registrations?.map((r) => ({ ...r, eventId: 'evt-1', currency: 'USD' })) ?? [] } as never,
    { find: async () => [] } as never,
    {
      createQueryBuilder: () => memberQb,
      find: async () =>
        members.map((m) => ({ id: m.id, userId: Number(m.id.slice(1)), firstName: m.firstName, phone: null, eventEmailOptIn: m.optedIn ?? true })),
    } as never,
    { find: async () => options.spouses ?? [] } as never,
    { find: async () => members.map((m) => ({ id: Number(m.id.slice(1)), email: m.email })) } as never,
    { setting: (key: string) => settings[key] } as never,
    audit as never,
    email as never,
    sms as never,
  );
  return { runner, event, log, sent, audit, sms };
}

const people = [
  { id: 'm1', firstName: 'Vikram', email: 'vikram@example.test' },
  { id: 'm2', firstName: 'Pooja', email: 'Pooja@Example.test' },
];

describe('EventNotificationRunner — invitations (EVT-22)', () => {
  it('invites every active member and spouse once, then marks the event complete', async () => {
    const { runner, sent, event, audit } = build({
      members: people,
      spouses: [{ id: 's1', memberId: 'm1', firstName: 'Padmini', email: 'padmini@example.test' }],
    });
    await runner.runOnce(NOW);

    expect(sent.map((m) => m.to).sort()).toEqual([
      'padmini@example.test',
      'pooja@example.test',
      'vikram@example.test',
    ]);
    expect(sent.every((m) => m.template === EVENT_TEMPLATES.INVITATION)).toBe(true);
    expect(event.invitationCompletedAt).toBeInstanceOf(Date);
    expect(audit.record).toHaveBeenCalledTimes(1);
  });

  it('sends nothing more on a later pass', async () => {
    const { runner, sent } = build({ members: people });
    await runner.runOnce(NOW);
    await runner.runOnce(NOW);
    await runner.runOnce(NOW);
    expect(sent).toHaveLength(2);
  });

  it('invites a couple who share an address once', async () => {
    const { runner, sent } = build({
      members: [people[0]],
      spouses: [{ id: 's1', memberId: 'm1', firstName: 'Padmini', email: 'VIKRAM@example.test' }],
    });
    await runner.runOnce(NOW);
    expect(sent).toHaveLength(1);
  });

  it('skips a recipient another instance has already claimed', async () => {
    const { runner, sent, log } = build({ members: people });
    // The other instance's claim, landed between this one's read and its insert.
    log.push({
      id: 'other',
      eventId: 'evt-1',
      kind: 'invitation',
      scheduleKey: 'publish',
      channel: 'email',
      recipientKey: 'vikram@example.test',
      status: 'claimed',
    });
    const find = (runner as unknown as { logRepo: { find: jest.Mock } }).logRepo.find;
    find.mockResolvedValueOnce([]);
    await runner.runOnce(NOW);
    expect(sent.map((m) => m.to)).toEqual(['pooja@example.test']);
  });

  it('carries on past an address that fails, and records the failure', async () => {
    const { runner, sent, log, event } = build({ members: people, failFor: ['vikram@example.test'] });
    await runner.runOnce(NOW);
    expect(sent.map((m) => m.to)).toEqual(['pooja@example.test']);
    expect(log.find((row) => row.recipientKey === 'vikram@example.test')).toMatchObject({
      status: 'failed',
      error: 'mailbox unavailable',
    });
    // At most once: a failed address is not retried into a second copy.
    expect(event.invitationCompletedAt).toBeInstanceOf(Date);
  });

  it('never mails a member who has opted out, nor their spouse, and logs both', async () => {
    const { runner, sent, log } = build({
      members: [{ ...people[0], optedIn: false }, people[1]],
      spouses: [{ id: 's1', memberId: 'm1', firstName: 'Padmini', email: 'padmini@example.test' }],
    });
    await runner.runOnce(NOW);
    expect(sent.map((m) => m.to)).toEqual(['pooja@example.test']);
    expect(log.filter((row) => row.status === 'skipped_opt_out')).toHaveLength(2);
  });

  it('works through a large community one batch per pass', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({ id: `m${i + 1}`, firstName: `M${i}`, email: `m${i}@example.test` }));
    const { runner, sent, event } = build({ members: many, batchSize: '2' });
    await runner.runOnce(NOW);
    expect(sent).toHaveLength(2);
    expect(event.invitationCompletedAt).toBeNull();
    await runner.runOnce(NOW);
    await runner.runOnce(NOW);
    expect(sent).toHaveLength(5);
    await runner.runOnce(NOW);
    expect(event.invitationCompletedAt).toBeInstanceOf(Date);
    expect(sent).toHaveLength(5);
  });

  it('does not invite anyone once registration has closed', async () => {
    const { runner, sent, event } = build({ members: people });
    event.registrationClosesOn = '2027-02-01';
    await runner.runOnce(NOW);
    expect(sent).toHaveLength(0);
  });

  it('leaves the unconfigured SMS channel alone', async () => {
    const { runner, sms } = build({ members: people });
    await runner.runOnce(NOW);
    expect(sms.send).not.toHaveBeenCalled();
  });
});

describe('EventNotificationRunner — reminders (EVT-07)', () => {
  const registered = (daysAgo: number, paidCents = 5000) => [
    { id: 'reg-1', purchaserMemberId: 'm1', createdAt: new Date(NOW.getTime() - daysAgo * DAY), totalCents: 5000, paidCents },
  ];

  it('sends nothing while the first reminder is not yet due', async () => {
    const { runner, sent } = build({ members: [people[0]], registrations: registered(20), startsInDays: 30 });
    await runner.runOnce(NOW);
    expect(sent.filter((m) => m.template === EVENT_TEMPLATES.REMINDER)).toHaveLength(0);
  });

  it('reminds a registered household once, with the attire guide', async () => {
    const { runner, sent } = build({ members: [people[0]], registrations: registered(20), startsInDays: 6 });
    await runner.runOnce(NOW);
    await runner.runOnce(NOW);
    const reminders = sent.filter((m) => m.template === EVENT_TEMPLATES.REMINDER);
    expect(reminders).toHaveLength(1);
    expect(reminders[0]).toMatchObject({ to: 'vikram@example.test' });
    expect(reminders[0].variables).toMatchObject({ attireGuide: 'White kurta', balance: null });
  });

  it('mentions an unpaid balance', async () => {
    const { runner, sent } = build({ members: [people[0]], registrations: registered(20, 1000), startsInDays: 6 });
    await runner.runOnce(NOW);
    const [reminder] = sent.filter((m) => m.template === EVENT_TEMPLATES.REMINDER);
    expect(reminder.variables.balance).toBe('$40.00');
  });

  it('does not remind a household that registered after the reminder fell due', async () => {
    // Due yesterday (start in 6 days, offset 7); registered an hour ago.
    const { runner, sent } = build({ members: [people[0]], registrations: registered(1 / 24), startsInDays: 6 });
    await runner.runOnce(NOW);
    expect(sent.filter((m) => m.template === EVENT_TEMPLATES.REMINDER)).toHaveLength(0);
  });

  it('sends the 1-day reminder separately from the 7-day one', async () => {
    const { runner, sent, event } = build({ members: [people[0]], registrations: registered(20), startsInDays: 6 });
    await runner.runOnce(NOW);
    event.startsAt = new Date(NOW.getTime() + 0.5 * DAY);
    await runner.runOnce(NOW);
    expect(sent.filter((m) => m.template === EVENT_TEMPLATES.REMINDER)).toHaveLength(2);
  });
});
