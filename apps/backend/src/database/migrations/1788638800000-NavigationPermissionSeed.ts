import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seeds the `navigation:manage` permission and grants it to the administrator
 * roles.
 *
 * A data-only migration rather than an addition to `sql/admin-seed.sql`,
 * because the permission is read by application code and so must exist in every
 * environment without anyone remembering to run a script. The same permission
 * is also listed in `admin-seed.sql`, which is what creates the `admin` role in
 * the first place — the grant below is written as an INSERT..SELECT so it
 * simply no-ops on a database where that role does not exist yet, and
 * re-running `admin-seed.sql` afterwards completes the wiring.
 *
 * Note for whoever runs this: permissions are baked into the JWT at login and
 * there is no refresh flow, so an administrator already signed in must log out
 * and back in before the navigation admin page appears.
 */
export class NavigationPermissionSeed1788638800000 implements MigrationInterface {
  name = 'NavigationPermissionSeed1788638800000';

  private static readonly PERMISSION = 'navigation:manage';
  private static readonly DESCRIPTION =
    'Configure application navigation (show, hide or disable routes per surface)';
  private static readonly ROLES = ['admin', 'super_admin'];

  public async up(queryRunner: QueryRunner): Promise<void> {
    const { PERMISSION, DESCRIPTION, ROLES } = NavigationPermissionSeed1788638800000;

    await queryRunner.query(
      `INSERT OR IGNORE INTO "permissions" ("name", "description") VALUES (?, ?)`,
      [PERMISSION, DESCRIPTION],
    );

    for (const role of ROLES) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "role_permissions" ("role_id", "permission_id")
         SELECT r."id", p."id" FROM "roles" r CROSS JOIN "permissions" p
         WHERE r."name" = ? AND p."name" = ?`,
        [role, PERMISSION],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const { PERMISSION } = NavigationPermissionSeed1788638800000;
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" = ?)`,
      [PERMISSION],
    );
    await queryRunner.query(`DELETE FROM "permissions" WHERE "name" = ?`, [PERMISSION]);
  }
}
