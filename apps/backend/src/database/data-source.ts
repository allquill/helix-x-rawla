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
 * The CLI does not load `.env`; pass a non-default database explicitly:
 *   DB_PATH=data/other.db pnpm --filter @helix-x/demo-backend migration:run
 */
export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_PATH ?? 'data/helix_x.db',
  entities: ALL_ENTITIES,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
});
