#!/bin/sh
# Rawla backend container entrypoint.
#
# Migrations own the schema (DB_SYNCHRONIZE is off in production), so a fresh
# /data volume holds no tables until they run. They are idempotent: already
# applied migrations are skipped. Set RUN_MIGRATIONS=false when a separate job
# runs them instead.
set -e

if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then
  echo "Running database migrations against ${DB_PATH}…"
  node node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run
fi

exec node dist/main "$@"
