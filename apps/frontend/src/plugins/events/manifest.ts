import { defineManifest } from '@helix-x/web';

/**
 * Events and their registrations (EVT), for members and for the people who
 * run them.
 *
 * Each clause mirrors a `@Permissions()` on the events controllers:
 * `events:read` and `events:register` on `PortalEventsController`;
 * `events:registrations.read`, `events:create` and `events:waivers.manage` on
 * the administration ones. `events:create` is the narrow one — the three
 * Secretaries and `super_admin`, not `admin` (EVT-16) — so the "New event"
 * route is gated on it alone rather than on the general admin clause.
 *
 * The clause only decides what to OFFER; the API refuses either way.
 *
 * The paths here are also written into the backend's event mail
 * (`event-templates.ts`) and its checkout return URL. Change one and that
 * link 404s with nothing failing at build time.
 */
const CAN_READ = "'events:read' in user.permissions";
const CAN_REGISTER = "'events:register' in user.permissions";
const CAN_ADMIN = "'events:registrations.read' in user.permissions";
const CAN_CREATE = "'events:create' in user.permissions";
const CAN_WAIVERS = "'events:waivers.manage' in user.permissions";

export const manifest = defineManifest({
  id: 'rawla.events',
  name: 'Events',
  version: '0.1.0',
  description: 'Community events, household registration and event administration.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'navigation:control'],

  activationEvents: [
    'onRoute:/events',
    'onRoute:/events/:id',
    'onRoute:/events/:id/register',
    'onRoute:/events/:id/registration',
    'onRoute:/admin/events',
    'onRoute:/admin/events/new',
    'onRoute:/admin/events/:id',
    'onRoute:/admin/waivers',
    'onSlot:portal.sectionnav',
  ],

  contributes: {
    routes: [
      { id: 'rawla.events.list', path: '/events', title: 'Events', when: CAN_READ, layout: 'app' },
      { id: 'rawla.events.detail', path: '/events/:id', title: 'Event', when: CAN_READ, layout: 'app' },
      { id: 'rawla.events.register', path: '/events/:id/register', title: 'Register', when: CAN_REGISTER, layout: 'app' },
      { id: 'rawla.events.registration', path: '/events/:id/registration', title: 'My registration', when: CAN_REGISTER, layout: 'app' },
      { id: 'rawla.events.admin', path: '/admin/events', title: 'Manage events', when: CAN_ADMIN, layout: 'app' },
      // The literal path before the parameterised one.
      { id: 'rawla.events.admin.new', path: '/admin/events/new', title: 'New event', when: CAN_CREATE, layout: 'app' },
      { id: 'rawla.events.admin.detail', path: '/admin/events/:id', title: 'Manage event', when: CAN_ADMIN, layout: 'app' },
      { id: 'rawla.events.waivers', path: '/admin/waivers', title: 'Waivers', when: CAN_WAIVERS, layout: 'app' },
    ],

    navItems: [
      {
        id: 'rawla.events.nav.list',
        slot: 'app.sidebar.primary',
        group: 'Community',
        order: 20,
        label: 'Events',
        icon: 'bell',
        when: CAN_READ,
        action: { type: 'navigate', to: '/events' },
      },
      // On `/` there is no sidebar, so the header carries it too.
      {
        id: 'rawla.events.nav.header',
        slot: 'app.header.menu',
        order: 25,
        label: 'Events',
        icon: 'bell',
        when: CAN_READ,
        action: { type: 'navigate', to: '/events' },
      },
      {
        id: 'rawla.events.nav.admin',
        slot: 'app.sidebar.primary',
        group: 'Administration',
        order: 25,
        label: 'Manage events',
        icon: 'table',
        when: CAN_ADMIN,
        action: { type: 'navigate', to: '/admin/events' },
      },
      // Tabs on the portal administration rail, a slot `membership-admin`
      // defines in its manifest — neither plugin imports the other.
      {
        id: 'portal.sectionnav.events',
        slot: 'portal.sectionnav',
        order: 25,
        label: 'Events',
        icon: 'bell',
        when: CAN_ADMIN,
        action: { type: 'navigate', to: '/admin/events' },
      },
      {
        id: 'portal.sectionnav.waivers',
        slot: 'portal.sectionnav',
        order: 26,
        label: 'Waivers',
        icon: 'file',
        when: CAN_WAIVERS,
        action: { type: 'navigate', to: '/admin/waivers' },
      },
    ],
  },
});

export default manifest;
