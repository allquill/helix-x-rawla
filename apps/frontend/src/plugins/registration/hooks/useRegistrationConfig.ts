import { useCallback, useEffect, useState } from 'react';
import {
  PortalRegistrationService,
  type PublicRegistrationConfigDto,
} from '@helix-x/client-sdk';

/**
 * The public form's own configuration (ADM-09 / ADM-10).
 *
 * Fetched rather than hard-coded so the client and the server cannot disagree
 * about the minimum age or the dues — the server re-checks both, and a form
 * built on stale constants would reject or accept the wrong people.
 */
export function useRegistrationConfig() {
  const [config, setConfig] = useState<PublicRegistrationConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setConfig(await PortalRegistrationService.getPublicRegistrationConfig());
    } catch {
      setError('Could not load the registration form. Please try again shortly.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Latest date of birth that still satisfies the age gate, for `max=`. */
  const maxDateOfBirth = (() => {
    if (!config) return undefined;
    const today = new Date();
    const cutoff = new Date(
      Date.UTC(today.getUTCFullYear() - config.minimumAge, today.getUTCMonth(), today.getUTCDate()),
    );
    return cutoff.toISOString().slice(0, 10);
  })();

  const options = (key: string) => config?.referenceLists?.[key] ?? [];

  return { config, loading, error, refresh, maxDateOfBirth, options };
}
