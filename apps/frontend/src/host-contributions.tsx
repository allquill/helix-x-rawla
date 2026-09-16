import type { HelixApplication } from '@helix-x/web';

/**
 * The host is just another contributor, under the reserved `host` id.
 *
 * Nothing is contributed yet. The demo seeded a card into
 * `dashboard.widgets`, but this app drops `plugin-dashboard` — the Rawla home
 * plugin owns `/` — so that slot does not exist here. Contributing to a slot
 * nobody defines is silently inert, which is why the call was removed rather
 * than repointed.
 *
 * Note what is *not* here: the signed-in user. Identity comes from
 * `plugin-auth`, which resolves it from the backend during `onStartup`. A host
 * that seeded a user here would be asserting an identity the backend never
 * issued — every `when` clause would gate on a fiction, and the first real API
 * call would 401.
 */
export function registerHostContributions(_app: HelixApplication): void {
  // Intentionally empty.
}
