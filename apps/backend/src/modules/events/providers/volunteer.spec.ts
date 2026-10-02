import { rankVolunteers, type VolunteerRow } from './volunteer.service';

/**
 * Top Volunteers (VOL-06). The acceptance case is a child with 3 hours at one
 * event appearing with exactly that; the rest pins what "events" counts and
 * how ties break, so the list does not reshuffle between requests.
 */
const row = (patch: Partial<VolunteerRow>): VolunteerRow => ({
  personKey: 'child:arjun',
  fullName: 'Arjun Singh',
  ownerMemberId: 'mem-1',
  isYouth: true,
  minutes: 180,
  startsAt: new Date('2027-03-20T18:00:00Z'),
  ...patch,
});

describe('rankVolunteers', () => {
  it('shows a child with 3 hours at one event as 3 hours, 1 event', () => {
    expect(rankVolunteers([row({})], 'hours')).toEqual([
      {
        personKey: 'child:arjun',
        fullName: 'Arjun Singh',
        ownerMemberId: 'mem-1',
        isYouth: true,
        minutes: 180,
        eventCount: 1,
      },
    ]);
  });

  it('adds a person up across events', () => {
    const [total] = rankVolunteers(
      [row({ minutes: 180 }), row({ minutes: 90, startsAt: new Date('2027-06-01T18:00:00Z') })],
      'hours',
    );
    expect(total).toMatchObject({ minutes: 270, eventCount: 2 });
  });

  it('does not count an event where nothing was served', () => {
    const [total] = rankVolunteers(
      [row({ minutes: 180 }), row({ minutes: 0, startsAt: new Date('2027-06-01T18:00:00Z') })],
      'events',
    );
    expect(total).toMatchObject({ minutes: 180, eventCount: 1 });
  });

  it('leaves out someone with no hours anywhere', () => {
    expect(rankVolunteers([row({ minutes: 0 })], 'hours')).toEqual([]);
  });

  it('ranks by hours, or by events, with the other metric breaking ties', () => {
    const rows = [
      row({ personKey: 'a', fullName: 'A', minutes: 300 }),
      row({ personKey: 'b', fullName: 'B', minutes: 100 }),
      row({ personKey: 'b', fullName: 'B', minutes: 100, startsAt: new Date('2027-06-01T18:00:00Z') }),
      row({ personKey: 'c', fullName: 'C', minutes: 100 }),
      row({ personKey: 'c', fullName: 'C', minutes: 150, startsAt: new Date('2027-06-01T18:00:00Z') }),
    ];
    expect(rankVolunteers(rows, 'hours').map((t) => t.personKey)).toEqual(['a', 'c', 'b']);
    expect(rankVolunteers(rows, 'events').map((t) => t.personKey)).toEqual(['c', 'b', 'a']);
  });

  it('breaks a full tie by name, so the order is stable', () => {
    const rows = [row({ personKey: 'z', fullName: 'Zara' }), row({ personKey: 'm', fullName: 'Meera' })];
    expect(rankVolunteers(rows, 'hours').map((t) => t.fullName)).toEqual(['Meera', 'Zara']);
  });

  it("takes the name and youth flag from the person's most recent event", () => {
    const [total] = rankVolunteers(
      [
        row({ isYouth: true, startsAt: new Date('2027-03-20T18:00:00Z') }),
        row({ isYouth: false, fullName: 'Arjun S. Singh', startsAt: new Date('2029-03-20T18:00:00Z') }),
      ],
      'hours',
    );
    expect(total).toMatchObject({ isYouth: false, fullName: 'Arjun S. Singh' });
  });
});
