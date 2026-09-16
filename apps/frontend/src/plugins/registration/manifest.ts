import { defineManifest } from '@helix-x/web';

/**
 * Applying for membership, and watching the application progress.
 *
 * The two routes are gated in opposite directions, which is the whole point:
 * `/join` is for people without an account and is hidden once you have one;
 * `/join/status` is for people who have an account but are not yet active.
 *
 * `/join/status` deliberately carries no permission clause. An applicant holds
 * nothing yet, and the backend marks the endpoints behind this screen
 * `@GateExempt()` for the same reason — a member who cannot get past the
 * activation gates must still be able to see *which* gate is holding them up.
 * Requiring a permission here would lock the one page that explains the lock.
 */
const SIGNED_OUT = '!user.authenticated';
const SIGNED_IN = 'user.authenticated';

export const manifest = defineManifest({
  id: 'rawla.registration',
  name: 'Registration',
  version: '0.1.0',
  description: 'Public membership application and applicant status.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'navigation:control'],

  activationEvents: ['onRoute:/join', 'onRoute:/join/status'],

  contributes: {
    routes: [
      // `app.bare` — header (branding, theme toggle) but no sidebar: there is
      // nothing to navigate to before you have an account.
      { id: 'rawla.registration.join', path: '/join', title: 'Join', when: SIGNED_OUT, layout: 'app.bare' },
      { id: 'rawla.registration.status', path: '/join/status', title: 'My membership', when: SIGNED_IN, layout: 'app' },
    ],

    navItems: [
      {
        id: 'rawla.registration.nav.join',
        slot: 'app.header.menu',
        order: 10,
        label: 'Join',
        icon: 'user',
        when: SIGNED_OUT,
        action: { type: 'navigate', to: '/join' },
      },
      {
        id: 'rawla.registration.nav.status',
        slot: 'app.header.menu',
        order: 10,
        label: 'My membership',
        icon: 'check',
        when: SIGNED_IN,
        action: { type: 'navigate', to: '/join/status' },
      },
      {
        id: 'rawla.registration.nav.status.sidebar',
        slot: 'app.sidebar.primary',
        group: 'Membership',
        order: 10,
        label: 'My membership',
        icon: 'check',
        when: SIGNED_IN,
        action: { type: 'navigate', to: '/join/status' },
      },
    ],
  },
});

export default manifest;
