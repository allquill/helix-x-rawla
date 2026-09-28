# Bundled sample database

> Full reference: [DEPLOY.md §5](../../../DEPLOY.md#5-the-sample-database).

`helix_x.db` here is copied into the backend image at `/opt/rawla/seed/`. When
a container starts with **`SEED_SAMPLE_DB=true`** and its database file does
not exist yet, the entrypoint copies this one into place and then runs any
newer migrations over it. An existing database is never touched.

It is generated, never hand-edited:

```bash
pnpm build
pnpm docker:sample-db        # rewrites apps/backend/seed/helix_x.db
pnpm docker:build:backend    # or docker:push, to bundle the new copy
```

`scripts/build-sample-db.mjs` migrates an empty database, serves it from a
throwaway backend, and fills it through the API with
`scripts/seed-sample-data.mjs`. It then clears captured mail, links, lockouts
and tokens.

**Published credentials — demo use only.**

| Sign in as | Password |
|---|---|
| `admin@example.com` | `Password!1` |
| `<first>.<last>@example.test` (verified sample members) | `Rawla!Demo1` |

Anyone who has read this file can sign in to a portal seeded from it. Never
enable `SEED_SAMPLE_DB` on a real deployment, and change the admin password
straight away on a public demo.

If `helix_x.db` is absent, the image still builds. `SEED_SAMPLE_DB=true` then
logs a warning and the backend starts on an empty, migrated database.
