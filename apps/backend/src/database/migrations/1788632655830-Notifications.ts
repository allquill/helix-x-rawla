import { MigrationInterface, QueryRunner } from "typeorm";

export class Notifications1788632655830 implements MigrationInterface {
    name = 'Notifications1788632655830'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dev_mail_outbox" ("id" varchar PRIMARY KEY NOT NULL, "destination" text NOT NULL, "subject" text NOT NULL, "template" text NOT NULL, "html" text NOT NULL, "text" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "notification_log" ("id" varchar PRIMARY KEY NOT NULL, "template" text NOT NULL, "destination" text NOT NULL, "subject" text NOT NULL, "priority" text NOT NULL, "transport" text NOT NULL, "status" text NOT NULL, "providerMessageId" text, "error" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_3149c9af9a6f8a2960da0f5d32" ON "notification_log" ("template") `);
        await queryRunner.query(`CREATE INDEX "IDX_5950ad727e8dbcf90c30dfdabb" ON "notification_log" ("destination") `);
        await queryRunner.query(`CREATE INDEX "IDX_bbdec870a684a910d0a81e1afe" ON "notification_log" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_bbdec870a684a910d0a81e1afe"`);
        await queryRunner.query(`DROP INDEX "IDX_5950ad727e8dbcf90c30dfdabb"`);
        await queryRunner.query(`DROP INDEX "IDX_3149c9af9a6f8a2960da0f5d32"`);
        await queryRunner.query(`DROP TABLE "notification_log"`);
        await queryRunner.query(`DROP TABLE "dev_mail_outbox"`);
    }

}
