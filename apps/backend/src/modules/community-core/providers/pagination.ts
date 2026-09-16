/**
 * Coerce a paging value that arrived from a query string.
 *
 * Nest's `transform: true` turns an *absent* numeric query parameter into
 * `NaN` rather than leaving it undefined, and TypeORM rejects a NaN `take`
 * with a 500. Guarding here means every caller is safe, not just the ones that
 * remembered.
 *
 * This lives in its own file rather than beside its first caller because both
 * `MemberService` and `AuditService` need it. Exporting it from
 * `member.service.ts` — where it started — made those two modules import each
 * other, and a require cycle resolves one side to `undefined` at load time.
 * What broke was not the helper but the *class*: `AuditService` came back
 * undefined in `MemberService`'s `design:paramtypes`, and Nest reported it as
 * "can't resolve dependencies ... at index [6]", which points at the injector
 * rather than at the cycle that actually caused it.
 */
export function clampPage(value: unknown, fallback: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}
