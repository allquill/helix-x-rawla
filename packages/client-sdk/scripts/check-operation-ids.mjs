#!/usr/bin/env node
/**
 * Fails when two NestJS handlers share a name.
 *
 * The host's `main.ts` sets `operationIdFactory: (_c, methodKey) => methodKey`,
 * so the operationId of every route is just its handler method name. A collision is
 * silent and destructive: the OpenAPI `paths` object keeps both routes but the
 * generator emits one method for the pair, so an endpoint disappears from the
 * SDK with no error anywhere. Cheaper to catch here than to debug from a
 * "method not found" in the browser.
 *
 * Usage: node scripts/check-operation-ids.mjs [url]
 */
const url = process.argv[2] ?? 'http://localhost:3001/docs-json';

let document;
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  document = await response.json();
} catch (error) {
  console.error(`Could not read the OpenAPI document at ${url}: ${error.message}`);
  console.error('Start the application backend first, then retry.');
  console.error('Override the URL with OPENAPI_INPUT=<url>.');
  process.exit(2);
}

const seen = new Map();
for (const [path, methods] of Object.entries(document.paths ?? {})) {
  for (const [method, operation] of Object.entries(methods)) {
    const id = operation?.operationId;
    if (!id) continue;
    const route = `${method.toUpperCase()} ${path}`;
    seen.set(id, [...(seen.get(id) ?? []), route]);
  }
}

const collisions = [...seen.entries()].filter(([, routes]) => routes.length > 1);

if (collisions.length === 0) {
  console.log(`${seen.size} operationIds, all unique.`);
  process.exit(0);
}

console.error(`${collisions.length} duplicate operationId(s) — the generated SDK will silently drop routes:\n`);
for (const [id, routes] of collisions) {
  console.error(`  ${id}`);
  routes.forEach((route) => console.error(`      ${route}`));
}
console.error('\nRename the handler methods so each is unique across the whole app.');
process.exit(1);
