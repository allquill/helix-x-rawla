-- =============================================================================
-- admin-seed.sql
--
-- Bootstrap script for the users / roles / permissions schema owned by
-- AuthModule (packages/framework/backend/authentication) and edited through the
-- admin-ui module. Idempotent — every statement is INSERT OR IGNORE, so it is
-- safe to re-run after adding a module or changing entities.
--
-- What it does:
--   1. Inserts the four permissions that backend guards actually enforce.
--   2. Inserts the roles: super_admin, admin, navigation_manager, user.
--   3. Grants permissions to those roles.
--   4. Assigns the 'admin' role to the user whose email matches :admin_email.
--   5. Inserts sample users — ON by default, see :seed_sample_users below.
--
-- BEFORE RUNNING: edit :admin_email below to your real admin user. That user
-- must already exist in `users` (register via the API or the auth UI first) —
-- or leave :seed_sample_users at 'yes' and use the seeded admin@example.com.
--
-- Run:
--   sqlite3 apps/backend/data/helix_x.db < apps/backend/sql/admin-seed.sql
--
-- AFTER RUNNING: log out and back in. Roles and permissions are baked into the
-- JWT at login and there is no refresh flow, so a live session will not see a
-- newly granted permission.
-- =============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- ⚠  CHANGE THIS to the email of the user you want to grant admin to.
-- ────────────────────────────────────────────────────────────────────────────
.parameter set :admin_email 'admin@example.com'

-- ────────────────────────────────────────────────────────────────────────────
-- Sample users. 'no' (the default) skips section 5 entirely, so this script
-- stays safe to run against a real database — the guard is a WHERE clause on
-- every sample INSERT, not a comment you have to remember to re-add.
-- Set to 'yes' for a local or demo database only: it creates five accounts
-- that all share one published password.
-- ────────────────────────────────────────────────────────────────────────────
.parameter set :seed_sample_users 'yes'

.headers on
.mode column

BEGIN TRANSACTION;

-- ── 1. Permissions ─────────────────────────────────────────────────────────
-- Only permissions a guard actually reads are seeded. Each one below is
-- enforced server-side and, except where noted, also gates the matching nav
-- item client-side. Adding a name here that no @Permissions() decorator or
-- NavItem references gives the admin UI a checkbox that does nothing.
--
--   users:manage        AdminUsersController        + /admin/users
--   roles:manage        AdminRolesController        + /admin/roles
--   permissions:manage  AdminPermissionsController  + /admin/permissions
--   navigation:manage   NavigationAdminController   + /admin/navigation
--   members:read        MemberController            + /members, /members/:id
--   registration:read   RegistrationAdminController + /admin/registrations
--   chapters:manage     PortalAdminController       + /admin/chapters
--   masterdata:manage   PortalAdminController       + /admin/reference-data
--   settings:manage     PortalAdminController       + /admin/portal-settings
--   audit:read          PortalAdminController       + /admin/audit
--
-- The portal permissions are the odd ones out in the other direction: they
-- belong to a module this APPLICATION owns (apps/backend/src/modules/community-core), not to
-- @helix-x/backend. A permission does not care where the guard reading it
-- lives, which is the whole reason an app-local module needs no framework
-- change. See docs/backend/modules.md.
--
-- OAuth client management (/oauth-clients) is the odd one out: it is guarded
-- by @Roles('admin'), a role check with no permission of its own, which is why
-- no oauth:* permission appears here.
INSERT OR IGNORE INTO permissions (name, description) VALUES
  ('users:manage',       'Manage user accounts (list, edit, enable/disable, delete, assign roles)'),
  ('roles:manage',       'Manage roles (create, edit, delete, assign permissions)'),
  ('permissions:manage', 'Manage permissions (create, edit, delete)'),
  ('navigation:manage',  'Configure application navigation (show, hide or disable routes per surface)'),
  -- Portal permissions, owned by apps/backend/src/modules/community-core.
  -- These are ALSO inserted by the CommunityCoreSeed migration, which grants
  -- them to the ten portal roles. They are repeated here so that a database
  -- seeded only by this script still has them, and because the 'admin' role
  -- itself is created here rather than by that migration. INSERT OR IGNORE
  -- makes the overlap harmless.
  ('members:read',                   'View member records'),
  ('members:write',                  'Edit any member record'),
  ('members:write.self',             'Edit your own member record'),
  ('members:read.financial',         'View member financial information'),
  ('registration:read',              'View membership applications'),
  ('registration:approve',           'Approve, reject or request info on an application'),
  ('registration:payment.override',  'Set or clear the dues payment gate'),
  ('registration:email.override',    'Override the email verification gate'),
  ('chapters:manage',                'Manage chapters and the state-to-chapter map'),
  ('chapters:manage.own',            'Manage your own chapter'),
  ('masterdata:manage',              'Manage reference lists and their values'),
  ('settings:manage',                'Manage portal settings'),
  ('audit:read',                     'Read the append-only audit log');

