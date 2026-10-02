import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApplication, createMemoryStorage, type HelixApplication } from '@helix-x/web';
import { NavigationService } from '@helix-x/core-sdk';

import { plugins } from '../src/plugins';

/**
 * Activates every plugin this host registers, under the same strict permission
 * mode `main.tsx` uses.
 *
 * This exists because a static check is not enough. `PluginContext` asserts
 * permissions **at the call site**, so an undeclared capability surfaces only
 * when that line runs — and the source-scanning audit in
 * `helix-x-web/scripts/check-plugin-permissions.mjs` reported a clean bill of
 * health while `plugin-auth` was crashing on an undeclared `settings:read`,
 * because its regex did not account for `context.getSetting<string>(...)`.
 * Running the plugins cannot be fooled by syntax.
 */
describe('every registered plugin activates under strict permissions', () => {
  let app: HelixApplication;

  beforeEach(() => {
    /*
     * Nothing here should reach the network. plugin-navigation tries and is
     * expected to fail softly, which is itself worth asserting.
     *
     * It has to be the SDK call that fails, not `fetch`: the generated client
     * issues every request through axios, so a `fetch` stub left this suite
     * quietly talking to whatever was listening on :3001.
     */
    vi.spyOn(NavigationService, 'getPublicNavigationConfig').mockRejectedValue(
      new Error('offline'),
    );
    // plugin-navigation caches the last document it applied in `localStorage`,
    // not in the storage injected below — so without this a document fetched
    // by one test survives into every later one, and the file's result depends
    // on the order its tests happen to run in.
    localStorage.clear();

    app = createApplication({
      app: { id: 'test', name: 'Test', version: '0.0.0', environment: 'test' },
      plugins,
      storage: createMemoryStorage(),
      router: { mode: 'memory' },
      logLevel: 'silent',
      pluginManager: { permissionMode: 'strict' },
      settingsDefaults: { 'helix.auth.apiBaseUrl': 'http://localhost:3001' },
    });
  });

  afterEach(() => {
    app.dispose();
    vi.unstubAllGlobals();
  });

  test('start() brings up the onStartup plugins without failing any', async () => {
    await app.start();

    const failed = app.plugins
      .getAll()
      .filter((record) => record.state === 'failed')
      .map((record) => `${record.manifest.id}: ${record.error?.message ?? 'unknown'}`);

    expect(failed).toEqual([]);
  });

  test('every lazy plugin activates too', async () => {
    await app.start();

    const failures: string[] = [];
    for (const record of app.plugins.getAll()) {
      if (record.state === 'disabled') continue;
      await app.plugins.activate(record.manifest.id);
      const after = app.plugins.get(record.manifest.id);
      if (after?.state !== 'active') {
        failures.push(`${record.manifest.id} is '${after?.state}': ${after?.error?.message ?? ''}`);
      }
    }

    // A PermissionDeniedError from any plugin lands here with its id and the
    // capability it forgot to declare.
    expect(failures).toEqual([]);
  });

  test('a backend outage during startup leaves the app usable', async () => {
    await app.start();

    // plugin-navigation's fetch fails above; it must still be active, because
    // navigation has to survive the API being down.
    expect(app.plugins.get('helix.navigation')?.state).toBe('active');
    expect(app.plugins.get('helix.auth')?.state).toBe('active');
  });

  test('the portal.sectionnav slot is open before membership-admin loads', async () => {
    await app.start();

    // Declared in membership-admin's manifest rather than only in its
    // activate(), which is what lets the chapters plugin contribute a tab
    // without membership-admin being loaded. If this regresses, the Chapters
    // tab silently vanishes from the portal admin rail.
    expect(app.plugins.get('rawla.membership-admin')?.state).not.toBe('active');
    expect(app.slots.getDefinition('portal.sectionnav')).toBeDefined();
  });
});

/**
 * The layouts this host's routes actually ask for.
 *
 * A typo in a `layout` id is invisible — the shell falls back to full chrome
 * rather than failing — so it is worth asserting the declared ids exist and that
 * the intent is what we think it is.
 */
