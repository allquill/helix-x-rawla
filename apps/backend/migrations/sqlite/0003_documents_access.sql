-- =============================================================================
-- helix-x-rawla — application migration 0003_documents_access.sql — SQLite
--
-- Track 'rawla'. REQUIRES the framework's 'helix-x' 0002
-- (node_modules/@helix-x/backend/migrations/sqlite/0002_documents.sql), which
-- creates the documents tables and the four documents:* permissions — but
-- grants none of them. This file decides who may use documents in the portal:
--   · member and the eight staff roles — read, write, share: their own private
--     files and folders, shared with people or roles as they choose
--   · admin and super_admin — also documents:manage (list and delete anyone's
--     files; it does NOT let them read the content)
--   · youth_member, applicant, navigation_manager — nothing
--
-- Grants only: no table, no permission row, no role. Idempotent by the
-- (role, permission) pair. Permissions ride in the JWT, so a signed-in user
-- must sign out and back in before the Documents section appears.
-- =============================================================================

BEGIN TRANSACTION;

INSERT INTO "schema_migrations" ("track", "version", "name") VALUES ('rawla', '0003', 'documents_access');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'documents:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'documents:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'documents:share';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'documents:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'documents:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'documents:share';

COMMIT;