-- ── 2. Roles ───────────────────────────────────────────────────────────────
-- 'user' is the name AuthService.register() looks up as the default role for a
-- newly registered account; renaming it silently leaves new users role-less.
--
-- 'super_admin' exists because migration 1788638800000-NavigationPermissionSeed
-- grants navigation:manage to it. Note that admin-ui's Users / Roles /
-- Permissions routes declare requiredRoles: ['admin'] — a literal role-name
-- check, not a permission check — so a super_admin who does not *also* hold
-- 'admin' gets a 403 on those pages despite holding every permission. Section 4
-- therefore grants both roles together; keep that pairing if you add more.
INSERT OR IGNORE INTO roles (name, description) VALUES
  ('super_admin',        'Every permission. Break-glass account; pair with ''admin'' so the admin UI''s role checks pass.'),
  ('admin',              'Full administrative access to users, roles, permissions and navigation.'),
  ('navigation_manager', 'Can configure navigation only. Reaches /admin/navigation without the ''admin'' role, since that route gates on the permission alone.'),
  ('user',               'Default role assigned to newly-registered accounts. Holds no permissions.');

-- ── 3. Role → permission grants ────────────────────────────────────────────

-- super_admin: everything currently in the table, including permissions added
-- by a later migration or by hand in the admin UI. Re-run after adding one.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'super_admin';

-- admin: listed explicitly rather than CROSS JOINed, so a future domain
-- permission is not handed to admins by accident just because it exists.
-- The portal grants are therefore deliberate lines, not something inherited:
-- remove one and that endpoint returns 403 to an admin, which is exactly the
-- behaviour to expect from a permission nobody granted.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN ('users:manage', 'roles:manage', 'permissions:manage', 'navigation:manage',
                 -- Portal permissions. Listed one by one rather than CROSS JOINed,
                 -- so a domain permission added later is never handed to every
                 -- administrator just because it exists.
                 'members:read', 'members:write', 'members:write.self',
                 'members:read.financial',
                 'registration:read', 'registration:approve',
                 'registration:payment.override', 'registration:email.override',
                 'chapters:manage', 'chapters:manage.own',
                 'masterdata:manage', 'settings:manage', 'audit:read');

-- navigation_manager: navigation only.
INSERT OR IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.name = 'navigation_manager'
  AND p.name = 'navigation:manage';

-- 'user' deliberately gets nothing.

-- ── 4. Assign the admin role to the target user ───────────────────────────
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u CROSS JOIN roles r
WHERE u.email = :admin_email
  AND r.name  = 'admin';

