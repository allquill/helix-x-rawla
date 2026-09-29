import { dbType, isUniqueViolation, memberActiveCheck, uuidRef } from './db-type';

/**
 * The per-driver switches (see db-type.ts). SQLite's values are pinned exactly:
 * they must match what migrations/sqlite/0001_baseline.sql created, or
 * `pnpm db:schema:log` on SQLite would start reporting changes that are not real.
 */
describe('db-type', () => {
  const original = process.env.DB_TYPE;
  afterEach(() => {
    if (original === undefined) delete process.env.DB_TYPE;
    else process.env.DB_TYPE = original;
  });

  it('defaults to sqlite and rejects unknown drivers', () => {
    delete process.env.DB_TYPE;
    expect(dbType()).toBe('sqlite');
    process.env.DB_TYPE = 'mysql';
    expect(() => dbType()).toThrow(/DB_TYPE/);
  });

  it('keeps SQLite exactly as its migrations created it', () => {
    process.env.DB_TYPE = 'sqlite';
    expect(uuidRef()).toBe('text');
    expect(memberActiveCheck()).toBe(
      `"isActive" = 0 OR ("isEmailVerified" = 1 AND "isApproved" = 1 AND "status" NOT IN ('rejected','archived'))`,
    );
  });

  it('uses native uuid foreign keys and boolean logic on Postgres', () => {
    process.env.DB_TYPE = 'postgres';
    expect(uuidRef()).toBe('uuid');
    expect(memberActiveCheck()).not.toMatch(/= [01]\b/);
  });

  it('recognises a unique violation from either driver', () => {
    expect(isUniqueViolation({ message: 'UNIQUE constraint failed: users.email' })).toBe(true);
    expect(isUniqueViolation({ message: 'duplicate key', driverError: { code: '23505' } })).toBe(true);
    expect(isUniqueViolation({ message: 'boom', driverError: { code: '23503' } })).toBe(false);
  });
});
