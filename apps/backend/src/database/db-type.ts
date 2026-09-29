import type { ColumnType } from 'typeorm';

/**
 * The database driver, chosen by `DB_TYPE`: `sqlite` (the default) or `postgres`.
 *
 * Read from `process.env` at call time, and some callers are entity decorators,
 * which run when the entity file is first imported — before `ConfigModule`
 * would have loaded `.env`. That is why `src/load-env.ts` is imported first in
 * `main.ts` and `data-source.ts`.
 *
 * Everything that has to differ between the two drivers lives here, so an
 * entity never branches on the driver itself. See
 * `.claude/rules/database-migrations.md` for the rules this supports.
 */
export type DbType = 'sqlite' | 'postgres';

export function dbType(): DbType {
  const raw = (process.env.DB_TYPE ?? 'sqlite').trim().toLowerCase();
  if (raw === 'sqlite' || raw === 'postgres') return raw;
  throw new Error(`DB_TYPE must be "sqlite" or "postgres", got "${process.env.DB_TYPE}".`);
}

export const isPostgres = (): boolean => dbType() === 'postgres';

/**
 * Column type for a foreign key to a `@PrimaryGeneratedColumn('uuid')`.
 *
 * Postgres makes those keys native `uuid`, and a `text` FK pointing at one is
 * rejected ("incompatible types"). SQLite keeps `text`, exactly as its
 * migrations created it — changing it would be a schema change there.
 */
export const uuidRef = (): ColumnType => (isPostgres() ? 'uuid' : 'text');

/**
 * `CHK_member_active_implies_gates`, per driver.
 *
 * SQLite stores booleans as 0/1 and compares them to integers; Postgres has a
 * real boolean and rejects `= 0`. The column names are the camelCase ones
 * TypeORM emits, quoted.
 */
export function memberActiveCheck(): string {
  return isPostgres()
    ? `NOT "isActive" OR ("isEmailVerified" AND "isApproved" AND "status" NOT IN ('rejected','archived'))`
    : `"isActive" = 0 OR ("isEmailVerified" = 1 AND "isApproved" = 1 AND "status" NOT IN ('rejected','archived'))`;
}

/**
 * Whether a query failed on a UNIQUE constraint. SQLite reports it only in the
 * message; Postgres sets SQLSTATE 23505 on the driver error.
 */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { message?: string; code?: string; driverError?: { code?: string } };
  return (
    e?.driverError?.code === '23505' ||
    e?.code === '23505' ||
    /UNIQUE constraint failed/i.test(e?.message ?? '')
  );
}
