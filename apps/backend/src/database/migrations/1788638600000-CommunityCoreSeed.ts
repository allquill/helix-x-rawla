import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reference data the Rawla portal's code depends on.
 *
 * A migration rather than an addition to `sql/admin-seed.sql`, because that
 * script is run by hand against a local file. The `applicant` role name, the
 * minimum-age setting and the membership tiers are read by application code, so
 * they have to exist in every environment automatically — a fresh deploy that
 * skipped a manual step would be broken rather than merely unseeded.
 *
 * Every insert is `INSERT OR IGNORE`, so re-running is harmless.
 */
export class CommunityCoreSeed1788638600000 implements MigrationInterface {
  name = 'CommunityCoreSeed1788638600000';

  private static readonly PERMISSIONS: Array<[string, string]> = [
    ['members:read', 'View member records and the directory'],
    ['members:write', 'Edit any member record'],
    ['members:write.self', "Edit one's own member record"],
    ['members:read.financial', "View a member's financial information (Tier 3)"],
    ['registration:read', 'View the membership application queue'],
    ['registration:approve', 'Approve, reject or request more information on an application'],
    ['registration:payment.override', 'Set or clear the membership dues gate by hand'],
    ['registration:email.override', 'Mark an email address verified manually'],
    ['chapters:manage', 'Manage chapters and the state-to-chapter map'],
    ['chapters:manage.own', "Manage only one's own chapter"],
    ['masterdata:manage', 'Maintain the admin-editable reference lists'],
    ['settings:manage', 'Change portal settings'],
    ['audit:read', 'Read the audit log'],
  ];

  private static readonly ROLES: Array<[string, string]> = [
    ['super_admin', 'Platform administrator: environment, integrations, impersonation'],
    ['president', 'National Chair: full read, governance, escalation recipient'],
    ['general_secretary', 'Minutes, announcements, events and communications'],
    ['finance_secretary', 'Donations, funds, refunds, tax statements, financial reports'],
    ['membership_secretary', 'Registration vetting, approvals and member records'],
    ['chapter_lead', "Manages only their own US region's members and events"],
    ['mentor', 'Reads the directory and professional profiles; no financial access'],
    ['member', 'An active community member'],
    ['youth_member', 'A member under 18; restricted profile'],
    ['applicant', 'Has applied for membership; sees only their own application'],
  ];

  /** role → permissions. `admin` keeps everything so the first account still works. */
  private static readonly GRANTS: Record<string, string[]> = {
    admin: CommunityCoreSeed1788638600000.allPermissionNames(),
    super_admin: CommunityCoreSeed1788638600000.allPermissionNames(),
    president: [
      'members:read', 'members:read.financial', 'registration:read',
      'registration:approve', 'registration:payment.override',
      'chapters:manage', 'settings:manage', 'audit:read',
    ],
    general_secretary: ['members:read', 'registration:read'],
    finance_secretary: [
      'members:read', 'members:read.financial', 'registration:read',
      'registration:payment.override', 'audit:read',
    ],
    membership_secretary: [
      'members:read', 'members:write', 'registration:read', 'registration:approve',
      'registration:payment.override', 'registration:email.override',
      'chapters:manage', 'masterdata:manage', 'audit:read',
    ],
    chapter_lead: ['members:read', 'registration:read', 'chapters:manage.own'],
    mentor: ['members:read'],
    member: ['members:read', 'members:write.self'],
    youth_member: ['members:write.self'],
    applicant: [],
  };

  private static allPermissionNames(): string[] {
    return [
      'members:read', 'members:write', 'members:write.self', 'members:read.financial',
      'registration:read', 'registration:approve', 'registration:payment.override',
      'registration:email.override', 'chapters:manage', 'chapters:manage.own',
      'masterdata:manage', 'settings:manage', 'audit:read',
    ];
  }

  private static readonly LISTS: Array<[string, string]> = [
    ['gotra', 'Gotra / Clan'],
    ['caste', 'Rajput Caste / Sub-Clan'],
    ['honorific', 'Honorific / Title'],
    ['language', 'Language'],
    ['thikana', 'Ancestral Village / Thikana'],
    ['membership_tier', 'Membership Tier'],
    ['industry', 'Industry / Field'],
    ['skill', 'Skill / Expertise'],
    ['volunteer_interest', 'Volunteer Interest'],
  ];

  /**
   * Starter values only.
   *
   * Gotra and Thikana ship empty on purpose: only the community can supply
   * those, and inventing lineage data would be worse than leaving the list for
   * an administrator. `ReferenceDataService` treats an empty list as
   * un-curated and accepts any value until the first one is added.
   */
  private static readonly VALUES: Array<[string, string, string, number, string | null]> = [
    ['honorific', 'kunwar', 'Kunwar', 1, null],
    ['honorific', 'baisa', 'Baisa', 2, null],
    ['honorific', 'banna', 'Banna', 3, null],
    ['language', 'hindi', 'Hindi', 1, null],
    ['language', 'marwari', 'Marwari', 2, null],
    ['language', 'mewari', 'Mewari', 3, null],
    ['language', 'english', 'English', 4, null],
    // The four sub-clans the workbook names explicitly.
    ['caste', 'sengar', 'Sengar', 1, null],
    ['caste', 'shaktawat', 'Shaktawat', 2, null],
    ['caste', 'rathore', 'Rathore', 3, null],
    ['caste', 'chauhan', 'Chauhan', 4, null],
    // Dues are configuration, not code (ADM-10). Amounts are placeholders for
    // the customer to set; the currency is fixed to USD.
    ['membership_tier', 'annual', 'Annual', 1, '{"duesCents":5000,"currency":"USD"}'],
    ['membership_tier', 'lifetime', 'Lifetime', 2, '{"duesCents":50000,"currency":"USD"}'],
    ['membership_tier', 'youth', 'Youth', 3, '{"duesCents":0,"currency":"USD"}'],
    ['membership_tier', 'associate', 'Associate', 4, '{"duesCents":2500,"currency":"USD"}'],
    ['volunteer_interest', 'events', 'Event planning', 1, null],
    ['volunteer_interest', 'tech', 'Tech support', 2, null],
    ['volunteer_interest', 'food', 'Food preparation', 3, null],
    ['volunteer_interest', 'fundraising', 'Fundraising', 4, null],
    ['volunteer_interest', 'youth_mentoring', 'Youth mentoring', 5, null],
  ];

