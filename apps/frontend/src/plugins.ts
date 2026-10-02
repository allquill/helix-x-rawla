import type { PluginRegistration } from '@helix-x/web';

import { manifest as themeManifest } from '@helix-x/plugin-theme/manifest';
import { manifest as authManifest } from '@helix-x/plugin-auth/manifest';
import { manifest as navigationManifest } from '@helix-x/plugin-navigation/manifest';
import { manifest as adminManifest } from '@helix-x/plugin-admin/manifest';
import { manifest as oauthManifest } from '@helix-x/plugin-oauth/manifest';
import { manifest as reportsManifest } from '@helix-x/plugin-reports/manifest';
import { manifest as contactManifest } from '@helix-x/plugin-contact/manifest';
import { manifest as documentsManifest } from '@helix-x/plugin-documents/manifest';
import { manifest as devtoolsManifest } from '@helix-x/plugin-devtools/manifest';

import { manifest as homeManifest } from './plugins/home/manifest';
import { manifest as registrationManifest } from './plugins/registration/manifest';
import { manifest as membersManifest } from './plugins/members/manifest';
import { manifest as membershipAdminManifest } from './plugins/membership-admin/manifest';
import { manifest as chaptersManifest } from './plugins/chapters/manifest';
import { manifest as eventsManifest } from './plugins/events/manifest';
import { manifest as volunteersManifest } from './plugins/volunteers/manifest';
import { manifest as helpManifest } from './plugins/help/manifest';


/**
 * The plugin registry.
 *
 * Manifests are imported eagerly — they are plain data and drive navigation,
 * routing and the command palette before any plugin code runs. The bodies sit
 * behind `load`, a dynamic `import()` the bundler code-splits automatically.
 *
 * `plugin-dashboard` is deliberately absent: it claims `/`, and the Rawla home
 * plugin owns that route. Two enabled plugins declaring the same path is a
 * conflict, not a merge. `plugin-chat` is absent too — it proxies a LangGraph
 * agents server this repo does not run.
 */
export const plugins: PluginRegistration[] = [
  // Infrastructure. `onStartup`, so it settles before the shell paints.
  {
    manifest: themeManifest,
    load: () => import('@helix-x/plugin-theme'),
  },
  {
    manifest: authManifest,
    load: () => import('@helix-x/plugin-auth'),
  },
  // Depends on helix.auth via manifest.dependencies, so registration order here
  // is documentation rather than sequencing.
  {
    manifest: navigationManifest,
    load: () => import('@helix-x/plugin-navigation'),
  },
  {
    manifest: adminManifest,
    load: () => import('@helix-x/plugin-admin'),
  },
  {
    manifest: oauthManifest,
    load: () => import('@helix-x/plugin-oauth'),
    // Feature flags are `enabled`, not a separate registry. A disabled plugin
    // is parked in the `disabled` state and never loads.
    enabled: import.meta.env.VITE_FEATURE_OAUTH !== 'false',
  },
  {
    manifest: reportsManifest,
    load: () => import('@helix-x/plugin-reports'),
    enabled: import.meta.env.VITE_FEATURE_REPORTS !== 'false',
  },
  {
    manifest: contactManifest,
    load: () => import('@helix-x/plugin-contact'),
    // Public Contact Us form. The recipient is backend configuration
    // (CONTACT_TO_EMAIL); switching the plugin off only removes the form.
    enabled: import.meta.env.VITE_FEATURE_CONTACT !== 'false',
  },
  {
    manifest: documentsManifest,
    load: () => import('@helix-x/plugin-documents'),
    // My files and Shared with me. Needs the documents:* grants from the
    // backend's migration 0003 — and a fresh sign-in, since they ride in the JWT.
    enabled: import.meta.env.VITE_FEATURE_DOCUMENTS !== 'false',
  },
  // ── Rawla portal ──
  // Owns '/', in place of plugin-dashboard. Public: the landing page is the
  // one screen reachable signed out besides /join and the auth routes.
  {
    manifest: homeManifest,
    load: () => import('./plugins/home'),
    enabled: import.meta.env.VITE_FEATURE_HOME !== 'false',
  },
  {
    manifest: registrationManifest,
    load: () => import('./plugins/registration'),
    enabled: import.meta.env.VITE_FEATURE_REGISTRATION !== 'false',
  },
  {
    manifest: membersManifest,
    load: () => import('./plugins/members'),
    enabled: import.meta.env.VITE_FEATURE_MEMBERS !== 'false',
  },
  // Defines the `portal.sectionnav` slot the chapters plugin contributes into,
  // so it is listed before it as documentation. Slots declared in a manifest
  // exist without the plugin loading, so the order is not load-bearing.
  {
    manifest: membershipAdminManifest,
    load: () => import('./plugins/membership-admin'),
    enabled: import.meta.env.VITE_FEATURE_MEMBERSHIP_ADMIN !== 'false',
  },
  {
    manifest: chaptersManifest,
    load: () => import('./plugins/chapters'),
    enabled: import.meta.env.VITE_FEATURE_CHAPTERS !== 'false',
  },
  // Events and their registrations, for members and for the people running
  // them. Needs the events:* and volunteers:* grants from the backend's
  // migration 0004 — and a fresh sign-in, since they ride in the JWT. Its
  // admin tabs contribute into `portal.sectionnav`, like chapters.
  {
    manifest: eventsManifest,
    load: () => import('./plugins/events'),
    enabled: import.meta.env.VITE_FEATURE_EVENTS !== 'false',
  },
  // The Volunteer page: Top Volunteers.
  {
    manifest: volunteersManifest,
    load: () => import('./plugins/volunteers'),
    enabled: import.meta.env.VITE_FEATURE_VOLUNTEERS !== 'false',
  },
  // Nav links to the guide served at /guide/ (the docsify site in docs/).
  {
    manifest: helpManifest,
    load: () => import('./plugins/help'),
    enabled: import.meta.env.VITE_FEATURE_HELP !== 'false',
  },
  {
    manifest: devtoolsManifest,
    load: () => import('@helix-x/plugin-devtools'),
    // Dev mode: the inspector that says which plugin contributed what.
    //
    // Opt-*in* (`=== 'true'`), unlike every flag above, which are opt-out. It
    // is a diagnostic, so it should be absent unless somebody asked for it —
    // but it is gated on the flag alone rather than `import.meta.env.DEV`, so
    // it can be switched on in a deployed build, which is where the
    // interesting "why is this contribution missing here" questions come from.
    enabled: import.meta.env.VITE_FEATURE_DEVTOOLS === 'true',
  },  
];
