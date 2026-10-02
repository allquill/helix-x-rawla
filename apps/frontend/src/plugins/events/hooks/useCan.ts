import { useCallback } from 'react';
import { useUser } from '@helix-x/web';

/**
 * Whether the signed-in user holds a permission.
 *
 * Only for deciding what to OFFER inside a screen — a button the API would
 * refuse anyway. The route's `when` clause gates the screen and the backend's
 * `@Permissions()` is the enforcement.
 */
export function useCan(): (permission: string) => boolean {
  const user = useUser();
  return useCallback((permission: string) => user?.permissions?.includes(permission) === true, [user]);
}
