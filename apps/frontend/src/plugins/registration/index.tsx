import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const JoinPage = lazy(() => import('./pages/JoinPage').then((m) => ({ default: m.JoinPage })));
const RegistrationStatusPage = lazy(() =>
  import('./pages/RegistrationStatusPage').then((m) => ({ default: m.RegistrationStatusPage })),
);

// Must stay identical to the clauses in manifest.ts — the manifest's copy gates
// each route before this plugin loads, these gate them afterwards.
const SIGNED_OUT = '!user.authenticated';
const SIGNED_IN = 'user.authenticated';

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerRoute({
      id: 'rawla.registration.join',
      path: '/join',
      when: SIGNED_OUT,
      component: JoinPage,
    });
    context.registerRoute({
      id: 'rawla.registration.status',
      path: '/join/status',
      when: SIGNED_IN,
      component: RegistrationStatusPage,
    });
  },
});
