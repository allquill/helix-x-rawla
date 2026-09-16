/**
 * The registration status machine (§5.1 of the requirements).
 *
 * Status is *where the application sits*; it is deliberately separate from
 * `isActive`, which is the conjunction of the three gates. A member can hold
 * status `Active` and still be inactive — a refund clears the payment gate
 * without moving the application backwards through vetting.
 */
export const MEMBER_STATUSES = [
  'pending_email_verification',
  'pending',
  'in_review',
  'info_requested',
  'rejected',
  'approved_awaiting_payment',
  'active',
  'active_secured',
  'archived',
] as const;

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** Statuses that can never satisfy activation, whatever the gates say. */
export const TERMINAL_STATUSES: readonly MemberStatus[] = ['rejected', 'archived'];

/**
 * Machine-readable reasons a login or gated call is refused (§6.1).
 *
 * These are a stable API contract — the frontend maps each to a remediation.
 * `INVALID_CREDENTIALS` and `ACCOUNT_LOCKED` are raised by the framework's own
 * `AuthService`, not here; they are listed so the union is complete.
 */
export const GATE_CODES = [
  'INVALID_CREDENTIALS',
  'ACCOUNT_LOCKED',
  'ACCOUNT_ARCHIVED',
  'REGISTRATION_REJECTED',
  'EMAIL_NOT_VERIFIED',
  'INFO_REQUESTED',
  'ACCOUNT_PENDING_APPROVAL',
  'PAYMENT_REQUIRED',
] as const;

export type GateCode = (typeof GATE_CODES)[number];

/** Relationship of a person to their household (`Member profile!F16`). */
export const HOUSEHOLD_RELATIONSHIPS = [
  'head_of_house',
  'spouse',
  'child',
  'parent',
  'sibling',
] as const;

export type HouseholdRelationship = (typeof HOUSEHOLD_RELATIONSHIPS)[number];

export const GENDERS = ['male', 'female'] as const;
export type Gender = (typeof GENDERS)[number];

export const LIFE_EVENT_TYPES = ['birth', 'wedding', 'anniversary', 'death'] as const;
export type LifeEventType = (typeof LIFE_EVENT_TYPES)[number];

/** Which flow proved the member controls their email address (§6.2). */
export const VERIFICATION_PROVENANCES = [
  'email_verification',
  'credential_setup',
  'password_reset',
  'admin_override',
] as const;

export type VerificationProvenance = (typeof VERIFICATION_PROVENANCES)[number];

/**
 * Admin-maintained dropdown lists (ADM-01 / MDM).
 *
 * Gotra, Caste and Thikana are never free text — segmentation and badge
 * printing both break the moment two members spell the same clan differently.
 */
export const REFERENCE_LIST_KEYS = [
  'gotra',
  'caste',
  'honorific',
  'language',
  'thikana',
  'membership_tier',
  'industry',
  'skill',
  'volunteer_interest',
] as const;

export type ReferenceListKey = (typeof REFERENCE_LIST_KEYS)[number];

/** Lists the public registration form may read without authentication. */
export const PUBLIC_REFERENCE_LIST_KEYS: readonly ReferenceListKey[] = [
  'gotra',
  'caste',
  'honorific',
  'language',
  'thikana',
  'membership_tier',
];

/** Keys in `portal_settings` (ADM-09 / ADM-11 / ADM-12). */
export const SETTING_KEYS = {
  MINIMUM_AGE: 'registration.minimum_age',
  PAYMENT_REQUIRED: 'registration.payment_required',
  AWAITING_PAYMENT_REMINDER_DAYS: 'registration.awaiting_payment_reminder_days',
  UNVERIFIED_PURGE_DAYS: 'registration.unverified_purge_days',
  CONSENT_VERSION: 'registration.consent_version',
  TTL_EMAIL_VERIFICATION: 'credential.ttl_minutes.email_verification',
  TTL_CREDENTIAL_SETUP: 'credential.ttl_minutes.credential_setup',
  TTL_PASSWORD_RESET: 'credential.ttl_minutes.password_reset',
  RESEND_COOLDOWN_SECONDS: 'credential.resend_cooldown_seconds',
  RESEND_HOURLY_CAP: 'credential.resend_hourly_cap',
} as const;

export const SETTING_DEFAULTS: Record<string, string> = {
  [SETTING_KEYS.MINIMUM_AGE]: '18',
  [SETTING_KEYS.PAYMENT_REQUIRED]: 'true',
  [SETTING_KEYS.AWAITING_PAYMENT_REMINDER_DAYS]: '7',
  [SETTING_KEYS.UNVERIFIED_PURGE_DAYS]: '7',
  [SETTING_KEYS.CONSENT_VERSION]: '1.0',
  [SETTING_KEYS.TTL_EMAIL_VERIFICATION]: '1440',
  [SETTING_KEYS.TTL_CREDENTIAL_SETUP]: '1440',
  [SETTING_KEYS.TTL_PASSWORD_RESET]: '20',
  [SETTING_KEYS.RESEND_COOLDOWN_SECONDS]: '60',
  [SETTING_KEYS.RESEND_HOURLY_CAP]: '5',
};

/** Permissions this module introduces. Seeded by the data-only migration. */
export const PORTAL_PERMISSIONS = {
  MEMBERS_READ: 'members:read',
  MEMBERS_WRITE: 'members:write',
  MEMBERS_WRITE_SELF: 'members:write.self',
  MEMBERS_READ_FINANCIAL: 'members:read.financial',
  REGISTRATION_READ: 'registration:read',
  REGISTRATION_APPROVE: 'registration:approve',
  REGISTRATION_PAYMENT_OVERRIDE: 'registration:payment.override',
  REGISTRATION_EMAIL_OVERRIDE: 'registration:email.override',
  CHAPTERS_MANAGE: 'chapters:manage',
  CHAPTERS_MANAGE_OWN: 'chapters:manage.own',
  MASTERDATA_MANAGE: 'masterdata:manage',
  SETTINGS_MANAGE: 'settings:manage',
  AUDIT_READ: 'audit:read',
} as const;

/**
 * Roles whose holders are portal staff rather than community members.
 *
 * Staff legitimately have no `member` row, so the activation gates cannot apply
 * to them — without this list an administrator would lock themselves out on the
 * first login after this module is installed.
 */
export const STAFF_ROLES: readonly string[] = [
  'admin',
  'super_admin',
  'president',
  'general_secretary',
  'finance_secretary',
  'membership_secretary',
  'chapter_lead',
  'mentor',
];

/** The role a self-registered applicant is given until they are approved. */
export const APPLICANT_ROLE = 'applicant';
/** Reviewers alerted when an application enters the queue (REG-08 / REG-14). */
export const MEMBERSHIP_SECRETARY_ROLE = 'membership_secretary';
export const CHAPTER_LEAD_ROLE = 'chapter_lead';
/** The role granted on approval. */
export const MEMBER_ROLE = 'member';

/** Notification template names owned by this module. */
export const PORTAL_TEMPLATES = {
  APPLICATION_RECEIVED: 'portal.application-received',
  APPLICATION_APPROVED: 'portal.application-approved',
  APPLICATION_REJECTED: 'portal.application-rejected',
  INFO_REQUESTED: 'portal.info-requested',
  AWAITING_PAYMENT_REMINDER: 'portal.awaiting-payment-reminder',
  NEW_APPLICATION_ALERT: 'portal.new-application-alert',
  EMAIL_CHANGED_NOTICE: 'portal.email-changed-notice',
  UNVERIFIED_REMINDER: 'portal.unverified-reminder',
} as const;
