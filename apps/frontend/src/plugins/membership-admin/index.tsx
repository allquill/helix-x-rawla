import { lazy } from 'react';
import { definePlugin, type PluginContext } from '@helix-x/web';

const RegistrationQueuePage = lazy(() =>
  import('./pages/RegistrationQueuePage').then((m) => ({ default: m.RegistrationQueuePage })),
);
const RegistrationReviewPage = lazy(() =>
  import('./pages/RegistrationReviewPage').then((m) => ({ default: m.RegistrationReviewPage })),
);
const ReferenceDataPage = lazy(() =>
  import('./pages/ReferenceDataPage').then((m) => ({ default: m.ReferenceDataPage })),
);
const PortalSettingsPage = lazy(() =>
  import('./pages/PortalSettingsPage').then((m) => ({ default: m.PortalSettingsPage })),
);
const AuditLogPage = lazy(() =>
  import('./pages/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);

// Must stay identical to the clauses in manifest.ts.
const CAN_REVIEW = "'registration:read' in user.permissions";
const CAN_MASTERDATA = "'masterdata:manage' in user.permissions";
const CAN_SETTINGS = "'settings:manage' in user.permissions";
const CAN_AUDIT = "'audit:read' in user.permissions";

export default definePlugin({
  async activate(context: PluginContext) {
    // Also declared in the manifest, so the slot exists before this plugin
    // loads and `chapters` can contribute its tab either way.
    context.defineSlot({
      id: 'portal.sectionnav',
      description: 'Tabs across the portal administration screens',
    });

    context.registerCommand('rawla.admin.openQueue', () => context.navigate('/admin/registrations'));
    context.registerCommand('rawla.admin.openAudit', () => context.navigate('/admin/audit'));

    context.registerRoute({ id: 'rawla.admin.queue', path: '/admin/registrations', when: CAN_REVIEW, component: RegistrationQueuePage });
    context.registerRoute({ id: 'rawla.admin.review', path: '/admin/registrations/:id', when: CAN_REVIEW, component: RegistrationReviewPage });
    context.registerRoute({ id: 'rawla.admin.referenceData', path: '/admin/reference-data', when: CAN_MASTERDATA, component: ReferenceDataPage });
    context.registerRoute({ id: 'rawla.admin.settings', path: '/admin/portal-settings', when: CAN_SETTINGS, component: PortalSettingsPage });
    context.registerRoute({ id: 'rawla.admin.audit', path: '/admin/audit', when: CAN_AUDIT, component: AuditLogPage });
  },
});
