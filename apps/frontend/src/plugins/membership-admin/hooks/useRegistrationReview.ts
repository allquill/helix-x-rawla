import { useCallback, useEffect, useState } from 'react';
import {
  PortalRegistrationsService,
  type MemberDetailDto,
} from '@helix-x-rawla/client-sdk';

/**
 * One application under review, plus the four decisions available on it.
 *
 * Every mutation re-reads the record rather than patching local state: approval
 * can activate the member, which changes the status, the Member ID and the gate
 * flags all at once, and guessing at that from the client is how a stale queue
 * row ends up contradicting the database.
 */
export function useRegistrationReview(id: string | undefined) {
  const [member, setMember] = useState<MemberDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setMember(await PortalRegistrationsService.getMemberRegistration({ id }));
    } catch {
      setError('Could not load this application.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (action: () => Promise<MemberDetailDto>) => {
    const updated = await action();
    setMember(updated);
    return updated;
  };

  return {
    member,
    loading,
    error,
    refresh,
    approve: () => run(() => PortalRegistrationsService.approveMemberRegistration({ id: id! })),
    reject: (reason: string) =>
      run(() =>
        PortalRegistrationsService.rejectMemberRegistration({ id: id!, requestBody: { reason } }),
      ),
    requestInfo: (message: string) =>
      run(() =>
        PortalRegistrationsService.requestMemberRegistrationInfo({
          id: id!,
          requestBody: { message },
        }),
      ),
    setPaymentStatus: (isPaymentMade: boolean, reason: string) =>
      run(() =>
        PortalRegistrationsService.setMemberPaymentStatus({
          id: id!,
          requestBody: { isPaymentMade, reason },
        }),
      ),
    overrideEmail: (reason: string) =>
      run(() =>
        PortalRegistrationsService.overrideMemberEmailVerification({
          id: id!,
          requestBody: { reason },
        }),
      ),
  };
}
