import '../load-env';
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { connectionOptions } from './connection';
import { ALL_ENTITIES } from './entities';

/**
 * DataSource for the TypeORM CLI, used for one command only: `schema:log`
 * (`pnpm db:schema:log`). It prints the SQL that would make the connected
 * database match the entities — or "Your schema is up to date".
 *
 * That is how a numbered migration is drafted (run it against a database at the
 * previous version, then review and adapt the SQL) and how drift is checked
 * (after applying every migration to a fresh database it must be up to date).
 * The schema itself is owned by apps/backend/migrations/*.sql, applied by hand;
 * nothing here ever changes a database. See .claude/rules/database-migrations.md.
 *
 * The driver follows DB_TYPE (see connection.ts), and `.env` is loaded first
 * (load-env.ts); variables set inline win:
 *   DB_PATH=/tmp/check.db pnpm db:schema:log
 *   DB_TYPE=postgres DATABASE_URL=postgres://… pnpm db:schema:log
 */
export const AppDataSource = new DataSource({
  ...connectionOptions((key) => process.env[key]),
  entities: ALL_ENTITIES,
  synchronize: false,
  logging:
    process.env.DB_LOGGING === 'all' ? 'all' : process.env.DB_LOGGING === 'true',
});
