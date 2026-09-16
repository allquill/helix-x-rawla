import { useCallback, useEffect, useState } from 'react';
import {
  PortalMembersService,
  type MemberDetailDto,
  type MemberSummaryDto,
  type UpdateMemberDto,
  type UpdateMemberPrivacyDto,
} from '@helix-x/client-sdk';

export type MemberFilter = {
  search?: string;
  gotra?: string;
  caste?: string;
  membershipTier?: string;
  isActive?: boolean;
  page: number;
  pageSize: number;
};

/** The member directory and admin list (MP-02). Server-paged and server-filtered. */
export function useMembers(initial?: Partial<MemberFilter>) {
  const [filter, setFilter] = useState<MemberFilter>({
    page: 1,
    pageSize: 25,
    isActive: true,
    ...initial,
  });
  const [items, setItems] = useState<MemberSummaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PortalMembersService.listPortalMembers({
        search: filter.search || undefined,
        gotra: filter.gotra || undefined,
        caste: filter.caste || undefined,
        membershipTier: filter.membershipTier || undefined,
        isActive: filter.isActive === undefined ? undefined : String(filter.isActive),
        limit: String(filter.pageSize),
        offset: String((filter.page - 1) * filter.pageSize),
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError('Could not load the member list.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const patch = (next: Partial<MemberFilter>) =>
    setFilter((f) => ({ ...f, ...next, page: next.page ?? 1 }));

  return { items, total, filter, loading, error, refresh, patch };
}

/** One member, tier-filtered by the server to what this viewer may see. */
export function useMember(id: string | undefined) {
  const [member, setMember] = useState<MemberDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setMember(await PortalMembersService.getPortalMember({ id }));
    } catch (err) {
      setError(
        (err as { status?: number }).status === 404
          ? 'That member could not be found.'
          : 'Could not load the member record.',
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { member, loading, error, refresh };
}

/** The signed-in member's own record, editable by them (MP-14). */
export function useMyProfile() {
  const [member, setMember] = useState<MemberDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMember(await PortalMembersService.getMyMemberProfile());
    } catch {
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(async (patch: UpdateMemberDto) => {
    setMember(await PortalMembersService.updateMyMemberProfile({ requestBody: patch }));
  }, []);

  const savePrivacy = useCallback(
    async (patch: UpdateMemberPrivacyDto) => {
      await PortalMembersService.updateMyMemberPrivacy({ requestBody: patch });
      await refresh();
    },
    [refresh],
  );

  return { member, loading, error, refresh, save, savePrivacy };
}