-- ── 5. Sample users (only when :seed_sample_users = 'yes') ────────────────
--
-- Passwords: admin@example.com uses Password!1 — the same administrator
-- scripts/seed-sample-data.mjs registers, so both seeding paths agree whichever
-- runs first (INSERT OR IGNORE keeps the first hash). The other four accounts
-- use ChangeMe!123.
--   (Both are 8+ chars with upper, lower, digit and symbol — satisfy PASSWORD_PATTERN
--    in packages/framework/backend/authentication/src/models/auth.dto.ts)
--
-- The hashes below are real bcrypt cost-12 digests of those passwords, matching
-- the cost AuthService uses, so these accounts log in through the normal flow.
-- Emails are stored lowercased because AuthService.normaliseEmail() lowercases
-- before comparing and SQLite's default collation is case-sensitive — a
-- mixed-case row here would simply never match at login.
--
-- ⚠  Never run this section against anything internet-facing. The password is
--    published in this file and in git history.
INSERT OR IGNORE INTO users (email, passwordHash, firstName, lastName, isActive, credentialEpoch)
SELECT email, passwordHash, firstName, lastName, isActive, 0
FROM (
  SELECT 'superadmin@example.com' AS email, '$2b$12$TvUbcfC/BwWo4Utlceym9exbGvN5CZrvKs3.Cmiy1rKZfws6ws5A2' AS passwordHash, 'Sam'  AS firstName, 'Superuser'  AS lastName, 1 AS isActive
  UNION ALL SELECT 'admin@example.com',      '$2b$12$ZfWq8d4fEj2kAUPW22q5qO3auruv/puCJSR.WomqCL1XLPKZwfrLG', 'Ada',  'Admin',      1
  UNION ALL SELECT 'navmanager@example.com', '$2b$12$DyVYXFlxKQgs.6X..lBY2eUZaSr8ZQ2VXpuBqYFGafEOzNqUIK0QC', 'Nina', 'Navigator',  1
  UNION ALL SELECT 'user@example.com',       '$2b$12$rneDsKNxVs.xECYXW./qlO0skX/xL81a/EODTlpRFOxf9w8R4YUNO', 'Uma',  'User',       1
  -- Logs in with the correct password and is then refused ACCOUNT_INACTIVE,
  -- which is the only way to exercise that branch without editing rows by hand.
  UNION ALL SELECT 'inactive@example.com',   '$2b$12$qc5ZhrVl8QiP00L8cCt.7evv4VSngzTeZcp8cm...fHk3zc8QnXhW', 'Ivan', 'Inactive',   0
)
WHERE :seed_sample_users = 'yes';

-- Sample role assignments. superadmin gets 'admin' too — see the note in
-- section 2 about admin-ui's literal role-name checks.
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN (
  SELECT 'superadmin@example.com' AS email, 'super_admin'        AS role
  UNION ALL SELECT 'superadmin@example.com', 'admin'
  UNION ALL SELECT 'admin@example.com',      'admin'
  -- Only 'user' + navigation_manager: demonstrates that /admin/navigation is
  -- reachable on the permission alone, while /admin/users still 403s.
  UNION ALL SELECT 'navmanager@example.com', 'navigation_manager'
  UNION ALL SELECT 'navmanager@example.com', 'user'
  UNION ALL SELECT 'user@example.com',       'user'
  UNION ALL SELECT 'inactive@example.com',   'user'
) s ON s.email = u.email
JOIN roles r ON r.name = s.role
WHERE :seed_sample_users = 'yes';

COMMIT;


-- ── 6. Report what is now in the database ─────────────────────────────────
.print
.print =============================================================
.print  Seeded: permissions
.print =============================================================
SELECT id, name, description
FROM permissions
ORDER BY name;

.print
.print =============================================================
.print  Seeded: roles  (with permission list)
.print =============================================================
SELECT
  r.id,
  r.name,
  COUNT(p.id)                                 AS perm_count,
  COALESCE(GROUP_CONCAT(p.name, ', '), '')    AS permissions
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions       p ON p.id        = rp.permission_id
GROUP BY r.id, r.name
ORDER BY r.name;

.print
.print =============================================================
.print  Granted admin role to (:admin_email)
.print =============================================================
SELECT
  u.id            AS user_id,
  u.email,
  CASE WHEN EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = u.id AND r.name = 'admin'
  ) THEN 'yes' ELSE 'NO — user not found or already missing admin role' END AS has_admin_role
FROM users u
WHERE u.email = :admin_email;

.print
.print =============================================================
.print  All users (with roles)
.print =============================================================
SELECT
  u.id,
  u.email,
  u.firstName || ' ' || u.lastName            AS name,
  CASE u.isActive WHEN 1 THEN 'yes' ELSE 'no' END AS active,
  COALESCE(GROUP_CONCAT(r.name, ', '), '')    AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles      r  ON r.id       = ur.role_id
GROUP BY u.id, u.email, u.firstName, u.lastName, u.isActive
ORDER BY u.id;
