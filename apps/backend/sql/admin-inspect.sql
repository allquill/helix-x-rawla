-- =============================================================================
-- admin-inspect.sql
--
-- Read-only diagnostic queries for the users / roles / permissions schema
-- managed by the admin-ui module and the AuthModule in packages/framework/backend/authentication.
--
-- Schema (TypeORM-generated):
--   users(id, email, passwordHash, firstName, lastName, isActive, ...)
--   roles(id, name, description, ...)
--   permissions(id, name, description, ...)
--   user_roles(user_id, role_id)              -- join table
--   role_permissions(role_id, permission_id)  -- join table
--
-- Run:
--   sqlite3 apps/backend/data/helix_x.db < apps/backend/sql/admin-inspect.sql
-- =============================================================================

.headers on
.mode column

-- ── 1. Row-count summary ────────────────────────────────────────────────────
.print
.print =============================================================
.print  1. Row counts
.print =============================================================

SELECT 'users'            AS table_name, COUNT(*) AS rows FROM users
UNION ALL SELECT 'roles',            COUNT(*) FROM roles
UNION ALL SELECT 'permissions',      COUNT(*) FROM permissions
UNION ALL SELECT 'user_roles',       COUNT(*) FROM user_roles
UNION ALL SELECT 'role_permissions', COUNT(*) FROM role_permissions;


-- ── 2. All permissions ──────────────────────────────────────────────────────
.print
.print =============================================================
.print  2. Permissions
.print =============================================================

SELECT
  id,
  name,
  COALESCE(description, '') AS description,
  createdAt
FROM permissions
ORDER BY name;


-- ── 3. Roles + their permissions (aggregated) ──────────────────────────────
.print
.print =============================================================
.print  3. Roles with permissions
.print =============================================================

SELECT
  r.id                                                  AS role_id,
  r.name                                                AS role,
  COALESCE(r.description, '')                           AS description,
  COUNT(p.id)                                           AS perm_count,
  COALESCE(GROUP_CONCAT(p.name, ', '), '')              AS permissions
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions       p ON p.id        = rp.permission_id
GROUP BY r.id, r.name, r.description
ORDER BY r.name;


-- ── 4. Users + their roles (aggregated) ────────────────────────────────────
.print
.print =============================================================
.print  4. Users with roles
.print =============================================================

SELECT
  u.id                                                  AS user_id,
  u.email,
  u.firstName || ' ' || u.lastName                      AS full_name,
  CASE WHEN u.isActive = 1 THEN 'yes' ELSE 'no' END     AS active,
  COALESCE(GROUP_CONCAT(r.name, ', '), '(no roles)')    AS roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles      r  ON r.id       = ur.role_id
GROUP BY u.id, u.email, u.firstName, u.lastName, u.isActive
ORDER BY u.email;


-- ── 5. Users + effective permissions (transitive through roles) ────────────
.print
.print =============================================================
.print  5. Users with effective permissions
.print =============================================================

SELECT
  u.id                                                  AS user_id,
  u.email,
  COALESCE(GROUP_CONCAT(DISTINCT r.name), '')           AS roles,
  COALESCE(GROUP_CONCAT(DISTINCT p.name), '')           AS effective_permissions
FROM users u
LEFT JOIN user_roles       ur ON ur.user_id        = u.id
LEFT JOIN roles            r  ON r.id              = ur.role_id
LEFT JOIN role_permissions rp ON rp.role_id        = r.id
LEFT JOIN permissions      p  ON p.id              = rp.permission_id
GROUP BY u.id, u.email
ORDER BY u.email;


-- ── 6. Raw join-table contents (for debugging) ─────────────────────────────
.print
.print =============================================================
.print  6a. user_roles (raw join table)
.print =============================================================

SELECT
  ur.user_id,
  u.email,
  ur.role_id,
  r.name AS role
FROM user_roles ur
JOIN users u ON u.id = ur.user_id
JOIN roles r ON r.id = ur.role_id
ORDER BY u.email, r.name;

.print
.print =============================================================
.print  6b. role_permissions (raw join table)
.print =============================================================

SELECT
  rp.role_id,
  r.name           AS role,
  rp.permission_id,
  p.name           AS permission
FROM role_permissions rp
JOIN roles       r ON r.id = rp.role_id
JOIN permissions p ON p.id = rp.permission_id
ORDER BY r.name, p.name;


-- ── 7. Who can access the admin endpoints? ─────────────────────────────────
-- Returns users that hold any of users:manage / roles:manage / permissions:manage.
.print
.print =============================================================
.print  7. Users holding admin-management permissions
.print =============================================================

SELECT
  u.id                                              AS user_id,
  u.email,
  CASE WHEN u.isActive = 1 THEN 'yes' ELSE 'no' END AS active,
  GROUP_CONCAT(DISTINCT p.name)                     AS admin_permissions_held
FROM users u
JOIN user_roles       ur ON ur.user_id = u.id
JOIN roles            r  ON r.id       = ur.role_id
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions      p  ON p.id       = rp.permission_id
WHERE p.name IN ('users:manage', 'roles:manage', 'permissions:manage')
GROUP BY u.id, u.email, u.isActive
ORDER BY u.email;


-- ── 8. Orphan checks ───────────────────────────────────────────────────────
.print
.print =============================================================
.print  8a. Roles with no permissions
.print =============================================================

SELECT r.id, r.name
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
WHERE rp.permission_id IS NULL
ORDER BY r.name;

.print
.print =============================================================
.print  8b. Permissions not assigned to any role
.print =============================================================

SELECT p.id, p.name
FROM permissions p
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
WHERE rp.role_id IS NULL
ORDER BY p.name;

.print
.print =============================================================
.print  8c. Users with no roles
.print =============================================================

SELECT u.id, u.email
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role_id IS NULL
ORDER BY u.email;