describe('route layouts', () => {
  /*
   * These assert what *this host declares*, so nothing here may reach the
   * network.
   *
   * plugin-navigation fetches a navigation document and applies it as a route
   * override layer — it can move a path or disable a route outright. Without
   * this stub the suite quietly read whatever a backend on :3001 happened to
   * serve, so it passed with no dev server running and failed with one: the
   * deployment's document moves `/join` to `/register` and disables
   * `helix.auth.register`, and `matchAny('/register')` then answered with the
   * Join page. A test that depends on whether a server is up is worse than no
   * test, and the failure accuses the wrong code.
   *
   * The SDK calls through axios, not `fetch`, so stubbing the global does
   * nothing here — the call itself has to be the thing that fails.
   */
  beforeEach(() => {
    vi.spyOn(NavigationService, 'getPublicNavigationConfig').mockRejectedValue(
      new Error('offline'),
    );
    localStorage.clear();
  });

  test('every declared layout id is one the kernel or a plugin defines', async () => {
    const app = createApplication({
      app: { id: 'test', name: 'Test', version: '0.0.0', environment: 'test' },
      plugins,
      storage: createMemoryStorage(),
      router: { mode: 'memory' },
      logLevel: 'silent',
      pluginManager: { permissionMode: 'strict' },
      settingsDefaults: { 'helix.auth.apiBaseUrl': 'http://localhost:3001' },
    });
    await app.start();
    for (const record of app.plugins.getAll()) {
      if (record.state !== 'disabled') await app.plugins.activate(record.manifest.id);
    }

    const unknown = app.routes
      .declared()
      .filter(({ route }) => route.layout && !app.layouts.has(route.layout))
      .map(({ route }) => `${route.id} -> '${route.layout}'`);

    expect(unknown).toEqual([]);
    app.dispose();
  });

  test('sign-in screens are chrome-free and admin screens are not', async () => {
    const app = createApplication({
      app: { id: 'test', name: 'Test', version: '0.0.0', environment: 'test' },
      plugins,
      storage: createMemoryStorage(),
      router: { mode: 'memory' },
      logLevel: 'silent',
      pluginManager: { permissionMode: 'strict' },
      settingsDefaults: { 'helix.auth.apiBaseUrl': 'http://localhost:3001' },
    });
    await app.start();

    const layoutOf = (path: string) => app.routes.matchAny(path)?.route.layout;

    expect(layoutOf('/login')).toBe('app.focused');
    expect(layoutOf('/register')).toBe('app.focused');
    // Where the emailed credential links land. Chrome-free for the same reason
    // as the rest: AuthLayout is a full-page split.
    expect(layoutOf('/verify-email')).toBe('app.focused');
    expect(layoutOf('/set-password')).toBe('app.focused');
    expect(layoutOf('/admin/users')).toBe('app');
    expect(layoutOf('/oauth-clients')).toBe('app');
    // Documents: the two literal paths must outrank `/documents/:id`.
    expect(app.routes.matchAny('/documents/shared')?.route.id).toBe('documents.shared');
    expect(app.routes.matchAny('/documents/folders/abc')?.route.id).toBe('documents.folder');
    expect(app.routes.matchAny('/documents/abc')?.route.id).toBe('documents.detail');
    expect(layoutOf('/documents')).toBe('app');
    // The root page is full-width with no sidebar, signed in or out. Its nav
    // items move into the header, so the app stays reachable from it. Here that
    // is the Rawla landing page rather than plugin-dashboard, which this host
    // does not register.
    expect(layoutOf('/')).toBe('app.full');

    // Rawla portal. `/join` keeps the header (branding, theme toggle) but has
    // no sidebar: there is nothing to navigate to before you have an account.
    expect(layoutOf('/join')).toBe('app.bare');
    expect(layoutOf('/join/status')).toBe('app');
    expect(layoutOf('/members')).toBe('app');
    expect(layoutOf('/members/1')).toBe('app');
    expect(layoutOf('/admin/registrations')).toBe('app');
    expect(layoutOf('/admin/chapters')).toBe('app');
    app.dispose();
  });

  /*
   * The emailed-link screens are the only credential routes with no `when`
   * clause, and that is load-bearing rather than an oversight.
   *
   * `/verify-email` is reached two ways: from the link a fresh applicant gets
   * (signed out), and from the "Resend the confirmation email" button on
   * `/join/status` — which only a *signed-in* member can be looking at. The
   * backend hands out the same path as the `EMAIL_NOT_VERIFIED` remediation.
   * Gate it on `!user.authenticated` and that second route answers with the
   * shell's `denied` state instead of the page, which is invisible to a layout
   * assertion and exactly the kind of thing a later tidy-up would "fix".
   */
  test('the emailed-link screens stay reachable while signed in', async () => {
    const app = createApplication({
      app: { id: 'test', name: 'Test', version: '0.0.0', environment: 'test' },
      plugins,
      storage: createMemoryStorage(),
      router: { mode: 'memory' },
      logLevel: 'silent',
      pluginManager: { permissionMode: 'strict' },
      settingsDefaults: { 'helix.auth.apiBaseUrl': 'http://localhost:3001' },
    });
    await app.start();

    app.user.setUser({ id: '1', name: 'Member', roles: [], permissions: [] });

    const visible = (path: string) =>
      Boolean(app.routes.match(path, (when) => app.context.evaluate(when)));

    // The control: a signed-in visitor is deliberately bounced off sign-in.
    expect(visible('/login')).toBe(false);

    expect(visible('/verify-email')).toBe(true);
    expect(visible('/set-password')).toBe(true);

    app.dispose();
  });
});
