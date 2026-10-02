import { defineManifest } from '@helix-x/web';

/**
 * Links to the guide.
 *
 * The guide is the docsify site in the repository's `docs/`, served beside
 * the app at `/guide/` (see `vite.config.ts` and the nginx template). It is a
 * separate static site, not a screen, so these are `link` actions that open a
 * new tab — there is no route here and nothing to activate.
 *
 * "Help" is offered to everyone, signed in or not: the pages on joining and
 * signing in matter most before you have an account. "Admin guide" is offered
 * to staff — `registration:read` is held by every staff role except Mentor and
 * by no member. That decides only what is OFFERED: the guide is static files,
 * readable by anyone with the URL, which is why it holds no secrets.
 */
const IS_STAFF = "'registration:read' in user.permissions";

export const manifest = defineManifest({
  id: 'rawla.help',
  name: 'Help',
  version: '0.1.0',
  description: 'Links to the user guide and the administration guide.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'navigation:control'],

  activationEvents: [],

  contributes: {
    navItems: [
      {
        id: 'rawla.help.nav.header',
        slot: 'app.header.menu',
        // Beside "Contact us" (900), after the app's own links.
        order: 890,
        label: 'Help',
        icon: 'info',
        action: { type: 'link', url: '/guide/#/guide/joining', target: '_blank' },
      },
      {
        id: 'rawla.help.nav.sidebar',
        slot: 'app.sidebar.primary',
        group: 'Community',
        order: 90,
        label: 'Help',
        icon: 'info',
        action: { type: 'link', url: '/guide/#/guide/joining', target: '_blank' },
      },
      {
        id: 'rawla.help.nav.admin',
        slot: 'app.sidebar.primary',
        group: 'Administration',
        order: 90,
        label: 'Admin guide',
        icon: 'info',
        when: IS_STAFF,
        action: { type: 'link', url: '/guide/#/setup/overview', target: '_blank' },
      },
    ],
  },
});

export default manifest;
