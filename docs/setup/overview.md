# Overview

The portal is the membership site of a US community organisation with regional
chapters. It is two applications:

| App | What it is | Default address |
|---|---|---|
| Frontend | The website members and officers use | <http://localhost:5173> |
| Backend | The API, the database and the mail and payment integrations | <http://localhost:3001/api> |

Both are built on the Helix-X framework, which supplies sign-in, roles and
permissions, navigation, private documents and the contact form. Everything
about members, chapters, events and volunteers is this product's own.

## What a member is

Someone applies on the **Join** page. They become an **active** member only
when three things are true — the three *gates*:

| Gate | Closed by |
|---|---|
| Email confirmed | The applicant, from the link emailed to them |
| Application approved | An officer, on the Applications screen |
| Dues settled | The applicant paying, or an officer recording an override |

The gates close in any order. Until all three are closed a signed-in applicant
sees only their status page, their profile and the dues payment — the rest of
the portal answers "not yet". The dues gate can be switched off for everyone in
[Portal settings](/setup/admin-membership.md#portal-settings).

## What the portal does

| Area | For members | For officers |
|---|---|---|
| Membership | Join, status, dues | Review applications, overrides |
| Profile | Own details, spouse, children, privacy | Edit members, chapters, reference lists |
| Directory | Find other members | — |
| Events | Browse, register the household, pay | Create, publish, registrations, payments, documents, close |
| Volunteering | Volunteer at sign-up, Top Volunteers | Enter hours, upload certificates |
| Files | Private files, folders, sharing | — |

## Where to go next

- Running it for the first time: [Install and run](/setup/install.md), then
  [Database and migrations](/setup/database.md).
- Putting it on a server: [Deploying with Docker](/setup/deploy-docker.md) or
  [Deploying to Render](/setup/deploy-render.md), then
  [Production, backups and upgrades](/setup/production.md).
- Running the organisation's side of it: [The first sign-in](/setup/first-sign-in.md),
  [Roles and permissions](/setup/roles.md),
  [Administering membership](/setup/admin-membership.md) and
  [Administering events](/setup/admin-events.md).
