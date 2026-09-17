import { useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Alert,
  DataTable,
  Pagination,
  SearchInput,
  Tabs,
  type DataTableColumn,
} from '@helix-x/design-system';
import type { MemberSummaryDto } from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../components/PortalAdminLayout';
import { GateBadges } from '../components/GateBadges';
import { useRegistrationQueue } from '../hooks/useRegistrationQueue';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'in_review', label: 'In review' },
  { id: 'info_requested', label: 'Info requested' },
  { id: 'approved_awaiting_payment', label: 'Awaiting payment' },
  { id: 'active', label: 'Active' },
  { id: 'rejected', label: 'Rejected' },
];

/**
 * The Membership Secretary's queue (REG-09, REG-19).
 *
 * Applications that have not confirmed their email never appear here — the
 * server keeps them out, so a reviewer's time is only ever spent on addresses
 * proven reachable.
 */
export function RegistrationQueuePage() {
  const navigate = useNavigate();
  const queue = useRegistrationQueue();

  const columns = useMemo<DataTableColumn<MemberSummaryDto>[]>(
    () => [
      {
        key: 'name',
        header: 'Applicant',
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
        key: 'lineage',
        header: 'Lineage',
        hideOnMobile: true,
        render: (m) => (
          <div className="flex flex-col text-xs text-gray-600 dark:text-gray-400">
            <span>{m.caste}</span>
            <span className="text-gray-400 dark:text-gray-500">{m.thikana}</span>
          </div>
        ),
      },
      {
        key: 'tier',
        header: 'Tier',
        hideOnMobile: true,
        render: (m) => <span className="text-sm capitalize">{m.membershipTier}</span>,
      },
      {
        key: 'gates',
        header: 'Gates',
        render: (m) => (
          <GateBadges
            isEmailVerified={m.isEmailVerified}
            isApproved={m.isApproved}
            isPaymentMade={m.isPaymentMade}
            isActive={m.isActive}
          />
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
    ],
    [],
  );

  return (
    <PortalAdminLayout
      title="Membership applications"
      description="Review, approve and track applications through the three activation gates."
    >
      <div className="mb-4 flex flex-col gap-4">
        <Tabs
          items={TABS}
          value={queue.filter.status}
          onChange={queue.setStatus}
          aria-label="Application status"
        />
        <div className="sm:max-w-xs">
          <SearchInput
            value={queue.filter.search ?? ''}
            onChange={(event) => queue.setSearch(event.target.value)}
            onClear={() => queue.setSearch('')}
            placeholder="Name, email or Member ID…"
            aria-label="Search applications"
          />
        </div>
      </div>

      {queue.error && <Alert variant="error" className="mb-4">{queue.error}</Alert>}

      <DataTable
        columns={columns}
        data={queue.items}
        rowKey={(m) => m.id}
        loading={queue.loading}
        emptyState="No applications in this state."
        onRowClick={(m) => navigate(`/admin/registrations/${m.id}`)}
      />

      <Pagination
        page={queue.filter.page}
        pageSize={queue.filter.pageSize}
        total={queue.total}
        onPageChange={queue.setPage}
        onPageSizeChange={queue.setPageSize}
        disabled={queue.loading}
      />
    </PortalAdminLayout>
  );
}
