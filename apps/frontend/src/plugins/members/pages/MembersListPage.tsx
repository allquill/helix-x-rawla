import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Badge,
  DataTable,
  PageHeader,
  Pagination,
  SearchInput,
  Switch,
  type DataTableColumn,
} from '@helix-x/design-system';
import type { MemberSummaryDto } from '@helix-x-rawla/client-sdk';
import { useMembers } from '../hooks/useMembers';

/**
 * The member directory (MP-02, DIR-09).
 *
 * Defaults to active members only — pending, rejected, archived and
 * approved-but-unpaid members are not part of the community directory. An
 * administrator can widen it; the server still scopes a Chapter Lead to their
 * own region regardless of what is asked for here.
 */
export function MembersListPage() {
  const navigate = useNavigate();
  const { items, total, filter, loading, error, patch } = useMembers();

  const columns = useMemo<DataTableColumn<MemberSummaryDto>[]>(
    () => [
      {
        key: 'name',
        header: 'Member',
        render: (m) => (
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {m.firstName} {m.lastName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{m.email}</span>
          </div>
        ),
      },
      {
        key: 'memberId',
        header: 'Member ID',
        hideOnMobile: true,
        render: (m) => (
          <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
            {m.publicMemberId ?? '—'}
          </span>
        ),
      },
      {
        key: 'lineage',
        header: 'Gotra · Caste',
        hideOnMobile: true,
        render: (m) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {m.gotra} · {m.caste}
          </span>
        ),
      },
      {
        key: 'tier',
        header: 'Tier',
        hideOnMobile: true,
        render: (m) => <span className="text-sm capitalize">{m.membershipTier}</span>,
      },
      {
        key: 'state',
        header: 'Status',
        render: (m) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant={m.isApproved ? 'success' : 'default'}>
              {m.isApproved ? 'Approved' : 'Unapproved'}
            </Badge>
            <Badge variant={m.isPaymentMade ? 'success' : 'default'}>
              {m.isPaymentMade ? 'Paid' : 'Unpaid'}
            </Badge>
          </div>
        ),
      },
    ],
    [],
  );

  return (
      <div className="mx-auto w-full px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="Members"
          description="Search the community by name, lineage or Member ID."
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="sm:max-w-xs sm:flex-1">
            <SearchInput
              value={filter.search ?? ''}
              onChange={(event) => patch({ search: event.target.value })}
              onClear={() => patch({ search: '' })}
              placeholder="Name, email or Member ID…"
              aria-label="Search members"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            Active members only
            <Switch
              checked={filter.isActive === true}
              onCheckedChange={(next) => patch({ isActive: next ? true : undefined })}
              aria-label="Show active members only"
            />
          </label>
        </div>

        {error && <Alert variant="error" className="mb-4">{error}</Alert>}

        <DataTable
          columns={columns}
          data={items}
          rowKey={(m) => m.id}
          loading={loading}
          emptyState="No members match this search."
          onRowClick={(m) => navigate(`/members/${m.id}`)}
        />

        <Pagination
          page={filter.page}
          pageSize={filter.pageSize}
          total={total}
          onPageChange={(page) => patch({ page })}
          onPageSizeChange={(pageSize) => patch({ pageSize })}
          disabled={loading}
        />
      </div>
  );
}
