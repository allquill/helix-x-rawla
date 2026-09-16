import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  resolve: {
    /*
     * `@helix-x/*` arrives through `link:`, so its files live outside this
     * project and resolve `react` from *their* node_modules. Two React copies
     * in one page breaks every hook with the "invalid hook call" error, which
     * gives no hint that duplication is the cause.
     *
     * Dedupe collapses them onto this app's copy. It is only needed because the
     * packages are linked from sibling checkouts; consuming them as published
     * versions needs none of this.
     */
    dedupe: [
      'react',
      'react-dom',
      'react-router-dom',
      /*
       * `axios` carries the auth interceptor. `client-sdk`'s `core/request.ts`
       * issues every call through the *global* axios instance, and
       * `plugin-auth` installs its 401 → sign-out handler on the *global* axios
       * instance — but the plugin resolves axios from the `helix-x-web`
       * checkout and the SDK from its own, so without this they are two
       * different globals and the interceptor is installed on one nobody uses.
       * The symptom is a session that expires server-side and never signs out:
       * calls just start failing.
       */
      'axios',
      /*
       * `@helix-x/client-sdk` exports a mutable `OpenAPI` singleton. Both this
       * app and the linked `helix-x-web` plugins now `link:` the same
       * `helix-x-client-sdk` checkout, so there is one copy on disk and this
       * entry is belt-and-braces rather than the load-bearing fix it was when
       * the SDK arrived here as a tarball. It stays because the failure it
       * prevents is silent: two singletons means plugin-auth sets
       * `OpenAPI.BASE` and the token on one while every request reads the
       * other, and every call goes out unauthorised to a relative URL.
       */
      '@helix-x/client-sdk',
    ],
  },
  optimizeDeps: {
    // Linked packages are not pre-bundled by default. Excluding them keeps Vite
    // serving their source directly, so editing a plugin is live here.
    exclude: [
      '@helix-x/web',
      '@helix-x/react-router',
      '@helix-x/design-system',
      '@helix-x/plugin-theme',
      '@helix-x/plugin-auth',
      '@helix-x/plugin-navigation',
      '@helix-x/plugin-admin',
      '@helix-x/plugin-oauth',
      '@helix-x/plugin-reports',
    ],
  },
});
