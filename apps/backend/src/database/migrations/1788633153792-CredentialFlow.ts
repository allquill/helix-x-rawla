import { MigrationInterface, QueryRunner } from "typeorm";

export class CredentialFlow1788633153792 implements MigrationInterface {
    name = 'CredentialFlow1788633153792'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "login_lockout" ("id" varchar PRIMARY KEY NOT NULL, "email" text NOT NULL, "failedCount" integer NOT NULL DEFAULT (0), "lockedUntil" datetime, "lastFailedAt" datetime, "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_889699e36fe7f1eca0d278e85d" ON "login_lockout" ("email") `);
        await queryRunner.query(`CREATE TABLE "verification_token" ("id" varchar PRIMARY KEY NOT NULL, "userId" integer, "destination" text NOT NULL, "purpose" text NOT NULL, "tokenHash" text NOT NULL, "expiresAt" datetime NOT NULL, "consumedAt" datetime, "supersededAt" datetime, "lastSentAt" datetime NOT NULL, "createdIp" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_0748c047a951e34c0b686bfadb" ON "verification_token" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2eaf4316eb36db7fa25d898ae7" ON "verification_token" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_a89fd47cb303650d002f5fbff0" ON "verification_token" ("destination", "purpose") `);
        await queryRunner.query(`CREATE TABLE "credential_ticket" ("id" varchar PRIMARY KEY NOT NULL, "ticketHash" text NOT NULL, "userId" integer NOT NULL, "purpose" text NOT NULL, "tokenId" text, "expiresAt" datetime NOT NULL, "consumedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_bb6689830ed1a43e0799f86b90" ON "credential_ticket" ("ticketHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_9cc8747a6046239fd4257c8259" ON "credential_ticket" ("userId") `);
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" text NOT NULL, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt") SELECT "id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`CREATE TABLE "temporary_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" text NOT NULL, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "credentialEpoch" integer NOT NULL DEFAULT (0), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "temporary_users"("id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt") SELECT "id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt" FROM "users"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`ALTER TABLE "temporary_users" RENAME TO "users"`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" text NOT NULL, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt") SELECT "id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME TO "temporary_users"`);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" text NOT NULL, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "isActive" boolean NOT NULL DEFAULT (1), "resetToken" text, "resetTokenExpiresAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`INSERT INTO "users"("id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt") SELECT "id", "email", "passwordHash", "firstName", "lastName", "isActive", "createdAt", "updatedAt" FROM "temporary_users"`);
        await queryRunner.query(`DROP TABLE "temporary_users"`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`DROP INDEX "IDX_9cc8747a6046239fd4257c8259"`);
        await queryRunner.query(`DROP INDEX "IDX_bb6689830ed1a43e0799f86b90"`);
        await queryRunner.query(`DROP TABLE "credential_ticket"`);
        await queryRunner.query(`DROP INDEX "IDX_a89fd47cb303650d002f5fbff0"`);
        await queryRunner.query(`DROP INDEX "IDX_2eaf4316eb36db7fa25d898ae7"`);
        await queryRunner.query(`DROP INDEX "IDX_0748c047a951e34c0b686bfadb"`);
        await queryRunner.query(`DROP TABLE "verification_token"`);
        await queryRunner.query(`DROP INDEX "IDX_889699e36fe7f1eca0d278e85d"`);
        await queryRunner.query(`DROP TABLE "login_lockout"`);
    }

}
