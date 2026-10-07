import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, DataTable, Pagination, type DataTableColumn } from '@helix-x/web/design-system';
import type { AdminEventDto } from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { useAdminEvents } from '../hooks/useEventAdmin';
import { useCan } from '../hooks/useCan';
import { CATEGORY_LABELS, formatAmount, formatWhen } from '../lib/format';

const STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

/** Every event, drafts included, for the people running them. */
export function AdminEventsPage() {
  const { items, total, page, pageSize, setPage, loading, error } = useAdminEvents();
  const navigate = useNavigate();
  const can = useCan();

  const columns = useMemo<DataTableColumn<AdminEventDto>[]>(
    () => [
      {
        key: 'title',
        header: 'Event',
        render: (e) => (
          <div>
            <span className="font-medium">{e.title}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              {CATEGORY_LABELS[e.category] ?? e.category}
              {e.chapterName ? ` · ${e.chapterName}` : ''}
            </span>
          </div>
        ),
      },
      { key: 'when', header: 'When', hideOnMobile: true, render: (e) => <span className="text-sm">{formatWhen(e)}</span> },
      {
        key: 'registered',
        header: 'Registered',
        width: '130px',
        render: (e) => (
          <span className="text-sm">
            {e.attendeeCount}
            {e.capacity != null ? ` / ${e.capacity}` : ''}
          </span>
        ),
      },
      {
        key: 'paid',
        header: 'Received',
        hideOnMobile: true,
        width: '170px',
        render: (e) => (
          <span className="text-sm">
            {formatAmount(e.paidCents, e.currency)}
            <span className="text-gray-500 dark:text-gray-400"> of {formatAmount(e.totalCents, e.currency)}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '120px',
        render: (e) => <Badge variant={STATUS[e.status]?.variant ?? 'default'}>{STATUS[e.status]?.label ?? e.status}</Badge>,
      },
    ],
    [],
  );

  return (
    <PortalAdminLayout
        title="Manage events"
        description="Create events, follow registrations and payments, and close them when everything is done."
        actions={
          // EVT-16: only the three Secretaries create events.
          can('events:create') ? (
            <Link to="/admin/events/new">
              <Button>New event</Button>
            </Link>
          ) : undefined
        }
    >
      <div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <DataTable
        columns={columns}
        data={items}
        rowKey={(e) => e.id}
        loading={loading}
        onRowClick={(e) => navigate(`/admin/events/${e.id}`)}
        emptyState="No events yet."
      />
      {total > pageSize && (
        <Pagination className="mt-4" page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
      )}
      </div>
    </PortalAdminLayout>
  );
}
