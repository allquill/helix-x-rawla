import { defineManifest } from '@helix-x/web';

/**
 * The community's front door.
 *
 * This plugin owns `/` in place of the platform's `plugin-dashboard`, which is
 * why that one is not registered in `src/plugins.ts` at all. Two enabled
 * plugins declaring the same path is a conflict, not a merge.
 *
 * No `when` clause anywhere: the landing page is public by design (the samaj
 * has a front door), and the page itself branches on `useUser()` so a
 * signed-in member gets their name and a route onward rather than a sign-up
 * pitch.
 */
export const manifest = defineManifest({
  id: 'rawla.home',
  name: 'Home',
  version: '0.1.0',
  description: 'The Rajputana Rawla of America landing page.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'navigation:control'],

  activationEvents: ['onRoute:/'],

  contributes: {
    routes: [
      // `app.full` — header and status bar, no sidebar, and no content gutter:
      // the hero is full-bleed and would otherwise sit in a 20px frame.
      { id: 'rawla.home.landing', path: '/', title: 'Home', layout: 'app.full' },
    ],

    navItems: [
      {
        id: 'rawla.home.nav',
        slot: 'app.header.menu',
        order: 0,
        label: 'Home',
        icon: 'home',
        action: { type: 'navigate', to: '/' },
      },
    ],
  },
});

export default manifest;
