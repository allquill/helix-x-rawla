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
       * `axios` carries the auth interceptor. `core-sdk`'s `core/request.ts`
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
       * `@helix-x/core-sdk` exports a mutable `OpenAPI` singleton, and this is
       * load-bearing rather than belt-and-braces. The client is generated in
       * two halves: the linked `helix-x-web` plugins import the framework's
       * endpoints from `@helix-x/core-sdk`, and this app's own endpoints come
       * from `@helix-x-rawla/client-sdk`, whose `src/core/` re-exports that
       * same package. Both halves therefore have to agree on one copy.
       *
       * Two copies means `plugin-auth` sets `OpenAPI.BASE` and the token on
       * one object while every request reads the other, and the failure is
       * silent: calls go out unauthorised, to a relative URL, with nothing
       * pointing at duplication as the cause.
       */
      '@helix-x/core-sdk',
      '@helix-x-rawla/client-sdk',
      /*
       * The form stack. `plugin-auth` and `plugin-contact` import these from
       * the `helix-x-web` checkout, and the dep optimizer bundles each package
       * name once — whichever copy it meets first serves *every* importer. When
       * the framework's won, this app's zod-4 schemas ran on zod 3:
       * `z.enum(SubmitRegistrationDto.gender)` built fine and then crashed
       * inside zod with "array.map is not a function" on the first invalid
       * submit. Deduping pins all three to this app's versions.
       */
      'zod',
      'react-hook-form',
      '@hookform/resolvers',
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
      '@helix-x/plugin-contact',
      '@helix-x/plugin-documents',
      '@helix-x/plugin-devtools',
    ],
  },
});
