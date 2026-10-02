---
paths:
  - "apps/**"
  - "docs/**"
  - "scripts/**"
  - "package.json"
---

# A change is not done until the guide says so

[`docs/`](../../docs/) is a docsify site in two parts: a **User Guide** for
members and **Setup and Administration** for the people who run the portal.
It ships with the frontend at `/guide/` and is linked from the app (the `help`
plugin), so a stale page is read by members, not only by developers.

Serve it with `pnpm guide` (<http://localhost:4000>) — **not** `pnpm docs`,
which is a built-in npm command.

## Where it goes

| What changed | Update |
| --- | --- |
| A screen a member uses: its labels, steps or rules | the matching page in `docs/guide/` |
| The join flow, a gate, sign-in | `docs/guide/joining.md`, `signing-in.md` |
| Event registration, tickets, payment, cancelling | `docs/guide/registering.md`, `events.md` |
| An officer's screen: applications, chapters, reference data, settings | `docs/setup/admin-membership.md` |
| Event administration, waivers, closing, hours | `docs/setup/admin-events.md` |
| A role, permission or grant (a migration) | `docs/setup/roles.md` |
| A new portal setting | `docs/setup/admin-membership.md#portal-settings` |
| An environment variable or feature flag | `docs/setup/configuration.md` (and `.env.example`) |
| A migration, or how one is applied | `docs/setup/database.md`, and the file table in `apps/backend/migrations/README.md` |
| The images, Compose, nginx, Render | `docs/setup/deploy-docker.md`, `deploy-render.md` |
| A new failure mode and its fix | `docs/setup/troubleshooting.md` |
| A route path the guide's links or the backend's emails name | every page that links to it |

A new page also needs an entry in `docs/_sidebar.md`, or it is unreachable —
docsify has no automatic index.

## What good looks like

- **The User Guide is for members.** Task first, plain words, the labels as
  they appear on screen. No requirement IDs, no file paths, no role names
  beyond "an officer" or "the Membership Secretary".
- **Links are site-absolute** (`/setup/database.md#heading`), never relative
  and never a bare `#anchor` — docsify reads a bare anchor as a page.
- **No secrets.** The site is static and readable by URL without signing in.
  The first-install passwords stay in `apps/backend/migrations/README.md`.
- Describe what the portal does today. A page that promises a feature that is
  not built is worse than a missing page.
