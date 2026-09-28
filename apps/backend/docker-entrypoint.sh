#!/bin/sh
# Rawla backend container entrypoint.
#
# Starts as root only long enough to make the database directory writable,
# then re-runs itself as `node`. A platform's persistent disk or a bind mount
# on a Linux host can arrive owned by root, and SQLite running as `node` would
# then fail with "unable to open database file". The app itself never runs as
# root.
#
# Migrations own the schema (DB_SYNCHRONIZE is off in production), so a fresh
# volume holds no tables until they run. They are idempotent: already applied
# migrations are skipped. Set RUN_MIGRATIONS=false when a separate job runs
# them instead.
set -e

if [ "$(id -u)" = "0" ]; then
  db_dir="$(dirname "${DB_PATH:-/data/helix_x.db}")"
  mkdir -p "$db_dir"
  chown node:node "$db_dir"
  # Files a previous root-run (or a restore) left behind, e.g. -wal/-shm.
  find "$db_dir" -maxdepth 1 ! -user node -exec chown node:node {} + 2>/dev/null || true
  exec setpriv --reuid=node --regid=node --init-groups "$0" "$@"
fi

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "Running database migrations against ${DB_PATH}…"
  node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
fi

exec node dist/main "$@"
