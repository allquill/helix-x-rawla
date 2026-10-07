import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  DataTable,
  Pagination,
  SearchInput,
  type DataTableColumn,
} from '@helix-x/web/design-system';
import { PortalAdministrationService, type AuditLogEntryDto } from '@helix-x-rawla/client-sdk';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';

/** The append-only change log (ADM-02 / AUD §20.1). */
export function AuditLogPage() {
  const [items, setItems] = useState<AuditLogEntryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await PortalAdministrationService.listPortalAuditLogs({
        action: action || undefined,
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
      });
      setItems(data.items);
      setTotal(data.total);
    } catch {
      setError('Could not load the audit log.');
    } finally {
      setLoading(false);
    }
  }, [action, page, pageSize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const columns = useMemo<DataTableColumn<AuditLogEntryDto>[]>(
    () => [
      {
        key: 'when',
        header: 'When',
        render: (row) => (
          <span className="whitespace-nowrap text-xs text-gray-600 dark:text-gray-400">
            {new Date(row.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        render: (row) => <span className="font-mono text-xs">{row.action}</span>,
      },
      {
        key: 'entity',
        header: 'Target',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.entityType}
            {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ''}
          </span>
        ),
      },
      {
        key: 'actor',
        header: 'Actor',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.actorUserId ? `user ${row.actorUserId}` : 'system'}
          </span>
        ),
      },
      {
        key: 'change',
        header: 'Change',
        hideOnMobile: true,
        render: (row) => (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {row.before || row.after
              ? `${JSON.stringify(row.before ?? {})} → ${JSON.stringify(row.after ?? {})}`
              : '—'}
          </span>
        ),
      },
      {
        key: 'reason',
        header: 'Reason',
        render: (row) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">{row.reason ?? '—'}</span>
        ),
      },
    ],
    [],
  );

  return (
    <PortalAdminLayout
      title="Audit log"
      description="Who did what, when, and why. Append-only — entries cannot be edited or removed."
    >
      <div className="mb-4 sm:max-w-xs">
        <SearchInput
          value={action}
          onChange={(event) => { setAction(event.target.value); setPage(1); }}
          onClear={() => { setAction(''); setPage(1); }}
          placeholder="Filter by action…"
          aria-label="Filter by action"
        />
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <DataTable
        columns={columns}
        data={items}
        rowKey={(row) => row.id}
        loading={loading}
        emptyState="Nothing recorded yet."
      />

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        disabled={loading}
      />
    </PortalAdminLayout>
  );
}
