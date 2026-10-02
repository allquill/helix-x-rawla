# Sample data

Development only: sample members and everything that hangs off them, created through the API.


`pnpm seed:sample` (`scripts/seed-sample-data.mjs`) needs a **running
backend** on a **fully migrated** database. It adds 21 members across the
five chapters and all eight statuses, with households, spouses, children,
reference contacts, life events and a real audit trail. Everything goes
through the HTTP API, because members carry derived state (password hashes,
the activation CHECK, `RRA-` ids, status history) that hand-written INSERTs
get wrong.

| Where the database is | Command |
|---|---|
| Local SQLite | `pnpm seed:sample` |
| Local PostgreSQL | `DB_TYPE=postgres DATABASE_URL='postgresql://…' pnpm seed:sample` |
| Compose, SQLite | `API=http://localhost/api DB_CONTAINER=rawla-portal-backend-1 pnpm seed:sample` |
| Compose, PostgreSQL | `API=http://localhost/api DB_TYPE=postgres DB_CONTAINER=rawla-portal-postgres-1 pnpm seed:sample` |

- **Refuses to run over existing members.** `-- --reset` replaces them. It
  clears sample rows only, and keeps the migrations' rows and the two
  administrators. `audit_logs` stays, because it's append-only.
- **Refuses an unprepared database.** It first checks the state map,
  navigation and reference values. If any are missing, it stops with
  "Configuration missing — apply the migrations" and writes nothing.
- **Environment:**

  | Variable | Default | Purpose |
  |---|---|---|
  | `API` | `http://localhost:3001/api` | The running backend |
  | `DB_TYPE` | `sqlite` | `postgres` for PostgreSQL |
  | `DB` | `apps/backend/data/helix_x.db` (`/data/helix_x.db` with `DB_CONTAINER`) | SQLite file |
  | `DATABASE_URL` | none | PostgreSQL connection. With `DB_CONTAINER`, as seen from inside that container, or unset to use its `POSTGRES_USER`/`POSTGRES_DB` |
  | `DB_CONTAINER` | none | Run the script's SQL inside this container |
  | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | `admin@example.com`, *(in `0001_baseline.sql`)* | An **existing** administrator to sign in as. Set these if you changed the password. |

- **Sample sign-ins:** every member is `<first>.<last>@example.test` /
  `Rawla!Demo1`, e.g. `vikram.singh@example.test` (active, with a family),
  `bhavani.gehlot@…` (awaiting dues) and `ajay.parmar@…` (awaiting approval).
