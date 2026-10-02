/**
 * Events & Ticketing (EVT) and Volunteer Management (VOL) — §11 and §12 of the
 * requirements, in the Revision 9 shape: volunteering is a tick at sign-up,
 * hours are entered when the event closes, and closing is terminal.
 */

/** EVT-16, in RROA-DEV's priority order. */
export const EVENT_CATEGORIES = ['mel', 'annual_chapter', 'local_charity'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

/**
 * `draft` is invisible to members. `published` takes registrations. `closed`
 * is terminal (EVT-26): every write is refused and there is no way back.
 */
export const EVENT_STATUSES = ['draft', 'published', 'closed'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const REGISTRATION_STATUSES = [
  'pending_payment',
  'confirmed',
  'cancelled',
  'removed_by_admin',
] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

/** The statuses that hold seats and block a second registration by the household. */
export const ACTIVE_REGISTRATION_STATUSES: readonly RegistrationStatus[] = [
  'pending_payment',
  'confirmed',
];

/** Who an attendee is, relative to the purchaser's household. */
export const ATTENDEE_PERSON_TYPES = ['member', 'spouse', 'child'] as const;
export type AttendeePersonType = (typeof ATTENDEE_PERSON_TYPES)[number];

export const ATTENDEE_STATUSES = ['active', 'released'] as const;
export type AttendeeStatus = (typeof ATTENDEE_STATUSES)[number];

export const PRICING_TIERS = ['early_bird', 'standard'] as const;
export type PricingTier = (typeof PRICING_TIERS)[number];

/** `stripe` and `console` are checkouts; `zelle` and `other` are recorded by hand (EVT-20). */
export const EVENT_PAYMENT_METHODS = ['stripe', 'console', 'zelle', 'other'] as const;
export type EventPaymentMethod = (typeof EVENT_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_METHODS = ['zelle', 'other'] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const EVENT_PAYMENT_STATUSES = ['pending', 'settled', 'expired'] as const;
export type EventPaymentStatus = (typeof EVENT_PAYMENT_STATUSES)[number];

/** EVT-24. */
export const EVENT_DOCUMENT_KINDS = ['financial_statement', 'bill', 'other'] as const;
export type EventDocumentKind = (typeof EVENT_DOCUMENT_KINDS)[number];

/** EVT-11 / VOL-07: `volunteer` is the volunteer-related cost line. */
export const EVENT_COST_CATEGORIES = ['venue', 'food', 'volunteer', 'supplies', 'other'] as const;
export type EventCostCategory = (typeof EVENT_COST_CATEGORIES)[number];

export const NOTIFICATION_KINDS = ['invitation', 'reminder'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_CHANNELS = ['email', 'sms'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ['claimed', 'sent', 'failed', 'skipped_opt_out'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/** The one `scheduleKey` an invitation is logged under. */
export const INVITATION_SCHEDULE_KEY = 'publish';

/**
 * Permissions this module checks. Seeded, with their grants, by migration
 * `0004_events_volunteers` — a name here with no row there is a 403 for
 * everyone, administrators included.
 */
export const EVENT_PERMISSIONS = {
  READ: 'events:read',
  REGISTER: 'events:register',
  /** EVT-16: the three Secretaries, and `super_admin`. Not `admin`. */
  CREATE: 'events:create',
  WRITE: 'events:write',
  REGISTRATIONS_READ: 'events:registrations.read',
  PAYMENTS_RECORD: 'events:payments.record',
  REGISTRATIONS_REMOVE: 'events:registrations.remove',
  DOCUMENTS_READ: 'events:documents.read',
  DOCUMENTS_MANAGE: 'events:documents.manage',
  PHOTOS_MANAGE: 'events:photos.manage',
  CLOSE: 'events:close',
  INVENTORY_MANAGE: 'events:inventory.manage',
  FINANCE_READ: 'events:finance.read',
  FINANCE_MANAGE: 'events:finance.manage',
  WAIVERS_MANAGE: 'events:waivers.manage',
  VOLUNTEERS_READ: 'volunteers:read',
  VOLUNTEER_HOURS_WRITE: 'volunteers:hours.write',
  CERTIFICATES_UPLOAD: 'certificates:upload',
} as const;

/** Keys in `portal_settings`, seeded by `0004`. */
export const EVENT_SETTING_KEYS = {
  REMINDER_OFFSETS_DAYS: 'events.reminder_offsets_days',
  DEFAULT_TIMEZONE: 'events.default_timezone',
  BROADCAST_BATCH_SIZE: 'events.broadcast_batch_size',
  YOUTH_MAX_AGE: 'volunteers.youth_max_age',
  LEADERBOARD_SIZE: 'volunteers.leaderboard_size',
} as const;

/** Used when the row is missing — the same values `0004` seeds. */
export const EVENT_SETTING_DEFAULTS: Record<string, string> = {
  [EVENT_SETTING_KEYS.REMINDER_OFFSETS_DAYS]: '7,1',
  [EVENT_SETTING_KEYS.DEFAULT_TIMEZONE]: 'America/Chicago',
  [EVENT_SETTING_KEYS.BROADCAST_BATCH_SIZE]: '50',
  [EVENT_SETTING_KEYS.YOUTH_MAX_AGE]: '17',
  [EVENT_SETTING_KEYS.LEADERBOARD_SIZE]: '25',
};

/** Reference lists the registration form reads (EVT-04). */
export const DIETARY_PREFERENCE_LIST = 'dietary_preference';
export const TSHIRT_SIZE_LIST = 'tshirt_size';

/** Notification template names owned by this module. */
export const EVENT_TEMPLATES = {
  INVITATION: 'portal.event-invitation',
  REMINDER: 'portal.event-reminder',
  REGISTRATION_RECEIVED: 'portal.event-registration-received',
  REGISTRATION_CONFIRMED: 'portal.event-registration-confirmed',
  REGISTRATION_REMOVED: 'portal.event-registration-removed',
} as const;

/** Machine-readable refusals the frontend maps to a message. */
export const EVENT_CODES = {
  EVENT_CLOSED: 'EVENT_CLOSED',
  EVENT_NOT_PUBLISHED: 'EVENT_NOT_PUBLISHED',
  EVENT_STARTED: 'EVENT_STARTED',
  EVENT_FULL: 'EVENT_FULL',
  REGISTRATION_CLOSED: 'REGISTRATION_CLOSED',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  ALREADY_PAID: 'ALREADY_PAID',
  NOT_ACTIVE: 'NOT_ACTIVE',
  SLOT_FULL: 'SLOT_FULL',
  WAIVER_REQUIRED: 'WAIVER_REQUIRED',
  NO_TICKET_TYPE: 'NO_TICKET_TYPE',
  HOURS_MISSING: 'HOURS_MISSING',
  NOTHING_TO_PAY: 'NOTHING_TO_PAY',
} as const;
export type EventCode = (typeof EVENT_CODES)[keyof typeof EVENT_CODES];
