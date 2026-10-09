// First: entity decorators read DB_TYPE at import time (see load-env.ts).
import '../load-env';
import { migrateDatabase } from '@helix-x/backend';
import { connectionOptions } from './connection';
import { schemaTracks } from './schema-version';

/**
 * `pnpm db:migrate` (`node dist/database/migrate-cli.js` in the image) —
 * applies every pending migration, the framework's `helix-x` track then
 * `rawla`, to the database in .env, or to DB_PATH / DATABASE_URL given
 * inline, then exits. Safe to re-run: with nothing pending it changes nothing.
 * The work is `migrateDatabase` from @helix-x/backend (a SQLite backup copy
 * first, a Postgres advisory lock around it); DB_AUTO_MIGRATE=true runs the
 * same at startup.
 */
migrateDatabase(connectionOptions((key) => process.env[key]), schemaTracks()).then(
  () => process.exit(0),
  (error: Error) => {
    console.error(`\ndb:migrate failed: ${error.message}\nThe database is at the last migration that completed.\n`);
    process.exit(1);
  },
);
