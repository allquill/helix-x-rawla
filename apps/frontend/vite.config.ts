import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Serve the guide — the docsify site in the repository's `docs/` — at
 * `/guide/`, beside the app.
 *
 * One copy of the pages: `pnpm guide` reads the same folder on :4000. In dev
 * a middleware streams the files; at build they are copied to `dist/guide/`.
 * A page that does not exist must answer 404 rather than fall through to the
 * app shell, or docsify renders the app's `index.html` as Markdown.
 */
function guide(): Plugin {
  const docs = resolve(__dirname, '../../docs');
  const types: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
  };
  let outDir = 'dist';
  return {
    name: 'rawla-guide',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use('/guide', (req, res) => {
        const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
        // docsify fetches its pages relative to the address, so `/guide` must
        // become `/guide/`. The mount strips the prefix; `originalUrl` keeps it.
        const requested = (req as { originalUrl?: string }).originalUrl?.split('?')[0];
        if (requested === '/guide') {
          res.statusCode = 302;
          res.setHeader('Location', '/guide/');
          return res.end();
        }
        const file = normalize(join(docs, path.endsWith('/') ? `${path}index.html` : path));
        if (!file.startsWith(docs) || !existsSync(file) || !statSync(file).isFile()) {
          res.statusCode = 404;
          return res.end('Not found');
        }
        res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        // Pages are fetched by XHR; without this an edit shows only after a hard reload.
        res.setHeader('Cache-Control', 'no-store');
        createReadStream(file).pipe(res);
        return undefined;
      });
    },
    closeBundle() {
      if (existsSync(docs)) cpSync(docs, join(outDir, 'guide'), { recursive: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), guide()],
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
