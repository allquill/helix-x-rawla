// First: entity decorators read DB_TYPE at import time (see load-env.ts).
import '../load-env';
import { runMigrations } from './migrate';

/**
 * `pnpm db:migrate` — applies every pending migration (framework track, then
 * this app's) to the database in .env, or to DB_PATH / DATABASE_URL given
 * inline, then exits. Safe to re-run: with nothing pending it changes nothing.
 * See src/database/migrate.ts.
 */
runMigrations().then(
  () => process.exit(0),
  (error: Error) => {
    console.error(`\ndb:migrate failed: ${error.message}\nThe database is at the last migration that completed.\n`);
    process.exit(1);
  },
);
