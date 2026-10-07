import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  DataTable,
  FormField,
  Modal,
  Pagination,
  SearchInput,
  Select,
  type DataTableColumn,
} from '@helix-x/web/design-system';
import type { AdminEventDto, AdminEventRegistrationDto, RecordEventPaymentDto } from '@helix-x-rawla/client-sdk';
import { useEventRegistrations } from '../../hooks/useEventAdmin';
import {
  PAYMENT_METHOD_LABELS,
  REGISTRATION_STATUS_LABELS,
  apiMessage,
  formatAmount,
  formatMoney,
} from '../../lib/format';
import { ReasonDialog } from '../ReasonDialog';

const live = (r: AdminEventRegistrationDto) => r.status === 'pending_payment' || r.status === 'confirmed';

export type RegistrationsTabProps = {
  event: AdminEventDto;
  readOnly: boolean;
  canRecordPayment: boolean;
  canRemove: boolean;
  /** Tell the page its totals are stale. */
  onChanged: () => void;
};

/** Who has registered, what they owe, and the two Admin actions on them (EVT-20 / EVT-23). */
export function RegistrationsTab({ event, readOnly, canRecordPayment, canRemove, onChanged }: RegistrationsTabProps) {
  const { items, total, page, pageSize, setPage, q, setQ, loading, error, recordPayment, remove } =
    useEventRegistrations(event.id);
  const [viewing, setViewing] = useState<AdminEventRegistrationDto | null>(null);
  const [paying, setPaying] = useState<AdminEventRegistrationDto | null>(null);
  const [removing, setRemoving] = useState<AdminEventRegistrationDto | null>(null);

  const columns = useMemo<DataTableColumn<AdminEventRegistrationDto>[]>(
    () => [
      {
        key: 'household',
        header: 'Household',
        render: (r) => (
          <div>
            <span className="font-medium">{r.purchaserName}</span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">{r.purchaserEmail}</span>
          </div>
        ),
      },
      {
        key: 'people',
        header: 'People',
        width: '120px',
        render: (r) => (
          <span className="text-sm">
            {r.attendees.length}
            {r.attendees.some((a) => a.isVolunteer) && (
              <span className="text-gray-500 dark:text-gray-400">
                {' '}· {r.attendees.filter((a) => a.isVolunteer).length} vol.
              </span>
            )}
          </span>
        ),
      },
      {
        key: 'money',
        header: 'Paid',
        render: (r) => (
          <span className="text-sm">
            {formatAmount(r.paidCents, r.currency)}
            <span className="text-gray-500 dark:text-gray-400"> of {formatAmount(r.totalCents, r.currency)}</span>
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        width: '150px',
        render: (r) => (
          <Badge variant={r.status === 'confirmed' ? 'success' : r.status === 'pending_payment' ? 'warning' : 'default'}>
            {REGISTRATION_STATUS_LABELS[r.status] ?? r.status}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '290px',
        render: (r) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => setViewing(r)}>
              View
            </Button>
            {!readOnly && canRecordPayment && live(r) && (
              <Button size="sm" variant="secondary" onClick={() => setPaying(r)}>
                Record payment
              </Button>
            )}
            {!readOnly && canRemove && live(r) && (
              <Button size="sm" variant="ghost" onClick={() => setRemoving(r)}>
                Remove
              </Button>
            )}
          </div>
        ),
      },
    ],
    [readOnly, canRecordPayment, canRemove],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sm:max-w-sm">
        <SearchInput
          placeholder="Search by name"
          aria-label="Search registrations by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onClear={() => setQ('')}
        />
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <DataTable columns={columns} data={items} rowKey={(r) => r.id} loading={loading} emptyState="No registrations yet." />
      {total > pageSize && <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />}

      <RegistrationDialog registration={viewing} onClose={() => setViewing(null)} />
      <PaymentDialog
        registration={paying}
        onClose={() => setPaying(null)}
        onSave={async (body) => {
          await recordPayment(paying!.id, body);
          onChanged();
        }}
      />
      <ReasonDialog
        open={removing !== null}
        title={`Remove ${removing?.purchaserName ?? 'this household'} from the event?`}
        description={
          removing && removing.paidCents > 0
            ? `They have paid ${formatAmount(removing.paidCents, removing.currency)}. Refunds are handled outside the portal; the payment stays on record.`
            : 'Their places are released. They are told by email, with your reason.'
        }
        confirmLabel="Remove from event"
        onClose={() => setRemoving(null)}
        onConfirm={async (reason) => {
          await remove(removing!.id, reason);
          onChanged();
        }}
      />
    </div>
  );
}

