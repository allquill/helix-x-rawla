import { MigrationInterface, QueryRunner } from 'typeorm';

/** Storage for the admin-editable navigation configuration. */
export class NavigationConfig1788638700000 implements MigrationInterface {
  name = 'NavigationConfig1788638700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "navigation_config" ("id" text PRIMARY KEY NOT NULL, "document" text NOT NULL, "revision" integer NOT NULL DEFAULT (1), "updatedByUserId" integer, "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "navigation_config"`);
  }
}
