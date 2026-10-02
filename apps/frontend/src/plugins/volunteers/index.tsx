import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const VolunteersPage = lazy(() =>
  import('./pages/VolunteersPage').then((m) => ({ default: m.VolunteersPage })),
);

// Must stay identical to the clause in manifest.ts.
const CAN_READ = "'volunteers:read' in user.permissions";

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerRoute({
      id: 'rawla.volunteers.top',
      path: '/volunteers',
      when: CAN_READ,
      component: VolunteersPage,
    });
  },
});
