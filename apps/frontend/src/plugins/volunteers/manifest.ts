import { defineManifest } from '@helix-x/web';

/**
 * The Volunteer page (VOL-13): the Volunteers part of the Wall of Fame, which
 * is the Top Volunteers list (VOL-06).
 *
 * Mirrors `@Permissions('volunteers:read')` on `PortalVolunteersController`.
 * Every signed-in member role holds it; a signed-out visitor never sees the
 * page and the endpoint behind it answers 401.
 */
const CAN_READ = "'volunteers:read' in user.permissions";

export const manifest = defineManifest({
  id: 'rawla.volunteers',
  name: 'Volunteers',
  version: '0.1.0',
  description: 'Top volunteers by hours served and events served at.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'navigation:control'],

  activationEvents: ['onRoute:/volunteers'],

  contributes: {
    routes: [
      { id: 'rawla.volunteers.top', path: '/volunteers', title: 'Volunteers', when: CAN_READ, layout: 'app' },
    ],

    navItems: [
      {
        id: 'rawla.volunteers.nav',
        slot: 'app.sidebar.primary',
        group: 'Community',
        order: 30,
        label: 'Volunteers',
        icon: 'users',
        when: CAN_READ,
        action: { type: 'navigate', to: '/volunteers' },
      },
      {
        id: 'rawla.volunteers.nav.header',
        slot: 'app.header.menu',
        order: 26,
        label: 'Volunteers',
        icon: 'users',
        when: CAN_READ,
        action: { type: 'navigate', to: '/volunteers' },
      },
    ],
  },
});

export default manifest;