  private static readonly SETTINGS: Array<[string, string, string, string]> = [
    ['registration.minimum_age', '18', 'number', 'Minimum age to create a member account (ADM-09).'],
    ['registration.payment_required', 'true', 'boolean', 'ADM-11 kill-switch: when false the dues gate counts as satisfied.'],
    ['registration.awaiting_payment_reminder_days', '7', 'number', 'Days before an approved-but-unpaid member is reminded (REG-19).'],
    ['registration.unverified_purge_days', '7', 'number', 'Days before an unverified application is purged (REG-24).'],
    ['registration.consent_version', '1.0', 'string', 'Version of the Community Guidelines and Privacy Policy in force (REG-03).'],
    ['credential.ttl_minutes.email_verification', '1440', 'number', 'Verification link lifetime (ADM-12).'],
    ['credential.ttl_minutes.credential_setup', '1440', 'number', 'Password-setup link lifetime (ADM-12).'],
    ['credential.ttl_minutes.password_reset', '20', 'number', 'Password-reset link lifetime (ADM-12).'],
    ['credential.resend_cooldown_seconds', '60', 'number', 'Seconds between resends of a credential link (ADM-12).'],
    ['credential.resend_hourly_cap', '5', 'number', 'Maximum credential links per address per hour (ADM-12).'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [name, description] of CommunityCoreSeed1788638600000.PERMISSIONS) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "permissions" ("name", "description") VALUES (?, ?)`,
        [name, description],
      );
    }

    for (const [name, description] of CommunityCoreSeed1788638600000.ROLES) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "roles" ("name", "description") VALUES (?, ?)`,
        [name, description],
      );
    }

    for (const [role, permissions] of Object.entries(CommunityCoreSeed1788638600000.GRANTS)) {
      for (const permission of permissions) {
        await queryRunner.query(
          `INSERT OR IGNORE INTO "role_permissions" ("role_id", "permission_id")
           SELECT r."id", p."id" FROM "roles" r, "permissions" p
           WHERE r."name" = ? AND p."name" = ?`,
          [role, permission],
        );
      }
    }

    for (const [key, label] of CommunityCoreSeed1788638600000.LISTS) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "reference_lists" ("id", "key", "label") VALUES (lower(hex(randomblob(16))), ?, ?)`,
        [key, label],
      );
    }

    for (const [listKey, value, label, sortOrder, metadata] of CommunityCoreSeed1788638600000.VALUES) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "reference_list_values"
           ("id", "list_id", "value", "label", "sortOrder", "isActive", "metadata")
         SELECT lower(hex(randomblob(16))), l."id", ?, ?, ?, 1, ?
         FROM "reference_lists" l WHERE l."key" = ?`,
        [value, label, sortOrder, metadata, listKey],
      );
    }

    for (const [key, value, valueType, description] of CommunityCoreSeed1788638600000.SETTINGS) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "portal_settings" ("id", "key", "value", "valueType", "description")
         VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`,
        [key, value, valueType, description],
      );
    }

    // The only append-only enforcement SQLite offers. Without these the audit
    // log is merely a table somebody promised not to edit.
    await queryRunner.query(
      `CREATE TRIGGER IF NOT EXISTS "audit_logs_no_update"
       BEFORE UPDATE ON "audit_logs"
       BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END`,
    );
    await queryRunner.query(
      `CREATE TRIGGER IF NOT EXISTS "audit_logs_no_delete"
       BEFORE DELETE ON "audit_logs"
       BEGIN SELECT RAISE(ABORT, 'audit_logs is append-only'); END`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS "audit_logs_no_delete"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS "audit_logs_no_update"`);
    await queryRunner.query(`DELETE FROM "portal_settings"`);
    await queryRunner.query(`DELETE FROM "reference_list_values"`);
    await queryRunner.query(`DELETE FROM "reference_lists"`);

    const roles = CommunityCoreSeed1788638600000.ROLES.map(([name]) => `'${name}'`).join(',');
    const permissions = CommunityCoreSeed1788638600000.PERMISSIONS.map(([name]) => `'${name}'`).join(',');
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission_id" IN (SELECT "id" FROM "permissions" WHERE "name" IN (${permissions}))`,
    );
    await queryRunner.query(`DELETE FROM "roles" WHERE "name" IN (${roles})`);
    await queryRunner.query(`DELETE FROM "permissions" WHERE "name" IN (${permissions})`);
  }
}
