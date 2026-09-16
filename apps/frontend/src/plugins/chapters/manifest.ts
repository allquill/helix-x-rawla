import { defineManifest } from '@helix-x/web';

/**
 * The chapter registry and the state → chapter map (CHP-01, CHP-02).
 *
 * Mirrors `@Permissions('chapters:manage')` on `PortalAdminController`.
 *
 * The rail tab contributes into `portal.sectionnav`, a slot the
 * `membership-admin` plugin defines. That is the point of declaring slots in a
 * manifest: this tab appears without either plugin importing the other, and
 * without `membership-admin` having to know that chapters exist.
 */
const CAN_MANAGE = "'chapters:manage' in user.permissions";

export const manifest = defineManifest({
  id: 'rawla.chapters',
  name: 'Chapters',
  version: '0.1.0',
  description: 'Chapter registry and state-to-chapter mapping.',
  publisher: 'rawla',

  permissions: ['ui:contribute', 'routes:register', 'navigation:control'],

  activationEvents: ['onRoute:/admin/chapters', 'onSlot:portal.sectionnav'],

  contributes: {
    routes: [
      { id: 'rawla.chapters.admin', path: '/admin/chapters', title: 'Chapters', when: CAN_MANAGE, layout: 'app' },
    ],

    navItems: [
      {
        id: 'portal.sectionnav.chapters',
        slot: 'portal.sectionnav',
        order: 20,
        label: 'Chapters',
        icon: 'table',
        when: CAN_MANAGE,
        action: { type: 'navigate', to: '/admin/chapters' },
      },
    ],
  },
});

export default manifest;
