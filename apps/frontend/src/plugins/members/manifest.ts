import { defineManifest } from '@helix-x/web';

/**
 * The member directory and a member's own profile.
 *
 * Two different clauses, and the split matters. The directory and the detail
 * page mirror `@Permissions('members:read')` on `MemberController`. The
 * `/members/me*` screens require only a session: they are how a member edits
 * their own record, and `members:write.self` is granted to the `member` role
 * anyway — gating the link on a permission an applicant lacks would hide the
 * profile page from exactly the people still filling it in.
 *
 * The clause only decides what to OFFER. The guard is the enforcement — hiding
 * a link does not close the URL, and the API refuses either way.
 */
const CAN_READ = "'members:read' in user.permissions";
const SIGNED_IN = 'user.authenticated';

export const manifest = defineManifest({
  id: 'rawla.members',
  name: 'Members',
  version: '0.1.0',
  description: 'Member directory, profiles and privacy settings.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'commands:register', 'navigation:control'],

  activationEvents: [
    'onRoute:/members',
    'onRoute:/members/me',
    'onRoute:/members/me/privacy',
    'onRoute:/members/:id',
    'onCommand:rawla.members.openDirectory',
  ],

  contributes: {
    commands: [
      {
        id: 'rawla.members.openDirectory',
        title: 'Member directory',
        category: 'Members',
        icon: 'users',
        when: CAN_READ,
      },
    ],

    routes: [
      { id: 'rawla.members.directory', path: '/members', title: 'Members', when: CAN_READ, layout: 'app' },
      // Static segments before the parameterised one. The kernel ranks routes
      // statically so this is not load-bearing the way Express is, but keeping
      // the declaration order honest keeps the intent readable.
      { id: 'rawla.members.me', path: '/members/me', title: 'My profile', when: SIGNED_IN, layout: 'app' },
      { id: 'rawla.members.privacy', path: '/members/me/privacy', title: 'Privacy', when: SIGNED_IN, layout: 'app' },
      { id: 'rawla.members.detail', path: '/members/:id', title: 'Member', when: CAN_READ, layout: 'app' },
    ],

    navItems: [
      {
        id: 'rawla.members.nav.directory',
        slot: 'app.sidebar.primary',
        group: 'Community',
        order: 10,
        label: 'Members',
        icon: 'users',
        when: CAN_READ,
        action: { type: 'navigate', to: '/members' },
      },
      {
        id: 'rawla.members.nav.directory.header',
        slot: 'app.header.menu',
        order: 20,
        label: 'Members',
        icon: 'users',
        when: CAN_READ,
        action: { type: 'navigate', to: '/members' },
      },
      // In the user menu rather than the sidebar: it is about you, not about
      // the community, and that is where people look for it.
      {
        id: 'rawla.members.nav.me',
        slot: 'app.header.menu',
        order: 21,
        label: 'My profile',
        icon: 'user',
        when: SIGNED_IN,
        action: { type: 'navigate', to: '/members/me' },
      },
    ],
  },
});

export default manifest;
