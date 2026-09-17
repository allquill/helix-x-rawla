import { useCallback, useEffect, useState } from 'react';
import { PortalAdministrationService, type PortalSettingDto } from '@helix-x-rawla/client-sdk';

/** The ADM-11 activation levers. */
export function usePortalSettings() {
  const [settings, setSettings] = useState<PortalSettingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSettings(await PortalAdministrationService.listPortalSettings());
    } catch {
      setError('Could not load the portal settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (values: Record<string, string>) => {
    setSettings(
      await PortalAdministrationService.updatePortalSettings({ requestBody: { values } }),
    );
  }, []);

  return { settings, loading, error, refresh, save };
}
