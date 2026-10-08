#!/usr/bin/env node
/**
 * Writes the Nexus credential for @helix-x/* into the user-level ~/.npmrc —
 * the one place pnpm accepts it from. The project .npmrc is committed and only
 * names the registry; pnpm refuses to expand `${NPM_TOKEN}` there.
 *
 *   NPM_TOKEN=<base64 of user:password> pnpm registry:login
 *
 * Used the same way by a developer once, by CI, and by the Render build
 * command. Idempotent: it replaces its own line and leaves the rest of
 * ~/.npmrc alone. The registry URL is read from the project .npmrc, so the two
 * cannot drift.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const token = process.env.NPM_TOKEN;
if (!token) {
  console.error('registry:login: set NPM_TOKEN to the base64 of "user:password" for packages.allquill.com');
  process.exit(1);
}

const project = readFileSync(new URL('../.npmrc', import.meta.url), 'utf8');
const registry = project.match(/^@helix-x:registry\s*=\s*"?([^"\s]+)"?\s*$/m)?.[1];
if (!registry) {
  console.error('registry:login: no @helix-x:registry line in the project .npmrc');
  process.exit(1);
}
const key = `${registry.replace(/^https?:/, '').replace(/\/?$/, '/')}:_auth`;

const file = join(process.env.NPM_CONFIG_USERCONFIG || homedir(), process.env.NPM_CONFIG_USERCONFIG ? '' : '.npmrc');
const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l && !l.startsWith(`${key}=`)) : [];
lines.push(`${key}=${token}`);
writeFileSync(file, `${lines.join('\n')}\n`);
chmodSync(file, 0o600);
console.log(`registry:login: credential for ${registry} written to ${file}`);
