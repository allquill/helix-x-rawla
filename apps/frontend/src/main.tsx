import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, HelixProvider, createApplication } from '@helix-x/web';
import { createReactRouterAdapter } from '@helix-x/web/react-router';

import { plugins } from './plugins';
import { registerHostContributions } from './host-contributions';
import './styles.css';

// React Router owns the history; the kernel reads it through the adapter, so
// plugin pages can use useNavigate/<Link> as normal while routes are still
// declared in manifests and activated lazily.
//
// Not useParams: there are no <Route> elements for it to read a match from, so
// it returns {}. Path params arrive as props from <RouterOutlet>. See
// docs/frontend/host.md.
const { router, Provider: RouterProvider } = createReactRouterAdapter();

const app = createApplication({
  app: { id: 'helix-rawla', name: 'Rajputana Rawla', version: '0.1.0', environment: import.meta.env.MODE },
  // No `user` here on purpose. The app starts signed out, and `plugin-auth`
  // resolves the real identity from the backend during `onStartup` — before
  // `<HelixProvider>` renders, so every `when` clause is right on first paint.
  plugins,
  logLevel: 'debug',
  router,
  settingsDefaults: {
    // Where the backend lives. plugin-auth reads this and configures the SDK;
    // the plugin has no business inventing a URL.
    'helix.auth.apiBaseUrl': import.meta.env.VITE_API_SERVER ?? 'http://localhost:3001',
  },
  pluginManager: {
    // Plugins must declare every capability they use.
    permissionMode: 'strict',
    // Host-side veto: nothing gets settings:write in this demo.
    permissionPolicy: (_manifest, requested) => requested.filter((p) => p !== 'storage:write'),
  },
});

registerHostContributions(app);

// Handy while developing plugins.
if (import.meta.env.DEV) {
  Object.assign(globalThis, { helix: app });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside HelixProvider: start() activates for the initial route, so the
        adapter must already be in sync when plugins begin activating. */}
    <RouterProvider>
      <HelixProvider application={app} fallback={<div className="p-8 text-sm text-slate-500">Starting…</div>}>
        <AppShell title="Rajputana Rawla" />
      </HelixProvider>
    </RouterProvider>
  </StrictMode>,
);
