import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const MembersListPage = lazy(() =>
  import('./pages/MembersListPage').then((m) => ({ default: m.MembersListPage })),
);
const MyProfilePage = lazy(() =>
  import('./pages/MyProfilePage').then((m) => ({ default: m.MyProfilePage })),
);
const PrivacySettingsPage = lazy(() =>
  import('./pages/PrivacySettingsPage').then((m) => ({ default: m.PrivacySettingsPage })),
);
const MemberDetailPage = lazy(() =>
  import('./pages/MemberDetailPage').then((m) => ({ default: m.MemberDetailPage })),
);

// Must stay identical to the clauses in manifest.ts.
const CAN_READ = "'members:read' in user.permissions";
const SIGNED_IN = 'user.authenticated';

export default definePlugin({
  async activate(context: PluginContext) {
    context.registerCommand('rawla.members.openDirectory', () => context.navigate('/members'));

    context.registerRoute({ id: 'rawla.members.directory', path: '/members', when: CAN_READ, component: MembersListPage });
    context.registerRoute({ id: 'rawla.members.me', path: '/members/me', when: SIGNED_IN, component: MyProfilePage });
    context.registerRoute({ id: 'rawla.members.privacy', path: '/members/me/privacy', when: SIGNED_IN, component: PrivacySettingsPage });
    context.registerRoute({ id: 'rawla.members.detail', path: '/members/:id', when: CAN_READ, component: MemberDetailPage });
  },
});
