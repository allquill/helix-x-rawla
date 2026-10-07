#!/usr/bin/env node
/**
 * Fails when pnpm-lock.yaml resolves a framework package from anywhere but the
 * registry — the lockfile `pnpm fw:local` / `pnpm fw:packed` write. Committed,
 * it would make CI and the Docker build look for a `framework/` checkout that
 * is not there. Restore the committed one with `pnpm fw:registry`.
 */
import { readFileSync } from 'node:fs';

const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
const bad = lock
  .split('\n')
  .map((line, i) => ({ line: line.trim(), n: i + 1 }))
  .filter(({ line }) => /helix-x-(web|backend|core-sdk)|['"]?@helix-x\/[a-z-]+['"]?:\s*(link|file):/.test(line) && /(link|file):/.test(line));

if (bad.length) {
  console.error('pnpm-lock.yaml points @helix-x/* at a local checkout (local/packed mode):');
  for (const { line, n } of bad.slice(0, 10)) console.error(`  ${n}: ${line}`);
  console.error('Run `pnpm fw:registry` and commit that lockfile instead.');
  process.exit(1);
}
console.log('pnpm-lock.yaml resolves every @helix-x package from the registry');
