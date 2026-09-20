import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from './entities';

/**
 * DataSource used by the TypeORM CLI only (`pnpm migration:generate` /
 * `migration:run`). The running application builds its own connection in
 * `app.module.ts` via `TypeOrmModule.forRootAsync`.
 *
 * `synchronize` stays false here regardless of `DB_SYNCHRONIZE` — the CLI
 * exists to author and run migrations, and a CLI invocation must never alter
 * the schema as a side effect. The running app syncs from the entities when
 * `DB_SYNCHRONIZE` allows it (see `app.module.ts`).
 *
 * `logging` goes the other way and does honour `DB_LOGGING` — but only for
 * `migration:generate`, which is the one that needs it: seeing what it queried
 * is exactly what you want when it reports "No changes in database schema were
 * found". TypeORM's other CLI commands overwrite `logging` themselves before
 * connecting (`migration:show` forces `["schema"]`, `migration:run` forces
 * `["query","error","schema"]`), so the value set here cannot reach them.
 *
 * The CLI does not load `.env`; pass a non-default database — or the logging
 * switch — explicitly:
 *   DB_PATH=data/other.db pnpm --filter @helix-x-rawla/backend migration:run
 *   DB_LOGGING=all pnpm --filter @helix-x-rawla/backend migration:generate …
 */
export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_PATH ?? 'data/helix_x.db',
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  // Off unless asked. Only `all` and `true` are honoured here — the full
  // DB_LOGGING vocabulary lives in `resolveDbLogging` from `@helix-x/backend`,
  // which needs a ConfigService and so cannot be reached outside the Nest
  // container. Same reason `DB_PATH` is read from `process.env` above.
  logging:
    process.env.DB_LOGGING === 'all' ? 'all' : process.env.DB_LOGGING === 'true',
});
