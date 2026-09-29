-- =============================================================================
-- helix-x-rawla — application migration 0001_baseline.sql — SQLite
--
-- Track 'rawla'. REQUIRES the framework's 'helix-x' 0001 first
-- (node_modules/@helix-x/backend/migrations/sqlite/0001_baseline.sql): it
-- records itself in the framework's schema_migrations table, references
-- users(id), and grants the framework's permissions to portal roles.
--
-- Everything the portal adds for a new install to be usable:
--   · schema — the community-core tables, their indexes, audit_logs and its
--     append-only triggers
--   · reference data — portal settings, reference lists and values
--   · access — the 13 portal permissions and 12 portal roles, with every
--     grant (including the framework's 4 permissions, looked up by name)
--   · configuration — the 5 chapters and state→chapter map, and the navigation
--     overrides (framework /register disabled, join form at /register)
--   · accounts — admin@example.com / Password!1 and superadmin@example.com /
--     ChangeMe!123, ⚠ PUBLISHED passwords: change them after installing.
--
-- Apply after the framework baseline:
--   sqlite3 -bail data/helix_x.db < apps/backend/migrations/sqlite/0001_baseline.sql
-- See apps/backend/migrations/README.md.
-- =============================================================================

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Records this file FIRST, in the table the framework's 0001 created. Without
-- the framework baseline applied, this statement fails and nothing changes.
INSERT INTO "schema_migrations" ("track", "version", "name") VALUES ('rawla', '0001', 'baseline');

-- ── Tables ──────────────────────────────────────────────────────────────────
CREATE TABLE "audit_logs" ("id" varchar PRIMARY KEY NOT NULL, "actorUserId" integer, "actorRoles" text, "impersonatedByUserId" integer, "action" text NOT NULL, "entityType" text NOT NULL, "entityId" text, "before" text, "after" text, "reason" text, "ip" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')));
CREATE TABLE "chapters" ("id" varchar PRIMARY KEY NOT NULL, "name" text NOT NULL, "code" text NOT NULL, "description" text, "leadUserId" integer, "contactEmail" text, "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_763fd9caff55ea1f33aa146a4b8" UNIQUE ("name"), CONSTRAINT "UQ_2b96c60371887d5903c9d3d5624" UNIQUE ("code"));
CREATE TABLE "portal_settings" ("id" varchar PRIMARY KEY NOT NULL, "key" text NOT NULL, "value" text NOT NULL, "valueType" text NOT NULL DEFAULT ('string'), "description" text, "updatedByUserId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_2fe2408774bdc57318a5caeb1ca" UNIQUE ("key"));
CREATE TABLE "reference_lists" ("id" varchar PRIMARY KEY NOT NULL, "key" text NOT NULL, "label" text NOT NULL, "description" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_50320ca4b20bbc129f231b2ef11" UNIQUE ("key"));
CREATE TABLE "households" ("id" varchar PRIMARY KEY NOT NULL, "publicHouseholdId" text NOT NULL, "headMemberId" text, "addressLine1" text, "addressLine2" text, "city" text, "state" text, "postalCode" text, "country" text NOT NULL DEFAULT ('US'), "chapter_id" varchar, "anniversaryDate" date, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_9641757bcd62af342e2aa5f7e17" UNIQUE ("publicHouseholdId"), CONSTRAINT "FK_d3f07b1964f2d0915e43fc8a4a2" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE TABLE "members" ("id" varchar PRIMARY KEY NOT NULL, "user_id" integer NOT NULL, "publicMemberId" text, "firstName" text NOT NULL, "middleName" text, "lastName" text NOT NULL, "honorific" text, "gender" text NOT NULL, "dateOfBirth" date NOT NULL, "thikana" text NOT NULL, "gotra" text NOT NULL, "caste" text NOT NULL, "sasural" text, "nanihal" text, "languages" text, "familyHistory" text, "phone" text NOT NULL, "whatsappPhone" text, "isPhoneVerified" boolean NOT NULL DEFAULT (0), "household_id" varchar NOT NULL, "relationship" text NOT NULL DEFAULT ('head_of_house'), "chapter_id" varchar, "chapterIsOverridden" boolean NOT NULL DEFAULT (0), "weddingDate" date, "industry" text, "jobTitle" text, "skills" text, "education" text, "linkedinUrl" text, "facebookUrl" text, "socialLinksApproved" boolean NOT NULL DEFAULT (0), "membershipTier" text NOT NULL, "joinDate" date, "volunteerInterests" text, "status" text NOT NULL DEFAULT ('pending_email_verification'), "rejectionReason" text, "rejectedAt" datetime, "infoRequestMessage" text, "infoRequestedAt" datetime, "archivedAt" datetime, "archivedByUserId" integer, "passwordSetAt" datetime, "isEmailVerified" boolean NOT NULL DEFAULT (0), "emailVerifiedAt" datetime, "emailVerificationProvenance" text, "emailOverrideByUserId" integer, "emailOverrideReason" text, "emailOverrideAt" datetime, "isApproved" boolean NOT NULL DEFAULT (0), "approvedByUserId" integer, "approvedAt" datetime, "isPaymentMade" boolean NOT NULL DEFAULT (0), "paymentOverrideByUserId" integer, "paymentOverrideReason" text, "paymentOverrideAt" datetime, "paymentSettledAt" datetime, "isActive" boolean NOT NULL DEFAULT (0), "activatedAt" datetime, "offlineVerification" boolean NOT NULL DEFAULT (0), "reviewerNotes" text, "directoryOptIn" boolean NOT NULL DEFAULT (1), "fieldVisibility" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_28d4bf9df97a869738824d37790" UNIQUE ("publicMemberId"), CONSTRAINT "REL_da404b5fd9c390e25338996e2d" UNIQUE ("user_id"), CONSTRAINT "CHK_member_active_implies_gates" CHECK ("isActive" = 0 OR ("isEmailVerified" = 1 AND "isApproved" = 1 AND "status" NOT IN ('rejected','archived'))), CONSTRAINT "FK_da404b5fd9c390e25338996e2d1" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_415e47bfa95b7897c35bdca6421" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_8b3cf72559bdc03150f5938d683" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE TABLE "child_profiles" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "household_id" varchar NOT NULL, "firstName" text NOT NULL, "middleName" text, "lastName" text NOT NULL, "gender" text, "dateOfBirth" date NOT NULL, "sequence" integer NOT NULL DEFAULT (1), "educationLevel" text, "achievements" text, "membershipTier" text NOT NULL DEFAULT ('youth'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_2ce4cfcf429f873d6be38b20126" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_3d0a56a2517d023beb8b8c5cc6e" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "consent_records" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "document" text NOT NULL, "version" text NOT NULL, "ip" text, "acceptedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_0cee5ee945e53de41fc4d75f1b2" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "life_events" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "type" text NOT NULL, "eventDate" date NOT NULL, "notes" text, "recognisedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_3b6ec7f6bf110870c935a88ff55" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "member_reference_contacts" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "sequence" integer NOT NULL, "name" text NOT NULL, "phone" text NOT NULL, "isVerified" boolean NOT NULL DEFAULT (0), "verifiedByUserId" integer, "verifiedAt" datetime, "notes" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_e2daba4314a2d1ff3cd6da13eff" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "member_status_history" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "fromStatus" text, "toStatus" text NOT NULL, "actorUserId" integer, "reason" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_c1481e4dcfc0d9c1a9d82347414" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "membership_payments" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "tier" text NOT NULL, "amountCents" integer NOT NULL DEFAULT (0), "currency" text NOT NULL DEFAULT ('USD'), "status" text NOT NULL DEFAULT ('pending'), "provider" text, "providerRef" text, "reason" text, "recordedByUserId" integer, "settledAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_733b90f80254aaa30625e3fdbbf" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "reference_list_values" ("id" varchar PRIMARY KEY NOT NULL, "list_id" varchar NOT NULL, "value" text NOT NULL, "label" text NOT NULL, "sortOrder" integer NOT NULL DEFAULT (0), "isActive" boolean NOT NULL DEFAULT (1), "metadata" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_2066b35f7bee316a15edc2a8a3b" FOREIGN KEY ("list_id") REFERENCES "reference_lists" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "spouse_profiles" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "household_id" varchar NOT NULL, "firstName" text NOT NULL, "middleName" text, "lastName" text NOT NULL, "caste" text, "gotra" text, "thikana" text, "nanihal" text, "familyHistory" text, "email" text, "phone" text, "dateOfBirth" date, "industry" text, "education" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_8fabf47ae4fd06094e3b104183e" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_7d33fbb0642c39a3cb31b24e449" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE TABLE "state_chapter_map" ("id" varchar PRIMARY KEY NOT NULL, "stateCode" text NOT NULL, "chapter_id" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_269a31bb7d188b362fe46086e8e" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);

-- audit_logs is append-only.
CREATE TRIGGER "audit_logs_no_update"
       BEFORE UPDATE ON "audit_logs"
       BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;
CREATE TRIGGER "audit_logs_no_delete"
       BEFORE DELETE ON "audit_logs"
       BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END;

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX "IDX_e36d23e1e7cf81ea77758bef79" ON "audit_logs" ("actorUserId");
CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON "audit_logs" ("action");
CREATE INDEX "IDX_c69efb19bf127c97e6740ad530" ON "audit_logs" ("createdAt");
CREATE INDEX "IDX_13c69424c440a0e765053feb4b" ON "audit_logs" ("entityType", "entityId");
CREATE INDEX "IDX_763fd9caff55ea1f33aa146a4b" ON "chapters" ("name");
CREATE INDEX "IDX_2fe2408774bdc57318a5caeb1c" ON "portal_settings" ("key");
CREATE INDEX "IDX_50320ca4b20bbc129f231b2ef1" ON "reference_lists" ("key");
CREATE INDEX "IDX_9641757bcd62af342e2aa5f7e1" ON "households" ("publicHouseholdId");
CREATE INDEX "IDX_d3f07b1964f2d0915e43fc8a4a" ON "households" ("chapter_id");
CREATE UNIQUE INDEX "IDX_da404b5fd9c390e25338996e2d" ON "members" ("user_id");
CREATE INDEX "IDX_28d4bf9df97a869738824d3779" ON "members" ("publicMemberId");
CREATE INDEX "IDX_b53ac7b9c0e30b89db66fea08a" ON "members" ("dateOfBirth");
CREATE INDEX "IDX_b31db76278d10000e1b5c2ef71" ON "members" ("thikana");
CREATE INDEX "IDX_a60514a7fb6a3e939833ee56ce" ON "members" ("gotra");
CREATE INDEX "IDX_55cae358d5ad783201580ce1b7" ON "members" ("caste");
CREATE INDEX "IDX_415e47bfa95b7897c35bdca642" ON "members" ("household_id");
CREATE INDEX "IDX_8b3cf72559bdc03150f5938d68" ON "members" ("chapter_id");
CREATE INDEX "IDX_d75eefa29c161d6add2a30a10e" ON "members" ("status");
CREATE INDEX "IDX_85d6263be6a57c16ad8b6c5ea6" ON "members" ("isActive");
CREATE INDEX "IDX_2ce4cfcf429f873d6be38b2012" ON "child_profiles" ("member_id");
CREATE INDEX "IDX_3d0a56a2517d023beb8b8c5cc6" ON "child_profiles" ("household_id");
CREATE INDEX "IDX_b4b7f3910329a19c3e2df732b3" ON "consent_records" ("member_id", "document");
CREATE INDEX "IDX_3b6ec7f6bf110870c935a88ff5" ON "life_events" ("member_id");
CREATE INDEX "IDX_bcf7ab15382d6fff4155ba9050" ON "life_events" ("eventDate");
CREATE INDEX "IDX_e2daba4314a2d1ff3cd6da13ef" ON "member_reference_contacts" ("member_id");
CREATE UNIQUE INDEX "IDX_2dd2f29badf782c631f3b0b1ce" ON "member_reference_contacts" ("member_id", "sequence");
CREATE INDEX "IDX_c1481e4dcfc0d9c1a9d8234741" ON "member_status_history" ("member_id");
CREATE INDEX "IDX_c516f66beb4f46fa401ff7e7c6" ON "member_status_history" ("createdAt");
CREATE INDEX "IDX_733b90f80254aaa30625e3fdbb" ON "membership_payments" ("member_id");
CREATE INDEX "IDX_6065083ac6933eb65b540c2235" ON "membership_payments" ("status");
CREATE UNIQUE INDEX "IDX_fa87cd9ac56f430865352a2e4d" ON "membership_payments" ("providerRef");
CREATE INDEX "IDX_2066b35f7bee316a15edc2a8a3" ON "reference_list_values" ("list_id");
CREATE UNIQUE INDEX "IDX_e8aac809cc9b1242412d320f9e" ON "reference_list_values" ("list_id", "value");
CREATE UNIQUE INDEX "IDX_8fabf47ae4fd06094e3b104183" ON "spouse_profiles" ("member_id");
CREATE INDEX "IDX_7d33fbb0642c39a3cb31b24e44" ON "spouse_profiles" ("household_id");
CREATE UNIQUE INDEX "IDX_b10070b2dd28c5964761f1d5a2" ON "state_chapter_map" ("stateCode");
CREATE INDEX "IDX_269a31bb7d188b362fe46086e8" ON "state_chapter_map" ("chapter_id");

-- ── Reference data: portal settings and the admin-editable reference lists ──
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('5ce6aa6a93f22c6502e9932d1b391a1a', 'registration.minimum_age', '18', 'number', 'Minimum age to create a member account (ADM-09).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('fdf9251102ec3046006285fb77335088', 'registration.payment_required', 'true', 'boolean', 'ADM-11 kill-switch: when false the dues gate counts as satisfied.', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('da50a8b5c79f22436e5ec2dd4b315482', 'registration.awaiting_payment_reminder_days', '7', 'number', 'Days before an approved-but-unpaid member is reminded (REG-19).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('1b6f468fa26c037b93c78fedbf0b4b7a', 'registration.unverified_purge_days', '7', 'number', 'Days before an unverified application is purged (REG-24).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('522f1336fb72948b44fbbda21fe3411d', 'registration.consent_version', '1.0', 'string', 'Version of the Community Guidelines and Privacy Policy in force (REG-03).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('e65d743678dcf805549db63945795f90', 'credential.ttl_minutes.email_verification', '1440', 'number', 'Verification link lifetime (ADM-12).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('f673b5d4e43c1bb8dd1acfe22350e2d9', 'credential.ttl_minutes.credential_setup', '1440', 'number', 'Password-setup link lifetime (ADM-12).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('6b5a39687d097977ff1b456e016390c0', 'credential.ttl_minutes.password_reset', '20', 'number', 'Password-reset link lifetime (ADM-12).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('19c710893a8a47ec97b0bde97f4aff5e', 'credential.resend_cooldown_seconds', '60', 'number', 'Seconds between resends of a credential link (ADM-12).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "portal_settings" ("id", "key", "value", "valueType", "description", "updatedByUserId", "createdAt", "updatedAt") VALUES ('2b1a45d7a3fdc4c50f994972a71899b8', 'credential.resend_hourly_cap', '5', 'number', 'Maximum credential links per address per hour (ADM-12).', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('795f276753b991532748334a96220738', 'gotra', 'Gotra / Clan', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('5e5d332d588ea7d769407f4a78f923ee', 'caste', 'Rajput Caste / Sub-Clan', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('cb6fb25b0096682659be6965577c7e08', 'honorific', 'Honorific / Title', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('155b9c919d5571ea8cc731c6f29bf67b', 'language', 'Language', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('5c954635196817df31e663cd1a9bff6f', 'thikana', 'Ancestral Village / Thikana', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('5dfb08a596dac9d9506fa8ea6c211fb4', 'membership_tier', 'Membership Tier', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('9094a1e5559e1a7dad019e48bf29580e', 'industry', 'Industry / Field', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('28e46e1be2999f83c6c2638791756f5b', 'skill', 'Skill / Expertise', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_lists" ("id", "key", "label", "description", "createdAt", "updatedAt") VALUES ('6a99fd65d54452608a2b1c1ce3ab70a4', 'volunteer_interest', 'Volunteer Interest', NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('5205adcdcefb80a4212eaaf968a4105c', 'cb6fb25b0096682659be6965577c7e08', 'kunwar', 'Kunwar', 1, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('c3130849cf75952523fa93b0e1e122f1', 'cb6fb25b0096682659be6965577c7e08', 'baisa', 'Baisa', 2, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('ecaa2d71c3d65f575909372bde67bd67', 'cb6fb25b0096682659be6965577c7e08', 'banna', 'Banna', 3, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('39467a44dd71e285e89f8cfe59d931dc', '155b9c919d5571ea8cc731c6f29bf67b', 'hindi', 'Hindi', 1, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('af6175902ccaa18d8a4c1ea4532586a4', '155b9c919d5571ea8cc731c6f29bf67b', 'marwari', 'Marwari', 2, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('814bf837360d77fd494e7bcb3d4c3611', '155b9c919d5571ea8cc731c6f29bf67b', 'mewari', 'Mewari', 3, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('a2932f160e0935789f7128dc7d9d6c1d', '155b9c919d5571ea8cc731c6f29bf67b', 'english', 'English', 4, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('454832bacb0c212e293f2e497896d298', '5e5d332d588ea7d769407f4a78f923ee', 'sengar', 'Sengar', 1, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('ce6b11364f17ff3f873a5fb41ff775c0', '5e5d332d588ea7d769407f4a78f923ee', 'shaktawat', 'Shaktawat', 2, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('6f21e1333a7589483a749298f2cc33d7', '5e5d332d588ea7d769407f4a78f923ee', 'rathore', 'Rathore', 3, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('5faea9c9f9f7b33c208ba23f8d3d1276', '5e5d332d588ea7d769407f4a78f923ee', 'chauhan', 'Chauhan', 4, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('a0aba1d57d6790cc555c6e7a4c3e5990', '5dfb08a596dac9d9506fa8ea6c211fb4', 'annual', 'Annual', 1, 1, '{"duesCents":5000,"currency":"USD"}', '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('689bb4a7c89228988e5e713fed1e12a1', '5dfb08a596dac9d9506fa8ea6c211fb4', 'lifetime', 'Lifetime', 2, 1, '{"duesCents":50000,"currency":"USD"}', '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('6cc5d08295d92b16c1a038346cfbb7ec', '5dfb08a596dac9d9506fa8ea6c211fb4', 'youth', 'Youth', 3, 1, '{"duesCents":0,"currency":"USD"}', '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('6633b5c5fdc0f19bbab4113b4aab8df6', '5dfb08a596dac9d9506fa8ea6c211fb4', 'associate', 'Associate', 4, 1, '{"duesCents":2500,"currency":"USD"}', '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('cd0cc8e55ac1324faa0516ab99a7fe9e', '6a99fd65d54452608a2b1c1ce3ab70a4', 'events', 'Event planning', 1, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('f110fba653563fa6fe67aa5079bb1a43', '6a99fd65d54452608a2b1c1ce3ab70a4', 'tech', 'Tech support', 2, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('e5b543d14635ff01217b39a6ad5962ea', '6a99fd65d54452608a2b1c1ce3ab70a4', 'food', 'Food preparation', 3, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('b95f85821d436a89b39afc53d3042b51', '6a99fd65d54452608a2b1c1ce3ab70a4', 'fundraising', 'Fundraising', 4, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');
INSERT INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata", "createdAt", "updatedAt") VALUES ('2b6fdb5b40f1d3b598c0c80b4f6b81ee', '6a99fd65d54452608a2b1c1ce3ab70a4', 'youth_mentoring', 'Youth mentoring', 5, 1, NULL, '2026-09-28 23:54:52', '2026-09-28 23:54:52');

-- ── Access model: the portal's permissions and roles ───────────────────────
-- Backend @Permissions() guards and frontend `when` gates check exactly these
-- 13 portal permissions plus the 4 the framework's 0001 created
-- (users/roles/permissions/navigation:manage), and these 12 roles plus the
-- framework's `user`. Everything is keyed by name, never by id. super_admin
-- and admin hold all 17.

INSERT OR IGNORE INTO permissions (name, description) VALUES ('members:read', 'View member records and the directory');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('members:write', 'Edit any member record');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('members:write.self', 'Edit one''s own member record');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('members:read.financial', 'View a member''s financial information (Tier 3)');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('registration:read', 'View the membership application queue');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('registration:approve', 'Approve, reject or request more information on an application');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('registration:payment.override', 'Set or clear the membership dues gate by hand');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('registration:email.override', 'Mark an email address verified manually');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('chapters:manage', 'Manage chapters and the state-to-chapter map');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('chapters:manage.own', 'Manage only one''s own chapter');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('masterdata:manage', 'Maintain the admin-editable reference lists');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('settings:manage', 'Change portal settings');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('audit:read', 'Read the audit log');

INSERT OR IGNORE INTO roles (name, description) VALUES ('super_admin', 'Platform administrator: environment, integrations, impersonation');
INSERT OR IGNORE INTO roles (name, description) VALUES ('president', 'National Chair: full read, governance, escalation recipient');
INSERT OR IGNORE INTO roles (name, description) VALUES ('general_secretary', 'Minutes, announcements, events and communications');
INSERT OR IGNORE INTO roles (name, description) VALUES ('finance_secretary', 'Donations, funds, refunds, tax statements, financial reports');
INSERT OR IGNORE INTO roles (name, description) VALUES ('membership_secretary', 'Registration vetting, approvals and member records');
INSERT OR IGNORE INTO roles (name, description) VALUES ('chapter_lead', 'Manages only their own US region''s members and events');
INSERT OR IGNORE INTO roles (name, description) VALUES ('mentor', 'Reads the directory and professional profiles; no financial access');
INSERT OR IGNORE INTO roles (name, description) VALUES ('member', 'An active community member');
INSERT OR IGNORE INTO roles (name, description) VALUES ('youth_member', 'A member under 18; restricted profile');
INSERT OR IGNORE INTO roles (name, description) VALUES ('applicant', 'Has applied for membership; sees only their own application');
INSERT OR IGNORE INTO roles (name, description) VALUES ('admin', 'Full administrative access to users, roles, permissions and navigation.');
INSERT OR IGNORE INTO roles (name, description) VALUES ('navigation_manager', 'Can configure navigation only. Reaches /admin/navigation without the ''admin'' role, since that route gates on the permission alone.');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'members:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'members:write.self';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'members:read.financial';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:approve';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:payment.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'registration:email.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'chapters:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'chapters:manage.own';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'masterdata:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'settings:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'audit:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'navigation:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'users:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'roles:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'permissions:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'members:read.financial';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'registration:approve';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'registration:payment.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'chapters:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'settings:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'audit:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'members:read.financial';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'registration:payment.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'audit:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'members:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:approve';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:payment.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'registration:email.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'chapters:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'masterdata:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'audit:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'chapters:manage.own';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'members:write.self';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'youth_member' AND p.name = 'members:write.self';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'members:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'members:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'members:write.self';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'members:read.financial';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'registration:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'registration:approve';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'registration:payment.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'registration:email.override';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'chapters:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'chapters:manage.own';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'masterdata:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'settings:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'audit:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'navigation:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'users:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'roles:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'permissions:manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'navigation_manager' AND p.name = 'navigation:manage';

-- ── First-install accounts ─────────────────────────────────────────────────
-- Two administrators, so a new install can be signed in to and set up.
-- ⚠ PUBLISHED PASSWORDS — change both right after the first install
-- (apps/backend/migrations/README.md).
--   admin@example.com       Password!1     admin
--   superadmin@example.com  ChangeMe!123   super_admin + admin
-- Both hold a staff role, which is what lets an account without a member
-- record sign in to this portal (STAFF_ROLES, community-auth-hooks). bcrypt
-- cost 12, matching AuthService; emails lowercased as it compares them.

INSERT OR IGNORE INTO users (email, passwordHash, firstName, lastName, isActive, credentialEpoch) VALUES ('superadmin@example.com', '$2b$12$TvUbcfC/BwWo4Utlceym9exbGvN5CZrvKs3.Cmiy1rKZfws6ws5A2', 'Sam', 'Superuser', 1, 0);
INSERT OR IGNORE INTO users (email, passwordHash, firstName, lastName, isActive, credentialEpoch) VALUES ('admin@example.com', '$2b$12$ZfWq8d4fEj2kAUPW22q5qO3auruv/puCJSR.WomqCL1XLPKZwfrLG', 'Ada', 'Admin', 1, 0);

INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'superadmin@example.com' AND r.name = 'super_admin';
INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'superadmin@example.com' AND r.name = 'admin';
INSERT OR IGNORE INTO user_roles (user_id, role_id) SELECT u.id, r.id FROM users u, roles r WHERE u.email = 'admin@example.com' AND r.name = 'admin';

-- ── Chapters and the state→chapter map ─────────────────────────────────────
-- Registration assigns an applicant's chapter from their state (REG-14), so
-- these are configuration, not sample data. Fixed ids keep every database
-- built from this file identical. contactEmail is left empty on purpose —
-- set real addresses in /admin/chapters.

INSERT OR IGNORE INTO chapters (id, code, name, description, "isActive") VALUES ('242e55d8-0deb-4471-9243-0d54565dcfe8', 'EC', 'East Coast', NULL, 1);
INSERT OR IGNORE INTO chapters (id, code, name, description, "isActive") VALUES ('0472bc1b-6d8d-449b-9c2a-5c57bd1b8b2f', 'MW', 'Midwest', NULL, 1);
INSERT OR IGNORE INTO chapters (id, code, name, description, "isActive") VALUES ('631552b7-fb18-4e1a-9256-51d6d6554a37', 'SE', 'Southeast', NULL, 1);
INSERT OR IGNORE INTO chapters (id, code, name, description, "isActive") VALUES ('937613e9-4395-4be8-b9a8-36602a05da9b', 'TX', 'Texas', NULL, 1);
INSERT OR IGNORE INTO chapters (id, code, name, description, "isActive") VALUES ('fcecf2f5-8fa0-4d85-a203-35705728dd16', 'WC', 'West Coast', NULL, 1);

INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'be208ba9-d8eb-4b4c-8053-1d01e710bfcb', 'AR', c.id FROM chapters c WHERE c.code = 'TX';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '9cc8d36a-50be-44dd-bca5-6b2efd31da0a', 'AZ', c.id FROM chapters c WHERE c.code = 'WC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '94ab0314-c0f5-4ef8-9791-b0cf8712cedf', 'CA', c.id FROM chapters c WHERE c.code = 'WC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '4d05c268-d7b6-4e41-8931-305a43aaac4e', 'CT', c.id FROM chapters c WHERE c.code = 'EC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '7e3dcb5c-094b-4f0c-af63-11529246e850', 'FL', c.id FROM chapters c WHERE c.code = 'SE';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '6dd1cd15-2615-4c6e-a63b-752c2d8351a3', 'GA', c.id FROM chapters c WHERE c.code = 'SE';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '58c0ec2b-6b8e-4889-97a2-2c837b15f96a', 'IL', c.id FROM chapters c WHERE c.code = 'MW';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '6d696a54-e1d4-4e6e-a80a-966ab5087f08', 'LA', c.id FROM chapters c WHERE c.code = 'TX';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '8da0a4cb-b4e4-43c2-b213-dd4d50f473d3', 'MA', c.id FROM chapters c WHERE c.code = 'EC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '4ac12939-8efc-4eae-be4d-bd8246f405e1', 'MI', c.id FROM chapters c WHERE c.code = 'MW';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '094470be-fa17-40cf-8205-e54b8865f98a', 'MN', c.id FROM chapters c WHERE c.code = 'MW';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '73c38be3-637d-42fb-a479-25cc5acf6d04', 'NC', c.id FROM chapters c WHERE c.code = 'SE';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '06de7909-2a57-4e0f-9870-bbc72575dfa1', 'NJ', c.id FROM chapters c WHERE c.code = 'EC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '6e90970b-b399-47af-af75-34367a9a1a4c', 'NM', c.id FROM chapters c WHERE c.code = 'TX';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'db67faa5-5f0d-40db-a49b-c842ab9c1058', 'NV', c.id FROM chapters c WHERE c.code = 'WC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'd448f4f9-9420-45be-89b4-b7ef8bcb6ee1', 'NY', c.id FROM chapters c WHERE c.code = 'EC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '2d0c74e7-0b85-40f1-be7a-4495c39409f8', 'OH', c.id FROM chapters c WHERE c.code = 'MW';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'd0a52d35-3f76-4183-a4a6-4e514b96cedd', 'OK', c.id FROM chapters c WHERE c.code = 'TX';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'c21638ec-2263-4d04-97b5-b509f95c2ac3', 'OR', c.id FROM chapters c WHERE c.code = 'WC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '811e4b64-05f6-4a54-a383-ac7e6d0a22b8', 'PA', c.id FROM chapters c WHERE c.code = 'EC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'f31f359d-4280-4837-9984-a3a37666ae4d', 'SC', c.id FROM chapters c WHERE c.code = 'SE';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '98fde5da-27ad-4a4d-a4c0-356f9b503a5e', 'TN', c.id FROM chapters c WHERE c.code = 'SE';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '2c80dcc2-669d-4f47-87a6-707c09198f62', 'TX', c.id FROM chapters c WHERE c.code = 'TX';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT 'd74635c8-962a-4760-8cbe-fa046e457719', 'WA', c.id FROM chapters c WHERE c.code = 'WC';
INSERT OR IGNORE INTO state_chapter_map (id, "stateCode", chapter_id) SELECT '7f6c687b-b12f-4c45-97b9-450acd13d663', 'WI', c.id FROM chapters c WHERE c.code = 'MW';

-- ── Navigation overrides ───────────────────────────────────────────────────
-- The framework's own sign-up route (/register) is disabled — it creates an
-- account with no member record, bypassing vetting — and the portal's
-- application form takes over its path.

INSERT OR IGNORE INTO navigation_config (id, document, revision) VALUES ('default', '{"version":1,"items":{},"routes":{"helix.auth.register":{"disabled":true},"rawla.registration.join":{"path":"/register"}}}', 1);


COMMIT;
PRAGMA foreign_keys=ON;
