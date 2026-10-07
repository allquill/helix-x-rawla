/**
 * Points the three framework packages at the sibling `framework/` checkout —
 * only when asked. Without HELIX_FRAMEWORK this file changes nothing, and the
 * app installs @helix-x/web, @helix-x/backend and @helix-x/core-sdk from Nexus
 * like any other dependency. CI and the Docker images never set it.
 *
 *   pnpm fw:local     HELIX_FRAMEWORK=local   web and core-sdk linked (edits live),
 *                                             backend from its .artifacts tarball
 *   pnpm fw:packed    HELIX_FRAMEWORK=packed  all three from .artifacts tarballs —
 *                                             the exact bytes a release publishes
 *   pnpm fw:registry  back to Nexus versions (restores the committed lockfile)
 *
 * The backend is never linked: a symlinked NestJS package resolves its
 * `@nestjs/*` peers from the library checkout, so the graph gets two
 * `TypeOrmModule` classes and DI fails at startup. Repack it there with
 * `pnpm run pack` and re-run `pnpm fw:local`.
 *
 * Either mode rewrites pnpm-lock.yaml with paths into `framework/`.
 * `scripts/check-lockfile.mjs` fails CI on such a lockfile, so it cannot be
 * merged; `pnpm fw:registry` puts the committed one back.
 */
const { createHash } = require('node:crypto');
const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const mode = process.env.HELIX_FRAMEWORK;
const framework = resolve(process.env.HELIX_FRAMEWORK_DIR || join(__dirname, '..', '..', 'framework'));

/*
 * A repacked tarball keeps its name (the version does not change), and pnpm
 * pins a `file:` tarball's integrity in the lockfile — so pointing at
 * .artifacts/ directly re-installs the *previous* build with no error. Pointing
 * at a copy named after the tarball's content hash makes every repack a new
 * spec, which pnpm resolves afresh.
 */
function tarball(repo, name) {
  const dir = join(framework, repo, '.artifacts');
  const file = existsSync(dir) && readdirSync(dir).find((f) => f.startsWith(`${name}-`) && f.endsWith('.tgz'));
  if (!file) throw new Error(`HELIX_FRAMEWORK=${mode}: no ${name} tarball in ${dir} — run \`pnpm run pack\` there`);
  const bytes = readFileSync(join(dir, file));
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const cache = join(__dirname, 'node_modules', '.helix-framework');
  const copy = join(cache, file.replace(/\.tgz$/, `-${hash}.tgz`));
  if (!existsSync(copy)) {
    mkdirSync(cache, { recursive: true });
    writeFileSync(copy, bytes);
  }
  return `file:${copy}`;
}

function targets() {
  if (mode === 'local') {
    return {
      '@helix-x/web': `link:${join(framework, 'helix-x-web', 'packages', 'web')}`,
      '@helix-x/core-sdk': `link:${join(framework, 'helix-x-core-sdk')}`,
      '@helix-x/backend': tarball('helix-x-backend', 'helix-x-backend'),
    };
  }
  if (mode === 'packed') {
    return {
      '@helix-x/web': tarball('helix-x-web', 'helix-x-web'),
      '@helix-x/core-sdk': tarball('helix-x-core-sdk', 'helix-x-core-sdk'),
      '@helix-x/backend': tarball('helix-x-backend', 'helix-x-backend'),
    };
  }
  if (mode) throw new Error(`HELIX_FRAMEWORK must be "local" or "packed", not "${mode}"`);
  return null;
}

const rewrite = targets();

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (!rewrite) return pkg;
      for (const field of ['dependencies', 'devDependencies']) {
        for (const name of Object.keys(pkg[field] ?? {})) {
          if (rewrite[name]) pkg[field][name] = rewrite[name];
        }
      }
      return pkg;
    },
  },
};
