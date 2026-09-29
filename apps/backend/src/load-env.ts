/**
 * Load `.env` into `process.env` before anything else is imported.
 *
 * Entity decorators read `DB_TYPE` (see `database/db-type.ts`) when their files
 * are first imported, which happens before `ConfigModule.forRoot()` would load
 * `.env`. Importing this module first closes that gap.
 *
 * `process.loadEnvFile` (Node 20.12+) never overrides a variable that is
 * already set, so real environment variables — Docker, Render — still win,
 * exactly as they do with ConfigModule. A missing `.env` is normal in
 * containers and is ignored.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env in the working directory.
}
