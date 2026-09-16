import { ageInYears } from './member-registration.service';

/**
 * The age gate (REG-17 / IAM-15).
 *
 * The boundary is the whole requirement — "17 years 364 days is rejected;
 * 18 years exactly is accepted" — so it is worth pinning rather than trusting a
 * date library to round the way we assume.
 */
describe('ageInYears', () => {
  const asOf = new Date('2026-09-05T12:00:00Z');

  it('counts a birthday that has already passed this year', () => {
    expect(ageInYears('1985-02-20', asOf)).toBe(41);
  });

  it('does not count a birthday still to come this year', () => {
    expect(ageInYears('1985-12-20', asOf)).toBe(40);
  });

  it('accepts exactly 18 years to the day', () => {
    expect(ageInYears('2008-09-05', asOf)).toBe(18);
  });

  it('rejects one day short of 18', () => {
    expect(ageInYears('2008-09-06', asOf)).toBe(17);
  });

  it('is evaluated in UTC, so a late-evening local time cannot shift it', () => {
    const lateUtc = new Date('2026-09-05T23:59:59Z');
    const earlyUtc = new Date('2026-09-05T00:00:01Z');
    expect(ageInYears('2008-09-05', lateUtc)).toBe(ageInYears('2008-09-05', earlyUtc));
  });

  it('returns NaN for an unparseable date rather than a plausible number', () => {
    expect(Number.isNaN(ageInYears('not-a-date', asOf))).toBe(true);
  });
});
