import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1788632308069 implements MigrationInterface {
    name = 'InitialSchema1788632308069'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" text NOT NULL, "description" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"))`);
        await queryRunner.query(`CREATE INDEX "IDX_48ce552495d14eae9b187bb671" ON "permissions" ("name") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" text NOT NULL, "description" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"))`);
        await queryRunner.query(`CREATE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `);
        await queryRunner.query(`CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" text NOT NULL, "passwordHash" text NOT NULL, "firstName" text NOT NULL, "lastName" text NOT NULL, "isActive" boolean NOT NULL DEFAULT (1), "resetToken" text, "resetTokenExpiresAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"))`);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "oauth_access_tokens" ("id" varchar PRIMARY KEY NOT NULL, "jti" text NOT NULL, "clientId" text NOT NULL, "userId" integer, "scope" text NOT NULL, "expiresAt" datetime NOT NULL, "revokedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_da955ffbb05a5bcc91ba232950" ON "oauth_access_tokens" ("jti") `);
        await queryRunner.query(`CREATE TABLE "oauth_authorization_codes" ("id" varchar PRIMARY KEY NOT NULL, "code" text NOT NULL, "clientId" text NOT NULL, "userId" integer NOT NULL, "redirectUri" text NOT NULL, "scope" text NOT NULL, "nonce" text, "codeChallenge" text, "codeChallengeMethod" text, "expiresAt" datetime NOT NULL, "used" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_fb91ab932cfbd694061501cc20" ON "oauth_authorization_codes" ("code") `);
        await queryRunner.query(`CREATE TABLE "oauth_clients" ("id" varchar PRIMARY KEY NOT NULL, "clientId" text NOT NULL, "clientSecretHash" text NOT NULL, "name" text NOT NULL, "redirectUris" text NOT NULL, "allowedScopes" text NOT NULL, "grantTypes" text NOT NULL, "isConfidential" boolean NOT NULL DEFAULT (1), "isActive" boolean NOT NULL DEFAULT (1), "userId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b0c094fe1ef0a6c4af8f2b10be" ON "oauth_clients" ("clientId") `);
        await queryRunner.query(`CREATE TABLE "oauth_pending_requests" ("id" varchar PRIMARY KEY NOT NULL, "clientId" text NOT NULL, "userId" integer NOT NULL, "redirectUri" text NOT NULL, "scope" text NOT NULL, "state" text, "nonce" text, "codeChallenge" text, "codeChallengeMethod" text, "expiresAt" datetime NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE TABLE "oauth_refresh_tokens" ("id" varchar PRIMARY KEY NOT NULL, "token" text NOT NULL, "clientId" text NOT NULL, "userId" integer NOT NULL, "scope" text NOT NULL, "expiresAt" datetime NOT NULL, "revokedAt" datetime, "accessTokenJti" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_74abaed0b30711b6532598b039" ON "oauth_refresh_tokens" ("token") `);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`CREATE TABLE "user_roles" ("user_id" integer NOT NULL, "role_id" integer NOT NULL, PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `);
        await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
        await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
        await queryRunner.query(`CREATE TABLE "temporary_role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_role_permissions"("role_id", "permission_id") SELECT "role_id", "permission_id" FROM "role_permissions"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`ALTER TABLE "temporary_role_permissions" RENAME TO "role_permissions"`);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
        await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
        await queryRunner.query(`CREATE TABLE "temporary_user_roles" ("user_id" integer NOT NULL, "role_id" integer NOT NULL, CONSTRAINT "FK_87b8888186ca9769c960e926870" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "FK_b23c65e50a758245a33ee35fda1" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE, PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`INSERT INTO "temporary_user_roles"("user_id", "role_id") SELECT "user_id", "role_id" FROM "user_roles"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`ALTER TABLE "temporary_user_roles" RENAME TO "user_roles"`);
        await queryRunner.query(`CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
        await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
        await queryRunner.query(`ALTER TABLE "user_roles" RENAME TO "temporary_user_roles"`);
        await queryRunner.query(`CREATE TABLE "user_roles" ("user_id" integer NOT NULL, "role_id" integer NOT NULL, PRIMARY KEY ("user_id", "role_id"))`);
        await queryRunner.query(`INSERT INTO "user_roles"("user_id", "role_id") SELECT "user_id", "role_id" FROM "temporary_user_roles"`);
        await queryRunner.query(`DROP TABLE "temporary_user_roles"`);
        await queryRunner.query(`CREATE INDEX "IDX_b23c65e50a758245a33ee35fda" ON "user_roles" ("role_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_87b8888186ca9769c960e92687" ON "user_roles" ("user_id") `);
        await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
        await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
        await queryRunner.query(`ALTER TABLE "role_permissions" RENAME TO "temporary_role_permissions"`);
        await queryRunner.query(`CREATE TABLE "role_permissions" ("role_id" integer NOT NULL, "permission_id" integer NOT NULL, PRIMARY KEY ("role_id", "permission_id"))`);
        await queryRunner.query(`INSERT INTO "role_permissions"("role_id", "permission_id") SELECT "role_id", "permission_id" FROM "temporary_role_permissions"`);
        await queryRunner.query(`DROP TABLE "temporary_role_permissions"`);
        await queryRunner.query(`CREATE INDEX "IDX_17022daf3f885f7d35423e9971" ON "role_permissions" ("permission_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_178199805b901ccd220ab7740e" ON "role_permissions" ("role_id") `);
        await queryRunner.query(`DROP INDEX "IDX_b23c65e50a758245a33ee35fda"`);
        await queryRunner.query(`DROP INDEX "IDX_87b8888186ca9769c960e92687"`);
        await queryRunner.query(`DROP TABLE "user_roles"`);
        await queryRunner.query(`DROP INDEX "IDX_17022daf3f885f7d35423e9971"`);
        await queryRunner.query(`DROP INDEX "IDX_178199805b901ccd220ab7740e"`);
        await queryRunner.query(`DROP TABLE "role_permissions"`);
        await queryRunner.query(`DROP INDEX "IDX_74abaed0b30711b6532598b039"`);
        await queryRunner.query(`DROP TABLE "oauth_refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "oauth_pending_requests"`);
        await queryRunner.query(`DROP INDEX "IDX_b0c094fe1ef0a6c4af8f2b10be"`);
        await queryRunner.query(`DROP TABLE "oauth_clients"`);
        await queryRunner.query(`DROP INDEX "IDX_fb91ab932cfbd694061501cc20"`);
        await queryRunner.query(`DROP TABLE "oauth_authorization_codes"`);
        await queryRunner.query(`DROP INDEX "IDX_da955ffbb05a5bcc91ba232950"`);
        await queryRunner.query(`DROP TABLE "oauth_access_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP INDEX "IDX_648e3f5447f725579d7d4ffdfb"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "IDX_48ce552495d14eae9b187bb671"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}
