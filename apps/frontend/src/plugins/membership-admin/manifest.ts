import { defineManifest } from '@helix-x/web';

/**
 * The Membership Secretary's screens: the vetting queue, master data, portal
 * settings and the audit log.
 *
 * Each clause mirrors the `@Permissions()` on the endpoint behind the screen,
 * and they are deliberately four different strings rather than one blanket
 * "portal admin" permission. A Chapter Lead holds `registration:read` but not
 * `settings:manage`, so they get the queue and no way to change the rules it
 * runs on. Collapsing these into one clause would quietly hand them the lot.
 */
const CAN_REVIEW = "'registration:read' in user.permissions";
const CAN_MASTERDATA = "'masterdata:manage' in user.permissions";
const CAN_SETTINGS = "'settings:manage' in user.permissions";
const CAN_AUDIT = "'audit:read' in user.permissions";

export const manifest = defineManifest({
  id: 'rawla.membership-admin',
  name: 'Membership administration',
  version: '0.1.0',
  description: 'Vetting queue, reference data, portal settings and audit log.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'commands:register', 'navigation:control'],

  activationEvents: [
    'onRoute:/admin/registrations',
    'onRoute:/admin/registrations/:id',
    'onRoute:/admin/reference-data',
    'onRoute:/admin/portal-settings',
    'onRoute:/admin/audit',
    'onSlot:portal.sectionnav',
  ],

  contributes: {
    // The section rail every portal admin page renders. Opening it here rather
    // than only in `activate()` means the `chapters` plugin can contribute a
    // tab without this one being loaded.
    slots: [{ id: 'portal.sectionnav', description: 'Tabs across the portal administration screens' }],

    commands: [
      { id: 'rawla.admin.openQueue', title: 'Membership applications', category: 'Portal administration', icon: 'users', when: CAN_REVIEW },
      { id: 'rawla.admin.openAudit', title: 'Audit log', category: 'Portal administration', icon: 'file', when: CAN_AUDIT },
    ],

    routes: [
      { id: 'rawla.admin.queue', path: '/admin/registrations', title: 'Applications', when: CAN_REVIEW, layout: 'app' },
      { id: 'rawla.admin.review', path: '/admin/registrations/:id', title: 'Review application', when: CAN_REVIEW, layout: 'app' },
      { id: 'rawla.admin.referenceData', path: '/admin/reference-data', title: 'Reference data', when: CAN_MASTERDATA, layout: 'app' },
      { id: 'rawla.admin.settings', path: '/admin/portal-settings', title: 'Portal settings', when: CAN_SETTINGS, layout: 'app' },
      { id: 'rawla.admin.audit', path: '/admin/audit', title: 'Audit log', when: CAN_AUDIT, layout: 'app' },
    ],

    navItems: [
      // Header + sidebar entry point. Labelled "Membership" out here and
      // "Applications" in the rail — out of context it needs to say which
      // part of the portal it is; inside the section it does not.
      {
        id: 'rawla.admin.nav.header',
        slot: 'app.header.menu',
        order: 30,
        label: 'Membership',
        icon: 'shield',
        when: CAN_REVIEW,
        action: { type: 'navigate', to: '/admin/registrations' },
      },
      {
        id: 'rawla.admin.nav.sidebar',
        slot: 'app.sidebar.primary',
        group: 'Administration',
        order: 20,
        label: 'Membership',
        icon: 'shield',
        when: CAN_REVIEW,
        action: { type: 'navigate', to: '/admin/registrations' },
      },

      // The section rail. Same clauses as the routes above, so a tab is never
      // shown for a screen the person cannot open. `/admin/registrations/:id`
      // gets no tab — it is a detail view reached from the queue.
      { id: 'portal.sectionnav.queue', slot: 'portal.sectionnav', order: 10, label: 'Applications', icon: 'users', when: CAN_REVIEW, action: { type: 'navigate', to: '/admin/registrations' } },
      { id: 'portal.sectionnav.referenceData', slot: 'portal.sectionnav', order: 30, label: 'Reference data', icon: 'table', when: CAN_MASTERDATA, action: { type: 'navigate', to: '/admin/reference-data' } },
      { id: 'portal.sectionnav.settings', slot: 'portal.sectionnav', order: 40, label: 'Portal settings', icon: 'settings', when: CAN_SETTINGS, action: { type: 'navigate', to: '/admin/portal-settings' } },
      { id: 'portal.sectionnav.audit', slot: 'portal.sectionnav', order: 50, label: 'Audit log', icon: 'file', when: CAN_AUDIT, action: { type: 'navigate', to: '/admin/audit' } },
    ],
  },
});

export default manifest;
