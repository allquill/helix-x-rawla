import { useCallback, useEffect, useState } from 'react';
import {
  PortalRegistrationsService,
  type ListMembersResponseDto,
  type MemberSummaryDto,
} from '@helix-x-rawla/client-sdk';

export type QueueFilter = {
  status: string;
  search?: string;
  page: number;
  pageSize: number;
};

/** The vetting queue (REG-09). Server-paged — the member base will outgrow one page. */
export function useRegistrationQueue(initialStatus = 'pending') {
  const [filter, setFilter] = useState<QueueFilter>({
    status: initialStatus,
    page: 1,
    pageSize: 25,
  });
  const [data, setData] = useState<ListMembersResponseDto>({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await PortalRegistrationsService.listMemberRegistrations({
          status: filter.status,
          search: filter.search || undefined,
          limit: String(filter.pageSize),
          offset: String((filter.page - 1) * filter.pageSize),
        }),
      );
    } catch {
      setError('Could not load the application queue.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setStatus = (status: string) => setFilter((f) => ({ ...f, status, page: 1 }));
  const setSearch = (search: string) => setFilter((f) => ({ ...f, search, page: 1 }));
  const setPage = (page: number) => setFilter((f) => ({ ...f, page }));
  const setPageSize = (pageSize: number) => setFilter((f) => ({ ...f, pageSize, page: 1 }));

  return {
    items: data.items as MemberSummaryDto[],
    total: data.total,
    filter,
    loading,
    error,
    refresh,
    setStatus,
    setSearch,
    setPage,
    setPageSize,
  };
}
