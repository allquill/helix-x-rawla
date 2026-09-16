import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { createApplication, createMemoryStorage, type HelixApplication } from '@helix-x/web';

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
    // Nothing here should reach the network. plugin-navigation tries and is
    // expected to fail softly, which is itself worth asserting.
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 503 })));

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
    expect(layoutOf('/admin/users')).toBe('app');
    expect(layoutOf('/oauth-clients')).toBe('app');
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
});
