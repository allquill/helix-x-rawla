#!/bin/sh
# Rawla backend container entrypoint.
#
# Starts as root only long enough to make the database and documents directories writable,
# then re-runs itself as `node`. A platform's persistent disk or a bind mount
# on a Linux host can arrive owned by root, and SQLite running as `node` would
# then fail with "unable to open database file". The app itself never runs as
# root.
#
# The schema is owned by the numbered SQL files in /opt/migrations/helix-x/
# (the framework's, from @helix-x/backend) and /opt/migrations/rawla/
# (apps/backend/migrations/), in that order. The app checks schema_migrations
# before it starts and refuses — with the exact commands to run — when either
# is missing a migration. With DB_AUTO_MIGRATE=true the app applies the pending
# files itself first (ensureSchema, from @helix-x/backend); nothing here changes.
set -e

# DB_TYPE=postgres keeps no file under /data: the ownership fix below is
# SQLite-only.
is_sqlite=true
[ "${DB_TYPE:-sqlite}" = "postgres" ] && is_sqlite=false

# Uploaded documents, when they are kept on disk (DOCUMENTS_STORAGE_DRIVER=local,
# the default). Same ownership problem as the database directory, but it applies
# under PostgreSQL too. Not recursive: everything below it is written as `node`.
if [ "$(id -u)" = "0" ] && [ "${DOCUMENTS_STORAGE_DRIVER:-local}" = "local" ]; then
  documents_dir="${DOCUMENTS_LOCAL_ROOT:-data/documents}"
  mkdir -p "$documents_dir"
  chown node:node "$documents_dir"
fi

if [ "$(id -u)" = "0" ] && [ "$is_sqlite" = true ]; then
  db_dir="$(dirname "${DB_PATH:-/data/helix_x.db}")"
  mkdir -p "$db_dir"
  chown node:node "$db_dir"
  # Files a previous root-run (or a restore) left behind, e.g. -wal/-shm.
  find "$db_dir" -maxdepth 1 ! -user node -exec chown node:node {} + 2>/dev/null || true
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
elif [ "$(id -u)" = "0" ]; then
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

# DB_MAINTENANCE=true: keep the container up WITHOUT starting the app, so an
# operator can open a shell (docker exec) and apply migrations by
# hand — the app itself refuses to start on a database that is behind, which
# would otherwise leave nothing running to shell into. Turn it off and restart.
if [ "${DB_MAINTENANCE:-false}" = "true" ]; then
  echo "DB_MAINTENANCE: the app is NOT running. To apply every pending migration, from a shell:"
  echo "  node dist/database/migrate-cli.js"
  echo "Or one file at a time — for a new SQLite database:"
  echo "  for f in ${MIGRATIONS_DIR:-/opt/migrations}/helix-x/sqlite/*.sql ${MIGRATIONS_DIR:-/opt/migrations}/rawla/sqlite/*.sql; do"
  echo "    sqlite3 -bail ${DB_PATH:-/data/helix_x.db} < \"\$f\" || break; done"
  echo "To upgrade, apply only the newer files, each by its full name."
  echo "then set DB_MAINTENANCE=false and restart."
  exec sleep infinity
fi

exec node dist/main "$@"