function RegistrationDialog({
  registration,
  onClose,
}: {
  registration: AdminEventRegistrationDto | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={registration !== null}
      size="lg"
      onClose={onClose}
      title={registration?.purchaserName}
      description={registration ? REGISTRATION_STATUS_LABELS[registration.status] : undefined}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {registration && (
        <div className="flex flex-col gap-5 text-sm">
          {registration.removedReason && (
            <Alert variant="warning">Removed: {registration.removedReason}</Alert>
          )}
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {registration.attendees.map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {a.fullName}
                    {a.isVolunteer && <Badge variant="brand" className="ml-2">Volunteer</Badge>}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {[
                      a.ticketTypeName,
                      a.pricingTier === 'early_bird' && 'early bird',
                      a.dietaryPref,
                      a.dietaryNotes,
                      a.tshirtSize && `T-shirt ${a.tshirtSize.toUpperCase()}`,
                      a.hotelDetails,
                      ...a.slots.map((s) => s.activity),
                      a.waiverSignedAt && 'waiver signed',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <span className="text-gray-900 dark:text-gray-100">{formatMoney(a.unitPriceCents, registration.currency)}</span>
              </li>
            ))}
          </ul>
          <div>
            <p className="font-medium text-gray-900 dark:text-gray-100">
              Payments — {formatAmount(registration.paidCents, registration.currency)} of{' '}
              {formatAmount(registration.totalCents, registration.currency)}
            </p>
            {registration.payments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">None recorded.</p>
            ) : (
              <ul className="mt-1 flex flex-col gap-1">
                {registration.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap justify-between gap-2 text-gray-700 dark:text-gray-300">
                    <span>
                      {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                      {p.reference ? ` · ${p.reference}` : ''}
                      {p.note ? ` · ${p.note}` : ''}
                      {p.recordedByUserId ? ' · recorded by hand' : ''}
                      {p.settledAt ? ` · ${new Date(p.settledAt).toLocaleString()}` : ''}
                    </span>
                    <span>{formatAmount(p.amountCents, p.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

/** EVT-20: money received outside the portal checkout, recorded by an Admin. */
function PaymentDialog({
  registration,
  onClose,
  onSave,
}: {
  registration: AdminEventRegistrationDto | null;
  onClose: () => void;
  onSave: (body: RecordEventPaymentDto) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('zelle');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!registration) return;
    setAmount(registration.balanceCents > 0 ? (registration.balanceCents / 100).toFixed(2) : '');
    setMethod('zelle');
    setReference('');
    setNote('');
    setError(null);
  }, [registration]);

  const save = async () => {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents < 1) return setError('Enter the amount received.');
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        amountCents: cents,
        method: method as RecordEventPaymentDto['method'],
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(apiMessage(err, 'The payment could not be recorded.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={registration !== null}
      onClose={submitting ? () => {} : onClose}
      title="Record a payment"
      description={
        registration
          ? `${registration.purchaserName} owes ${formatAmount(registration.balanceCents, registration.currency)}. Recorded with your name and the time.`
          : undefined
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={save} loading={submitting}>
            Record payment
          </Button>
        </>
      }
    >
      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Amount received" inputMode="decimal" value={amount} disabled={submitting} onChange={(e) => setAmount(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-method" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            How it was paid
          </label>
          <Select
            id="payment-method"
            value={method}
            disabled={submitting}
            options={[
              { value: 'zelle', label: 'Zelle' },
              { value: 'other', label: 'Other (cheque, cash…)' },
            ]}
            onChange={(e) => setMethod(e.target.value)}
          />
        </div>
        <FormField label="Reference" helperText="Zelle confirmation, cheque number…" value={reference} disabled={submitting} onChange={(e) => setReference(e.target.value)} />
        <FormField label="Note" value={note} disabled={submitting} onChange={(e) => setNote(e.target.value)} />
      </div>
    </Modal>
  );
}
