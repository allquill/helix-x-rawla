# The first sign-in

A freshly migrated database has no members, but it does have two
administrators so that somebody can sign in.

| Account | Roles |
|---|---|
| `admin@example.com` | `admin` |
| `superadmin@example.com` | `super_admin`, `admin` |

Their first passwords are published in the repository — in the app's
`0001_baseline.sql` migration and in `apps/backend/migrations/README.md` — and
are deliberately not repeated here. **Change both before anyone else can reach
the portal.**

## Do these four things


1. **Sign in as `admin@example.com` and change both administrators'
   passwords.** They're published in this repository.
2. **Give real people roles** in `/admin/users`, or from a shell:

   ```bash
   sqlite3 -bail apps/backend/data/helix_x.db "INSERT OR IGNORE INTO user_roles (user_id, role_id)
     SELECT u.id, r.id FROM users u, roles r WHERE u.email = lower('you@example.com') AND r.name = 'super_admin';"
   # PostgreSQL: the same INSERT … SELECT with ON CONFLICT DO NOTHING instead of OR IGNORE
   ```

   Then sign out and back in, because roles are baked into the JWT at login.
3. **Set the chapter contact emails** in `/admin/chapters` (they ship empty),
   and extend the reference lists under master data.
4. **Deactivate the two built-in administrators** once real ones exist, if
   you prefer.

## Why a new role does not show up at once

Roles and permissions are written into the session when someone signs in, and
a session is not refreshed. After you grant a role — or after a migration adds
permissions — the person must **sign out and sign back in** before the screens
that depend on it appear. This is the single most common "it is not working"
report; see [Troubleshooting](/setup/troubleshooting.md).

Which role to give whom is in [Roles and permissions](/setup/roles.md).
