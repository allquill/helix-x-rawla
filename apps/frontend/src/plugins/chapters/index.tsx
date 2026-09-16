import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const ChaptersAdminPage = lazy(() =>
  import('./pages/ChaptersAdminPage').then((m) => ({ default: m.ChaptersAdminPage })),
);

// Must stay identical to the clause in manifest.ts.
const CAN_MANAGE = "'chapters:manage' in user.permissions";

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerRoute({
      id: 'rawla.chapters.admin',
      path: '/admin/chapters',
      when: CAN_MANAGE,
      component: ChaptersAdminPage,
    });
  },
});
