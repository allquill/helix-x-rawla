import { useCallback, useState } from 'react';
import { PortalMembersService } from '@helix-x-rawla/client-sdk';

/**
 * Hands the member off to the dues checkout (REG-16).
 *
 * A full-page navigation rather than a popup or frame: hosted checkout pages
 * refuse to be framed, and the provider sends the browser back to
 * `/join/status?payment=…` when it is done.
 */
export function useDuesCheckout() {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const { checkoutUrl } = await PortalMembersService.createMyDuesCheckout();
      window.location.assign(checkoutUrl);
      // Leave `starting` set: the page is unloading, and re-enabling the button
      // in the meantime only invites a second checkout.
    } catch (err) {
      const message = (err as { body?: { message?: unknown } }).body?.message;
      setError(typeof message === 'string' ? message : 'Could not start the payment. Please try again.');
      setStarting(false);
    }
  }, []);

  return { startCheckout, starting, error };
}
