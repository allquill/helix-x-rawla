import { useCallback, useEffect, useState } from 'react';
import { PortalMembersService, type MemberStatusDto } from '@helix-x-rawla/client-sdk';

/**
 * The signed-in member's own gate progress (REG-13).
 *
 * This endpoint is deliberately exempt from the activation gates, so it keeps
 * working for exactly the people who need it: those who cannot use anything
 * else yet.
 */
export function useMembershipStatus() {
  const [status, setStatus] = useState<MemberStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await PortalMembersService.getMyMembershipStatus());
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(
        status === 404
          ? 'This account has no membership application attached to it.'
          : 'Could not load your application status.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { status, loading, error, refresh };
}
