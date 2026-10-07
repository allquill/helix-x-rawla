import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { RouteViewProps } from '@helix-x/web';
import { Alert, Badge, Button, Tabs } from '@helix-x/web/design-system';
import { PortalAdminLayout } from '../../../shared/PortalAdminLayout';
import { CloseTab } from '../components/admin/CloseTab';
import { DetailsTab } from '../components/admin/DetailsTab';
import { CostsTab, DocumentsTab, GoodsTab } from '../components/admin/LedgerTabs';
import { RegistrationsTab } from '../components/admin/RegistrationsTab';
import { SlotsTab, TicketsTab } from '../components/admin/TicketsTab';
import { useAdminEvent } from '../hooks/useEventAdmin';
import { useCan } from '../hooks/useCan';
import { apiMessage, formatAmount, formatWhen } from '../lib/format';

const STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
  closed: { label: 'Closed', variant: 'default' },
};

/**
 * One event, for the people running it.
 *
 * Which tabs and buttons appear follows the permissions the signed-in user
 * holds; the API enforces the same rules whatever is shown. Once the event is
 * closed every tab is read-only — the server answers 409 to any write, and
 * the controls are simply not offered.
 */
export function AdminEventPage({ params }: RouteViewProps) {
  const id = params?.id;
  const can = useCan();
  const admin = useAdminEvent(id);
  const { event, loading, error } = admin;
  const [tab, setTab] = useState('details');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const closed = event?.status === 'closed';
  const canWrite = can('events:write');

  const tabs = [
    { id: 'details', label: 'Details' },
    { id: 'tickets', label: 'Tickets', count: event?.ticketTypes.length },
    { id: 'slots', label: 'Time slots' },
    { id: 'registrations', label: 'Registrations', count: event?.registrationCount },
    ...(can('events:documents.read') ? [{ id: 'documents', label: 'Documents' }] : []),
    ...(can('events:inventory.manage') ? [{ id: 'goods', label: 'Donated goods' }] : []),
    ...(can('events:finance.read') ? [{ id: 'costs', label: 'Costs' }] : []),
    ...(can('volunteers:hours.write') || can('events:close')
      ? [{ id: 'close', label: 'Hours and close', count: event?.volunteerCount }]
      : []),
  ];

  const publish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await admin.publish();
    } catch (err) {
      setPublishError(apiMessage(err, 'The event could not be published.'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <PortalAdminLayout
        title={event?.title ?? 'Event'}
        description={
          event ? (
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS[event.status]?.variant ?? 'default'}>{STATUS[event.status]?.label ?? event.status}</Badge>
              <span>{formatWhen(event)}</span>
              <span>
                · {event.attendeeCount}
                {event.capacity != null ? ` of ${event.capacity}` : ''} registered ·{' '}
                {formatAmount(event.paidCents, event.currency)} received
              </span>
            </span>
          ) : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {event?.status === 'draft' && canWrite && (
              <Button onClick={publish} loading={publishing}>
                Publish
              </Button>
            )}
            {event && event.status !== 'draft' && (
              <Link to={`/events/${event.id}`}>
                <Button variant="secondary">View as a member</Button>
              </Link>
            )}
            <Link to="/admin/events">
              <Button variant="secondary">All events</Button>
            </Link>
          </div>
        }
    >
      <div>

      {loading && <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">Loading…</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {publishError && <Alert variant="error" className="mb-4">{publishError}</Alert>}
      {event?.status === 'draft' && (
        <Alert variant="info" className="mb-4">
          This is a draft. Members cannot see it, and nobody has been invited. Publishing emails the
          invitation to every member.
        </Alert>
      )}
      {closed && (
        <Alert variant="info" className="mb-4">
          This event is closed. Everything here is read-only.
        </Alert>
      )}

      {event && (
        <>
          <Tabs aria-label="Event sections" className="mb-6" items={tabs} value={tab} onChange={setTab} />

          {tab === 'details' && (
            <DetailsTab
              event={event}
              readOnly={closed}
              canWrite={canWrite}
              canPostPhotos={can('events:photos.manage')}
              onUpdate={admin.update}
              onUploadFlyer={admin.uploadFlyer}
              onSetPhotosLink={admin.setPhotosLink}
            />
          )}
          {tab === 'tickets' && (
            <TicketsTab
              event={event}
              editable={canWrite && !closed}
              onSave={admin.saveTicketType}
              onDelete={admin.deleteTicketType}
            />
          )}
          {tab === 'slots' && <SlotsTab event={event} editable={canWrite && !closed} />}
          {tab === 'registrations' && (
            <RegistrationsTab
              event={event}
              readOnly={closed}
              canRecordPayment={can('events:payments.record')}
              canRemove={can('events:registrations.remove')}
              onChanged={admin.refresh}
            />
          )}
          {tab === 'documents' && (
            <DocumentsTab event={event} readOnly={closed} canManage={can('events:documents.manage')} />
          )}
          {tab === 'goods' && <GoodsTab event={event} editable={!closed} />}
          {tab === 'costs' && <CostsTab event={event} editable={can('events:finance.manage') && !closed} />}
          {tab === 'close' && (
            <CloseTab
              event={event}
              canEnterHours={can('volunteers:hours.write')}
              canClose={can('events:close')}
              onClose={admin.close}
            />
          )}
        </>
      )}
      </div>
    </PortalAdminLayout>
  );
}
