import { canViewLevel, eventDocumentLevel, type DocLevel } from './doc-level-rules';

/**
 * DOC-06: the portal enforces the security level itself. The table below is
 * the whole access matrix, one row per seeded role.
 */
describe('canViewLevel', () => {
  //                         role                    L1     L2     L4     L5
  const matrix: Array<[string, boolean, boolean, boolean, boolean]> = [
    ['super_admin', true, true, true, true],
    ['admin', true, true, true, false],
    ['general_secretary', true, true, true, true],
    ['finance_secretary', true, true, true, true],
    ['membership_secretary', true, true, true, false],
    ['president', true, false, false, false],
    ['chapter_lead', true, false, false, false],
    ['mentor', true, false, false, false],
    ['member', true, false, false, false],
    ['youth_member', true, false, false, false],
  ];

  it.each(matrix)('%s', (role, l1, l2, l4, l5) => {
    const viewer = { roles: [role] };
    expect(([1, 2, 4, 5] as DocLevel[]).map((level) => canViewLevel(level, viewer))).toEqual([
      l1,
      l2,
      l4,
      l5,
    ]);
  });

  it('lets a member open a personal document filed under their own profile', () => {
    expect(canViewLevel(2, { roles: ['member'], isOwner: true })).toBe(true);
  });

  it('never lets ownership open a leadership or finance document', () => {
    expect(canViewLevel(4, { roles: ['member'], isOwner: true })).toBe(false);
    expect(canViewLevel(5, { roles: ['admin'], isOwner: true })).toBe(false);
  });

  it('takes the widest of several roles', () => {
    expect(canViewLevel(5, { roles: ['admin', 'super_admin'] })).toBe(true);
    expect(canViewLevel(5, { roles: ['chapter_lead', 'finance_secretary'] })).toBe(true);
  });
});

describe('eventDocumentLevel', () => {
  it('is leadership while the event is open and finance-restricted once closed', () => {
    expect(eventDocumentLevel({ status: 'draft' })).toBe(4);
    expect(eventDocumentLevel({ status: 'published' })).toBe(4);
    expect(eventDocumentLevel({ status: 'closed' })).toBe(5);
  });

  it('locks a membership secretary and an admin out at close (EVT-24)', () => {
    const closed = eventDocumentLevel({ status: 'closed' });
    expect(canViewLevel(closed, { roles: ['membership_secretary'] })).toBe(false);
    expect(canViewLevel(closed, { roles: ['admin'] })).toBe(false);
    expect(canViewLevel(closed, { roles: ['finance_secretary'] })).toBe(true);
  });
});
