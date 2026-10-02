-- =============================================================================
-- helix-x-rawla — application migration 0004_events_volunteers.sql — SQLite
--
-- Track 'rawla'. Events & Ticketing (EVT) and Volunteer Management (VOL):
--   · 15 tables — portal_files (flyers, bills, certificates), waiver_templates,
--     events and their ticket types, time slots, registrations, attendees, slot
--     bookings, waiver signatures, payments, documents, donated goods, cost
--     entries and notification log, and member_certificates
--   · members."eventEmailOptIn" — the opt-out for invitations and reminders
--   · 18 permissions with every grant. Two are deliberately narrow:
--       events:create — the three Secretaries and super_admin, NOT admin (EVT-16)
--       events:payments.record / registrations.remove / documents.manage /
--       photos.manage — admin and super_admin only
--   · 5 portal settings and the dietary_preference and tshirt_size reference
--     lists with their starting values
--
-- Additive: safe for the previous release to run against. Seeded rows are
-- idempotent by their natural keys. Permissions ride in the JWT, so a
-- signed-in user must sign out and back in before Events appears.
-- =============================================================================

BEGIN TRANSACTION;

INSERT INTO "schema_migrations" ("track", "version", "name") VALUES ('rawla', '0004', 'events_volunteers');

-- ── Tables ──
CREATE TABLE "portal_files" ("id" varchar PRIMARY KEY NOT NULL, "storageKey" text NOT NULL, "name" text NOT NULL, "mimeType" text NOT NULL, "sizeBytes" integer NOT NULL, "checksumSha256" text NOT NULL, "uploadedByUserId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX "IDX_d90f9b4806f8dc8abaf1191c1c" ON "portal_files" ("storageKey");
CREATE TABLE "waiver_templates" ("id" varchar PRIMARY KEY NOT NULL, "key" text NOT NULL, "version" integer NOT NULL DEFAULT (1), "title" text NOT NULL, "body" text NOT NULL, "bodySha256" text NOT NULL, "isCurrent" boolean NOT NULL DEFAULT (1), "createdByUserId" integer, "createdAt" datetime NOT NULL DEFAULT (datetime('now')));
CREATE UNIQUE INDEX "IDX_336f6bd30c4a022b5e8dab74c8" ON "waiver_templates" ("key", "version");
CREATE TABLE "events" ("id" varchar PRIMARY KEY NOT NULL, "title" text NOT NULL, "description" text, "category" text NOT NULL, "chapter_id" varchar, "venue" text, "startsAt" datetime NOT NULL, "endsAt" datetime NOT NULL, "timezone" text NOT NULL DEFAULT ('America/Chicago'), "capacity" integer, "attendeeCount" integer NOT NULL DEFAULT (0), "registrationClosesOn" date NOT NULL, "currency" text NOT NULL DEFAULT ('USD'), "flyer_file_id" varchar, "attireGuide" text, "waiver_template_id" varchar, "collectTshirt" boolean NOT NULL DEFAULT (0), "collectHotel" boolean NOT NULL DEFAULT (0), "reminderOffsetsDays" text, "stripePaymentLink" text, "zelleInstructions" text, "photosUrl" text, "status" text NOT NULL DEFAULT ('draft'), "publishedAt" datetime, "invitationCompletedAt" datetime, "closedAt" datetime, "closedByUserId" integer, "createdByUserId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_987a4efcef7b92bd79e1071719d" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_cc0d0f7a01ec6930af498b1290d" FOREIGN KEY ("flyer_file_id") REFERENCES "portal_files" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_4d28675674ca6a7e68dd1ae5a2b" FOREIGN KEY ("waiver_template_id") REFERENCES "waiver_templates" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX "IDX_f20503eb78cfdac5f8eda342c8" ON "events" ("category");
CREATE INDEX "IDX_987a4efcef7b92bd79e1071719" ON "events" ("chapter_id");
CREATE INDEX "IDX_e0da647c004a695b1d55a073e8" ON "events" ("startsAt");
CREATE INDEX "IDX_03dcebc1ab44daa177ae9479c4" ON "events" ("status");
CREATE TABLE "event_ticket_types" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "name" text NOT NULL, "minAge" integer, "maxAge" integer, "priceCents" integer NOT NULL DEFAULT (0), "earlyBirdPriceCents" integer, "earlyBirdEndsAt" datetime, "sortOrder" integer NOT NULL DEFAULT (0), "isActive" boolean NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_c68d0c353332e19f801ce7a57de" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_c68d0c353332e19f801ce7a57d" ON "event_ticket_types" ("event_id");
CREATE TABLE "event_time_slots" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "activity" text NOT NULL, "startsAt" datetime NOT NULL, "endsAt" datetime NOT NULL, "capacity" integer NOT NULL, "bookedCount" integer NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_6d49cfaefeb4a2150bdf3439f3d" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_6d49cfaefeb4a2150bdf3439f3" ON "event_time_slots" ("event_id");
CREATE TABLE "event_registrations" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "household_id" varchar NOT NULL, "purchaser_member_id" varchar NOT NULL, "chapter_id" varchar, "status" text NOT NULL DEFAULT ('pending_payment'), "totalCents" integer NOT NULL DEFAULT (0), "paidCents" integer NOT NULL DEFAULT (0), "currency" text NOT NULL DEFAULT ('USD'), "removedByUserId" integer, "removedReason" text, "removedAt" datetime, "cancelledAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_28b0a253c87a80a4b013c437f7d" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_2d432c8d902a56dff5693e37887" FOREIGN KEY ("household_id") REFERENCES "households" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_15ced8946dfff142da65fb3b42e" FOREIGN KEY ("purchaser_member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_28d46115e1c8d6481f0cb9af7fd" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX "IDX_28b0a253c87a80a4b013c437f7" ON "event_registrations" ("event_id");
CREATE INDEX "IDX_2d432c8d902a56dff5693e3788" ON "event_registrations" ("household_id");
CREATE INDEX "IDX_15ced8946dfff142da65fb3b42" ON "event_registrations" ("purchaser_member_id");
CREATE INDEX "IDX_28d46115e1c8d6481f0cb9af7f" ON "event_registrations" ("chapter_id");
CREATE INDEX "IDX_d727b5cb9516d2fe450c6ee20b" ON "event_registrations" ("status");
CREATE UNIQUE INDEX "UQ_event_registrations_active_household" ON "event_registrations" ("event_id", "household_id") WHERE "status" IN ('pending_payment', 'confirmed');
CREATE TABLE "event_attendees" ("id" varchar PRIMARY KEY NOT NULL, "registration_id" varchar NOT NULL, "event_id" varchar NOT NULL, "personType" text NOT NULL, "member_id" varchar, "spouse_profile_id" varchar, "child_profile_id" varchar, "owner_member_id" varchar, "personKey" text NOT NULL, "fullName" text NOT NULL, "isYouth" boolean NOT NULL DEFAULT (0), "ticket_type_id" varchar, "ticketTypeName" text NOT NULL, "unitPriceCents" integer NOT NULL DEFAULT (0), "pricingTier" text NOT NULL DEFAULT ('standard'), "dietaryPref" text, "dietaryNotes" text, "tshirtSize" text, "hotelDetails" text, "isVolunteer" boolean NOT NULL DEFAULT (0), "volunteerMinutes" integer, "hoursRecordedByUserId" integer, "hoursRecordedAt" datetime, "status" text NOT NULL DEFAULT ('active'), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_d2e97cfbdee84bcfd524c23f40d" FOREIGN KEY ("registration_id") REFERENCES "event_registrations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_c296e70709cd6f4cb6b4e3e7e2a" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_25b3ba40ac3341413d909d1b9f9" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_9dc23a02b9243b3a2d4a236e797" FOREIGN KEY ("spouse_profile_id") REFERENCES "spouse_profiles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_cd12d17b1c904a7355dd589de71" FOREIGN KEY ("child_profile_id") REFERENCES "child_profiles" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_47ffee27a190141f672e10caebd" FOREIGN KEY ("owner_member_id") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_611eee884d1f3d433ea5d7c5103" FOREIGN KEY ("ticket_type_id") REFERENCES "event_ticket_types" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX "IDX_d2e97cfbdee84bcfd524c23f40" ON "event_attendees" ("registration_id");
CREATE INDEX "IDX_c296e70709cd6f4cb6b4e3e7e2" ON "event_attendees" ("event_id");
CREATE INDEX "IDX_47ffee27a190141f672e10caeb" ON "event_attendees" ("owner_member_id");
CREATE INDEX "IDX_74e7833542cb8626f30e984999" ON "event_attendees" ("personKey");
CREATE INDEX "IDX_ff3ec80f9e74ccb90ae7a14454" ON "event_attendees" ("isVolunteer");
CREATE INDEX "IDX_b323f3a704418085cff3d3a734" ON "event_attendees" ("status");
CREATE UNIQUE INDEX "UQ_event_attendees_active_person" ON "event_attendees" ("event_id", "personKey") WHERE "status" = 'active';
CREATE TABLE "event_slot_bookings" ("id" varchar PRIMARY KEY NOT NULL, "slot_id" varchar NOT NULL, "attendee_id" varchar NOT NULL, "event_id" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_3fc4fd474462352bd763fac4544" FOREIGN KEY ("slot_id") REFERENCES "event_time_slots" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_4a0d04011fbed42d5fbc99001ad" FOREIGN KEY ("attendee_id") REFERENCES "event_attendees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_10256c1b58b255b45e747d51eaf" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_4a0d04011fbed42d5fbc99001a" ON "event_slot_bookings" ("attendee_id");
CREATE INDEX "IDX_10256c1b58b255b45e747d51ea" ON "event_slot_bookings" ("event_id");
CREATE UNIQUE INDEX "IDX_02c4aaffc2589257f5354579d9" ON "event_slot_bookings" ("slot_id", "attendee_id");
CREATE TABLE "event_waiver_signatures" ("id" varchar PRIMARY KEY NOT NULL, "attendee_id" varchar NOT NULL, "event_id" varchar NOT NULL, "waiver_template_id" varchar NOT NULL, "templateVersion" integer NOT NULL, "bodySha256" text NOT NULL, "signedName" text NOT NULL, "signed_by_member_id" varchar, "signedByUserId" integer NOT NULL, "signedAt" datetime NOT NULL, "ip" text, "userAgent" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_b33f26e289532b64d8cc1e6a6d3" FOREIGN KEY ("attendee_id") REFERENCES "event_attendees" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_675c233530e87250497811aa769" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_c3ecc71f39faa4334a4317c1ee9" FOREIGN KEY ("waiver_template_id") REFERENCES "waiver_templates" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION, CONSTRAINT "FK_cbd30f9c55804158aa077fdba37" FOREIGN KEY ("signed_by_member_id") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE UNIQUE INDEX "IDX_b33f26e289532b64d8cc1e6a6d" ON "event_waiver_signatures" ("attendee_id");
CREATE INDEX "IDX_675c233530e87250497811aa76" ON "event_waiver_signatures" ("event_id");
CREATE TABLE "event_payments" ("id" varchar PRIMARY KEY NOT NULL, "registration_id" varchar NOT NULL, "event_id" varchar NOT NULL, "amountCents" integer NOT NULL, "currency" text NOT NULL DEFAULT ('USD'), "method" text NOT NULL, "status" text NOT NULL DEFAULT ('pending'), "providerRef" text, "checkoutUrl" text, "checkoutExpiresAt" datetime, "reference" text, "note" text, "recordedByUserId" integer, "settledAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_3bd1471bb804aa8de5af89e4696" FOREIGN KEY ("registration_id") REFERENCES "event_registrations" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_5be28ed036832012d0ea9c8a506" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_3bd1471bb804aa8de5af89e469" ON "event_payments" ("registration_id");
CREATE INDEX "IDX_5be28ed036832012d0ea9c8a50" ON "event_payments" ("event_id");
CREATE INDEX "IDX_140cb9ed2c7bb2cff74415dc01" ON "event_payments" ("status");
CREATE UNIQUE INDEX "IDX_4143a0dadfa24c729ba1d6b30b" ON "event_payments" ("providerRef");
CREATE TABLE "event_documents" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "file_id" varchar NOT NULL, "kind" text NOT NULL DEFAULT ('other'), "addedByUserId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_0e7beecc0e412805ac01255fd0f" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_f6abea385598f55c2353d1b1277" FOREIGN KEY ("file_id") REFERENCES "portal_files" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_0e7beecc0e412805ac01255fd0" ON "event_documents" ("event_id");
CREATE TABLE "event_donated_goods" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "item" text NOT NULL, "description" text, "quantity" integer NOT NULL DEFAULT (1), "unit" text, "estimatedValueCents" integer, "donor_member_id" varchar, "donorName" text, "receivedAt" datetime NOT NULL, "recordedByUserId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_ffc912da46eff0278da0760bfcf" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_441e8d992e8588d6a0e83545e2d" FOREIGN KEY ("donor_member_id") REFERENCES "members" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX "IDX_ffc912da46eff0278da0760bfc" ON "event_donated_goods" ("event_id");
CREATE INDEX "IDX_441e8d992e8588d6a0e83545e2" ON "event_donated_goods" ("donor_member_id");
CREATE TABLE "event_cost_entries" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "chapter_id" varchar, "category" text NOT NULL, "description" text NOT NULL, "amountCents" integer NOT NULL, "currency" text NOT NULL DEFAULT ('USD'), "incurredOn" date NOT NULL, "recordedByUserId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_b5c9222d889a5f5fe0fca650aea" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_ac54c5d914eeddc3235a4ded96d" FOREIGN KEY ("chapter_id") REFERENCES "chapters" ("id") ON DELETE SET NULL ON UPDATE NO ACTION);
CREATE INDEX "IDX_b5c9222d889a5f5fe0fca650ae" ON "event_cost_entries" ("event_id");
CREATE INDEX "IDX_ac54c5d914eeddc3235a4ded96" ON "event_cost_entries" ("chapter_id");
CREATE TABLE "event_notification_log" ("id" varchar PRIMARY KEY NOT NULL, "event_id" varchar NOT NULL, "kind" text NOT NULL, "scheduleKey" text NOT NULL, "channel" text NOT NULL, "recipientKey" text NOT NULL, "status" text NOT NULL DEFAULT ('claimed'), "error" text, "sentAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_c688accc556d64e7b32b8c75b60" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE UNIQUE INDEX "IDX_440366ef80d5d7ecbdfc1fd296" ON "event_notification_log" ("event_id", "kind", "scheduleKey", "channel", "recipientKey");
CREATE TABLE "member_certificates" ("id" varchar PRIMARY KEY NOT NULL, "member_id" varchar NOT NULL, "child_profile_id" varchar, "event_id" varchar, "title" text NOT NULL, "file_id" varchar NOT NULL, "uploadedByUserId" integer NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "FK_2e5404cb947fc330383ba558407" FOREIGN KEY ("member_id") REFERENCES "members" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_3c5fce227e5c9974f18840e8c0c" FOREIGN KEY ("child_profile_id") REFERENCES "child_profiles" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_0e40fae71bc4b4bd6bb6cba0b3b" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE SET NULL ON UPDATE NO ACTION, CONSTRAINT "FK_542bd0b67215511661ac2ad71ef" FOREIGN KEY ("file_id") REFERENCES "portal_files" ("id") ON DELETE CASCADE ON UPDATE NO ACTION);
CREATE INDEX "IDX_2e5404cb947fc330383ba55840" ON "member_certificates" ("member_id");

-- ── members: the event-email opt-out (default: opted in) ──
ALTER TABLE "members" ADD COLUMN "eventEmailOptIn" boolean NOT NULL DEFAULT (1);

-- ── Access: permissions and grants ──
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:read', 'See published events, their flyers and participant lists');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:register', 'Register your household for an event and pay for it');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:create', 'Create an event (EVT-16: the three Secretaries)');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:write', 'Edit and publish events, their tickets and time slots');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:registrations.read', 'See every registration for an event, with amounts and preferences');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:payments.record', 'Record a Zelle or other offline event payment by hand');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:registrations.remove', 'Remove a household from an event, with a reason');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:documents.read', 'Open the statements and bills of an event, subject to its security level');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:documents.manage', 'Attach and delete the statements and bills of an event');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:photos.manage', 'Post the link to the photos of an event');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:close', 'Close an event permanently');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:inventory.manage', 'Record goods donated for an event');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:finance.read', 'See the revenue and costs of an event by chapter');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:finance.manage', 'Record the costs of an event against a chapter');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('events:waivers.manage', 'Write liability waivers and publish new versions');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('volunteers:read', 'See the Top Volunteers list');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('volunteers:hours.write', 'Enter the hours each volunteer served at an event');
INSERT OR IGNORE INTO permissions (name, description) VALUES ('certificates:upload', 'Upload a certificate to the profile of a member or their child');

INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'youth_member' AND p.name = 'events:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'events:register';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:create';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:create';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:create';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:create';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'events:registrations.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:payments.record';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:payments.record';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:registrations.remove';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:registrations.remove';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:documents.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:documents.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:documents.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:documents.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:documents.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:documents.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:documents.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:photos.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:photos.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:close';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:close';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:close';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:close';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:close';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:inventory.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:inventory.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:inventory.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:inventory.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:inventory.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:finance.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:finance.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:finance.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:finance.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'events:finance.read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:finance.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:finance.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:finance.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:finance.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'events:waivers.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'events:waivers.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'events:waivers.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'events:waivers.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'events:waivers.manage';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'president' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'chapter_lead' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'mentor' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'member' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'youth_member' AND p.name = 'volunteers:read';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'volunteers:hours.write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'volunteers:hours.write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'volunteers:hours.write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'volunteers:hours.write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'volunteers:hours.write';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'super_admin' AND p.name = 'certificates:upload';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin' AND p.name = 'certificates:upload';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'general_secretary' AND p.name = 'certificates:upload';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'membership_secretary' AND p.name = 'certificates:upload';
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'finance_secretary' AND p.name = 'certificates:upload';

-- ── Portal settings ──
INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description") VALUES ('75cd5c15-cff3-5fd5-ada2-d03523d09467', 'events.reminder_offsets_days', '7,1', 'string', 'Days before an event starts that registrants are reminded, comma-separated (EVT-07). An event may override it.');
INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description") VALUES ('e071896f-0506-569e-aae4-2d2b1bc6dc51', 'events.default_timezone', 'America/Chicago', 'string', 'IANA time zone a new event starts in; its closing date is evaluated there (EVT-18).');
INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description") VALUES ('05a85384-98c7-5a0c-9c0a-9a17defc993e', 'events.broadcast_batch_size', '50', 'number', 'Invitation emails sent per scheduler pass (EVT-22).');
INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description") VALUES ('7ce387e3-5bf4-5421-b71d-3fbef9249a1d', 'volunteers.youth_max_age', '17', 'number', 'Oldest age, on the day an event starts, counted as a youth volunteer (VOL-06).');
INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description") VALUES ('517e53cd-ce2b-5a73-845a-0dd6f2352ef6', 'volunteers.leaderboard_size', '25', 'number', 'How many people the Top Volunteers list shows (VOL-06).');

-- ── Reference lists read by the event registration form (EVT-04) ──
INSERT OR IGNORE INTO "reference_lists" ("id", "key", "label") VALUES ('4c154dfe-ff50-5117-a2cb-c828798a6bd9', 'dietary_preference', 'Dietary Preference');
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '5dc9432c-4768-59bb-97c1-c7d159e0bd05', l."id", 'vegetarian', 'Vegetarian', 10 FROM "reference_lists" l WHERE l."key" = 'dietary_preference';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '22c83138-8b01-5112-868c-97c13acea684', l."id", 'jain', 'Jain', 20 FROM "reference_lists" l WHERE l."key" = 'dietary_preference';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '0a338d58-728a-5622-955b-62bd5a6aaa11', l."id", 'non_vegetarian', 'Non-vegetarian', 30 FROM "reference_lists" l WHERE l."key" = 'dietary_preference';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '480eb8d4-1ebd-56ab-a8d6-2edef33769e4', l."id", 'vegan', 'Vegan', 40 FROM "reference_lists" l WHERE l."key" = 'dietary_preference';
INSERT OR IGNORE INTO "reference_lists" ("id", "key", "label") VALUES ('7e71dbf0-d056-5e50-ae22-1d8f3368fa3f', 'tshirt_size', 'T-shirt Size');
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT 'b2034956-c68f-5aae-85ba-220cd707c776', l."id", 'youth_s', 'Youth S', 10 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '2aa6f2ca-7e47-57f6-9835-bfab642f4892', l."id", 'youth_m', 'Youth M', 20 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT 'ca5a947c-fecd-5ad2-b1ba-fa9a49b64462', l."id", 'youth_l', 'Youth L', 30 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '2c5a77f3-d40b-5711-ba33-a6968dd9ee7f', l."id", 's', 'Adult S', 40 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT 'd8cc02fb-3de4-5176-9702-6d174509dd9f', l."id", 'm', 'Adult M', 50 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '29268b2f-0792-51a7-8947-c2bf96345c16', l."id", 'l', 'Adult L', 60 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '1a795150-2a5e-51c4-a70d-5eef234a9910', l."id", 'xl', 'Adult XL', 70 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';
INSERT OR IGNORE INTO "reference_list_values" ("id", "list_id", "value", "label", "sortOrder") SELECT '26ba80f2-1fcc-5663-a037-c56a22d0d579', l."id", 'xxl', 'Adult XXL', 80 FROM "reference_lists" l WHERE l."key" = 'tshirt_size';

COMMIT;
